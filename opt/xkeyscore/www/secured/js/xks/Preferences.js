/*
 * Preferences (2011 top bar, xks-workflows-2011.pdf slide 8). The sysadmin
 * deck calls it MyXKS: "Can edit user settings, disable/enable access to
 * databases, edit a search form search setting, and restore default
 * settings." (xks-system-administration.pdf slide 32). No screenshot
 * exists, so the layout and every setting below are inferred from that
 * sentence:
 *   User Settings         default Datetime range, default Max Results for a Single DB
 *   Databases             databases switched off are not offered in the Request Wizard
 *   Search Form Settings  per-form Datetime range and "Show Hidden Search Fields" on open
 *   Restore Default Settings
 * Settings are kept in this browser (localStorage) when it allows it.
 */
Ext.ns('Xks');

Xks.prefs = (function () {
    var KEY = 'xks.prefs',
        DEFAULTS = { range: '1 Day', maxResults: '', disabledDbs: [], forms: {} },
        values = Ext.decode(Ext.encode(DEFAULTS));

    try {
        Ext.apply(values, Ext.decode(window.localStorage.getItem(KEY) || '{}'));
    } catch (e) {}

    function save() {
        try {
            window.localStorage.setItem(KEY, Ext.encode(values));
        } catch (e) {}
    }

    return {
        get: function (k) { return values[k]; },
        set: function (k, v) { values[k] = v; save(); },

        // the Datetime range a form opens with
        rangeFor: function (searchKey) {
            var f = values.forms[searchKey];
            return (f && f.range) || values.range;
        },
        showHiddenFor: function (searchKey) {
            var f = values.forms[searchKey];
            return !!(f && f.showHidden);
        },
        dbEnabled: function (db) {
            return values.disabledDbs.indexOf(db) === -1;
        },

        restore: function () {
            values = Ext.decode(Ext.encode(DEFAULTS));
            save();
        }
    };
}());

Xks.PreferencesPanel = Ext.extend(Ext.TabPanel, {
    title: 'Preferences',
    closable: true,
    activeTab: 0,
    deferredRender: false,

    initComponent: function () {
        var P = Xks.prefs,
            ranges = Ext.pluck(Xks.SearchForm.prototype.ranges, 0).slice(0, -1),   // not "Custom"
            combo = function (cfg) {
                return new Ext.form.ComboBox(Ext.apply({ width: 120, mode: 'local', triggerAction: 'all',
                                                         editable: false }, cfg));
            },
            searches = [];

        Ext.iterate(Xks.data.searches, function (k, d) {
            if (k !== 'full_log_dni') {
                searches.push([k, d.title.replace(/^[^:]*:\s*/, '')]);
            }
        });
        searches.sort(function (a, b) { return a[1] < b[1] ? -1 : 1; });

        // ---- User Settings
        this.rangeCombo = combo({ fieldLabel: 'Default Datetime', store: ranges });
        this.maxCombo = combo({ fieldLabel: 'Default Max Results for a Single DB',
                                store: ['', '100', '500', '1000', '5000', '10000'] });   // MultiSearch options [UG4]

        // ---- Databases (aliases are groups of sites, not databases)
        this.dbChecks = [];
        Ext.each(Xks.data.workflow.databases, function (d) {
            if (!d.alias) {
                this.dbChecks.push(new Ext.form.Checkbox({
                    hideLabel: true, dbName: d.db,
                    boxLabel: '<b>' + Ext.util.Format.htmlEncode(d.name) + '</b> (' + d.db + ')'
                }));
            }
        }, this);

        // ---- Search Form Settings
        this.formStore = new Ext.data.ArrayStore({ fields: ['key', 'title', 'range', 'showHidden'] });
        this.formCombo = combo({ fieldLabel: 'Search Form', width: 220, valueField: 'key', displayField: 'title',
                                 store: new Ext.data.ArrayStore({ fields: ['key', 'title'], data: searches }),
                                 listeners: { select: this.onFormSelect, scope: this } });
        this.formRange = combo({ fieldLabel: 'Datetime', store: [['', '(Default Datetime)']].concat(
                                     Xks.map(ranges, function (r) { return [r, r]; })) });
        this.formHidden = new Ext.form.Checkbox({ fieldLabel: 'Show Hidden Search Fields' });

        Ext.apply(this, {
            items: [{
                title: 'User Settings', layout: 'form', labelWidth: 210, bodyStyle: 'padding:10px',
                items: [{ xtype: 'displayfield', fieldLabel: 'Username', value: Xks.App.USER },
                        this.rangeCombo, this.maxCombo]
            }, {
                title: 'Databases', layout: 'form', autoScroll: true, bodyStyle: 'padding:10px',
                items: [{ xtype: 'box', cls: 'xks-pref-note',
                          html: 'Databases that are not checked are not offered in the Workflow Request Wizard.' }]
                    .concat(this.dbChecks)
            }, {
                title: 'Search Form Settings', layout: 'border',
                items: [{
                    region: 'north', height: 110, layout: 'form', labelWidth: 170, bodyStyle: 'padding:10px',
                    border: false,
                    items: [this.formCombo, this.formRange, this.formHidden],
                    buttonAlign: 'left',
                    buttons: [{ text: 'Set', handler: this.setFormSetting, scope: this }]
                }, {
                    region: 'center', xtype: 'grid', store: this.formStore,
                    viewConfig: { emptyText: 'Every search form uses the User Settings.', forceFit: true },
                    columns: [
                        { header: 'Search Form', dataIndex: 'title' },
                        { header: 'Datetime', dataIndex: 'range', renderer: function (v) { return v || '(Default Datetime)'; } },
                        { header: 'Show Hidden Search Fields', dataIndex: 'showHidden',
                          renderer: function (v) { return v ? 'yes' : 'no'; } }
                    ]
                }]
            }],
            bbar: [
                { text: 'Save', iconCls: 'xks-icon-download', handler: this.save, scope: this },
                '->',
                { text: 'Restore Default Settings', handler: function () {
                    P.restore();
                    this.load();
                }, scope: this }
            ]
        });
        Xks.PreferencesPanel.superclass.initComponent.call(this);
        this.load();
    },

    // fill the controls from Xks.prefs
    load: function () {
        var P = Xks.prefs, rows = [], forms = P.get('forms');
        this.rangeCombo.setValue(P.get('range'));
        this.maxCombo.setValue(P.get('maxResults'));
        Ext.each(this.dbChecks, function (c) { c.setValue(P.dbEnabled(c.dbName)); });
        Ext.iterate(forms, function (k, f) {
            var d = Xks.data.searches[k];
            if (d) {
                rows.push([k, d.title.replace(/^[^:]*:\s*/, ''), f.range || '', !!f.showHidden]);
            }
        });
        this.formStore.loadData(rows);
        this.formCombo.reset();
        this.formRange.setValue('');
        this.formHidden.setValue(false);
    },

    onFormSelect: function () {
        var f = Xks.prefs.get('forms')[this.formCombo.getValue()] || {};
        this.formRange.setValue(f.range || '');
        this.formHidden.setValue(!!f.showHidden);
    },

    setFormSetting: function () {
        var key = this.formCombo.getValue(), forms = Ext.apply({}, Xks.prefs.get('forms'));
        if (!key) {
            return;
        }
        if (this.formRange.getValue() || this.formHidden.getValue()) {
            forms[key] = { range: this.formRange.getValue(), showHidden: this.formHidden.getValue() };
        } else {
            delete forms[key];
        }
        Xks.prefs.set('forms', forms);
        this.load();
    },

    save: function () {
        var off = [];
        Ext.each(this.dbChecks, function (c) {
            if (!c.getValue()) {
                off.push(c.dbName);
            }
        });
        Xks.prefs.set('range', this.rangeCombo.getValue());
        Xks.prefs.set('maxResults', this.maxCombo.getValue());
        Xks.prefs.set('disabledDbs', off);
        Ext.Msg.alert('Preferences', 'Settings saved. They apply to forms and wizards opened from now on.');
    }
});
