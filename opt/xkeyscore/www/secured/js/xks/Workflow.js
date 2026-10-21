/*
 * Workflow Central: the Request Wizard and My Workflows.
 *
 * Sources:
 *   [WF#]  xks-workflows-2011.pdf slide #
 *
 * Wizard steps (Cancel / Prev ... Next / Submit along the bottom):
 *   1 Please select a Search Type            [WF9]
 *   2 Basic Information                      [WF10]
 *   3 Add Search Fields                      [WF11] [WF21-24]
 *   4 Group Search Fields                    [WF12]
 *   5 Select the Database(s) to query        [WF13] [WF24]
 *   6 Follow-on Actions                      [WF14-17]
 *   7 Workflow Review                        [WF18]
 * A new workflow is "pending" (yellow row) until approved (green row)
 * [WF19] [WF20].
 */
Ext.ns('Xks');

Xks.workflowStore = new Ext.data.JsonStore({
    idProperty: 'id',
    fields: ['id', 'searchKey', 'searchTitle', 'name', 'justification', 'addJustification', 'miranda',
             'recurring', 'interval', 'offset', 'start', 'stop', 'criteria', 'group', 'databases',
             'contentMustExist', 'actions', 'created', 'modified', 'state', 'user']
});

Xks.workflow = {
    // searches that can be a workflow ("Every search type can be a workflow." [WF2])
    searchTypes: function () {
        var out = [];
        Ext.iterate(Xks.data.searches, function (key, def) {
            if (!def.multi && key !== 'full_log_dni') {
                out.push([key, def.title.replace(/^[^:]*:\s*/, '')]);
            }
        });
        return out.sort(function (a, b) { return a[1] < b[1] ? -1 : 1; });
    },

    // field names offered in "Add Search Fields": the form's own fields with
    // From/To spelled out, as the wizard shows them ("From IP Address")
    fieldNames: function (key) {
        var out = [];
        function add(n) {
            if (out.indexOf(n) === -1) {
                out.push(n);
            }
        }
        function walk(specs) {
            Ext.each(specs, function (s) {
                if (s === '-') {
                    return;
                }
                if (s.type === 'band') {
                    walk(s.fields);
                } else if (typeof s === 'string') {
                    add(s);
                } else if (s.type === 'dir' || s.type === 'countrydir') {
                    add('From ' + s.label);
                    add('To ' + s.label);
                } else if (s.type !== 'check' && s.type !== 'searchforms') {
                    add(s.label);
                }
            });
        }
        walk(Xks.data.getSearch(key, key).fields);
        Ext.each(Xks.data.workflow.extraFields, add);
        return out;
    },

    groupColumns: function (key) {
        var cols = Xks.data.workflow.groupColumns[key], def;
        if (cols) {
            return cols;
        }
        // no screenshot: Datetime, the result columns, then the common ones
        def = Xks.data.getSearch(key, key);
        cols = ['Datetime'];
        Ext.each((def.results || []).concat(Xks.data.commonResultColumns), function (c) {
            if (cols.indexOf(c) === -1) {
                cols.push(c);
            }
        });
        return cols;
    },

    xmlName: function (field) {
        return Xks.data.workflow.xmlNames[field] ||
            field.replace(/\*|\(.*?\)/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    },

    // turn a My Recent Results query into wizard values ("Create Workflow from this Search" [WF6])
    fromQuery: function (q) {
        var criteria = [];
        Ext.each(q.values, function (v) {
            if (v.value === '' || v.value === null || v.value === undefined) {
                return;
            }
            if (!v.dir) {
                criteria.push({ field: v.label, value: v.value });
            } else if (v.dir === 'Either') {
                // [WF11] multiple field search shows as "From IP Address OR To IP Address"
                criteria.push({ field: 'From ' + v.label + ' OR To ' + v.label, value: v.value });
            } else {
                criteria.push({ field: v.dir + ' ' + v.label, value: v.value });
            }
        });
        return {
            searchKey: q.searchKey,
            name: q.name,
            justification: q.justification,
            miranda: q.miranda,
            recurring: false,
            start: q.start,
            stop: q.stop,
            criteria: criteria
        };
    },

    // [WF18] "Workflow Values" tab
    reviewHtml: function (wf) {
        var enc = Ext.util.Format.htmlEncode,
            h = ['This query (' + enc(wf.name) + ') will search the <b>' + enc(wf.searchTitle) +
                 '</b> table in database(s):<br>'];
        Ext.each(wf.databases, function (d) {
            h.push('&nbsp;&nbsp;<b>' + enc(d) + '</b><br>');
        });
        h.push('<br>');
        if (wf.recurring) {
            h.push('The query will run <b>CONTINUOUSLY</b> executing every <b>' + wf.interval +
                   ' hours</b> beginning at <b>' + wf.offset + ':00 EST</b><br><br>');
        } else {
            // one-time wording not shown on any slide
            h.push('The query will run <b>ONCE</b> from <b>' + wf.start.format('Y-m-d H:i') +
                   '</b> to <b>' + wf.stop.format('Y-m-d H:i') + '</b><br><br>');
        }
        h.push('The query will execute the following search criteria:<br><br>');
        Ext.each(wf.criteria, function (c) {
            h.push('&lt;and&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;field&gt;<b>' + enc(c.field) +
                   '</b>&lt;/field&gt;<br>&nbsp;&nbsp;&nbsp;&nbsp;&lt;value&gt;' + enc(c.value) +
                   '&lt;/value&gt;<br>&lt;/and&gt;<br><br>');
        });
        return h.join('');
    },

    // [WF20] the XML shown in the "Workflow: <name>" window. The end of the
    // document is cut off on the slide; <actions> is a guess.
    toXml: function (wf) {
        var enc = Ext.util.Format.htmlEncode,
            out = [],
            ind = function (n) { return new Array(n + 1).join('  '); },
            tag = function (n, name, v) { out.push(ind(n) + '<' + name + '>' + enc(String(v)) + '</' + name + '>'); },
            open = function (n, name) { out.push(ind(n) + '<' + name + '>'); },
            close = function (n, name) { out.push(ind(n) + '</' + name + '>'); },
            user = wf.user || Xks.App.USER,
            pw = '';

        // stand-in for the hashed password on the slide
        Ext.each((user + wf.name).split(''), function (ch, i) {
            pw += ((ch.charCodeAt(0) * (i + 7)) % 256 + 256).toString(16).substr(1);
        });

        out.push('<?xml version="1.0" encoding="UTF-8"?>');
        open(0, 'query_jobs');
        tag(1, 'internal_gui', 1);
        tag(1, 'datetime_created', Math.floor(wf.created.getTime() / 1000));
        open(1, 'job');
        tag(2, 'xks_userid', user);
        tag(2, 'xks_user_name', user);
        tag(2, 'xks_password', pw.substr(0, 16));
        tag(2, 'search_type', wf.searchKey);
        tag(2, 'query_name', wf.name);
        tag(2, 'query_justification', wf.justification);
        open(2, 'datetime');
        if (wf.recurring) {
            tag(3, 'interval', wf.interval);
            tag(3, 'offset', wf.offset);
        } else {
            tag(3, 'start', wf.start.format('Y-m-d H:i:s'));     // one-time tags are a guess
            tag(3, 'stop', wf.stop.format('Y-m-d H:i:s'));
        }
        close(2, 'datetime');
        open(2, 'sql');
        open(3, 'where');
        Ext.each(wf.criteria, function (c) {
            var fields = c.field.split(' OR ');
            open(4, fields.length > 1 ? 'or' : 'and');
            Ext.each(fields, function (f) { tag(5, 'field', Xks.workflow.xmlName(f)); });
            tag(5, 'value', c.value);
            close(4, fields.length > 1 ? 'or' : 'and');
        });
        close(3, 'where');
        if (wf.group && wf.group.on && wf.group.columns.length) {
            var g = Xks.map(wf.group.columns, Xks.workflow.xmlName).join(',');
            tag(3, 'group_by', g);
            tag(3, 'indexes', (wf.group.type === 'global' ? 'global ' : '') + 'unique key(' + g + ')');
        }
        close(2, 'sql');
        open(2, 'advanced');
        tag(3, 'content_must_exist', wf.contentMustExist ? 'true' : 'false');
        open(3, 'routing');
        Ext.each(wf.databases, function (d) { tag(4, 'database', d); });
        close(3, 'routing');
        close(2, 'advanced');
        if (wf.actions && wf.actions.length) {
            open(2, 'actions');
            Ext.each(wf.actions, function (a) {
                open(3, 'action');
                tag(4, 'script', a.script);
                Ext.iterate(a.args, function (k, v) {
                    tag(4, k.toLowerCase().replace(/[^a-z0-9]+/g, '_'), v);
                });
                close(3, 'action');
            });
            close(2, 'actions');
        }
        close(1, 'job');
        close(0, 'query_jobs');
        return out.join('\n');
    }
};

/*
 * A panel with its own title bar inside a wizard step, like the
 * "Would you like to group any fields?" strips [WF12] [WF14].
 */
Xks.wfSection = function (title, items, cfg) {
    return Ext.apply({
        xtype: 'panel',
        title: title,
        cls: 'xks-wf-section',
        bodyStyle: 'padding:4px 6px',
        border: true,
        items: items
    }, cfg);
};

// a collapsed help strip ("Search Type Help", "Basic Features Help" ...)
Xks.wfHelp = function (title, html) {
    return {
        xtype: 'panel',
        title: title,
        collapsible: true,
        collapsed: true,
        titleCollapse: true,
        cls: 'xks-wf-help',
        bodyStyle: 'padding:6px;font:11px tahoma,arial,sans-serif',
        html: html
    };
};

Xks.WorkflowWizard = Ext.extend(Ext.Window, {
    width: 620,
    height: 560,
    layout: 'card',
    activeItem: 0,
    modal: false,
    constrain: true,
    bodyCssClass: 'xks-wf-body',

    initComponent: function () {
        var v = this.values || {};
        this.title = this.record ? 'Workflow Central Edit Request Wizard' : 'Workflow Central Request Wizard';

        this.items = [
            this.buildTypeStep(v),
            this.buildBasicStep(v),
            this.buildFieldsStep(v),
            this.buildGroupStep(v),
            this.buildDatabaseStep(v),
            this.buildActionsStep(v),
            this.buildReviewStep()
        ];

        this.prevBtn = new Ext.Button({ text: 'Prev', iconCls: 'x-tbar-page-prev', handler: function () { this.go(-1); }, scope: this });
        this.nextBtn = new Ext.Button({ text: 'Next', iconCls: 'x-tbar-page-next', iconAlign: 'left', handler: function () { this.go(1); }, scope: this });
        this.submitBtn = new Ext.Button({ text: 'Submit', disabled: true, handler: this.onSubmit, scope: this });
        this.bbar = [
            { text: 'Cancel', handler: this.close, scope: this },
            this.prevBtn, '->', this.nextBtn, this.submitBtn
        ];

        Xks.WorkflowWizard.superclass.initComponent.call(this);
        this.on('afterrender', this.updateButtons, this);
    },

    step: function (title, items) {
        return {
            xtype: 'container',
            autoScroll: true,
            style: 'padding:10px 14px',
            items: [{ xtype: 'fieldset', title: title, autoHeight: true, items: items }]
        };
    },

    /* ---- 1: search type [WF9] ---- */
    buildTypeStep: function (v) {
        var types = Xks.workflow.searchTypes(), me = this;
        this.typeCombo = new Ext.form.ComboBox({
            width: 160,
            mode: 'local',
            triggerAction: 'all',
            editable: false,
            store: types,
            value: v.searchKey || 'full_log',
            listeners: { select: function () { me.onTypeChange(); } }
        });
        this.typeHelp = new Ext.BoxComponent({ cls: 'xks-wf-typehelp', html: '' });
        return this.step('Please select a Search Type.', [{
            xtype: 'container',
            layout: 'column',
            cls: 'xks-wf-typebox',
            items: [
                { xtype: 'container', width: 165, style: 'padding:32px 0 26px 0', items: this.typeCombo },
                Ext.apply(this.typeHelp, { columnWidth: 1 })
            ]
        }, Xks.wfHelp('Search Type Help', 'Pick the search form the workflow runs. ' +
            'The fields offered in the next steps depend on this choice.')]);
    },

    searchKey: function () {
        return this.typeCombo.getValue();
    },

    searchTitle: function () {
        return this.typeCombo.getRawValue();
    },

    onTypeChange: function () {
        var key = this.searchKey();
        this.typeHelp.update(Ext.util.Format.htmlEncode(Xks.data.workflow.typeHelp[key] || ''));
        if (this.fieldNameStore) {
            this.fieldNameStore.loadData(Xks.map(Xks.workflow.fieldNames(key), function (n) { return [n]; }));
            this.buildGroupColumns();
        }
    },

    /* ---- 2: basic information [WF10] ---- */
    buildBasicStep: function (v) {
        var now = new Date(), me = this;
        this.queryName = new Ext.form.TextField({ fieldLabel: 'Query Name', width: 240, allowBlank: false, value: v.name });
        this.justification = new Ext.form.TextField({ fieldLabel: 'Query Justification', width: 240, allowBlank: false, value: v.justification });
        this.addJustification = new Ext.form.ComboBox({ fieldLabel: 'Additional Justification', width: 247,
            mode: 'local', triggerAction: 'all', store: [], value: v.addJustification });
        this.miranda = new Ext.form.TextField({ fieldLabel: 'Miranda Number', width: 240, value: v.miranda });

        this.rangeCombo = new Ext.form.ComboBox({ width: 80, mode: 'local', triggerAction: 'all', editable: false,
            store: Ext.pluck(Xks.SearchForm.prototype.ranges, 0), value: v.start ? 'Custom' : '1 Day',
            listeners: { select: Xks.SearchForm.prototype.onRangeSelect, scope: this } });
        this.ranges = Xks.SearchForm.prototype.ranges;
        this.startDate = new Ext.form.DateField({ width: 95, format: 'Y-m-d', value: v.start || now.add(Date.DAY, -1) });
        this.startTime = new Xks.form.TimeSpinner({ width: 50, value: v.start ? v.start.format('H:i') : '00:00' });
        this.stopDate = new Ext.form.DateField({ width: 95, format: 'Y-m-d', value: v.stop || now });
        this.stopTime = new Xks.form.TimeSpinner({ width: 50, value: v.stop ? v.stop.format('H:i') : '23:59' });

        // [WF4]: every 1..24 hours, with an hour offset. The tab's own
        // layout is not shown on any slide.
        this.intervalCombo = new Ext.form.ComboBox({ fieldLabel: 'Run Every (hours)', width: 60, mode: 'local',
            triggerAction: 'all', editable: false, store: Xks.data.workflow.intervals, value: v.interval || 24 });
        this.offsetCombo = new Ext.form.ComboBox({ fieldLabel: 'Offset (start hour)', width: 60, mode: 'local',
            triggerAction: 'all', editable: false, value: v.offset || 0,
            store: Xks.map(new Array(24).join(',').split(','), function (x, i) { return i; }) });

        this.whenTabs = new Ext.TabPanel({
            tabPosition: 'bottom',
            plain: true,
            border: false,
            activeTab: v.recurring ? 0 : 1,
            height: 80,
            deferredRender: false,
            items: [
                { title: 'Reccurring Search', layout: 'form', labelWidth: 120, bodyStyle: 'padding:6px',
                  items: [this.intervalCombo, this.offsetCombo] },
                { title: 'One Time Search', bodyStyle: 'padding:6px;font:11px tahoma,arial,sans-serif',
                  html: 'Runs once over the datetime range above.' }
            ]
        });

        return this.step('Basic Information', [{
            xtype: 'container', layout: 'form', labelWidth: 145, cls: 'xks-wf-white',
            items: [this.queryName, this.justification, this.addJustification, this.miranda]
        }, {
            xtype: 'panel', border: true, cls: 'xks-wf-datetime',
            items: [{
                xtype: 'container', layout: 'form', labelWidth: 55, style: 'padding:4px 6px',
                items: {
                    xtype: 'compositefield', fieldLabel: 'Datetime',
                    items: [this.rangeCombo,
                        { xtype: 'displayfield', value: 'Start:' }, this.startDate, this.startTime,
                        { xtype: 'displayfield', value: 'Stop:' }, this.stopDate, this.stopTime,
                        { xtype: 'box', autoEl: { tag: 'img', src: '../html/icons/silk/help.png', style: 'margin:3px 0 0 2px',
                                                  'ext:qtip': 'Dates and times are GMT' } }]
                }
            }, this.whenTabs]
        }, Xks.wfHelp('Basic Features Help', 'Query names must be unique per user. Every query must have a ' +
            'justification. <b>Reccurring Search</b> runs every few hours from the offset hour; ' +
            '<b>One Time Search</b> runs once over a set datetime range.')]);
    },

    /* ---- 3: search fields [WF11] ---- */
    buildFieldsStep: function (v) {
        var me = this,
            names = Xks.map(Xks.workflow.fieldNames(v.searchKey || 'full_log'), function (n) { return [n]; });

        this.fieldNameStore = new Ext.data.ArrayStore({ fields: ['name'], data: names });
        this.criteriaStore = new Ext.data.JsonStore({ fields: ['field', 'value'], data: v.criteria || [] });

        this.criteriaGrid = new Ext.grid.GridPanel({
            store: this.criteriaStore,
            height: 110,
            enableHdMenu: false,
            columns: [
                { header: 'Search Field', dataIndex: 'field', width: 250 },
                { header: 'Search Value', dataIndex: 'value', width: 210 },
                { header: 'Remove', width: 50, align: 'center', renderer: function () {
                    return '<img class="xks-wf-remove" src="../html/icons/silk/cross.png">';
                } }
            ],
            listeners: {
                cellclick: function (g, row, col) {
                    if (col === 2) {
                        me.criteriaStore.removeAt(row);
                    }
                }
            }
        });

        // [WF24] Single Field Search: field combo, value, PLUS button in a row
        this.singleField = new Ext.form.ComboBox({ width: 250, mode: 'local', triggerAction: 'all', editable: false,
            store: this.fieldNameStore, displayField: 'name', valueField: 'name' });
        this.singleValue = new Ext.form.TextField({ width: 205 });
        // [WF11] Multiple Field Search: multi-select list, value, PLUS button
        this.multiList = new Ext.list.ListView({
            store: this.fieldNameStore,
            multiSelect: true,
            hideHeaders: true,
            height: 75,
            columns: [{ dataIndex: 'name' }]
        });
        this.multiValue = new Ext.form.TextField({ width: 205 });

        function plus(handler) {
            return { xtype: 'button', iconCls: 'xks-icon-add', width: 48, style: 'margin-left:4px', handler: handler, scope: me };
        }

        return this.step('Add Search Fields', [{
            xtype: 'box',
            cls: 'xks-wf-note',
            // [WF11], verbatim
            html: '<div style="text-align:center">Search Values are <b>AND</b>ed by default.</div>' +
                  'To <b>OR</b> Search <b>Fields:</b><br>' +
                  '&nbsp;&nbsp;* Use the Multiple Field Search tab (below the input fields).<br>' +
                  '&nbsp;&nbsp;* Select all the fields you wish to search.<br>' +
                  'To <b>OR</b> Search <b>Values:</b><br>' +
                  '&nbsp;&nbsp;* Type \'OR\' between each value (no quotes).<br><br>' +
                  '<div style="text-align:center">See Search Value Help below for more details or<br>' +
                  'for a description of boolean logic go to <a href="#" onclick="return false">here</a>.</div>'
        }, this.criteriaGrid, {
            xtype: 'tabpanel',
            tabPosition: 'bottom',
            plain: true,
            activeTab: 0,
            height: 108,
            deferredRender: false,
            items: [{
                title: 'Single Field Search', layout: 'hbox', bodyStyle: 'padding:4px',
                items: [this.singleField, this.singleValue, plus(this.addSingle)]
            }, {
                title: 'Multiple Field Search', layout: 'hbox', bodyStyle: 'padding:2px',
                items: [{ xtype: 'container', width: 252, items: this.multiList },
                        { xtype: 'container', style: 'padding-top:24px', items: this.multiValue },
                        { xtype: 'container', style: 'padding-top:24px', items: plus(this.addMulti) }]
            }]
        }, Xks.wfHelp('Search Value Help', '<a href="#" class="xks-link" onclick="Xks.SearchForm.showValueHelp();return false">' +
            'Show the search value operators</a>')]);
    },

    addSingle: function () {
        var f = this.singleField.getValue(), val = this.singleValue.getValue();
        if (f && val !== '') {
            this.criteriaStore.add(new this.criteriaStore.recordType({ field: f, value: val }));
            this.singleValue.reset();
        }
    },

    addMulti: function () {
        var sel = Xks.map(this.multiList.getSelectedRecords(), function (r) { return r.get('name'); }),
            val = this.multiValue.getValue();
        if (sel.length && val !== '') {
            this.criteriaStore.add(new this.criteriaStore.recordType({ field: sel.join(' OR '), value: val }));
            this.multiValue.reset();
            this.multiList.clearSelections();
        }
    },

    /* ---- 4: group by [WF12] ---- */
    buildGroupStep: function (v) {
        var g = v.group || {}, me = this;
        this.groupOn = new Ext.form.RadioGroup({
            columns: 1, hideLabel: true,
            items: [{ boxLabel: 'No', name: 'wf-group-on', inputValue: 'no', checked: !g.on },
                    { boxLabel: 'Yes', name: 'wf-group-on', inputValue: 'yes', checked: !!g.on,
                      listeners: { check: function () { me.updateGroupEnabled(); } } }]
        });
        this.groupTable = new Ext.form.Radio({ fieldLabel: 'Table Unique Values', name: 'wf-group-type', checked: g.type !== 'global' });
        this.groupGlobal = new Ext.form.Radio({ fieldLabel: 'Global Unique Values', name: 'wf-group-type', checked: g.type === 'global' });
        this.groupColumnsBox = new Ext.Container({ layout: 'form', labelWidth: 180 });
        this.initialGroupColumns = g.columns || [];

        this.groupTypeSection = new Ext.Panel(Xks.wfSection('Group By Type', [{
            xtype: 'container', layout: 'column',
            items: [{ xtype: 'container', layout: 'form', labelWidth: 180, width: 230, items: [this.groupTable, this.groupGlobal] },
                    { xtype: 'box', html: '<img src="../html/icons/silk/help.png" style="vertical-align:middle"> ' +
                      '<a href="#" class="xks-link" onclick="return false" ext:qtip="Table Unique Values groups each ' +
                      'result table at each SITE; Global Unique Values groups the results after they are concatenated.">' +
                      'Group By Type Help</a>', style: 'padding-top:4px' }]
        }]));
        this.groupColumnsSection = new Ext.Panel(Xks.wfSection('Columns to Group By', [this.groupColumnsBox]));

        return this.step('Group Search Fields', [
            Xks.wfSection('Would you like to group any fields?', [this.groupOn]),
            this.groupTypeSection,
            this.groupColumnsSection
        ]);
    },

    buildGroupColumns: function () {
        var keep = this.groupChecks ? this.getGroupColumns() : this.initialGroupColumns;
        this.groupColumnsBox.removeAll();
        this.groupChecks = Xks.map(Xks.workflow.groupColumns(this.searchKey()), function (c) {
            return this.groupColumnsBox.add(new Ext.form.Checkbox({ fieldLabel: c, colName: c, checked: keep.indexOf(c) !== -1 }));
        }, this);
        this.groupColumnsBox.doLayout();
        this.updateGroupEnabled();
    },

    getGroupColumns: function () {
        var out = [];
        Ext.each(this.groupChecks, function (c) {
            if (c.getValue()) {
                out.push(c.colName);
            }
        });
        return out;
    },

    updateGroupEnabled: function () {
        var on = this.groupOn.items.get(1).getValue();   // the group value lags behind 'check'
        this.groupTypeSection.setDisabled(!on);
        this.groupColumnsSection.setDisabled(!on);
    },

    /* ---- 5: databases [WF13] [WF24] ---- */
    buildDatabaseStep: function (v) {
        var chosen = v.databases || [], me = this;
        this.dbChecks = Xks.map(Xks.data.workflow.databases, function (d) {
            var label = d.alias ? '<span class="xks-wf-alias">&#9642;</span>' + Ext.util.Format.htmlEncode(d.name)
                                : '<b>' + Ext.util.Format.htmlEncode(d.name) + '</b> (' + d.db + ')';
            if (d.warning) {
                label += ' <span class="xks-wf-warning">' + d.warning + '</span>';
            }
            // databases switched off in Preferences can't be picked (inferred)
            var on = d.alias || Xks.prefs.dbEnabled(d.db);
            return new Ext.form.Checkbox({ hideLabel: true, boxLabel: label, dbName: d.db || d.name, disabled: !on,
                                           checked: on && chosen.indexOf(d.db || d.name) !== -1 });
        });
        this.contentMustExist = new Ext.form.Checkbox({ hideLabel: true, boxLabel: '<b>Content must exist</b>',
                                                        checked: !!v.contentMustExist,
                                                        'ext:qtip': 'Results are only returned if the content still exists at site.' });
        function setAll(on) {
            Ext.each(me.dbChecks, function (c) { c.setValue(on && !c.disabled); });
        }
        return this.step('Select the Database(s) to query', [{
            xtype: 'container', layout: 'form', cls: 'xks-wf-white', style: 'padding:4px 8px',
            items: this.dbChecks.concat([{ xtype: 'box', cls: 'xks-search-sep' }, this.contentMustExist])
        }, {
            xtype: 'container', layout: 'vbox', height: 56, layoutConfig: { align: 'center' }, style: 'padding:4px',
            items: [{ xtype: 'button', text: 'Check All', width: 90, handler: function () { setAll(true); } },
                    { xtype: 'button', text: 'Uncheck All', width: 90, style: 'margin-top:3px', handler: function () { setAll(false); } }]
        }, Xks.wfHelp('Basic Features Help', 'If you are selecting specific SIGADs, only select the sites that have ' +
            'data from that SIGAD. Queries will return faster and there is less work for the system.')]);
    },

    getDatabases: function () {
        var out = [];
        Ext.each(this.dbChecks, function (c) {
            if (c.getValue()) {
                out.push(c.dbName);
            }
        });
        return out;
    },

    /* ---- 6: follow-on actions [WF14-17] ---- */
    buildActionsStep: function (v) {
        var me = this, actions = v.actions || [];
        this.actionsOn = new Ext.form.RadioGroup({
            columns: 1, hideLabel: true,
            items: [{ boxLabel: 'No', name: 'wf-act-on', inputValue: 'no', checked: !actions.length },
                    { boxLabel: 'Yes', name: 'wf-act-on', inputValue: 'yes', checked: !!actions.length,
                      listeners: { check: function () { me.updateActionsEnabled(); } } }]
        });
        var scripts = [];
        Ext.iterate(Xks.data.workflow.scripts, function (k) { scripts.push(k); });
        this.scriptCombo = new Ext.form.ComboBox({
            width: 120, mode: 'local', triggerAction: 'all', editable: false,
            store: scripts, value: 'Email Alert',
            listeners: { select: function () { me.buildScriptArgs(); } }
        });
        this.argsBox = new Ext.Container({ layout: 'form', labelWidth: 95, style: 'padding:4px' });
        this.actionStore = new Ext.data.JsonStore({ fields: ['script', 'args'], data: actions });

        // header strip like a grid header: Script | Script Arguments | Add
        this.actionTable = new Ext.Container({
            cls: 'xks-wf-acttable',
            items: [{
                xtype: 'box', cls: 'xks-wf-acthead',
                html: '<table><tr><td style="width:128px">Script</td><td>Script Arguments</td><td style="width:52px">Add</td></tr></table>'
            }, {
                xtype: 'container', layout: 'column',
                items: [
                    { xtype: 'container', width: 128, style: 'padding:10px 4px', items: this.scriptCombo },
                    Ext.apply(this.argsBox, { columnWidth: 1, cls: 'xks-wf-args' }),
                    { xtype: 'container', width: 52, style: 'padding:10px 2px',
                      items: { xtype: 'button', iconCls: 'xks-icon-add', width: 44, handler: this.addAction, scope: this } }
                ]
            }]
        });
        // list of added actions: not shown on the slides
        this.actionGrid = new Ext.grid.GridPanel({
            store: this.actionStore, height: 90, enableHdMenu: false, style: 'margin-top:6px',
            columns: [
                { header: 'Added Follow-on Action', dataIndex: 'script', width: 150 },
                { header: 'Arguments', dataIndex: 'args', width: 300, renderer: function (a) {
                    var s = [];
                    Ext.iterate(a, function (k, val) { if (val !== '' && val !== false) { s.push(k + ': ' + val); } });
                    return Ext.util.Format.htmlEncode(s.join('; '));
                } },
                { header: 'Remove', width: 50, align: 'center', renderer: function () {
                    return '<img class="xks-wf-remove" src="../html/icons/silk/cross.png">';
                } }
            ],
            listeners: { cellclick: function (g, row, col) { if (col === 2) { me.actionStore.removeAt(row); } } }
        });

        return this.step('Follow-on Actions', [
            Xks.wfSection('Would you like to add any follow on actions', [this.actionsOn]),
            this.actionTable,
            this.actionGrid
        ]);
    },

    buildScriptArgs: function () {
        var specs = Xks.data.workflow.scripts[this.scriptCombo.getValue()] || [];
        this.argsBox.removeAll();
        this.argFields = Xks.map(specs, function (s) {
            var f;
            if (s.check) {
                f = new Ext.form.Checkbox({ boxLabel: s.check });
            } else if (s.combo) {
                f = new Ext.form.ComboBox({ width: 195, mode: 'local', triggerAction: 'all', editable: false, store: s.combo });
            } else if (s.textarea) {
                f = new Ext.form.TextArea({ width: 195, height: 60, value: s.textarea });
            } else {
                f = new Ext.form.TextField({ width: 195 });
            }
            f.fieldLabel = s.label;
            f.argName = s.label;
            return this.argsBox.add(f);
        }, this);
        if (!specs.length) {
            this.argsBox.add({ xtype: 'box', html: '<i>No arguments.</i>' });
        }
        this.argsBox.doLayout();
    },

    addAction: function () {
        var args = {};
        Ext.each(this.argFields, function (f) {
            args[f.argName] = f.getValue();
        });
        // [WF25]: an SQL Report needs a valid SQL statement
        if (args.SQL !== undefined && !/^\s*select\s+\S.*\bfrom\s+%\{OUTPUT_TABLE\}/i.test(args.SQL.replace(/\n/g, ' '))) {
            Ext.Msg.alert('SQL Report', 'This must be a VALID SQL statement, e.g.<br><br>' +
                '<tt>SELECT casenotation, sigad<br>FROM %{OUTPUT_TABLE}<br>WHERE sigad!=\'\'<br>GROUP BY casenotation</tt>');
            return;
        }
        this.actionStore.add(new this.actionStore.recordType({ script: this.scriptCombo.getValue(), args: args }));
        this.buildScriptArgs();
    },

    updateActionsEnabled: function () {
        var on = this.actionsOn.items.get(1).getValue();   // the group value lags behind 'check'
        this.actionTable.setDisabled(!on);
        this.actionGrid.setDisabled(!on);
    },

    /* ---- 7: review [WF18] ---- */
    buildReviewStep: function () {
        this.reviewValues = new Ext.Panel({ title: 'Workflow Values', autoScroll: true, cls: 'xks-wf-review',
                                            bodyStyle: 'padding:6px' });
        this.reviewXml = new Ext.Panel({ title: 'Workflow XML', autoScroll: true, cls: 'xks-wf-review',
                                         bodyStyle: 'padding:6px' });
        return this.step('Workflow Review', [{
            xtype: 'tabpanel', tabPosition: 'bottom', plain: true, activeTab: 0, height: 410,
            deferredRender: false, items: [this.reviewValues, this.reviewXml]
        }]);
    },

    getValues: function () {
        var rec = this.record, interval = this.intervalCombo.getValue();
        return {
            id: rec ? rec.get('id') : 'wf_' + (Math.random().toString(16) + '000000').substr(2, 6),
            searchKey: this.searchKey(),
            searchTitle: this.searchTitle(),
            name: this.queryName.getValue(),
            justification: this.justification.getValue(),
            addJustification: this.addJustification.getValue(),
            miranda: this.miranda.getValue(),
            recurring: this.whenTabs.getActiveTab() === this.whenTabs.items.get(0),
            interval: interval,
            offset: this.offsetCombo.getValue(),
            start: Xks.SearchForm.prototype.parseDateTime(this.startDate, this.startTime),
            stop: Xks.SearchForm.prototype.parseDateTime(this.stopDate, this.stopTime),
            criteria: Xks.map(this.criteriaStore.getRange(), function (r) { return { field: r.get('field'), value: r.get('value') }; }),
            group: { on: this.groupOn.getValue().inputValue === 'yes',
                     type: this.groupGlobal.getValue() ? 'global' : 'table',
                     columns: this.getGroupColumns() },
            databases: this.getDatabases(),
            contentMustExist: this.contentMustExist.getValue(),
            actions: this.actionsOn.getValue().inputValue === 'yes' ?
                Xks.map(this.actionStore.getRange(), function (r) { return { script: r.get('script'), args: r.get('args') }; }) : [],
            created: rec ? rec.get('created') : new Date(),
            modified: new Date(),
            state: 'pending',
            user: rec ? rec.get('user') : Xks.App.USER
        };
    },

    // checks before leaving a step
    validateStep: function (i) {
        var name;
        if (i === 1) {
            if (!this.queryName.isValid() || !this.justification.isValid()) {
                return 'Every query must have a name and a justification.';
            }
            name = this.queryName.getValue();
            if (Xks.workflowStore.findBy(function (r) {
                return r.get('name') === name && r.get('user') === (this.record ? this.record.get('user') : Xks.App.USER) &&
                       r !== this.record;
            }, this) !== -1) {
                return 'Query names must be unique per user.';           // [WF10]
            }
        }
        if (i === 2 && !this.criteriaStore.getCount()) {
            return 'Add at least one search field (use the PLUS button).';   // [WF11] "you must select the PLUS key"
        }
        if (i === 4 && !this.getDatabases().length) {
            return 'Select at least one database.';
        }
        return null;
    },

    go: function (dir) {
        var layout = this.getLayout(),
            i = this.items.indexOf(layout.activeItem),
            msg = dir > 0 ? this.validateStep(i) : null,
            wf;
        if (msg) {
            Ext.Msg.alert(this.title, msg);
            return;
        }
        i = Math.max(0, Math.min(this.items.getCount() - 1, i + dir));
        layout.setActiveItem(i);
        if (i === this.items.getCount() - 1) {
            wf = this.getValues();
            this.reviewValues.update(Xks.workflow.reviewHtml(wf));
            this.reviewXml.update('<pre>' + Ext.util.Format.htmlEncode(Xks.workflow.toXml(wf)) + '</pre>');
        }
        this.updateButtons();
    },

    updateButtons: function () {
        var i = this.items.indexOf(this.getLayout().activeItem),
            last = this.items.getCount() - 1;
        this.prevBtn.setDisabled(i === 0);
        this.nextBtn.setDisabled(i === last);
        this.submitBtn.setDisabled(i !== last);
    },

    afterRender: function () {
        Xks.WorkflowWizard.superclass.afterRender.call(this);
        this.onTypeChange();
        this.buildScriptArgs();
        this.buildGroupColumns();
        this.updateActionsEnabled();
    },

    onSubmit: function () {
        var wf = this.getValues(), rec = this.record;
        if (rec) {
            Ext.iterate(wf, function (k, val) { rec.set(k, val); });
            rec.commit();
        } else {
            Xks.workflowStore.add(new Xks.workflowStore.recordType(wf, wf.id));
        }
        this.close();
        Xks.App.openMyWorkflows();
    }
});

/*
 * My Workflows [WF19] [WF20]: Query Type, Query Name, Last Modified,
 * State, Actions; a "+" expander on each row; paging bar with Page Size.
 * Action icons (left to right on [WF19]): approve, delete, run, edit and a
 * fifth icon (a mortarboard, not in Silk) that here opens the XML window.
 *
 * "All Workflows" and "All Pending Workflows" are only in the Oct 2009 tree
 * (cne-analysis-in-xks.pdf slides 12 and 30) with no screenshot of their
 * contents: here they are this grid over every user's workflows (all, or
 * only pending ones) with a User column (inferred). Each tab has its own
 * copy of the list (Xks.mirrorStore); actions apply to Xks.workflowStore.
 */
Xks.MyWorkflowsGrid = Ext.extend(Ext.grid.GridPanel, {
    title: 'My Workflows',
    closable: true,
    stripeRows: false,
    deferRowRender: false,

    initComponent: function () {
        var me = this,
            enc = Ext.util.Format.htmlEncode,
            ACTIONS = [['approve', 'tick', 'Approve'], ['delete', 'cross', 'Delete'],
                       ['run', 'control_play_blue', 'Run Now'], ['edit', 'pencil', 'Edit'],
                       ['xml', 'script_code', 'View Workflow XML']];

        this.store = Xks.mirrorStore(this.keep || function (r) { return r.get('user') === Xks.App.USER; },
                                     Xks.workflowStore);
        this.expanded = {};
        this.columns = [
            { header: '', width: 22, fixed: true, menuDisabled: true, id: 'expander',
              renderer: function () { return '<div class="x-grid3-row-expander">&#160;</div>'; } },
            { header: 'Query Type', dataIndex: 'searchKey', width: 130, sortable: true },
            { header: 'Query Name', dataIndex: 'name', width: 160, sortable: true, renderer: enc },
            { header: 'Last Modified', dataIndex: 'modified', width: 130, sortable: true,
              renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') },
            { header: 'State', dataIndex: 'state', width: 120, sortable: true },
            { header: 'Actions', width: 120, menuDisabled: true, renderer: function () {
                return Xks.map(ACTIONS, function (a) {
                    return '<img class="xks-wf-action" data-action="' + a[0] + '" ext:qtip="' + a[2] +
                           '" src="../html/icons/silk/' + a[1] + '.png">';
                }).join('');
            } }
        ].concat(this.showUser ? [Xks.userColumn] : []);
        this.viewConfig = {
            enableRowBody: true,
            getRowClass: function (rec, i, p) {
                p.body = '<div class="xks-wf-rowbody">' + Xks.workflow.reviewHtml(rec.data) + '</div>';
                return (me.expanded[rec.id] ? 'x-grid3-row-expanded' : 'x-grid3-row-collapsed') +
                       (rec.get('state') === 'approved' ? ' xks-wf-approved' : ' xks-wf-pending');
            }
        };
        this.tbar = [
            { text: 'Help', handler: function () {
                Ext.Msg.alert(me.title, 'New workflows stay <b>pending</b> until approved. ' +
                    'Click + on a row to see what the workflow does.');
            } },
            { text: 'Actions', menu: [
                { text: 'New Workflow', iconCls: 'xks-icon-workflow', handler: function () { new Xks.WorkflowWizard().show(); } }
            ] }
        ];
        this.pageSize = new Ext.form.NumberField({ width: 35, value: 30, allowDecimals: false });
        this.bbar = new Ext.PagingToolbar({
            store: this.store, pageSize: 30, displayInfo: true,
            displayMsg: 'Displaying {0} - {1} of {2}', emptyMsg: 'No workflows',
            items: ['-', 'Page Size:', this.pageSize]
        });

        Xks.MyWorkflowsGrid.superclass.initComponent.call(this);
        this.on('destroy', this.store.unbindMaster);

        this.on('cellclick', function (g, row, col, e) {
            var rec = this.store.getAt(row), t = e.getTarget('.xks-wf-action');
            if (col === 0) {
                this.expanded[rec.id] = !this.expanded[rec.id];
                this.getView().refreshRow(rec);
            } else if (t) {
                // act on the shared record so every workflows tab follows
                this.doAction(t.getAttribute('data-action'), Xks.workflowStore.getById(rec.id) || rec);
            }
        }, this);
    },

    doAction: function (action, rec) {
        switch (action) {
        case 'approve':
            rec.set('state', 'approved');
            rec.set('modified', new Date());
            rec.commit();
            break;
        case 'delete':
            Ext.Msg.confirm(this.title, 'Delete workflow ' + Ext.util.Format.htmlEncode(rec.get('name')) + '?', function (b) {
                if (b === 'yes') {
                    Xks.workflowStore.remove(rec);
                }
            });
            break;
        case 'run':
            if (rec.get('state') !== 'approved') {
                Ext.Msg.alert(this.title, 'This workflow is still pending approval.');
                return;
            }
            Xks.App.runQuery({
                workflowId: rec.get('id'),
                name: rec.get('name'),
                justification: rec.get('justification'),
                searchKey: rec.get('searchKey'),
                searchTitle: rec.get('searchTitle'),
                start: rec.get('recurring') ? new Date().add(Date.HOUR, -rec.get('interval')) : rec.get('start'),
                stop: rec.get('recurring') ? new Date() : rec.get('stop'),
                values: Xks.map(rec.get('criteria'), function (c) { return { label: c.field, value: c.value }; })
            });
            break;
        case 'edit':
            new Xks.WorkflowWizard({ record: rec, values: rec.data }).show();
            break;
        case 'xml':
            this.showXml(rec);
            break;
        }
    },

    // [WF20] "Workflow: <name>" with the editable XML, Cancel and Save/Submit
    showXml: function (rec) {
        var area = new Ext.form.TextArea({ value: Xks.workflow.toXml(rec.data), cls: 'xks-raw' }),
            win = new Ext.Window({
                title: 'Workflow: ' + Ext.util.Format.htmlEncode(rec.get('name')),
                width: 640, height: 500, layout: 'fit', items: area,
                bbar: [{ text: 'Cancel', handler: function () { win.close(); } }, '->',
                       { text: 'Save/Submit', handler: function () {
                           // the edited XML is not parsed back
                           rec.set('modified', new Date());
                           rec.commit();
                           win.close();
                       } }]
            });
        win.show();
    }
});
