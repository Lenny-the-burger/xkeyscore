/*
 * Xks.SessionViewer - "X-KEYSCORE C2C Session Viewer"
 *
 * Sources:
 *   [TAO36]  using-xks-to-enable-tao.pdf slide 36 (HTTP-GET session, Jul 2009)
 *   [TAO12]  same deck, slide 12 (telnet session, ASCII formatter)
 *   [CNE25]  cne-analysis-in-xks.pdf slide 25 (KEYLOGGER session in the
 *            pop-out window, layouts/popOutLayout.jsp, Oct 2009)
 *
 * Layout: title bar; paging toolbar (Session N of M ... Read-ahead: On);
 * one-row header grid (Datetime, Case Notation, From IP, To IP, From Port,
 * To Port, Protocol, Length); tabs Session / Header (n) / Meta (n). The
 * Session tab has the Formatter toolbar, the yellow "Quick Clicks" tree of
 * One-Click Searches on the left and the formatter output on the right.
 *
 * All session content is generated from the (fake) result row, so it only
 * ever shows documentation IPs, example.* hosts and harmless text.
 *
 * Config:
 *   grid         the Xks.SessionGrid the sessions come from
 *   index        row to show first
 */
Ext.ns('Xks');

Xks.SessionViewer = Ext.extend(Ext.Window, {
    width: 1000,
    height: 640,
    layout: 'border',
    maximizable: true,
    constrain: true,
    cls: 'xks-sv',

    initComponent: function () {
        var me = this;
        this.index = this.index || 0;
        this.formatter = 'AUTO';
        this.snippet = false;
        this.readAhead = true;
        this.searchKey = this.grid.queryRecord.get('searchKey');

        this.title = 'X-KEYSCORE C2C Session Viewer';

        this.sessionField = new Ext.form.NumberField({
            width: 60, allowDecimals: false, minValue: 1, cls: 'x-tbar-page-number',
            listeners: {
                specialkey: function (f, e) {
                    if (e.getKey() === e.ENTER) {
                        me.show_(f.getValue() - 1);
                    }
                }
            }
        });
        this.ofText = new Ext.Toolbar.TextItem('of 1');
        this.readAheadBtn = new Ext.Toolbar.TextItem({ text: 'Read-ahead: On', cls: 'xks-sv-readahead' });

        this.headerStore = new Ext.data.JsonStore({
            fields: ['datetime', 'caseNotation', 'fromIp', 'toIp', 'fromPort', 'toPort', 'protocol', 'length']
        });
        this.headerGrid = new Ext.grid.GridPanel({
            region: 'north',
            height: 50,
            store: this.headerStore,
            enableHdMenu: false,
            enableColumnResize: true,
            cls: 'xks-sv-header',
            columns: [
                { header: 'Datetime', dataIndex: 'datetime', width: 130 },
                { header: 'Case Notation', dataIndex: 'caseNotation', width: 130 },
                { header: 'From IP', dataIndex: 'fromIp', width: 190 },
                { header: 'To IP', dataIndex: 'toIp', width: 190 },
                { header: 'From Port', dataIndex: 'fromPort', width: 65, renderer: Xks.SessionViewer.portLink },
                { header: 'To Port', dataIndex: 'toPort', width: 60, renderer: Xks.SessionViewer.portLink },
                { header: 'Protocol', dataIndex: 'protocol', width: 60 },
                { header: 'Length', dataIndex: 'length', width: 70 }
            ]
        });

        this.formatterCombo = new Ext.form.ComboBox({
            width: 140, mode: 'local', triggerAction: 'all', editable: false, value: 'AUTO',
            // only AUTO is visible on the slides
            store: ['AUTO', 'ASCII', 'HEX'],
            listeners: { select: function (c) { me.formatter = c.getValue(); me.render_(); } }
        });
        this.modeBtn = new Ext.Button({
            text: 'Mode: <span class="xks-sv-val">Full Session</span>',
            handler: function () {
                // [TAO36] "Full Session", [CNE25] "Snippet"
                me.snippet = !me.snippet;
                this.setText('Mode: <span class="xks-sv-val">' + (me.snippet ? 'Snippet' : 'Full Session') + '</span>');
                me.render_();
            }
        });
        this.searchField = new Ext.form.TextField({
            width: 280, emptyText: 'Enter text to search',
            enableKeyEvents: true,
            listeners: { keyup: { fn: function () { me.render_(); }, buffer: 250 } }
        });

        this.quickClicks = new Ext.tree.TreePanel({
            region: 'west',
            title: 'Quick Clicks',
            width: 210,
            split: true,
            collapsible: true,
            autoScroll: true,
            rootVisible: false,
            cls: 'xks-sv-quick',
            root: new Ext.tree.TreeNode({ text: 'root' }),
            listeners: {
                click: function (node) {
                    if (node.attributes.oneClick) {
                        me.runOneClick(node.attributes.oneClick);
                    }
                }
            }
        });

        this.content = new Ext.Panel({
            region: 'center',
            autoScroll: true,
            cls: 'xks-sv-content',
            bodyCssClass: 'xks-sv-body'
        });

        this.headerTab = new Ext.grid.PropertyGrid({ title: 'Header', source: {}, cls: 'xks-sv-props' });
        this.metaTab = new Ext.grid.PropertyGrid({ title: 'Meta', source: {}, cls: 'xks-sv-props' });
        Ext.each([this.headerTab, this.metaTab], function (g) {
            g.on('beforeedit', function () { return false; });
        });

        this.tabs = new Ext.TabPanel({
            region: 'center',
            activeTab: 0,
            border: false,
            items: [{
                title: 'Session',
                layout: 'border',
                border: false,
                tbar: {
                    cls: 'xks-sv-bar',
                    items: [
                        'Formatter:', this.formatterCombo, '-',
                        { text: 'Send to: <span class="xks-sv-val">Download Session</span>', menu: [
                            { text: 'Download Session', iconCls: 'xks-icon-download', handler: this.download, scope: this },
                            { text: 'Send to Agility', disabled: true }
                        ] }, '-',
                        this.modeBtn, '-',
                        { text: 'Options', menu: [
                            { text: 'Wrap Long Lines', checked: true, checkHandler: function (i, on) {
                                me.content.body.toggleClass('xks-sv-nowrap', !on);
                            } }
                        ] }, '-',
                        'Search Content:', this.searchField,
                        { text: 'clear', handler: function () { me.searchField.reset(); me.render_(); } }
                    ]
                },
                items: [this.quickClicks, this.content]
            }, this.headerTab, this.metaTab]
        });

        this.items = [this.headerGrid, this.tabs];
        this.tbar = {
            cls: 'xks-sv-bar',
            items: [
                { iconCls: 'x-tbar-page-first', handler: function () { me.show_(0); } },
                { iconCls: 'x-tbar-page-prev', handler: function () { me.show_(me.index - 1); } },
                '-', 'Session', this.sessionField, this.ofText, '-',
                { iconCls: 'x-tbar-page-next', handler: function () { me.show_(me.index + 1); } },
                { iconCls: 'x-tbar-page-last', handler: function () { me.show_(me.count() - 1); } },
                '-',
                { iconCls: 'x-tbar-loading', handler: function () { me.show_(me.index); } },
                '->', '<span class="xks-sv-dots">&#9679;&#9679;&#9679;</span>', this.readAheadBtn
            ]
        };

        Xks.SessionViewer.superclass.initComponent.call(this);
        this.on('afterrender', function () { this.show_(this.index); }, this, { single: true });
    },

    count: function () {
        return this.grid.store.getCount();
    },

    // column value of the current row by result-grid column name
    col: function (rec, name) {
        var i = this.grid.columnNames.indexOf(name);
        return i === -1 ? '' : rec.get('c' + i);
    },

    show_: function (i) {
        var rec, s;
        if (!this.count()) {
            return;
        }
        this.index = Math.max(0, Math.min(this.count() - 1, i || 0));
        rec = this.grid.store.getAt(this.index);
        this.grid.getSelectionModel().selectRow(this.index);
        this.session = s = Xks.SessionViewer.build(this, rec);

        // [CNE25] sessions no longer in the rolling buffer come "[from archive]";
        // the 3-day cut-off is a guess
        this.setTitle('X-KEYSCORE C2C Session Viewer' +
            (new Date().getTime() - rec.get('datetime').getTime() > 3 * 86400000 ? ' [from archive]' : ''));
        this.sessionField.setValue(this.index + 1);
        this.ofText.setText('of ' + this.count());
        this.headerStore.loadData([{
            datetime: rec.get('datetime').format('Y-m-d H:i:s'),
            caseNotation: s.caseNotation,
            fromIp: s.fromIp + (s.fromCountry ? ' (' + s.fromCountry + ')' : ''),
            toIp: s.toIp + (s.toCountry ? ' (' + s.toCountry + ')' : ''),
            fromPort: s.fromPort,
            toPort: s.toPort,
            protocol: 'TCP',
            length: s.length
        }]);

        this.tabs.items.get(1).setTitle('Header (' + s.headers.length + ')');
        this.tabs.items.get(2).setTitle('Meta (' + s.meta.length + ')');
        this.headerTab.setSource(Xks.SessionViewer.toSource(s.headers));
        this.metaTab.setSource(Xks.SessionViewer.toSource(s.meta));
        this.buildQuickClicks(s);
        this.render_();
    },

    buildQuickClicks: function (s) {
        var root = this.quickClicks.getRootNode(), oc;
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }
        root.appendChild(new Ext.tree.TreeNode({ text: 'Session', iconCls: 'xks-sv-x', leaf: true }));
        oc = root.appendChild(new Ext.tree.TreeNode({ text: 'One-Click Searches', iconCls: 'xks-sv-x',
                                                      cls: 'xks-sv-oneclick', expanded: true }));
        Ext.each(s.oneClicks, function (group) {
            var g = oc.appendChild(new Ext.tree.TreeNode({ text: group.text, cls: 'xks-sv-ocgroup', iconCls: 'xks-sv-noicon', expanded: true }));
            Ext.each(group.items, function (it) {
                g.appendChild(new Ext.tree.TreeNode({ text: Ext.util.Format.htmlEncode(it.text), leaf: true,
                                                      iconCls: 'xks-sv-noicon', oneClick: it }));
            });
        });
        root.expand(true);
    },

    // One-Click Searches run a fresh query into My Recent Results
    runOneClick: function (it) {
        var s = this.session, now = new Date();
        Xks.App.runQuery({
            name: 'oneclick_' + it.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            justification: 'One-Click Search from session ' + (this.index + 1),
            searchKey: it.searchKey || 'full_log',
            searchTitle: it.searchKey === 'http_activity' ? 'HTTP Activity' : 'Full Log',
            start: now.add(Date.DAY, -1),
            stop: now,
            values: Xks.map(it.values, function (v) { return { label: v[0], value: v[1] }; })
        });
        Xks.SessionViewer.toast('Submitted One-Click Search: ' + it.label);
    },

    render_: function () {
        var s = this.session, html, fmt = this.formatter, term = this.searchField.getValue();
        if (!s) {
            return;
        }
        if (fmt === 'AUTO') {
            fmt = s.autoFormatter;
        }
        html = '<div class="xks-sv-auto"><b>' + (this.formatter === 'AUTO' ? 'AUTO FORMATTER:' : this.formatter + ' FORMATTER:') +
               '</b> app_id= <b>' + Ext.util.Format.htmlEncode(s.appId) + '</b> Viewer= <b>' + s.viewer[fmt] +
               '</b> formatter. Info=</div>';
        html += Xks.SessionViewer.formatters[fmt](s, this.snippet);
        if (term) {
            html = Xks.SessionViewer.highlight(html, term);
        }
        this.content.update(html);
    },

    download: function () {
        var text = Xks.SessionViewer.rawText(this.session),
            name = 'session_' + (this.index + 1) + '.txt';
        // also listed under My Downloads
        Xks.downloads.add({ filename: name, queryName: this.grid.queryRecord.get('name'), sessions: 1, text: text });
        Xks.downloads.save(name, text);
    }
});

Ext.apply(Xks.SessionViewer, {
    // ports are links in the header row [TAO12] [TAO36]
    portLink: function (v) {
        return v === '' ? '' : '<a href="#" class="xks-link" onclick="return false">' + v + '</a>';
    },

    toSource: function (pairs) {
        var o = {};
        Ext.each(pairs, function (p) { o[p[0]] = p[1]; });
        return o;
    },

    toast: function (text) {
        var el = Ext.DomHelper.append(document.body, { cls: 'xks-sv-toast', html: Ext.util.Format.htmlEncode(text) }, true);
        el.alignTo(document.body, 't-t', [0, 60]);
        el.fadeOut({ duration: 3, remove: true });
    },

    // highlight a search term in already-built HTML, outside of tags
    highlight: function (html, term) {
        var re = new RegExp('(' + Ext.escapeRe(Ext.util.Format.htmlEncode(term)) + ')', 'gi');
        return html.replace(/(^|>)([^<]+)/g, function (m, gt, text) {
            return gt + text.replace(re, '<span class="xks-sv-hit">$1</span>');
        });
    },

    /*
     * Build one fake session from a result row.
     */
    build: function (v, rec) {
        var seed = rec.get('id') * 7919 + v.grid.queryRecord.get('name').length,
            rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; },
            int = function (lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); },
            pick = function (a) { return a[Math.floor(rnd() * a.length)]; },
            ip = function () { return pick(['192.0.2.', '198.51.100.', '203.0.113.']) + int(1, 254); },
            hex = function (n) { var h = ''; while (h.length < n) { h += int(0, 15).toString(16); } return h; },
            s = {
                fromIp: v.col(rec, 'From IP Address') || ip(),
                toIp: v.col(rec, 'To IP Address') || ip(),
                fromPort: v.col(rec, 'From Port') || int(1025, 65000),
                toPort: v.col(rec, 'To Port') || 80,
                fromCountry: v.col(rec, 'From Country (IP)'),
                toCountry: v.col(rec, 'To Country (IP)'),
                // made-up case notation in the slides' "XX.XXXXXXXXXXXX" shape
                caseNotation: 'ZZ.XMPL' + hex(6).toUpperCase(),
                viewer: { HEX: 'HEX', ASCII: 'ASCII' }
            },
            key = v.searchKey;

        if (key === 'keylogger') {
            Xks.SessionViewer.buildKeylogger(s, v, rec, int, pick);
        } else if (key === 'http_activity' || s.toPort === 80 || s.toPort === 8080) {
            Xks.SessionViewer.buildHttp(s, v, rec, int, pick, hex);
        } else {
            Xks.SessionViewer.buildTelnet(s, v, rec, int, pick);
        }
        s.length = Xks.SessionViewer.rawText(s).length;

        // Header tab: the IP/TCP header fields (contents not shown on any slide)
        s.headers = [['IP', s.fromIp + ' > ' + s.toIp + ', ttl ' + int(48, 128) + ', id ' + int(1000, 65000)],
                     ['TCP', s.fromPort + ' > ' + s.toPort + ', seq ' + int(1e6, 4e9) + ', win ' + pick([8192, 16384, 65535])],
                     ['Payload', s.length + ' bytes']];
        // Meta tab (contents not shown on any slide)
        s.meta = [['Datetime', rec.get('datetime').format('Y-m-d H:i:s')],
                  ['Datetime End', rec.get('datetimeEnd').format('Y-m-d H:i:s')],
                  ['Application ID', s.appId],
                  ['Case Notation', s.caseNotation],
                  ['Search', v.grid.queryRecord.get('searchTitle')],
                  ['Query', v.grid.queryRecord.get('name')]];

        // [TAO12] [TAO36] One-Click Searches common to every session
        s.oneClicks = [{
            text: 'Find opposite side of sess',
            // [CNE25] port-less sessions show ":0"
            items: [{ text: s.fromIp + ':' + (s.fromPort || 0) + ' ->', label: 'opposite side',
                      values: [['From IP Address', s.toIp], ['To IP Address', s.fromIp],
                               ['From Port', s.toPort], ['To Port', s.fromPort]] },
                    { text: s.toIp + ':' + (s.toPort || 0), label: 'opposite side',
                      values: [['From IP Address', s.toIp], ['To IP Address', s.fromIp]] }]
        }, {
            text: 'Find traffic on',
            items: [{ text: s.toIp, label: 'traffic ' + s.toIp, values: [['To IP Address', s.toIp]] },
                    { text: s.fromIp, label: 'traffic ' + s.fromIp, values: [['From IP Address', s.fromIp]] }]
        }, {
            text: 'Find application',
            items: [{ text: s.appId, label: 'application', values: [['AppID (+Fingerprints)*', s.appId]] }]
        }].concat(s.extraOneClicks || []);
        return s;
    },

    // [TAO36] HTTP-GET through a squid proxy, DNI_PRESENTER formatter
    buildHttp: function (s, v, rec, int, pick, hex) {
        var host = v.col(rec, 'Host') || pick(['www.example.com', 'news.example.org', 'files.example.net']),
            path = v.col(rec, 'URL Path') || pick(['/index.php', '/search', '/news/article']),
            args = v.col(rec, 'URL Args'),
            via = v.col(rec, 'Via') || '1.0 proxy.example.net:3128 (squid/2.6.STABLE16)',
            xff = v.col(rec, 'X Forwarded For') || pick(['192.0.2.', '198.51.100.']) + int(1, 254),
            proxyHash = hex(8);
        s.toPort = s.toPort || 80;
        s.appId = 'http/proxy_to_server/squid_proxy';
        s.autoFormatter = 'DNI_PRESENTER';
        s.viewer.DNI_PRESENTER = 'DNI_PRESENTER';
        s.display = 'HTTP-GET';
        s.request = 'GET ' + path + (args ? '?' + args : '') + ' HTTP/1.0';
        s.fields = [
            ['Accept', 'image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/x-shockwave-flash, */*'],
            ['Referer', v.col(rec, 'Referer') || 'http://' + host + '/'],
            ['Accept-Language', v.col(rec, 'Language') || 'en'],
            ['Accept-Encoding', 'gzip, deflate'],
            ['User-Agent', v.col(rec, 'Browser') || 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)'],
            ['Host', host],
            // [TAO36] one cookie per line; these are plain preference cookies
            ['Cookie', ['lang=' + (v.col(rec, 'Language') || 'en'), 'theme=classic', 'visits=' + int(1, 40),
                        '__utma=' + int(1e8, 9e8) + '.' + int(1e8, 9e8) + '.' + int(1e9, 2e9)]],
            ['Via', via],
            ['X-Forwarded-For', xff]
        ];
        s.extraOneClicks = [
            { text: 'Find proxy hash', items: [{ text: proxyHash, label: 'proxy hash', values: [['Attribute Info', proxyHash]] }] },
            { text: 'Find x-forwarded-for IP', items: [{ text: xff, label: 'xff ' + xff,
                searchKey: 'http_activity', values: [['X Forwarded For', xff]] }] }
        ];
    },

    // [TAO12] terminal/telnet session from the server side, ASCII formatter
    buildTelnet: function (s, v, rec, int, pick) {
        var name = pick(['gw1', 'edge-rtr', 'core2', 'lab-sw3']) + '.example.net';
        if (String(s.toPort) === '23') {
            // client side of the session; this app_id is a guess
            s.appId = 'terminal/telnet/to_server(port23)';
        } else {
            s.fromPort = 23;
            s.appId = 'terminal/telnet/from_server(port23)';
        }
        s.autoFormatter = 'ASCII';
        s.lines = ['............',
                   '------------------------------------------------------------',
                   'Welcome to ' + name,
                   'Authorized users only. All activity may be monitored.',
                   '------------------------------------------------------------',
                   '', '', 'User Access Verification', '', 'Username: ', 'Password: '];
        s.extraOneClicks = [
            { text: 'Find fingerprint', items: [{ text: 'misc/network/configuration', label: 'fingerprint',
                values: [['AppID (+Fingerprints)*', 'misc/network/configuration']] }] }
        ];
    },

    // [CNE25] KEYLOGGER formatter: one column per process name/process id/session id
    buildKeylogger: function (s, v, rec, int, pick) {
        var procs = [[v.col(rec, 'Proc Name') || 'notepad.exe', v.col(rec, 'Proc ID') || int(500, 6000),
                      v.col(rec, 'Sess ID') || 0, v.col(rec, 'Wndw Name') || 'Untitled - Notepad']],
            others = [['EXCEL.EXE', 'Book1 - Microsoft Excel'], ['WINWORD.EXE', 'Document1 - Microsoft Word'],
                      ['iexplore.exe', 'Example Domain - Windows Internet Explorer']],
            typed = ['shopping list[enter]milk[enter]bread', '[ctrl]s', 'hello wrold[bs][bs][bs][bs]orld',
                     'meeting at 10[tab]room 2', '[ctrl]c[ctrl]v', 'www.example.com[enter]', 'thanks[enter]'],
            t = rec.get('datetime').getTime(), i;
        Ext.each(others, function (o) {
            if (procs.length < 3 && o[0] !== procs[0][0]) {
                procs.push([o[0], int(500, 6000), procs[0][2], o[1]]);
            }
        });
        s.toPort = '';
        s.fromPort = '';
        s.appId = 'dn_payload/keylogger';        // slide shows "dn_payload/k..." cut off
        s.autoFormatter = 'KEYLOGGER';
        s.viewer.KEYLOGGER = 'KEYLOGGER';
        s.procs = procs;
        s.keys = [];
        if (v.col(rec, 'Key Strokes')) {
            s.keys.push([new Date(t), 0, v.col(rec, 'Key Strokes')]);
        }
        for (i = 0; i < 6; i++) {
            t += int(200, 40000);
            s.keys.push([new Date(t), int(0, procs.length - 1), pick(typed)]);
        }
        s.extraOneClicks = [];
    },

    rawText: function (s) {
        if (s.request) {
            return [s.request].concat(Xks.map(s.fields, function (f) {
                return f[0] + ': ' + (Ext.isArray(f[1]) ? f[1].join('; ') : f[1]);
            })).join('\r\n') + '\r\n\r\n';
        }
        if (s.lines) {
            return s.lines.join('\r\n');
        }
        return Xks.map(s.keys, function (k) {
            var p = s.procs[k[1]];
            return k[0].format('c') + ' ' + p[0] + '/' + p[1] + '/' + p[2] + ' ' + k[2];
        }).join('\n');
    },

    formatters: {
        // [TAO36] "Display Information: HTTP-GET" box with a header table
        DNI_PRESENTER: function (s, snippet) {
            var enc = Ext.util.Format.htmlEncode,
                rows = Xks.map(snippet ? s.fields.slice(0, 5) : s.fields, function (f) {
                    var val = Ext.isArray(f[1]) ? Xks.map(f[1], function (c) { return '<div>' + enc(c) + '</div>'; }).join('')
                                                : enc(f[1]);
                    return '<tr><th>' + enc(f[0]) + ':</th><td>' + val + '</td></tr>';
                }).join('');
            return '<div class="xks-sv-dni"><div class="xks-sv-dni-title"><span class="xks-sv-tri">&#9660;</span> ' +
                   '<b>Display Information:</b> ' + s.display +
                   '<a href="#" class="xks-link xks-sv-agility" onclick="return false">Send to Agility Reader</a></div>' +
                   '<table><tr><td colspan="2" class="xks-sv-req">' + enc(s.request) + '</td></tr>' + rows + '</table></div>';
        },

        ASCII: function (s, snippet) {
            var text = Xks.SessionViewer.rawText(s);
            if (snippet) {
                text = text.substr(0, 400);
            }
            return '<pre class="xks-sv-ascii">' + Ext.util.Format.htmlEncode(text) + '</pre>';
        },

        HEX: function (s, snippet) {
            var text = Xks.SessionViewer.rawText(s), out = [], i, j, line, hex, asc, c;
            if (snippet) {
                text = text.substr(0, 256);
            }
            for (i = 0; i < text.length; i += 16) {
                line = text.substr(i, 16);
                hex = [];
                asc = '';
                for (j = 0; j < 16; j++) {
                    c = line.charCodeAt(j);
                    hex.push(j < line.length ? ('0' + (c & 255).toString(16)).slice(-2) : '  ');
                    asc += j < line.length ? (c >= 32 && c < 127 ? line.charAt(j) : '.') : '';
                }
                out.push(('0000000' + i.toString(16)).slice(-8) + '  ' + hex.slice(0, 8).join(' ') + '  ' +
                         hex.slice(8).join(' ') + '  |' + asc + '|');
            }
            return '<pre class="xks-sv-ascii">' + Ext.util.Format.htmlEncode(out.join('\n')) + '</pre>';
        },

        // [CNE25]
        KEYLOGGER: function (s, snippet) {
            var enc = Ext.util.Format.htmlEncode,
                keys = snippet ? s.keys.slice(0, 3) : s.keys,
                h = ['<div class="xks-sv-kl"><div class="xks-sv-kl-title">KEYLOGGER</div>',
                     '<p>Output columns are designated by <i>process name/process id/session id</i></p>',
                     '<p>Keystroke Legend</p><table><tr><td></td>'];
            Ext.each(s.procs, function (p) { h.push('<th>' + enc(p[0] + '/' + p[1] + '/' + p[2]) + '</th>'); });
            h.push('</tr><tr><th>Window Title:</th>');
            Ext.each(s.procs, function (p) { h.push('<th>' + enc(p[3]) + '</th>'); });
            h.push('</tr>');
            Ext.each(keys, function (k) {
                h.push('<tr><td class="xks-sv-kl-time">' + k[0].format('Y-m-d\\TH:i:s.u').replace(/(\.\d{3})\d*$/, '$1') + '</td>');
                Ext.each(s.procs, function (p, i) { h.push('<td>' + (i === k[1] ? enc(k[2]) : '') + '</td>'); });
                h.push('</tr>');
            });
            h.push('</table></div>');
            return h.join('');
        }
    }
});

// open the viewer on a result grid row
Xks.showSession = function (grid, rec) {
    new Xks.SessionViewer({ grid: grid, index: grid.store.indexOf(rec) }).show();
};
