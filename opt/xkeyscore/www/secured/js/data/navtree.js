/*
 * Navigation Menu tree.
 *
 * Every entry is taken from a screenshot; sources noted per group.
 *   [WF8]  xks-workflows-2011.pdf slide 8 (full 2011 "New GUI" tree)
 *   [UG2]  unofficial-xks-user-guide.pdf p.2 (Classic A-M, 2009)
 *   [UG3]  unofficial-xks-user-guide.pdf p.3 (MultiSearch)
 *   [FFU]  free-file-uploaders.pdf slide 31 (Classic N-Z)
 *   [CNE]  cne-analysis-in-xks.pdf slides 22-23 (Oct 2009 Classic A-M / N-Z)
 *   [CNE12] cne-analysis-in-xks.pdf slide 12 (Oct 2009 Results folder)
 *   [CNE17] cne-analysis-in-xks.pdf slide 17 (Oct 2009 Statistics folder)
 *   [CNE30] cne-analysis-in-xks.pdf slide 30 (Oct 2009 Workflow Central folder)
 * Classic lists are the union of every version seen, in the GUI's own
 * (ASCII) sort order; items only seen in one version are marked.
 * Folders whose contents were not visible in any screenshot are marked TODO
 * and only list children the documents name elsewhere.
 *
 * Leaf nodes carry `search` (key into Xks.data.searches) or `view`
 * (a non-search panel handled by Xks.App).
 */
Ext.ns('Xks.data');

(function () {
    function leaf(text, cfg) {
        return Ext.apply({ text: text, leaf: true, iconCls: 'xks-icon-form' }, cfg);
    }
    function search(text, key) {
        return leaf(text, { search: key || text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') });
    }
    function folder(text, children, expanded) {
        return { text: text, expanded: !!expanded, children: children };
    }

    Xks.data.navtree = [
        folder('Explorer', [                                       // [WF8]
            leaf('Home', { view: 'home' }),
            folder('Workflow Central', [
                leaf('Request', { view: 'workflow_request' }),
                leaf('All Workflows', { view: 'all_workflows' }),                  // [CNE30] only
                leaf('All Pending Workflows', { view: 'all_pending_workflows' }),  // [CNE30] only
                leaf('My Workflows', { view: 'my_workflows' })
            ], true)
        ], true),

        folder('Search', [                                         // [WF8]
            folder('Classic', [
                folder('MultiSearch', [                            // [UG3]
                    search('IP Addresses', 'multi_ip'),
                    search('Mac Address', 'multi_mac'),
                    search('Username', 'multi_username')
                ]),
                folder('Classic A-M', [                            // [UG2] + [CNE]
                    search('ASF and WMV Metadata'),                // [UG2] only
                    search('Alert'),
                    search('BlackBerry'),
                    search('CNE'),
                    search('Call Logs'),
                    search('Category DNI'),
                    search('Cellular DNI'),
                    search('Cisco Passwords'),
                    search('DNS'),                                 // [CNE] only
                    search('Document Metadata'),
                    search('Document Tagging'),
                    search('Email Addresses'),
                    search('Extracted Files'),
                    search('Full Log DNI'),
                    search('HTTP Activity'),
                    search('IKE Parser'),                          // [CNE] only
                    search('IRC Cafe Geolocation'),                // [UG2] only
                    search('Logins and Passwords'),
                    search('Microplugin Metadata')                 // [CNE] only
                ]),
                folder('Classic N-Z', [                            // [FFU] + [CNE]
                    search('KEYLOGGER'),                           // [CNE] only (sic, filed under N-Z)
                    search('Network Logs'),
                    search('PDF Metadata'),
                    search('PILBEAM'),
                    search('PPF VoIP Metadata'),
                    search('Passport'),
                    search('Phone Number Extractor'),
                    search('RBGAN'),
                    search('REGISTRY'),
                    search('RTP'),
                    search('Radius Logs'),
                    search('SIP'),
                    search('SSL Parser'),
                    search('TOR Log'),                             // [FFU] only
                    search('Tech Strings in Documents'),
                    search('User Activity'),
                    search('WLAN'),
                    search('Web File Transfer'),
                    search('Web Proxy'),
                    search('Wireshark')
                ])
            ], true),
            folder('Common', [                                     // [WF8] - list cut off after Email Addresses. TODO
                search('Category DNI'),
                search('Document Metadata'),
                search('Email Addresses')
            ], true),
            folder('Dictionary Hits', []),                         // named in [UG2] text. TODO
            folder('File Transfer', []),                           // named in [UG2] text. TODO
            folder('Network Management', []),                      // named in [UG2] text. TODO
            folder('UserActivity', []),                            // [WF8] (sic, no space). TODO
            folder('VoIP', []),                                    // [WF8]. TODO
            folder('Wireless', [])                                 // [WF8]. TODO
        ], true),

        folder('Results', [                                        // [WF8] + [CNE12]
            leaf('My Recent Results', { view: 'recent_results' }),
            leaf('My Previous Results', { view: 'previous_results' }),
            leaf('My Archived Results', { view: 'archived_results' }),         // [CNE12] only
            leaf('My Ongoing Results', { view: 'ongoing_results' }),
            leaf('My Downloads', { view: 'downloads' }),
            leaf('All Downloads', { view: 'all_downloads' }),                  // [CNE12] only
            leaf('All Recent Results', { view: 'all_recent_results' }),        // [CNE12] only
            leaf('All Previous Results', { view: 'all_previous_results' }),    // [CNE12] [CNE16] only
            leaf('All Archived Results', { view: 'all_archived_results' }),    // [CNE12] only
            leaf('All Ongoing Results', { view: 'all_ongoing_results' })       // [CNE12] only
        ], true),

        folder('Statistics', [                                     // [WF8] + [CNE17]
            folder('Signal Acquisition', []),                      // [CNE17] only, shown collapsed. TODO
            leaf('Link Summarization', { view: 'link_summarization' })
        ], true),

        folder('Tagging', [                                        // [WF8] - list cut off. TODO
            leaf('Local Tagging', { view: 'local_tagging' }),
            leaf('Tech Extractor Tagging', { view: 'tech_extractor_tagging' })
        ], true)
    ];
}());
