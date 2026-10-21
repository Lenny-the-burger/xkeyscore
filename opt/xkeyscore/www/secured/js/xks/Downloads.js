/*
 * "My Downloads". The tree names it (xks-workflows-2011.pdf slide 8) but no
 * screenshot shows it, so the whole layout is inferred. Downloads come from:
 *   - the session viewer's "Send to: Download Session" (cne-analysis-in-xks.pdf slide 25)
 *   - the "Download Sessions" follow-on action of a workflow (xks-workflows-2011.pdf
 *     slides 14 and 17: User ID, Email To, Filename, ROWR, GZIP, Send To Agility ...)
 *
 * Columns: Filename | Query Name | Sessions | Size | Destination | Status | Datetime Requested
 * "All Downloads" (Oct 2009 tree, cne-analysis-in-xks.pdf slide 12) is the
 * same grid over every user's downloads, with a User column.
 */
Ext.ns('Xks');

Xks.DownloadStore = new Ext.data.JsonStore({
    fields: ['filename', 'queryName', 'sessions', 'size', 'destination', 'status',
             { name: 'requested', type: 'date' }, 'text', 'user'],
    sortInfo: { field: 'requested', direction: 'DESC' }
});

Xks.downloads = {
    add: function (cfg) {
        Xks.DownloadStore.insert(0, new Xks.DownloadStore.recordType({
            filename: cfg.filename,
            queryName: cfg.queryName,
            sessions: cfg.sessions,
            size: cfg.text.length,
            destination: cfg.destination || 'Local',
            // Agility pulls its copy itself; "sent" is a guess
            status: cfg.destination === 'Agility' ? 'sent' : 'ready',
            requested: cfg.requested || new Date(),
            text: cfg.text,
            user: cfg.user || Xks.App.USER
        }));
    },

    // give the browser the file
    save: function (filename, text) {
        var url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
            a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    // every session a query returned, as the session viewer would save each one
    sessionsText: function (queryRec) {
        var grid = new Xks.SessionGrid({ queryRecord: queryRec }),
            viewer = { grid: grid, searchKey: queryRec.get('searchKey'), col: Xks.SessionViewer.prototype.col },
            out = [];
        grid.store.each(function (r) {
            out.push('===== Session ' + r.get('id') + ' =====\r\n' +
                     Xks.SessionViewer.rawText(Xks.SessionViewer.build(viewer, r)));
        });
        grid.destroy();
        return out.join('\r\n\r\n');
    },

    // run the workflow's "Download Sessions" actions once its query has finished
    fromWorkflow: function (queryRec) {
        var i = Xks.workflowStore.findExact('id', queryRec.get('workflowId')),
            wf = i === -1 ? null : Xks.workflowStore.getAt(i);
        Ext.each(wf ? wf.get('actions') : [], function (a) {
            var args = a.args || {}, name;
            if (a.script !== 'Download Sessions' || (args.ROWR && !queryRec.get('numResults'))) {
                return;
            }
            name = (args.Filename || queryRec.get('name')).replace(/[^\w.\-]+/g, '_');
            // GZIP is not applied: the file is saved as plain text
            this.add({
                filename: /\.\w+$/.test(name) ? name : name + '.txt',
                queryName: queryRec.get('name'),
                sessions: queryRec.get('numResults'),
                destination: args['Send To Agility'] ? 'Agility' : 'Local',
                text: this.sessionsText(queryRec)
            });
        }, this);
    }
};

Xks.DownloadsGrid = Ext.extend(Ext.grid.GridPanel, {
    title: 'My Downloads',
    closable: true,
    stripeRows: true,
    deferRowRender: false,

    initComponent: function () {
        var sm = new Ext.grid.CheckboxSelectionModel(),
            enc = Ext.util.Format.htmlEncode;

        Ext.apply(this, {
            store: Xks.mirrorStore(this.keep || function (r) { return r.get('user') === Xks.App.USER; },
                                   Xks.DownloadStore),
            sm: sm,
            columns: [
                sm,
                { header: 'Filename', dataIndex: 'filename', width: 200, sortable: true,
                  renderer: function (v) { return '<span class="xks-link">' + enc(v) + '</span>'; } },
                { header: 'Query Name', dataIndex: 'queryName', width: 180, sortable: true, renderer: enc },
                { header: 'Sessions', dataIndex: 'sessions', width: 60, sortable: true },
                { header: 'Size', dataIndex: 'size', width: 70, sortable: true, renderer: Ext.util.Format.fileSize },
                { header: 'Destination', dataIndex: 'destination', width: 80, sortable: true },
                { header: 'Status', dataIndex: 'status', width: 60, sortable: true },
                { header: 'Datetime Requested', dataIndex: 'requested', width: 130, sortable: true,
                  renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') },
                { header: 'Actions', width: 50, menuDisabled: true, renderer: function () {
                    return '<img class="xks-qh-act xks-dl-save" src="../html/icons/silk/disk.png" ext:qtip="Save">' +
                           '<img class="xks-qh-act xks-dl-delete" src="../html/icons/silk/cross.png" ext:qtip="Delete">';
                } }
            ].concat(this.showUser ? [Xks.userColumn] : []),
            viewConfig: { emptyText: 'No downloads. Use "Send to: Download Session" in the session viewer, ' +
                                     'or add a Download Sessions action to a workflow.' },
            tbar: [
                { text: 'Help', iconCls: 'xks-icon-help', handler: function () {
                    Ext.Msg.alert('Help', 'Click a filename to save the file.');
                } },
                { text: 'Actions', menu: [
                    { text: 'Save Selected', iconCls: 'xks-icon-download', handler: this.saveSelected, scope: this },
                    { text: 'Delete Selected Rows', iconCls: 'xks-icon-delete', handler: function () {
                        Ext.each(this.getSelectionModel().getSelections(), this.removeDownload, this);
                    }, scope: this }
                ] },
                { text: 'View', menu: [
                    { text: 'Refresh', handler: function () { this.getView().refresh(); }, scope: this }
                ] }
            ]
        });

        Xks.DownloadsGrid.superclass.initComponent.call(this);
        this.on('destroy', this.store.unbindMaster);

        this.on('cellclick', function (g, row, col, e) {
            var r = this.store.getAt(row);
            if (e.getTarget('.xks-dl-delete')) {
                this.removeDownload(r);
            } else if (e.getTarget('.xks-dl-save') || this.getColumnModel().getDataIndex(col) === 'filename') {
                Xks.downloads.save(r.get('filename'), r.get('text'));
            }
        }, this);
    },

    // delete from Xks.DownloadStore so every downloads tab loses the row
    removeDownload: function (r) {
        Xks.DownloadStore.remove(Xks.DownloadStore.getById(r.id));
    },

    saveSelected: function () {
        Ext.each(this.getSelectionModel().getSelections(), function (r) {
            Xks.downloads.save(r.get('filename'), r.get('text'));
        });
    }
});
