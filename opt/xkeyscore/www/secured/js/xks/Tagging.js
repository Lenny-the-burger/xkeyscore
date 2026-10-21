/*
 * Tagging > Tech Extractor Tagging (2011 tree, xks-workflows-2011.pdf slide 8;
 * "Tech Extractor" in the Oct 2009 tree, cne-analysis-in-xks.pdf slide 17).
 *
 * No screenshot of it exists. Everything here is inferred from the tasking
 * rules in xks-tech-extractor-2010.pdf:
 *   [TE10] terms (keywords or regular expressions) are scanned against the
 *          contexts and the hits are tagged as meta-data
 *   [TE13] not retrospective: only data collected after a list is tasked
 *   [TE14] lists are "Tech Dictionaries" holding category names ("Tech
 *          Names"); a "GUI to allow analysts entry of tech terms" was
 *          "almost complete" (Apr 2010)
 *   [TE15] all terms classified REL FVEY; case insensitive unless forced;
 *          substring hits unless forced to a unique word or a regex
 * The tags show up in the Tech Strings in Documents results (Tech
 * Dictionary / Tech Name / Tech Value, [TE19]).
 */
Ext.ns('Xks');

Xks.TechTermStore = new Ext.data.JsonStore({
    fields: ['dictionary', 'name', 'term', 'caseSensitive', 'match', 'classification',
             { name: 'tasked', type: 'date' }, 'user'],
    sortInfo: { field: 'tasked', direction: 'DESC' }
});

Xks.techTerms = {
    MATCH: ['Substring', 'Whole Word', 'Regular Expression'],     // [TE15]

    add: function (t) {
        Xks.TechTermStore.insert(0, new Xks.TechTermStore.recordType(Ext.apply({
            caseSensitive: false, match: 'Substring', classification: 'REL FVEY',
            tasked: new Date(), user: Xks.App.USER
        }, t)));
    },

    // terms already tasked at `when` [TE13]
    activeAt: function (when) {
        var out = [];
        Xks.TechTermStore.each(function (r) {
            if (r.get('tasked') <= when) {
                out.push(r.data);
            }
        });
        return out;
    }
};

// the dictionary/name/term combinations seen on [CNE30] and [TE19]
Ext.each([['classic', 'vpn', 'vpn'], ['classic', 'vpn', 'pptp'], ['classic', 'gsm', 'HLR'],
          ['classic', 'gsm', 'ICCID'], ['classic', 'gsm', 'IMEI'], ['classic', 'gsm', 'IMSI'],
          ['classic', 'gsm', 'MSISDN']], function (t) {
    Xks.TechTermStore.add(new Xks.TechTermStore.recordType({
        dictionary: t[0], name: t[1], term: t[2], caseSensitive: false,
        match: t[2] === t[2].toUpperCase() ? 'Whole Word' : 'Substring', classification: 'REL FVEY',
        tasked: new Date().add(Date.DAY, -60), user: 'xksteam'
    }));
});

Xks.TechExtractorTagging = Ext.extend(Ext.Panel, {
    title: 'Tech Extractor Tagging',
    closable: true,
    layout: 'border',

    initComponent: function () {
        var enc = Ext.util.Format.htmlEncode,
            sm = new Ext.grid.CheckboxSelectionModel(),
            dictionaries = function () {
                var seen = {}, out = [];
                Xks.TechTermStore.each(function (r) {
                    if (!seen[r.get('dictionary')]) {
                        seen[r.get('dictionary')] = true;
                        out.push([r.get('dictionary')]);
                    }
                });
                return out;
            };

        this.dictionary = new Ext.form.ComboBox({
            fieldLabel: 'Tech Dictionary', width: 200, mode: 'local', triggerAction: 'all',
            store: new Ext.data.ArrayStore({ fields: ['d'], data: dictionaries() }), displayField: 'd',
            allowBlank: false, value: 'classic'
        });
        this.techName = new Ext.form.TextField({ fieldLabel: 'Tech Name', width: 200, allowBlank: false });
        this.term = new Ext.form.TextField({ fieldLabel: 'Term', width: 300, allowBlank: false });
        this.caseSensitive = new Ext.form.Checkbox({ fieldLabel: 'Case Sensitive' });
        this.match = new Ext.form.ComboBox({
            fieldLabel: 'Match', width: 200, mode: 'local', triggerAction: 'all', editable: false,
            store: Xks.techTerms.MATCH, value: 'Substring'
        });
        this.classification = new Ext.form.ComboBox({
            fieldLabel: 'Classification', width: 200, mode: 'local', triggerAction: 'all', editable: false,
            store: ['REL FVEY'], value: 'REL FVEY'                  // [TE15] the only one allowed
        });

        this.grid = new Ext.grid.GridPanel({
            region: 'center',
            store: Xks.TechTermStore,
            stripeRows: true,
            deferRowRender: false,
            sm: sm,
            columns: [
                sm,
                { header: 'Tech Dictionary', dataIndex: 'dictionary', width: 110, sortable: true, renderer: enc },
                { header: 'Tech Name', dataIndex: 'name', width: 110, sortable: true, renderer: enc },
                { header: 'Term', dataIndex: 'term', width: 200, sortable: true, renderer: enc },
                { header: 'Case Sensitive', dataIndex: 'caseSensitive', width: 85, sortable: true,
                  renderer: function (v) { return v ? 'yes' : 'no'; } },
                { header: 'Match', dataIndex: 'match', width: 110, sortable: true },
                { header: 'Classification', dataIndex: 'classification', width: 90, sortable: true },
                { header: 'Datetime Tasked', dataIndex: 'tasked', width: 130, sortable: true,
                  renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') },
                Xks.userColumn
            ],
            tbar: [
                { text: 'Help', iconCls: 'xks-icon-help', handler: function () {
                    Ext.Msg.alert('Tech Extractor Tagging',
                        'Terms are scanned against documents, email bodies and other content, and each hit ' +
                        'is tagged with its Tech Dictionary and Tech Name. Tagging is not retrospective: ' +
                        'only data collected after a term is tasked is tagged. The tags can then be ' +
                        'searched with Tech Strings in Documents.');
                } },
                { text: 'Actions', menu: [
                    { text: 'Delete Selected Rows', iconCls: 'xks-icon-delete', handler: function () {
                        Xks.TechTermStore.remove(this.grid.getSelectionModel().getSelections());
                    }, scope: this }
                ] }
            ],
            viewConfig: { emptyText: 'No terms tasked.' }
        });

        Ext.apply(this, {
            items: [{
                region: 'north',
                xtype: 'form',
                height: 205,
                labelWidth: 110,
                bodyStyle: 'padding:8px',
                items: [this.dictionary, this.techName, this.term, this.caseSensitive, this.match,
                        this.classification],
                buttonAlign: 'left',
                buttons: [{ text: 'Add Term', iconCls: 'xks-icon-tag-add', handler: this.addTerm, scope: this }]
            }, this.grid]
        });
        Xks.TechExtractorTagging.superclass.initComponent.call(this);
    },

    addTerm: function () {
        var term = this.term.getValue(), d = this.dictionary.getRawValue();
        if (!this.dictionary.isValid() || !this.techName.isValid() || !this.term.isValid()) {
            return;
        }
        if (this.match.getValue() === 'Regular Expression') {
            try {
                new RegExp(term);
            } catch (e) {
                Ext.Msg.alert('Tech Extractor Tagging', 'That is not a valid regular expression.');
                return;
            }
        }
        Xks.techTerms.add({
            dictionary: d,
            name: this.techName.getValue(),
            term: term,
            caseSensitive: this.caseSensitive.getValue(),
            match: this.match.getValue()
        });
        this.term.reset();
        if (this.dictionary.store.findExact('d', d) === -1) {
            this.dictionary.store.loadData([[d]], true);
        }
    }
});
