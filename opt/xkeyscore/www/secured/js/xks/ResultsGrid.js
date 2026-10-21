/*
 * Result grids.
 *
 *   Xks.QueryStore         every query submitted (plus a made-up history)
 *   Xks.RecentResultsGrid  "My Recent Results"  (xks-workflows-2011.pdf slide 7)
 *   Xks.QueryHistoryGrid   "My Previous Results" / "My Ongoing Results" (cne-analysis-in-xks.pdf slide 16)
 *   Xks.SessionGrid        rows returned by one query (unofficial-xks-user-guide.pdf p.14)
 *   Xks.showMetadata       session metadata viewer (http-activity-in-xks.pdf slides 5-6)
 */
Ext.ns('Xks');

/*
 * Status values: [CNE16] shows "finished"; "running" is a guess in the same style.
 */
Xks.QueryStore = new Ext.data.JsonStore({
    fields: ['id', 'name', 'searchKey', 'searchTitle', 'status', 'numResults', 'dbsDone', 'dbsTotal',
             { name: 'submitted', type: 'date' }, 'query', 'rows', 'workflowId', 'user', 'archived'],
    sortInfo: { field: 'submitted', direction: 'DESC' }
});

/*
 * Each results tab filters its own copy of Xks.QueryStore (or `master`), so
 * filtering one tab does not filter the others. `keep` picks the records the
 * tab lists. Copies share the record id with the master record.
 */
Xks.mirrorStore = function (keep, master) {
    master = master || Xks.QueryStore;
    var store = new Ext.data.Store({
            reader: new Ext.data.JsonReader({}, master.recordType),
            sortInfo: master.sortInfo
        }),
        find = function (id) { return (store.snapshot || store.data).key(id); },
        sync = function (r) {
            var mine = find(r.id);
            if (mine && keep(r)) {
                Ext.apply(mine.data, r.data);
                mine.commit();
            } else if (mine) {
                store.remove(mine);
            } else if (keep(r)) {
                store.insert(0, new store.recordType(Ext.apply({}, r.data), r.id));
            }
        },
        listeners = {
            add: function (s, recs) { Ext.each(recs, sync); },
            update: function (s, r) { sync(r); },
            remove: function (s, r) { var mine = find(r.id); if (mine) { store.remove(mine); } }
        };
    master.each(function (r) {
        if (keep(r)) {
            store.add(new store.recordType(Ext.apply({}, r.data), r.id));
        }
    });
    store.applySort();
    master.on(listeners);
    store.unbindMaster = function () { master.un('add', listeners.add); master.un('update', listeners.update);
                                       master.un('remove', listeners.remove); };
    return store;
};

// the Xks.QueryStore record behind a tab's copy
Xks.masterQuery = function (rec) {
    return Xks.QueryStore.getById(rec.id) || rec;
};

/*
 * The query as the GUI's "Query Text", [CNE16]:
 *   WHERE datetime >= '2009-09-13 00:00:00' AND datetime <= '...' AND ( ext_extension = 'ppt' ) AND ...
 * Field names come from Xks.workflow.xmlName. A From/To/Either field becomes
 * fm_/to_ ("fm_ip" per xks-workflows-2011.pdf slide 20); Either ORs both.
 */
Xks.queryText = function (q) {
    var quote = function (v) { return '\'' + String(v).replace(/'/g, '\'\'') + '\''; },
        name = function (label) { return Xks.workflow.xmlName(label); },
        parts = ['datetime >= ' + quote(q.start.format('Y-m-d H:i:s')),
                 'datetime <= ' + quote(q.stop.format('Y-m-d H:i:s'))];
    Ext.each(q.values, function (v) {
        if (v.value === '' || v.value === null || v.value === undefined || v.value === false) {
            return;
        }
        if (v.dir === 'Either') {
            parts.push('( ' + name('From ' + v.label) + ' = ' + quote(v.value) + ' OR ' +
                       name('To ' + v.label) + ' = ' + quote(v.value) + ' )');
        } else {
            parts.push('( ' + name(v.dir ? v.dir + ' ' + v.label : v.label) + ' = ' + quote(v.value) + ' )');
        }
    });
    return 'WHERE ' + parts.join(' AND ');
};

/*
 * "Result Grid Row Actions" of slide 7, acting on the master record so every
 * results tab sees the change.
 */
Xks.queryRowActions = function (row) {
    var rec = Xks.masterQuery(row);
    return [
        { text: 'View Metadata', iconCls: 'xks-icon-table', handler: function () { Xks.App.openResults(rec); } },
        { text: 'View Metadata (New Window)', iconCls: 'xks-icon-table-go', handler: function () { Xks.App.openResults(rec, true); } },
        { text: 'Delete Row', iconCls: 'xks-icon-delete', handler: function () { Xks.QueryStore.remove(rec); } },
        { text: 'Rename Query', iconCls: 'xks-icon-rename', handler: function () {
            Ext.Msg.prompt('Rename Query', 'New name:', function (btn, text) {
                if (btn === 'ok' && text) {
                    rec.set('name', text);
                    rec.commit();
                }
            }, this, false, rec.get('name'));
        } },
        { text: 'Share Results..', iconCls: 'xks-icon-share', handler: function () {
            Ext.Msg.prompt('Share Results', 'Share with user(s):', Ext.emptyFn);
        } },
        { text: 'Repopulate this Search into Form', iconCls: 'xks-icon-search', handler: function () {
            Xks.App.repopulate(rec.get('query'));
        } },
        { text: 'Create Workflow from this Search', iconCls: 'xks-icon-workflow', handler: function () {
            new Xks.WorkflowWizard({ values: Xks.workflow.fromQuery(rec.get('query')) }).show();
        } },
        { text: 'Split Both Sides of Traffic', iconCls: 'xks-icon-split', disabled: true },
        // moves the query to My Archived Results [CNE12]
        { text: 'Archive Results', iconCls: 'xks-icon-archive', disabled: rec.get('archived') || rec.get('status') !== 'finished',
          handler: function () {
            rec.set('archived', true);
            rec.commit();
        } }
    ];
};

// submitted in the last 24 hours and not archived (inferred meaning of "Recent")
Xks.isRecent = function (r) {
    return !r.get('archived') && new Date().getTime() - r.get('submitted').getTime() < 86400000;
};

// the "All ..." views add whose query it was (inferred)
Xks.userColumn = { header: 'User', dataIndex: 'user', width: 90, sortable: true };

/*
 * Build a cell context menu shared by both grids:
 * "Result Grid Row Actions" / "Result Grid Cell Actions" headings as on slide 7.
 */
Xks.cellMenu = function (grid, rowIndex, colIndex, e, rowItems) {
    var rec = grid.getStore().getAt(rowIndex),
        col = grid.getColumnModel().getColumnAt(colIndex),
        value = rec.get(col.dataIndex),
        text = Ext.isDate(value) ? value.format('Y-m-d H:i:s') :
               col.dataIndex === 'query' && value ? Xks.queryText(value) : String(value === undefined ? '' : value),
        shortText = Ext.util.Format.ellipsis(text, 20),
        items = [{ xtype: 'menutextitem', text: 'Result Grid Row Actions', cls: 'xks-menu-heading' }].concat(rowItems);

    if (col.dataIndex && col.header) {
        items.push(
            { xtype: 'menutextitem', text: 'Result Grid Cell Actions', cls: 'xks-menu-heading' },
            {
                text: '<b>Filter:</b> ' + col.header + ' <b>Equal</b> \'' + Ext.util.Format.htmlEncode(shortText) + '\'',
                iconCls: 'xks-icon-filter',
                handler: function () { grid.addFilter(col, value, true); }
            },
            {
                text: '<b>Filter:</b> ' + col.header + ' <b>Not Equal to</b> \'' + Ext.util.Format.htmlEncode(shortText) + '\'',
                iconCls: 'xks-icon-filter',
                handler: function () { grid.addFilter(col, value, false); }
            },
            '-',
            {
                text: 'Show Full Cell Value',
                iconCls: 'xks-icon-cell',
                handler: function () { Ext.Msg.alert(col.header, Ext.util.Format.htmlEncode(text)); }
            }
        );
    }
    grid.getSelectionModel().selectRow(rowIndex);
    e.stopEvent();
    new Ext.menu.Menu({ items: items }).showAt(e.getXY());
};

/*
 * Behaviour shared by both grids: cell filters and a "Clear Filters" action.
 */
Xks.FilterableGrid = Ext.extend(Ext.grid.GridPanel, {
    // rows are added while the tab is still being laid out; Ext 3.4's
    // deferred row render would drop them
    deferRowRender: false,

    initComponent: function () {
        Xks.FilterableGrid.superclass.initComponent.call(this);
        // rows a mirrored store adds later still go through the filters
        this.store.on('add', function () {
            if ((this.filters || []).length || this.groupBy || this.pageSize) {
                this.applyFilters();
            }
        }, this);
        if (this.store.unbindMaster) {
            this.on('destroy', this.store.unbindMaster);
        }
    },

    /*
     * Filters are { dataIndex, value, equal } (Filter Equal / Not Equal to),
     * { dataIndex, values } (any of a set, used by histograms and pivots;
     * `source` says which tool added it) or { dataIndex, contains }.
     * `groupBy` keeps the first row of each value ("Group By" to dedupe,
     * using-xks-to-enable-tao.pdf slide 29); `pageSize` pages what is left.
     */
    addFilter: function (col, value, equal) {
        this.filters = this.filters || [];
        this.filters.push({ dataIndex: col.dataIndex, value: value, equal: equal });
        this.applyFilters();
    },
    setFilter: function (f) {
        this.filters = Ext.partition(this.filters || [], function (x) {
            return x.source && x.source === f.source;
        })[1];
        if (f.values ? f.values.length : true) {
            this.filters.push(f);
        }
        this.applyFilters();
    },
    removeFilters: function (source) {
        this.filters = Ext.partition(this.filters || [], function (x) { return x.source === source; })[1];
        this.applyFilters();
    },
    clearFilters: function () {
        this.filters = [];
        this.groupBy = null;
        this.applyFilters();
    },
    matches: function (rec) {
        var filters = this.filters || [], i, f, v, same;
        for (i = 0; i < filters.length; i++) {
            f = filters[i];
            v = rec.get(f.dataIndex);
            if (f.values) {
                same = f.values.indexOf(String(v)) !== -1;
                if (!same) {
                    return false;
                }
            } else if (f.contains !== undefined) {
                if (String(v).toLowerCase().indexOf(f.contains.toLowerCase()) === -1) {
                    return false;
                }
            } else {
                same = Ext.isDate(v) ? v.getTime() === f.value.getTime() : v === f.value;
                if (same !== f.equal) {
                    return false;
                }
            }
        }
        return true;
    },
    // every record that passes the filters, ignoring paging
    matching: function () {
        var out = [], seen = {}, g = this.groupBy, store = this.getStore();
        (store.snapshot || store.data).each(function (rec) {
            if (this.matches(rec)) {
                if (g) {
                    if (seen.hasOwnProperty(rec.get(g))) {
                        return;
                    }
                    seen[rec.get(g)] = true;
                }
                out.push(rec);
            }
        }, this);
        return out;
    },
    applyFilters: function () {
        var keep = {}, size = this.pageSize, page = this.page || 0, recs;
        if (!(this.filters || []).length && !this.groupBy && !size) {
            this.getStore().clearFilter();
            this.fireEvent('filterschange', this, this.getStore().getCount());
            return;
        }
        recs = this.matching();
        this.matchCount = recs.length;
        if (size && page * size >= recs.length) {
            this.page = page = Math.max(0, Math.ceil(recs.length / size) - 1);
        }
        Ext.each(size ? recs.slice(page * size, (page + 1) * size) : recs, function (r) { keep[r.id] = true; });
        this.getStore().filterBy(function (rec) { return keep[rec.id] === true; });
        this.fireEvent('filterschange', this, recs.length);
    }
});

Xks.RecentResultsGrid = Ext.extend(Xks.FilterableGrid, {
    title: 'My Recent Results',
    closable: true,
    stripeRows: true,
    loadMask: true,

    initComponent: function () {
        var sm = new Ext.grid.CheckboxSelectionModel();

        Ext.apply(this, {
            // "recent" taken as the last 24 hours (inferred); older queries are
            // under My Previous Results. All Recent Results passes its own keep.
            store: Xks.mirrorStore(this.keep || function (r) {
                return r.get('user') === Xks.App.USER && Xks.isRecent(r);
            }),
            sm: sm,
            columns: [
                sm,
                { header: 'Query Name', dataIndex: 'name', width: 260, sortable: true,
                  renderer: function (v) { return '<span class="xks-link">' + Ext.util.Format.htmlEncode(v) + '</span>'; } },
                { header: 'Search Type', dataIndex: 'searchTitle', width: 150, sortable: true },
                { header: 'Status', dataIndex: 'status', width: 70, sortable: true },
                { header: 'Num Results', dataIndex: 'numResults', width: 80, sortable: true },
                { header: 'Num DBs', dataIndex: 'dbsDone', width: 70,
                  renderer: function (v, m, r) { return v + ' of ' + r.get('dbsTotal'); } },
                { header: 'Datetime Submitted', dataIndex: 'submitted', width: 130, sortable: true,
                  renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') },
                { header: 'Query ID', dataIndex: 'id', width: 130, sortable: true }
            ].concat(this.showUser ? [Xks.userColumn] : []),
            viewConfig: {
                emptyText: 'No results. Run a search from the Navigation Menu.',
                getRowClass: function (r) { return r.get('status') === 'running' ? 'xks-row-running' : ''; }
            },
            tbar: [
                { text: 'Help', iconCls: 'xks-icon-help', handler: function () {
                    Ext.Msg.alert('Help', 'Click a query name to open its results. Right click a row for more actions.');
                } },
                '-',
                { text: 'Actions', menu: [
                    { text: 'Delete Selected Rows', iconCls: 'xks-icon-delete', handler: this.deleteSelected, scope: this },
                    { text: 'Clear Filters', iconCls: 'xks-icon-filter', handler: this.clearFilters, scope: this }
                ] },
                { text: 'View', menu: [
                    { text: 'Refresh', handler: function () { this.getView().refresh(); }, scope: this }
                ] }
            ]
        });

        Xks.RecentResultsGrid.superclass.initComponent.call(this);

        this.on('cellclick', function (g, row, col) {
            if (this.getColumnModel().getDataIndex(col) === 'name') {
                Xks.App.openResults(this.store.getAt(row));
            }
        }, this);
        this.on('cellcontextmenu', function (g, row, col, e) {
            Xks.cellMenu(this, row, col, e, Xks.queryRowActions(this.store.getAt(row)));
        }, this);
    },

    deleteSelected: function () {
        Ext.each(this.getSelectionModel().getSelections(), function (r) {
            Xks.QueryStore.remove(Xks.masterQuery(r));
        });
    }
});

/*
 * "My Previous Results" and "My Ongoing Results". Layout from [CNE16], the
 * Oct 2009 "All Previous Results" tab (no 2011 screenshot):
 *   Help  Actions v  View v  FILTERS:
 *   Query Text | Actions | Status | Query Type | Num DBs | Datetime Submitted
 * and a closable "Query Text" panel below the grid with the full WHERE clause
 * of each row. Columns past Datetime Submitted are off the slide; Query Name
 * is added there (inferred). The three Actions icons are a red X, a page with
 * a pencil and a database; delete / repopulate / open results is a guess.
 * Ongoing uses the same layout (inferred): queries still running and those
 * started by a standing workflow.
 *
 * Config: keep(record) - which queries to list
 */
Xks.QueryHistoryGrid = Ext.extend(Xks.FilterableGrid, {
    stripeRows: true,
    region: 'center',
    border: false,

    initComponent: function () {
        var enc = Ext.util.Format.htmlEncode,
            icon = function (cls, file, tip) {
                return '<img class="xks-qh-act ' + cls + '" src="../html/icons/silk/' + file + '" ext:qtip="' + tip + '">';
            };

        this.filtersBtn = new Ext.Button({
            text: 'FILTERS:', cls: 'xks-filters-btn', iconCls: 'xks-icon-filter',
            menu: new Ext.menu.Menu({ listeners: { beforeshow: this.buildFiltersMenu, scope: this } })
        });

        Ext.apply(this, {
            store: Xks.mirrorStore(this.keep),
            columns: [
                { header: 'Query Text', dataIndex: 'query', width: 360,
                  renderer: function (q) { return enc(Xks.queryText(q)); } },
                { header: 'Actions', width: 70, menuDisabled: true, renderer: function () {
                    return icon('xks-qh-delete', 'cross.png', 'Delete') +
                           icon('xks-qh-edit', 'page_edit.png', 'Repopulate this Search into Form') +
                           icon('xks-qh-open', 'database.png', 'View Results');
                } },
                { header: 'Status', dataIndex: 'status', width: 60, sortable: true },
                { header: 'Query Type', dataIndex: 'searchKey', width: 130, sortable: true },
                { header: 'Num DBs', dataIndex: 'dbsDone', width: 60,
                  renderer: function (v, m, r) { return v + ' of ' + r.get('dbsTotal'); } },
                { header: 'Datetime Submitted', dataIndex: 'submitted', width: 130, sortable: true,
                  renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') },
                { header: 'Query Name', dataIndex: 'name', width: 200, sortable: true,
                  renderer: function (v) { return '<span class="xks-link">' + enc(v) + '</span>'; } }
            ].concat(this.showUser ? [Xks.userColumn] : []),
            viewConfig: {
                emptyText: this.emptyText,
                getRowClass: function (r) { return r.get('status') === 'running' ? 'xks-row-running' : ''; }
            },
            tbar: [
                { text: 'Help', iconCls: 'xks-icon-help', handler: function () {
                    Ext.Msg.alert('Help', 'Click the database icon or the query name to open the results. ' +
                                  'Select rows to see their full query text below.');
                } },
                { text: 'Actions', menu: [
                    { text: 'Delete Selected Rows', iconCls: 'xks-icon-delete', handler: this.deleteSelected, scope: this },
                    { text: 'Clear Filters', iconCls: 'xks-icon-filter', handler: this.clearFilters, scope: this }
                ] },
                { text: 'View', menu: [
                    { text: 'Refresh', handler: function () { this.getView().refresh(); }, scope: this },
                    { text: 'Show Query Text', handler: function () { this.fireEvent('showquerytext', this); }, scope: this }
                ] },
                this.filtersBtn
            ]
        });

        Xks.QueryHistoryGrid.superclass.initComponent.call(this);
        this.addEvents('showquerytext');

        this.on('cellclick', function (g, row, col, e) {
            var rec = Xks.masterQuery(this.store.getAt(row)), me = this;
            if (e.getTarget('.xks-qh-delete')) {
                Ext.Msg.confirm(this.title, 'Delete ' + enc(rec.get('name')) + '?', function (b) {
                    if (b === 'yes') {
                        Xks.QueryStore.remove(rec);
                    }
                });
            } else if (e.getTarget('.xks-qh-edit')) {
                Xks.App.repopulate(rec.get('query'));
            } else if (e.getTarget('.xks-qh-open') || this.getColumnModel().getDataIndex(col) === 'name') {
                Xks.App.openResults(rec);
            }
        }, this);
        this.on('cellcontextmenu', function (g, row, col, e) {
            Xks.cellMenu(this, row, col, e, Xks.queryRowActions(this.store.getAt(row)));
        }, this);
        this.on('filterschange', this.updateFiltersBtn, this);
    },

    // FILTERS: lists the filters in force; the count shows on the button (inferred)
    buildFiltersMenu: function (menu) {
        var cm = this.getColumnModel(), items = [];
        menu.removeAll();
        Ext.each(this.filters || [], function (f) {
            var i = cm.findColumnIndex(f.dataIndex),
                name = i === -1 ? f.dataIndex : cm.getColumnHeader(i),
                v = f.values ? ' in (' + f.values.join(', ') + ')' :
                    f.contains !== undefined ? ' contains ' + f.contains :
                    (f.equal ? ' = ' : ' != ') + (Ext.isDate(f.value) ? f.value.format('Y-m-d H:i:s') :
                     f.dataIndex === 'query' ? Xks.queryText(f.value) : String(f.value));
            items.push({ text: Ext.util.Format.htmlEncode(Ext.util.Format.ellipsis(name + v, 60)), disabled: true });
        });
        if (!items.length) {
            items.push({ text: 'No filters', disabled: true });
        }
        items.push('-', { text: 'Clear Filters', iconCls: 'xks-icon-filter', handler: this.clearFilters, scope: this });
        menu.add(items);
    },

    updateFiltersBtn: function () {
        var n = (this.filters || []).length;
        this.filtersBtn.setText('FILTERS:' + (n ? ' (' + n + ')' : ''));
    },

    deleteSelected: Xks.RecentResultsGrid.prototype.deleteSelected
});

// the tab: grid plus the "Query Text" panel of [CNE16]
Xks.queryHistoryTab = function (cfg) {
    var grid = new Xks.QueryHistoryGrid({ title: undefined, keep: cfg.keep, emptyText: cfg.emptyText, showUser: cfg.showUser }),
        text = new Ext.Panel({
            region: 'south', title: 'Query Text', height: 120, split: true, autoScroll: true,
            cls: 'xks-qh-text', bodyCssClass: 'xks-qh-text-body',
            tools: [{ id: 'close', handler: function () { text.hide(); text.ownerCt.doLayout(); } }]
        }),
        tab = new Ext.Panel({ id: cfg.id, title: cfg.title, closable: true, layout: 'border', items: [grid, text] }),
        update = function () {
            var recs = grid.getSelectionModel().getSelections();
            if (!recs.length) {
                recs = grid.store.getRange();
            }
            if (text.body) {
                text.body.update(Xks.map(recs, function (r) {
                    return '<div>' + Ext.util.Format.htmlEncode(Xks.queryText(r.get('query'))) + '</div>';
                }).join(''));
            }
        };
    grid.getSelectionModel().on('selectionchange', update);
    grid.store.on('datachanged', update);
    grid.store.on('add', update);
    grid.store.on('remove', update);
    text.on('afterrender', update);
    grid.on('showquerytext', function () { text.show(); tab.doLayout(); update(); });
    tab.grid = grid;
    return tab;
};

Xks.SessionGrid = Ext.extend(Xks.FilterableGrid, {
    closable: true,
    stripeRows: true,
    columnLines: true,
    // the header menu is XKS's own (ResultsMenu.js); Show/Hide... replaces Ext's Columns item
    enableColumnHide: false,

    initComponent: function () {
        var rec = this.queryRecord,
            def = Xks.data.getSearch(rec.get('searchKey'), rec.get('searchTitle')),
            names = (def.results || []).concat(Xks.data.commonResultColumns),
            fields = ['id', { name: 'datetime', type: 'date' }, { name: 'datetimeEnd', type: 'date' }],
            sm = new Ext.grid.CheckboxSelectionModel(),
            dateR = Ext.util.Format.dateRenderer('Y-m-d H:i:s'),
            columns = [
                new Ext.grid.RowNumberer(),
                sm,
                { header: 'State', width: 40, dataIndex: '', menuDisabled: true,
                  renderer: function () { return '<div class="xks-state xks-icon-session"></div>'; } },
                { header: 'ID', dataIndex: 'id', width: 40, sortable: true,
                  renderer: function (v) { return '<span class="xks-link">' + v + '</span>'; } },
                { header: 'Datetime', dataIndex: 'datetime', width: 125, sortable: true, renderer: dateR },
                { header: 'Datetime End', dataIndex: 'datetimeEnd', width: 125, sortable: true, renderer: dateR }
            ];

        Ext.each(names, function (n, i) {
            fields.push('c' + i);
            columns.push({ header: Ext.util.Format.htmlEncode(n), dataIndex: 'c' + i, sortable: true,
                           width: /browser|referer|url args/i.test(n) ? 220 : 110 });
        });
        this.columnNames = names;

        Ext.apply(this, {
            title: Ext.util.Format.htmlEncode(rec.get('name')),
            store: new Ext.data.JsonStore({ fields: fields, data: rec.get('rows') || [] }),
            sm: sm,
            columns: columns,
            viewConfig: { emptyText: 'No sessions matched this query.' },
            tbar: [
                { text: 'Help', iconCls: 'xks-icon-help', handler: function () {
                    Ext.Msg.alert('Help', 'Double click a row (or click its ID) to view the session metadata.');
                } },
                { text: 'Actions', menu: [
                    { text: 'View Metadata', iconCls: 'xks-icon-table', handler: this.viewSelected, scope: this },
                    { text: 'Clear Filters', iconCls: 'xks-icon-filter', handler: this.clearFilters, scope: this }
                ] },
                { text: 'Reports', menu: [
                    { text: 'Export to CSV', iconCls: 'xks-icon-download', handler: this.exportCsv, scope: this }
                ] },
                { text: 'View', menu: [
                    { text: 'Auto Size Columns', handler: function () { this.getView().fitColumns(); }, scope: this }
                ] }
            ]
        });

        Xks.SessionGrid.superclass.initComponent.call(this);
        this.on('viewready', function () { Xks.columnMenu.install(this); }, this);

        this.on('rowdblclick', function (g, row) { Xks.showSession(this, this.store.getAt(row)); }, this);
        this.on('cellclick', function (g, row, col, e) {
            if (this.getColumnModel().getDataIndex(col) === 'id') {
                Xks.showMetadata(this, this.store.getAt(row));
            } else if (e.getTarget('.xks-icon-session')) {
                Xks.showSession(this, this.store.getAt(row));
            }
        }, this);
        this.on('cellcontextmenu', function (g, row, col, e) {
            var r = this.store.getAt(row), grid = this;
            Xks.cellMenu(this, row, col, e, [
                { text: 'View Session', iconCls: 'xks-icon-session', handler: function () { Xks.showSession(grid, r); } },
                { text: 'View Metadata', iconCls: 'xks-icon-table', handler: function () { Xks.showMetadata(grid, r); } },
                { text: 'Delete Row', iconCls: 'xks-icon-delete', handler: function () { grid.store.remove(r); } }
            ]);
        }, this);
    },

    viewSelected: function () {
        var r = this.getSelectionModel().getSelected();
        if (r) {
            Xks.showMetadata(this, r);
        }
    },

    exportCsv: function () {
        var names = ['ID', 'Datetime', 'Datetime End'].concat(this.columnNames),
            lines = [names.join(',')];
        this.store.each(function (r) {
            var vals = [r.get('id'), r.get('datetime').format('Y-m-d H:i:s'), r.get('datetimeEnd').format('Y-m-d H:i:s')];
            Ext.each(this.columnNames, function (n, i) { vals.push(r.get('c' + i)); });
            lines.push(Xks.map(vals, function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','));
        }, this);
        new Ext.Window({
            title: 'Export to CSV', width: 700, height: 400, layout: 'fit',
            items: { xtype: 'textarea', value: lines.join('\n'), style: 'font-family:courier new,monospace' }
        }).show();
    }
});

/*
 * Session metadata viewer. Tabs follow http-activity-in-xks.pdf slide 5:
 * "DNI Display | Raw Data | DNI Format".
 */
Xks.showMetadata = function (grid, rec) {
    var props = { 'ID': rec.get('id'),
                  'Datetime': rec.get('datetime').format('Y-m-d H:i:s'),
                  'Datetime End': rec.get('datetimeEnd').format('Y-m-d H:i:s') },
        raw;

    Ext.each(grid.columnNames, function (n, i) {
        props[n] = rec.get('c' + i);
    });

    if (props['HTTP Type'] === 'get' || props['HTTP Type'] === 'post') {
        raw = [
            props['HTTP Type'].toUpperCase() + ' ' + props['URL Path'] + (props['URL Args'] ? '?' + props['URL Args'] : '') + ' HTTP/1.1',
            'Accept: image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, */*',
            'Referer: ' + props['Referer'],
            'Accept-Language: ' + props['Language'],
            'User-Agent: ' + props['Browser'],
            'Host: ' + props['Host'],
            'Via: ' + props['Via'],
            'Connection: keep-alive'
        ].join('\n');
    } else {
        raw = [];
        Ext.iterate(props, function (k, v) { raw.push(k + ': ' + v); });
        raw = raw.join('\n');
    }

    new Ext.Window({
        title: 'Session ' + rec.get('id') + ' - ' + Ext.util.Format.htmlEncode(grid.title),
        width: 640,
        height: 420,
        layout: 'fit',
        maximizable: true,
        items: {
            xtype: 'tabpanel',
            activeTab: 0,
            items: [
                { title: 'DNI Display', xtype: 'propertygrid', source: props,
                  listeners: { beforeedit: function () { return false; } } },
                { title: 'Raw Data', autoScroll: true,
                  html: '<div class="xks-raw">' + Ext.util.Format.htmlEncode(raw) + '</div>' },
                { title: 'DNI Format', autoScroll: true,
                  html: '<div class="xks-raw">' + Ext.util.Format.htmlEncode(Ext.encode(props)) + '</div>' }
            ]
        }
    }).show();
};
