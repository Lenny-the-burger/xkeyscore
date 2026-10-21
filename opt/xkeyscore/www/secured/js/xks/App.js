/*
 * Xks.App - viewport for the 2011 "New GUI" layout, xks-workflows-2011.pdf slide 8:
 *
 *   audit + classification banners
 *   XKEYSCORE   Welcome: <user>  switch users
 *   [Navigation Menu tree] | [Preferences  Help]
 *                          | [tabs: Home, searches, results ...]
 *   audit + classification banners
 */
Ext.ns('Xks');

Xks.App = (function () {
    var USER = 'xksuser',
        NUM_SITES = 51,           // "51 of 51" DBs, slide 7
        BANNER =
            '<div class="xks-banner">' +
            '<div class="xks-audit">This system is audited for USSID 18 and Human Rights Act compliance</div>' +
            '<div class="xks-class">TOP SECRET//COMINT//REL TO USA, AUS, CAN, GBR, and NZL//20320108</div>' +
            '</div>',
        tabs, tree;

    /*
     * Home page text from slide 8. The left edge of the HRA notice is cut off
     * in the screenshot; the missing first letters of each line are restored.
     */
    var HOME_HTML =
        '<div class="xks-home">' +
        '<div class="xks-welcome"><b>Welcome to the <i>New</i> XKEYSCORE Home Page!</b><br>' +
        'If you have questions or bug reports please go to <a href="#">XKEYSCORE New GUI Forum</a><br>' +
        'To use the old GUI, click <a href="#">here</a></div>' +
        '<div class="xks-hra"><h2>HUMAN RIGHTS ACT,<br>USSID 18 AND USSID 9</h2>' +
        'All (SYSTEM) queries require a justification to ensure Human Rights Act (HRA), USSID 18 and ' +
        'USSID 9 compliance. Please enter information as prompted by the query interface. An audit ' +
        'trail has been established and will be searched as part of Menwith Hill Station\'s response to ' +
        'any complaint brought under HRA and as part of the USSID 18 and USSID 9 process. ' +
        'Please note that SENSITIVE TARGETING APPROVAL (STA) is required for HRA before submitting ' +
        'any query which includes terms specific to a person or company (eg name, address, identity ' +
        'details such as communications address, passport/bank account number) who EITHER (a) is ' +
        'defined as a UK, British Dependent Territory (BDT) or Second Party "person" or (b) is located in ' +
        'the UK, or a BDT or Second Party country. STA is also required for wildcard pulls that are ' +
        'inevitably going to retrive a substantial proportion of such enties (e.g. wildcarding on a UK city ' +
        'code). Full legal guidance is available from the HRA Compliance Officer at Menwith Hill Station.' +
        '</div></div>';

    // what the documents say about views that have no screenshot
    var NOT_BUILT_NOTES = {
        link_summarization: 'No screenshot of it has been found. The only other mention is the "link summary" ' +
            'service, which "sets up xks link summary GUI" (xks-system-administration.pdf slide 90).',
        local_tagging: 'No screenshot of it has been found. The only other mention is the "local tagging" ' +
            'service, which "checks and/or loads tagging file" (xks-system-administration.pdf slide 85).',
        help_documentation: 'Listed under Help on xks-system-administration.pdf slide 32; no screenshot of it ' +
            'has been found. The operator table from the user guide is under Advanced Features > Search Value Help ' +
            'on each search form.',
        xk_forum: 'Listed under Help on xks-system-administration.pdf slide 32, and a button of its own on the ' +
            'Oct 2009 top bar (cne-analysis-in-xks.pdf); none of its pages are shown.',
        account_maintenance: 'Listed under Help on xks-system-administration.pdf slide 32; no screenshot of it ' +
            'has been found.'
    };

    function notBuilt(id, title) {
        var note = NOT_BUILT_NOTES[id.replace(/^view-/, '')];
        return {
            id: id,
            title: title,
            closable: true,
            bodyStyle: 'padding:10px;font:12px tahoma,arial,sans-serif',
            html: '<i>' + Ext.util.Format.htmlEncode(title) + '</i> has not been reconstructed yet.' +
                  (note ? '<br><br>' + Ext.util.Format.htmlEncode(note) : '')
        };
    }

    function openTab(id, factory) {
        var t = tabs.getItem(id);
        if (!t) {
            t = tabs.add(factory(id));
        }
        tabs.setActiveTab(t);
        return t;
    }

    function openSearch(key, text) {
        return openTab('search-' + key, function (id) {
            var tab = Xks.SearchForm.create({
                id: id,
                title: text,
                searchKey: key,
                searchDef: Xks.data.getSearch(key, text)
            });
            tab.searchForm.on('submitsearch', onSubmitSearch);
            return tab;
        });
    }

    /*
     * Results views. "My ..." lists this user's queries, "All ..." everyone's.
     * Archived and the All views are only in the Oct 2009 tree
     * (cne-analysis-in-xks.pdf slide 12). Which query lands in which view is
     * inferred: Recent = last 24 hours, Previous = finished, Archived = moved
     * there by "Archive Results", Ongoing = running or from a standing workflow.
     */
    var RESULT_VIEW = /^(all_)?(recent|previous|archived|ongoing)_results$/,
        RESULT_TESTS = {
            recent: function (r) { return Xks.isRecent(r); },
            previous: function (r) { return r.get('status') === 'finished' && !r.get('archived'); },
            archived: function (r) { return !!r.get('archived'); },
            ongoing: function (r) { return isOngoing(r); }
        },
        RESULT_EMPTY = {
            previous: 'No finished queries.',
            archived: 'No archived queries. Right click a finished query and choose Archive Results.',
            ongoing: 'No running queries or standing workflows.'
        };

    function openResultsView(view, text) {
        var m = RESULT_VIEW.exec(view), all = !!m[1], kind = m[2],
            keep = function (r) { return (all || r.get('user') === USER) && RESULT_TESTS[kind](r); };
        return openTab('view-' + view, function (id) {
            if (kind === 'recent') {
                return new Xks.RecentResultsGrid({ id: id, title: text, keep: keep, showUser: all });
            }
            return Xks.queryHistoryTab({ id: id, title: text, keep: keep, showUser: all, emptyText: RESULT_EMPTY[kind] });
        });
    }

    function openView(view, text) {
        switch (view) {
        case 'home':
            return tabs.setActiveTab(0);
        case 'downloads':
        case 'all_downloads':
            return openTab('view-' + view, function (id) {
                var all = view === 'all_downloads';
                return new Xks.DownloadsGrid({ id: id, title: text, showUser: all,
                                               keep: all ? function () { return true; } : undefined });
            });
        case 'workflow_request':
            return new Xks.WorkflowWizard().show();
        case 'my_workflows':
            return openTab('view-workflows', function (id) { return new Xks.MyWorkflowsGrid({ id: id }); });
        case 'preferences':
            return openTab('view-preferences', function (id) { return new Xks.PreferencesPanel({ id: id }); });
        case 'tech_extractor_tagging':
            return openTab('view-' + view, function (id) { return new Xks.TechExtractorTagging({ id: id, title: text }); });
        case 'all_workflows':
        case 'all_pending_workflows':
            return openTab('view-' + view, function (id) {
                var pending = view === 'all_pending_workflows';
                return new Xks.MyWorkflowsGrid({ id: id, title: text, showUser: true,
                    keep: function (r) { return !pending || r.get('state') === 'pending'; } });
            });
        default:
            if (RESULT_VIEW.test(view)) {
                return openResultsView(view, text);
            }
            return openTab('view-' + view, function (id) { return notBuilt(id, text); });
        }
    }

    function onTreeClick(node) {
        if (node.attributes.search) {
            openSearch(node.attributes.search, node.text);
        } else if (node.attributes.view) {
            openView(node.attributes.view, node.text);
        }
    }

    // My Ongoing Results: still running, or started by a standing workflow (inferred)
    function isOngoing(r) {
        var i = r.get('workflowId') ? Xks.workflowStore.findExact('id', r.get('workflowId')) : -1;
        return r.get('status') === 'running' || (i !== -1 && Xks.workflowStore.getAt(i).get('recurring'));
    }

    function queryRecord(query, submitted) {
        return new Xks.QueryStore.recordType({
            id: 'jb_' + (Math.random().toString(16) + '000000').substr(2, 8),
            name: query.name,
            searchKey: query.searchKey,
            searchTitle: query.searchTitle,
            status: 'running',
            numResults: 0,
            dbsDone: 0,
            dbsTotal: NUM_SITES,
            submitted: submitted || new Date(),
            query: query,
            rows: [],
            workflowId: query.workflowId,
            user: query.user || USER,
            archived: false
        });
    }

    // result rows for a query; literal search values (no wildcards/operators)
    // show up verbatim in the rows
    function queryRows(query, total) {
        var def = Xks.data.getSearch(query.searchKey, query.searchTitle),
            names = (def.results || []).concat(Xks.data.commonResultColumns),
            fixed = {};
        Ext.each(query.values, function (v) {
            var col = v.label.replace(/\*/g, '');
            if (typeof v.value === 'string' && v.value && !/[*_!<>]|or|and|^regex:/i.test(v.value) &&
                    names.indexOf(col) !== -1) {
                fixed[col] = v.value;
            }
        });
        return Xks.data.sample.rows(names, total, query.start, query.stop, query.name, fixed);
    }

    /*
     * Fake the federated query: each site's DB answers over a few seconds,
     * Num DBs counts up to NUM_SITES, then the rows appear.
     */
    function onSubmitSearch(form, query) {
        var S = Xks.data.sample,
            total = S.int(8, 240),
            rec = queryRecord(query),
            task = { interval: 150, run: function () {
                var done = Math.min(NUM_SITES, rec.get('dbsDone') + S.int(1, 5));
                rec.set('dbsDone', done);
                rec.set('numResults', Math.round(total * done / NUM_SITES));
                if (done >= NUM_SITES) {
                    rec.set('status', 'finished');
                    rec.set('rows', queryRows(query, total));
                    rec.commit();
                    Ext.TaskMgr.stop(task);
                    if (rec.get('workflowId')) {
                        Xks.downloads.fromWorkflow(rec);
                    }
                    return;
                }
                rec.commit();
            } };

        Xks.QueryStore.insert(0, rec);
        openView('recent_results', 'My Recent Results');
        Ext.TaskMgr.start(task);
    }

    /*
     * Made-up earlier queries so the results views are not empty. The
     * extracted_files / Extension 'ppt' one echoes [CNE16]'s Query Text,
     * the office/word one [CNE17]. Entries with `user` belong to other
     * (made-up) users and only show in the All ... views; `running` ones
     * stay part way through their DBs.
     */
    var HISTORY = [
        { days: 2, searchKey: 'http_activity', searchTitle: 'HTTP Activity', name: 'example_host_review',
          values: [{ label: 'Host', value: 'www.example.com' }] },
        { days: 4, searchKey: 'extracted_files', searchTitle: 'Extracted Files', name: 'ppt_extract',
          values: [{ label: 'Extension', value: 'ppt' }] },
        { days: 7, searchKey: 'email_addresses', searchTitle: 'Email Addresses', name: 'example_org_mail',
          values: [{ label: '@Domain', value: 'example.org' }] },
        { days: 12, searchKey: 'full_log', searchTitle: 'Full Log', name: 'full_log_198_51_100_23',
          values: [{ label: 'IP Address', dir: 'Either', value: '198.51.100.23' }] },
        { days: 20, searchKey: 'document_metadata', searchTitle: 'Document Metadata', name: 'docmeta_word',
          values: [{ label: 'Document Type', value: 'office/word' }] },
        { days: 35, searchKey: 'http_activity', searchTitle: 'HTTP Activity', name: 'old_example_net', archived: true,
          values: [{ label: 'Host', value: 'www.example.net' }] },
        { days: 0, user: 'xksuser2', searchKey: 'email_addresses', searchTitle: 'Email Addresses', name: 'example_net_senders',
          values: [{ label: '@Domain', value: 'example.net' }] },
        { days: 0, user: 'xksuser3', searchKey: 'full_log', searchTitle: 'Full Log', name: 'range_203_0_113', running: 37,
          values: [{ label: 'IP Address', dir: 'To', value: '203.0.113.*' }] },
        { days: 3, user: 'xksuser2', searchKey: 'phone_number_extractor', searchTitle: 'Phone Number Extractor',
          name: 'numbers_555', values: [{ label: 'Phone Number', value: '555-0100' }] },
        { days: 9, user: 'xksuser3', searchKey: 'extracted_files', searchTitle: 'Extracted Files', name: 'pdf_extract',
          values: [{ label: 'Extension', value: 'pdf' }] },
        { days: 28, user: 'xksuser3', searchKey: 'document_metadata', searchTitle: 'Document Metadata', name: 'docmeta_old',
          archived: true, values: [{ label: 'Author', value: 'example' }] }
    ];

    // made-up workflows belonging to other users
    var WORKFLOWS = [
        { days: 1, user: 'xksuser2', state: 'pending', searchKey: 'email_addresses', searchTitle: 'Email Addresses',
          name: 'example_net_daily', recurring: true, criteria: [{ field: '@Domain', value: 'example.net' }] },
        { days: 6, user: 'xksuser3', state: 'approved', searchKey: 'full_log', searchTitle: 'Full Log',
          name: 'range_203_0_113_12h', recurring: true, interval: 12,
          criteria: [{ field: 'To IP Address', value: '203.0.113.*' }] },
        { days: 15, user: 'xksuser3', state: 'approved', searchKey: 'extracted_files', searchTitle: 'Extracted Files',
          name: 'pdf_once', recurring: false, criteria: [{ field: 'Extension', value: 'pdf' }] }
    ];

    function seedHistory() {
        Ext.each(HISTORY, function (h) {
            var submitted = new Date().add(Date.DAY, -h.days).add(Date.MINUTE, -Xks.data.sample.int(10, 600)),
                query = { name: h.name, justification: 'Example', searchKey: h.searchKey, searchTitle: h.searchTitle,
                          start: submitted.add(Date.DAY, -1).clearTime(), stop: submitted, values: h.values, user: h.user },
                rec = queryRecord(query, submitted),
                rows = queryRows(query, Xks.data.sample.int(8, 120));
            if (h.running) {
                rec.set('dbsDone', h.running);
                rec.set('numResults', Math.round(rows.length * h.running / NUM_SITES));
            } else {
                rec.set('status', 'finished');
                rec.set('dbsDone', NUM_SITES);
                rec.set('rows', rows);
                rec.set('numResults', rows.length);
            }
            rec.set('archived', !!h.archived);
            rec.commit();
            Xks.QueryStore.add(rec);
        });
        // other users' workflows for All Workflows / All Pending Workflows (made up)
        Ext.each(WORKFLOWS, function (w, i) {
            var modified = new Date().add(Date.DAY, -w.days).add(Date.MINUTE, -Xks.data.sample.int(10, 600));
            Xks.workflowStore.add(new Xks.workflowStore.recordType(Ext.apply({
                id: 'wf_seed' + i, justification: 'Example', addJustification: '', miranda: '',
                interval: 24, offset: 0, start: modified.add(Date.DAY, -7).clearTime(), stop: modified,
                group: { on: false, type: 'table', columns: [] }, databases: ['TEC'],
                contentMustExist: false, actions: [], created: modified, modified: modified
            }, w), 'wf_seed' + i));
        });
        // other users' downloads for All Downloads (made up)
        Xks.downloads.add({ filename: 'example_net_senders.txt', queryName: 'example_net_senders', sessions: 12,
                            user: 'xksuser2', destination: 'Agility', requested: new Date().add(Date.HOUR, -3),
                            text: 'Example download. Sessions are not kept for made-up users.' });
        Xks.downloads.add({ filename: 'session_4.txt', queryName: 'pdf_extract', sessions: 1,
                            user: 'xksuser3', requested: new Date().add(Date.DAY, -9),
                            text: 'Example download. Sessions are not kept for made-up users.' });
    }

    return {
        USER: USER,

        init: function () {
            Ext.QuickTips.init();
            seedHistory();

            tree = new Ext.tree.TreePanel({
                region: 'west',
                title: 'Navigation Menu',
                width: 260,
                minWidth: 180,
                split: true,
                collapsible: true,
                autoScroll: true,
                rootVisible: false,
                root: new Ext.tree.AsyncTreeNode({ expanded: true, children: Xks.data.navtree }),
                listeners: { click: onTreeClick }
            });

            tabs = new Ext.TabPanel({
                activeTab: 0,
                enableTabScroll: true,
                border: false,
                items: [{ title: 'Home', autoScroll: true, html: HOME_HTML }]
            });

            new Ext.Viewport({
                layout: 'border',
                items: [{
                    region: 'north',
                    border: false,
                    html: BANNER + '<div class="xks-header"><span class="xks-product">XKEYSCORE</span>' +
                          'Welcome: ' + USER + ' <a href="#">switch users</a></div>'
                }, {
                    region: 'south',
                    border: false,
                    html: BANNER
                }, tree, {
                    region: 'center',
                    layout: 'fit',
                    tbar: [
                        { text: 'Preferences', handler: function () { openView('preferences', 'Preferences'); } },
                        // menu items from xks-system-administration.pdf slide 32; on the 2011 bar
                        // [WF8] Help has no visible arrow, the Oct 2009 bar shows "Help ▾"
                        { text: 'Help', iconCls: 'xks-icon-help', menu: [
                            { text: 'Help Documentation', handler: function () { openView('help_documentation', 'Help Documentation'); } },
                            { text: 'XK Forum', handler: function () { openView('xk_forum', 'XK Forum'); } },
                            { text: 'Account Maintenance', handler: function () { openView('account_maintenance', 'Account Maintenance'); } },
                            { text: 'About XKEYSCORE', handler: function () {
                                // contents of the About box are not known
                                Ext.Msg.alert('About XKEYSCORE', '<b>XKEYSCORE</b><br><br>A reconstruction of the web ' +
                                    'interface from published documents. Logged in as ' + USER + '.');
                            } }
                        ] }
                    ],
                    items: tabs
                }]
            });
        },

        openResults: function (rec, newWindow) {
            var grid;
            if (rec.get('status') !== 'finished') {
                Ext.Msg.alert('My Recent Results', 'This query is still running (' +
                    rec.get('dbsDone') + ' of ' + rec.get('dbsTotal') + ' DBs).');
                return;
            }
            if (newWindow) {
                grid = new Xks.SessionGrid({ queryRecord: rec, closable: false, title: undefined });
                new Ext.Window({ title: Ext.util.Format.htmlEncode(rec.get('name')), width: 900, height: 450,
                                 layout: 'fit', maximizable: true, items: grid }).show();
                return;
            }
            openTab('results-' + rec.get('id'), function (id) {
                return new Xks.SessionGrid({ id: id, queryRecord: rec });
            });
        },

        runQuery: function (query) {
            onSubmitSearch(null, query);
        },

        openMyWorkflows: function () {
            openView('my_workflows');
        },

        repopulate: function (query) {
            var node = tree.getRootNode().findChild('search', query.searchKey, true),
                tab = openSearch(query.searchKey, node ? node.text : query.searchTitle);
            tab.searchForm.loadQuery(query);
        }
    };
}());

Ext.onReady(Xks.App.init);
