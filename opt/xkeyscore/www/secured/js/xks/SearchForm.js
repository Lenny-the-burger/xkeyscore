/*
 * Xks.SearchForm
 *
 * One search form ("Search: HTTP Activity" etc). Layout follows the Oct 2009
 * full-window screenshots (cne-analysis-in-xks.pdf slides 22-23), filled in
 * with the Jan 2009 user guide where those are cropped:
 *   collapsed Help panel, toolbar, monospace title, the justification rows
 *   (required labels bold, Justification as a textarea with "Recent
 *   Justifications"), the Datetime row, then the search-specific fields from
 *   Xks.data.searches with the search's own fields on a blue band.
 *
 * Xks.SearchForm.create() returns the tab (Help panel + form); the form is
 * at tab.searchForm.
 *
 * Fires 'submitsearch' (form, query) where query is
 *   { name, justification, searchKey, searchTitle, start, stop, values: [{label, value, dir}] }
 */
Ext.ns('Xks');

Xks.lastValues = {};
Xks.recentJustifications = [];

Xks.SearchForm = Ext.extend(Ext.form.FormPanel, {
    autoHeight: true,
    labelAlign: 'right',
    labelWidth: 210,
    bodyCssClass: 'xks-search-body',

    // [UG4] [UG7] [UG8] [UG14] show 1 Day / 1 Week / 1 Month / Custom
    ranges: [['1 Day', 1], ['1 Week', 7], ['1 Month', 30], ['Custom', 0]],

    initComponent: function () {
        var def = this.searchDef;

        this.valueFields = [];

        Ext.apply(this, {
            tbar: this.buildToolbar(def),
            items: [{
                xtype: 'box',
                cls: 'xks-search-title',
                html: Ext.util.Format.htmlEncode(def.title)
            }, {
                xtype: 'box',
                hidden: !def.placeholder,
                style: 'margin:0 0 8px 30px;color:#777;font:italic 11px tahoma,arial,sans-serif',
                html: 'No screenshot of this form has been found; only the shared fields are shown.'
            }].concat(this.buildHeader(), this.buildFields(def.fields)),
            buttonAlign: 'left',
            fbar: {
                cls: 'xks-search-buttons',
                items: [
                    // not visible in any screenshot; Submit is named in the user guide text
                    { text: 'Submit', handler: this.onSubmit, scope: this },
                    { text: 'Clear', handler: this.clearValues, scope: this }
                ]
            }
        });

        Xks.SearchForm.superclass.initComponent.call(this);
        this.addEvents('submitsearch');
    },

    buildToolbar: function (def) {
        var tb;
        // the Fields menu is filled once the fields exist (see afterRender)
        this.fieldsMenu = new Ext.menu.Menu();

        tb = [{ text: 'Fields', menu: this.fieldsMenu }];
        // MultiSearch forms have no Advanced Features menu [UG4]
        if (!def.multi) {
            tb.push({
                text: 'Advanced Features',
                // menu contents are not visible in any screenshot
                menu: [{ text: 'Search Value Help', handler: Xks.SearchForm.showValueHelp }]
            });
        }
        tb.push(
            { text: 'Show Hidden Search Fields', handler: this.showHiddenFields, scope: this },
            { text: 'Clear Search Values', handler: this.clearValues, scope: this },
            { text: 'Reload Last Search Values', handler: this.reloadLastValues, scope: this }
        );
        return tb;
    },

    buildHeader: function () {
        var now = new Date(),
            bold = 'font-weight:bold';

        this.queryName = new Ext.form.TextField({ fieldLabel: 'Query Name', labelStyle: bold, width: 330, allowBlank: false });
        // [TAO20] [CNE22]: textarea with a "Recent Justifications" link
        this.justification = new Ext.form.TextArea({ width: 300, height: 55, allowBlank: false });
        this.addJustification = new Ext.form.ComboBox({
            fieldLabel: 'Additional Justification',
            width: 337,
            mode: 'local',
            triggerAction: 'all',
            // option list not visible in any screenshot
            store: []
        });
        this.miranda = new Ext.form.TextField({ fieldLabel: 'Miranda Number', width: 330 });

        this.rangeCombo = new Ext.form.ComboBox({
            width: 80,
            mode: 'local',
            triggerAction: 'all',
            editable: false,
            store: Ext.pluck(this.ranges, 0),
            value: Xks.prefs.rangeFor(this.searchKey),                 // Preferences (inferred)
            listeners: { select: this.onRangeSelect, scope: this }
        });
        this.startDate = new Ext.form.DateField({ width: 100, format: 'Y-m-d', value: now.add(Date.DAY, -1) });
        this.startTime = new Xks.form.TimeSpinner({ width: 55, value: '00:00' });
        this.stopDate = new Ext.form.DateField({ width: 100, format: 'Y-m-d', value: now });
        this.stopTime = new Xks.form.TimeSpinner({ width: 55, value: '23:59' });
        Ext.each([this.startDate, this.startTime, this.stopDate, this.stopTime], function (f) {
            f.on('change', function () { this.rangeCombo.setValue('Custom'); }, this);
        }, this);
        this.onRangeSelect(this.rangeCombo);

        return [this.queryName, {
                xtype: 'compositefield',
                fieldLabel: 'Justification',
                labelStyle: bold,
                items: [this.justification, this.link('Recent Justifications', this.showRecentJustifications)]
            },
            this.addJustification, this.miranda,
            { xtype: 'box', cls: 'xks-search-sep' },
            {
                xtype: 'compositefield',
                fieldLabel: 'Datetime',
                labelStyle: bold,
                items: [
                    this.rangeCombo,
                    { xtype: 'displayfield', value: '&nbsp;&nbsp;Start:' },
                    this.startDate, this.startTime,
                    { xtype: 'displayfield', value: '&nbsp;&nbsp;Stop:' },
                    this.stopDate, this.stopTime,
                    {
                        xtype: 'box',
                        autoEl: { tag: 'img', src: '../html/icons/silk/help.png', style: 'margin:3px 0 0 4px;cursor:pointer',
                                  'ext:qtip': 'Dates and times are GMT' }
                    }
                ]
            }];
    },

    // a blue underlined text link inside a form row
    link: function (text, handler) {
        return {
            xtype: 'box',
            autoEl: { tag: 'a', href: '#', cls: 'xks-form-link', html: text },
            listeners: {
                render: function (c) {
                    c.el.on('click', function (e) {
                        e.preventDefault();
                        handler.call(this, c);
                    }, this);
                },
                scope: this
            }
        };
    },

    showRecentJustifications: function (c) {
        var items = Xks.map(Xks.recentJustifications, function (j) {
            return { text: Ext.util.Format.htmlEncode(Ext.util.Format.ellipsis(j, 60)),
                     handler: function () { this.justification.setValue(j); }, scope: this };
        }, this);
        new Ext.menu.Menu({
            items: items.length ? items : [{ text: '<i>No recent justifications</i>', disabled: true }]
        }).show(c.el);
    },

    buildFields: function (specs) {
        var items = [];
        Ext.each(specs, function (s) {
            if (s === '-') {
                items.push({ xtype: 'box', cls: 'xks-search-sep' });
            } else if (s.type === 'band') {
                // [CNE22]: the search's own fields sit on a light blue band
                items.push({
                    xtype: 'container',
                    layout: 'form',
                    cls: 'xks-search-band',
                    labelAlign: this.labelAlign,
                    labelWidth: this.labelWidth,
                    items: this.buildFields(s.fields)
                });
            } else {
                items.push(this.buildField(typeof s === 'string' ? { label: s } : s));
            }
        }, this);
        return items;
    },

    buildField: function (s) {
        var entry = { label: s.label, optional: s.optional },
            parts, f;

        switch (s.type) {
        case 'combo':
            entry.field = new Ext.form.ComboBox({ width: 337, mode: 'local', triggerAction: 'all',
                                                  store: s.options, value: s.value });
            break;
        case 'textarea':
            entry.field = new Ext.form.TextArea({ width: 300, height: 55 });
            break;
        case 'check':
            entry.field = new Ext.form.Checkbox();
            break;
        case 'dir':
            entry.field = new Ext.form.TextField({ width: 330 });
            break;
        case 'countrydir':
            entry.field = new Ext.form.ComboBox({ width: 337, mode: 'local', triggerAction: 'all',
                                                  store: ['AA', 'XA', 'XB', 'XC', 'ZZ'] });
            break;
        case 'searchforms':
            return this.buildSearchForms(s, entry);
        default:
            entry.field = new Ext.form.TextField({ width: 330 });
        }

        parts = [entry.field];
        if (s.type === 'dir' || s.type === 'countrydir') {
            entry.dirField = new Ext.form.ComboBox({ width: 65, mode: 'local', triggerAction: 'all', editable: false,
                                                     store: s.options, value: s.value });
            parts.push(entry.dirField);
        }
        if (s.builder) {
            // [CNE22] "[IP Address Field Builder]", [TAO24] "[Populate with URL Field Builder]"
            parts.push({ xtype: 'box', autoEl: { tag: 'img', src: '../html/icons/silk/bricks.png', style: 'margin-top:2px' } },
                       this.link(s.builder === 'ip' ? '[IP Address Field Builder]' : '[Populate with URL Field Builder]',
                                 function () { this.showFieldBuilder(entry, s.builder); }));
        }
        if (s.optional) {
            // [TAO24]: hidden fields show an enable checkbox in front of the field
            entry.enable = new Ext.form.Checkbox();
            parts.unshift(entry.enable);
        }

        f = parts.length > 1
            ? new Ext.form.CompositeField({ fieldLabel: s.label, items: parts })
            : Ext.apply(entry.field, { fieldLabel: s.label });
        if (s.optional) {
            f.hidden = true;
        }
        entry.container = f;
        this.valueFields.push(entry);
        return f;
    },

    // MultiSearch "Search Forms" checklist [UG4]: bold centred label with a Clear button underneath
    buildSearchForms: function (s, entry) {
        var g = new Ext.form.CheckboxGroup({
            columns: 1,
            fieldLabel: '<div class="xks-searchforms-label">' + s.label +
                        '<br><button type="button" class="xks-clear-forms">Clear</button></div>',
            labelSeparator: '',
            items: Xks.map(s.options, function (o) {
                return { boxLabel: '<b>' + o + '</b>', name: o, checked: true };
            })
        });
        g.on('afterrender', function () {
            g.el.up('.x-form-item').child('.xks-clear-forms').on('click', function () {
                g.items.each(function (c) { c.setValue(false); });
            });
        });
        entry.field = entry.container = g;
        entry.checklist = true;
        this.valueFields.push(entry);
        return g;
    },

    /*
     * Field Builder window. Only the links are visible in the screenshots;
     * this version just ORs together one value per line.
     */
    showFieldBuilder: function (entry, kind) {
        var ta = new Ext.form.TextArea({ hideLabel: true, anchor: '100% 100%' }),
            win = new Ext.Window({
                title: kind === 'ip' ? 'IP Address Field Builder' : 'URL Field Builder',
                width: 420,
                height: 260,
                modal: true,
                layout: 'fit',
                items: { xtype: 'form', bodyStyle: 'padding:6px', border: false,
                         items: [{ xtype: 'box', html: 'Enter one ' + (kind === 'ip' ? 'IP address' : 'URL') + ' per line:',
                                   style: 'margin-bottom:4px' }, ta] },
                buttons: [{
                    text: 'OK',
                    handler: function () {
                        var vals = Ext.util.Format.trim(ta.getValue()).split(/\s*\n\s*/);
                        if (kind === 'url') {
                            vals = Xks.map(vals, function (v) { return v.replace(/^\w+:\/\//, '').replace(/\/.*$/, ''); });
                        }
                        entry.field.setValue(vals.join(' or '));
                        win.close();
                    }
                }, { text: 'Cancel', handler: function () { win.close(); } }]
            });
        win.show();
    },

    afterRender: function () {
        Xks.SearchForm.superclass.afterRender.call(this);
        Ext.each(this.valueFields, function (e) {
            e.menuItem = this.fieldsMenu.add({
                text: e.label,
                checked: !e.optional,
                hideOnClick: false,
                checkHandler: function (item, checked) {
                    e.container.setVisible(checked);
                }
            });
            if (e.label === 'Max Results for a Single DB' && Xks.prefs.get('maxResults')) {
                e.field.setValue(Xks.prefs.get('maxResults'));
            }
        }, this);
        if (Xks.prefs.showHiddenFor(this.searchKey)) {
            this.showHiddenFields();
        }
    },

    onRangeSelect: function (combo) {
        var days = this.ranges[Ext.pluck(this.ranges, 0).indexOf(combo.getValue())][1];
        if (days) {
            this.stopDate.setValue(new Date());
            this.startDate.setValue(new Date().add(Date.DAY, -days));
            this.startTime.setValue('00:00');
            this.stopTime.setValue('23:59');
        }
    },

    showHiddenFields: function () {
        Ext.each(this.valueFields, function (e) {
            e.container.show();
            e.menuItem.setChecked(true, true);
        });
    },

    clearValues: function () {
        Ext.each([this.queryName, this.justification, this.addJustification, this.miranda], function (f) {
            f.reset();
        });
        Ext.each(this.valueFields, function (e) {
            if (e.checklist) {
                e.field.items.each(function (c) { c.setValue(true); });
            } else {
                e.field.reset();
            }
            if (e.dirField) {
                e.dirField.reset();
            }
            if (e.enable) {
                e.enable.reset();
            }
        });
    },

    reloadLastValues: function () {
        var last = Xks.lastValues[this.searchKey];
        if (!last) {
            Ext.Msg.alert('Reload Last Search Values', 'No previous values for this search.');
            return;
        }
        this.loadQuery(last);
    },

    loadQuery: function (q) {
        this.queryName.setValue(q.name);
        this.justification.setValue(q.justification);
        this.miranda.setValue(q.miranda);
        this.rangeCombo.setValue('Custom');
        this.startDate.setValue(q.start);
        this.startTime.setValue(q.start.format('H:i'));
        this.stopDate.setValue(q.stop);
        this.stopTime.setValue(q.stop.format('H:i'));
        Ext.each(this.valueFields, function (e, i) {
            var v = q.values[i];
            if (!v || e.checklist) {
                return;
            }
            e.field.setValue(v.value);
            if (e.dirField) {
                e.dirField.setValue(v.dir);
            }
            if (e.enable && v.value !== '') {
                e.enable.setValue(true);
                e.container.show();
            }
        });
    },

    parseDateTime: function (dateField, timeField) {
        var d = dateField.getValue() || new Date(),
            t = (timeField.getValue() || '00:00').split(':');
        return d.clearTime(true).add(Date.HOUR, parseInt(t[0], 10)).add(Date.MINUTE, parseInt(t[1], 10));
    },

    onSubmit: function () {
        var query, j = this.justification.getValue();
        if (!this.queryName.isValid() || !this.justification.isValid()) {
            return;
        }
        if (Xks.recentJustifications.indexOf(j) === -1) {
            Xks.recentJustifications.unshift(j);
        }
        query = {
            name: this.queryName.getValue(),
            justification: j,
            miranda: this.miranda.getValue(),
            searchKey: this.searchKey,
            searchTitle: this.searchDef.title.replace(/^[^:]*:\s*/, ''),
            start: this.parseDateTime(this.startDate, this.startTime),
            stop: this.parseDateTime(this.stopDate, this.stopTime),
            values: Xks.map(this.valueFields, function (e) {
                // an optional field only counts when its checkbox is ticked
                var on = !e.checklist && (!e.enable || e.enable.getValue());
                return { label: e.label, value: on ? e.field.getValue() : '',
                         dir: e.dirField ? e.dirField.getValue() : null };
            })
        };
        Xks.lastValues[this.searchKey] = query;
        this.fireEvent('submitsearch', this, query);
    }
});

/*
 * Build a search tab: the collapsed "Help" panel above the form, as in the
 * Oct 2009 screenshots [CNE22] [CNE23].
 */
Xks.SearchForm.create = function (cfg) {
    var form = new Xks.SearchForm({ searchKey: cfg.searchKey, searchDef: cfg.searchDef });
    return new Ext.Panel({
        id: cfg.id,
        title: cfg.title,
        closable: true,
        autoScroll: true,
        border: false,
        bodyCssClass: 'xks-search-page',
        searchForm: form,
        items: [{
            title: 'Help',
            collapsible: true,
            collapsed: true,
            titleCollapse: true,
            cls: 'xks-search-help',
            bodyStyle: 'padding:6px;font:11px tahoma,arial,sans-serif',
            // help text not visible in any screenshot
            html: 'Fill in the fields you want to search on and click Submit. Blank fields are wildcarded. ' +
                  'See Advanced Features &gt; Search Value Help for operators.'
        }, form]
    });
};

/*
 * Search Value Help - the boolean/wildcard operator table from
 * unofficial-xks-user-guide.pdf p.24 ("Searching - Tips and Tricks").
 */
Xks.SearchForm.showValueHelp = function () {
    var rows = [
        ['!', 'Not Equal Comparison', 'beginning of word (i.e. !joe and !sam)'],
        ['or', 'Logical OR (Search for multiple values)', 'between words (i.e. osama or laden)'],
        ['and', 'Logical AND (Search for combination value matches)', 'between words (ie. *osama* and *laden*) takes precedence over ORs'],
        ['*', 'Multiple Character Wildcard', 'anywhere in word (i.e. *osam*bin*laden)'],
        ['_', 'Single Character Wildcard', 'anywhere in word (i.e. _sam__bin_laden)'],
        ['>', 'Greater Than Comparison', 'beginning of word (i.e. >00080 and <00111)'],
        ['<', 'Less Than Comparison', 'beginning of word (i.e. >00080)'],      // sic
        ['regex:', 'REGEX Expression', '(i.e. to retrieve only numbers: regex:[0-9]*)']
    ];
    new Ext.Window({
        title: 'Search Value Help',
        width: 620,
        height: 280,
        layout: 'fit',
        items: new Ext.grid.GridPanel({
            store: new Ext.data.ArrayStore({ fields: ['op', 'desc', 'usage'], data: rows }),
            columns: [
                { header: 'OPERATOR', dataIndex: 'op', width: 70 },
                { header: 'DESCRIPTION', dataIndex: 'desc', width: 260 },
                { header: 'USAGE', dataIndex: 'usage', width: 260 }
            ],
            stripeRows: true
        })
    }).show();
};
