/*
 * Fake result data.
 *
 * Everything here is invented. IPs come from the RFC 5737 documentation
 * ranges and hosts/emails use reserved example domains, so nothing points
 * at a real person or network.
 */
Ext.ns('Xks.data');

Xks.data.sample = (function () {
    var seed = 1,
        HOSTS = ['www.example.com', 'mail.example.net', 'forum.example.org', 'news.example.com',
                 'files.example.net', 'search.example.org', 'static.example.com'],
        PATHS = ['/index.php', '/s/stat.php', '/search', '/forum/viewtopic.php', '/upload', '/login', '/news/article'],
        TERMS = ['weather', 'train times', 'football scores', 'exchange rate', 'recipe', 'cheap flights'],
        USERS = ['user1024', 'blue_kite', 'jdoe', 'test.account', 'nomad77', 'quietfox'],
        BROWSERS = ['Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
                    'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.5) Gecko/2008120122 Firefox/3.0.5',
                    'Opera/9.63 (Windows NT 5.1; U; en) Presto/2.1.1'],
        PROCS = [['notepad.exe', 'Untitled - Notepad'], ['WINWORD.EXE', 'Document1 - Microsoft Word'],
                 ['EXCEL.EXE', 'Book1 - Microsoft Excel'], ['iexplore.exe', 'Example Domain - Windows Internet Explorer']],
        COUNTRIES = ['AA', 'XA', 'XB', 'XC', 'ZZ'],    // ISO 3166 user-assigned codes, not real countries
        FILES = ['report', 'scan0001', 'notes', 'invoice', 'photo', 'draft_v2'],
        EXT = ['doc', 'pdf', 'xls', 'jpg', 'zip', 'ppt'],
        MIME = { doc: 'application/msword', pdf: 'application/pdf', xls: 'application/vnd.ms-excel',
                 jpg: 'image/jpeg', zip: 'application/zip', ppt: 'application/vnd.ms-powerpoint' };

    // small deterministic PRNG so the same query gives the same rows
    function rnd() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }
    function pick(a) {
        return a[Math.floor(rnd() * a.length)];
    }
    function int(lo, hi) {
        return lo + Math.floor(rnd() * (hi - lo + 1));
    }
    function ip() {
        return pick(['192.0.2.', '198.51.100.', '203.0.113.']) + int(1, 254);
    }

    function techTerm(row) {
        var terms = Xks.techTerms ? Xks.techTerms.activeAt(row.datetime) : [];
        return row.__tech || (row.__tech = terms.length ? pick(terms) :
                              { dictionary: 'classic', name: 'vpn', term: 'vpn' });
    }

    function term(row) {
        return row.__term || (row.__term = pick(TERMS));
    }

    function value(col, row) {
        var c = col.toLowerCase();
        if (/ip address|client ip|x forwarded/.test(c)) { return ip(); }
        if (/from port/.test(c)) { return int(1025, 65000); }
        if (/to port/.test(c)) { return pick([80, 80, 80, 443, 25, 110, 8080]); }
        if (/country/.test(c)) { return pick(COUNTRIES); }
        if (c === 'http type') { return pick(['get', 'get', 'post', 'response']); }
        if (c === 'host' || c === 'domain' || c === '@domain') { return pick(HOSTS).replace(/^www\./, c === 'host' ? 'www.' : ''); }
        if (c === 'url path') { return pick(PATHS); }
        if (c === 'url args') { return 'q=' + encodeURIComponent(term(row)).replace(/%20/g, '+') + '&hl=en'; }
        if (c === 'search terms') { return term(row); }
        if (c === 'language') { return pick(['en', 'en', 'fr', 'de']); }
        if (c === 'browser') { return pick(BROWSERS); }
        if (c === 'via') { return '1.0 proxy.example.net:3128 (squid/2.5.STABLE13)'; }
        if (c === 'referer') { return 'http://' + pick(HOSTS) + pick(PATHS); }
        if (/user ?name|email username|^username/.test(c)) { return pick(USERS); }
        if (c === 'password') { return '********'; }
        // User Activity [OSN16]: invented realms, not real sites
        if (c === 'search for') { return 'username'; }
        if (c === 'realm' || c === 'source') { return row.__realm || (row.__realm = pick(['examplebook', 'examplenet'])); }
        if (c === 'search value') { return row.__user || (row.__user = pick(USERS)); }
        if (c === 'attribute type') { return 'email_address'; }
        if (c === 'attribute value') { return (row.__user || (row.__user = pick(USERS))) + '@example.com'; }
        // Web File Transfer [FFU24]
        if (c === 'file url') { return 'http://files.example.net/download/' + (row.__up || (row.__up = int(10000000, 99999999))) + '/'; }
        if (c === 'upload id') { return row.__up || (row.__up = int(10000000, 99999999)); }
        if (c === 'delete id') { return (int(0, 0xfffffff) * 0x10000000 + int(0, 0xfffffff)).toString(16); }
        if (c === 'transfer type') { return pick(['upload', 'upload', 'download']); }
        if (c === 'site name') { return 'files.example.net'; }
        // Cellular DNI [CELL9]: IMSIs on the 001-01 test network
        if (c === 'imsi') { return '00101' + int(10000, 99999) + int(10000, 99999); }
        if (c === 'application info') { return pick(['Example Domain', 'Example Mail - Inbox', 'Example News']); }
        if (c === 'application' || c === 'appid (+fingerprints)') {
            return row.__app || (row.__app = pick(['mail/webmail/example', 'http/response/html', 'dnt_payload/file']));
        }
        // Tech Strings in Documents [CNE30], [TE19]
        if (c === 'event type') { return pick(['document_body', 'email_body', 'tech_body']); }
        // a term tasked in Tech Extractor Tagging before the session was collected [TE13]
        if (c === 'tech dictionary') { return techTerm(row).dictionary; }
        if (c === 'tech name') { return techTerm(row).name; }
        if (c === 'tech value') { return techTerm(row).term; }
        if (c === 'tech filename') { return rnd() < 0.5 ? '' : 'H:\\' + pick(FILES) + '.doc'; }
        if (/filename/.test(c)) { return row.__file || (row.__file = pick(FILES) + '.' + (row.__ext = pick(EXT))); }
        if (c === 'extension') { return row.__ext || (row.__ext = pick(EXT)); }
        if (/mime|document type|^file type$/.test(c)) { return MIME[row.__ext || (row.__ext = pick(EXT))]; }
        if (/size/.test(c)) { return int(2, 2048) * 1024; }
        if (/author/.test(c)) { return pick(['Administrator', 'User', 'Owner']); }
        if (c === 'phone number') { return '+' + int(10, 99) + ' ' + int(100, 999) + ' 555 ' + int(1000, 9999); }
        if (c === 'number type') { return pick(['mobile', 'landline', 'fax']); }
        if (c === 'country code') { return '+' + int(10, 99); }
        if (c === 'area') { return String(int(10, 999)); }
        // KEYLOGGER grid [CNE24]: harmless desktop apps and typing
        if (c === 'input source') { return 'keyboard'; }
        if (c === 'proc name') { return (row.__proc || (row.__proc = pick(PROCS)))[0]; }
        if (c === 'wndw name') { return (row.__proc || (row.__proc = pick(PROCS)))[1]; }
        if (c === 'proc id') { return int(500, 6000); }
        if (c === 'sess id') { return int(0, 3); }
        if (c === 'time') { return row.datetime.format('H:i:s'); }
        if (c === 'key strokes') { return term(row) + '[enter]'; }
        return '';
    }

    return {
        /*
         * Build `count` rows for the given column names, ending at `stop`
         * and spread over the query's datetime range. `fixed` maps column
         * names to the literal values the analyst searched on.
         */
        rows: function (columns, count, start, stop, queryName, fixed) {
            var rows = [], i, j, t, row, span = Math.max(stop - start, 60000);
            seed = 1;
            for (i = 0; i < (queryName || '').length; i++) {
                seed = (seed * 31 + queryName.charCodeAt(i)) % 2147483647 || 1;
            }
            for (i = 0; i < count; i++) {
                t = new Date(stop.getTime() - rnd() * span);
                row = { id: i + 1, datetime: t, datetimeEnd: new Date(t.getTime() + int(0, 90) * 1000) };
                // a searched-for user also shows in User Activity's Attribute Value
                if (fixed && fixed['Search Value']) {
                    row.__user = fixed['Search Value'];
                }
                if (fixed && fixed.Realm) {
                    row.__realm = fixed.Realm;
                }
                for (j = 0; j < columns.length; j++) {
                    row['c' + j] = fixed && fixed.hasOwnProperty(columns[j]) ? fixed[columns[j]] : value(columns[j], row);
                }
                rows.push(row);
            }
            rows.sort(function (a, b) { return b.datetime - a.datetime; });
            for (i = 0; i < rows.length; i++) {
                rows[i].id = i + 1;
            }
            return rows;
        },

        int: int,
        pick: pick
    };
}());
