/*
 * Column header menu of a query's results grid.
 *
 * The items and their order are from using-xks-to-enable-tao.pdf slide 29
 * and cne-analysis-in-xks.pdf slide 11:
 *   Sort Ascending, Sort Descending | Filters > | Color By, Group By > |
 *   Histogram >, Pivot Data >, Histogram Grid > | Show/Hide..., AutoFit Column Width
 * Slide 29's note: "If you have thousands of results, try to 'Group By' to
 * 'dedupe' results". What each item does beyond that, and the contents of
 * the submenus, are not shown and are inferred. Histogram, Pivot Data and
 * Histogram Grid are listed but only say they have not been reconstructed.
 */
Ext.ns('Xks');

Xks.columnMenu = {
    // pastel row colours for Color By (inferred)
    COLORS: 8,

    install: function (grid) {
        var view = grid.getView(),
            menu = view.hmenu,
            col = function () { return grid.getColumnModel().getColumnAt(view.hdCtxIndex); },
            filterField = new Ext.form.TextField({
                width: 160,
                emptyText: 'Contains...',
                enableKeyEvents: true,
                listeners: {
                    keyup: { buffer: 300, fn: function (f) {
                        var c = col(), source = 'contains:' + c.dataIndex, v = f.getValue();
                        if (v) {
                            grid.setFilter({ source: source, dataIndex: c.dataIndex, contains: v });
                        } else {
                            grid.removeFilters(source);
                        }
                    } }
                }
            }),
            filtersMenu = new Ext.menu.Menu({
                items: [filterField],
                listeners: {
                    beforeshow: function () {
                        var f = Ext.each(grid.filters || [], function (x) {
                            return x.source !== 'contains:' + col().dataIndex;
                        });
                        filterField.setValue(f === undefined ? '' : grid.filters[f].contains);
                    },
                    show: function () { filterField.focus(true, 50); }
                }
            });

        menu.add('-', {
            text: 'Filters', iconCls: 'xks-icon-filter', hideOnClick: false, menu: filtersMenu
        }, '-', {
            text: 'Color By', iconCls: 'xks-icon-color', handler: function () {
                Xks.columnMenu.colorBy(grid, col().dataIndex);
            }
        }, {
            text: 'Group By', iconCls: 'xks-icon-group', hideOnClick: false, menu: [{
                text: 'Group By This Field', handler: function () {
                    grid.groupBy = col().dataIndex;
                    grid.applyFilters();
                }
            }, {
                text: 'Show All Rows', handler: function () {
                    grid.groupBy = null;
                    grid.applyFilters();
                }
            }]
        });
        menu.add('-');
        // in the menu as on slide 29, but not reconstructed
        Ext.each([['Histogram', 'xks-icon-chart'], ['Pivot Data', 'xks-icon-pivot'],
                  ['Histogram Grid', 'xks-icon-table']], function (t) {
            menu.add({ text: t[0], iconCls: t[1], handler: function () {
                Ext.Msg.alert(t[0], '<i>' + t[0] + '</i> has not been reconstructed yet.');
            } });
        });
        menu.add('-', {
            text: 'Show/Hide...', iconCls: 'xks-icon-columns', handler: function () {
                Xks.columnMenu.showHide(grid);
            }
        }, {
            text: 'AutoFit Column Width', iconCls: 'xks-icon-autofit', handler: function () {
                Xks.columnMenu.autoFit(grid, view.hdCtxIndex);
            }
        });

        // Color By paints each distinct value of the column in its own colour
        view.getRowClass = function (rec) {
            var c = grid.colorColumn;
            return c ? 'xks-colorby-' + grid.colorIndex[String(rec.get(c))] : '';
        };
        grid.on('filterschange', function () {
            if (grid.colorColumn) {
                Xks.columnMenu.colorBy(grid, grid.colorColumn, true);
            }
        });
    },

    // choosing the same column again turns colouring off (inferred)
    colorBy: function (grid, dataIndex, keep) {
        var index = {}, n = 0;
        if (!keep && grid.colorColumn === dataIndex) {
            grid.colorColumn = null;
        } else {
            grid.getStore().each(function (r) {
                var v = String(r.get(dataIndex));
                if (!index.hasOwnProperty(v)) {
                    index[v] = n++ % Xks.columnMenu.COLORS;
                }
            });
            grid.colorColumn = dataIndex;
            grid.colorIndex = index;
        }
        grid.getView().refresh();
    },

    showHide: function (grid) {
        var cm = grid.getColumnModel(), boxes = [];
        Ext.each(cm.config, function (c, i) {
            if (c.dataIndex && c.header) {
                boxes.push({ xtype: 'checkbox', boxLabel: c.header, checked: !c.hidden, colIndex: i,
                             handler: function (cb, on) { cm.setHidden(cb.colIndex, !on); } });
            }
        });
        new Ext.Window({
            title: 'Show/Hide Columns', width: 260, height: 360, autoScroll: true, modal: true,
            bodyStyle: 'padding:6px;background:#fff', items: boxes,
            buttons: [{ text: 'Close', handler: function () { this.ownerCt.ownerCt.close(); } }]
        }).show();
    },

    // widest of the header and the rows on this page, plus room for padding
    autoFit: function (grid, i) {
        var view = grid.getView(), cm = grid.getColumnModel(),
            tm = Ext.util.TextMetrics.createInstance(view.getHeaderCell(i)),
            w = tm.getWidth(cm.getColumnHeader(i)) + 30;
        Ext.each(view.getRows(), function (row, r) {
            var cell = view.getCell(r, i);
            w = Math.max(w, tm.getWidth(cell.textContent || cell.innerText || '') + 16);
        });
        cm.setColumnWidth(i, Math.min(w, 600));
    }
};
