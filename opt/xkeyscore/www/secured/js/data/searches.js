/*
 * Search form definitions.
 *
 * Every search form has the same header (Query Name / Justification /
 * Additional Justification / Miranda Number, then the Datetime row) which
 * Xks.SearchForm adds itself. `fields` is everything below the Datetime row.
 *
 * Field specs:
 *   'Label'                              plain text field
 *   { label, type: 'combo', options }
 *   { label, type: 'textarea' }
 *   { label, type: 'check' }
 *   { label, ..., builder: 'ip'|'url' }  adds the "[... Field Builder]" link
 *   { label, ..., optional: true }       only shown by "Show Hidden Search Fields",
 *                                        with an enable checkbox in front
 *   band([...])                          the search-specific fields, drawn on a blue band
 *   '-'                                  blue separator line
 *
 * Sources:
 *   [UG#]   unofficial-xks-user-guide.pdf page #               (Jan 2009)
 *   [TAO#]  using-xks-to-enable-tao.pdf slide #                (Jul 2009)
 *   [CNE#]  cne-analysis-in-xks.pdf slide #                    (Oct 2009)
 *   [CELL#] analyzing-mobile-cellular-dni-in-xks.pdf slide #   (May 2009)
 *   [FFU#]  free-file-uploaders.pdf slide #                    (Aug 2009)
 *   [OSN#]  tracking-targets-on-online-social-networks.pdf slide # (Sep 2009)
 *   [TE#]   xks-tech-extractor-2010.pdf slide #                (Apr 2010)
 * Where versions disagree the newest wins. Forms with `placeholder: true`
 * have no screenshot and only show the shared rows.
 */
Ext.ns('Xks.data');

(function () {
    var DIR = ['Either', 'From', 'To'],
        // [CNE22] IP rows default From/To and carry the Field Builder link
        IP_BLOCK = [
            '-',
            { label: 'IP Address', type: 'dir', value: 'From', options: DIR, builder: 'ip' },
            { label: 'IP Address', type: 'dir', value: 'To', options: DIR, builder: 'ip' },
            { label: 'Port', type: 'dir', value: 'From', options: DIR },
            { label: 'Port', type: 'dir', value: 'To', options: DIR }
        ],
        // [UG12]; [TAO24] shows it as an optional (checkbox) field
        COUNTRY = [
            '-',
            { label: 'Country', type: 'countrydir', value: 'Either', options: DIR }
        ],
        USER_REALM = ['-', 'Username<realm>'],                        // [CNE22], [CNE23]
        COLLECTION = { label: 'Collection Technique', type: 'combo', options: [] },   // options not visible
        MULTI_FORMS = ['User Activity', 'Phone Number Extractor', 'Email Addresses',
                       'Extracted Files', 'HTTP Activity', 'Full Log', 'Web Proxy'],
        MULTI_TAIL = [                                                // [UG4]
            '-',
            { label: 'Content Must Exist', type: 'check' },
            { label: 'Snippet Must Exist', type: 'check' },               // [OSN16]; not on [UG4]
            { label: 'Max Results for a Single DB', type: 'combo', options: ['100', '500', '1000', '5000', '10000'] },
            '-',
            { label: 'Search Forms', type: 'searchforms', options: MULTI_FORMS },
            '-',
            { label: 'Save in my Favorites', type: 'combo', value: 'No', options: ['No', 'Yes'] },
            { label: 'Load From my Favorites', type: 'combo', options: [] }
        ];

    function band(fields) {
        return { type: 'band', fields: fields };
    }

    // standard layout used by the Classic searches
    function std(fields, after) {
        return (fields.length ? [band(fields)] : []).concat(after || [], IP_BLOCK, COUNTRY);
    }

    // Column names for the result grid that every DNI search shares.
    // Names follow the Workflow "Group by" list, xks-workflows-2011.pdf slide 12.
    Xks.data.commonResultColumns = ['From IP Address', 'To IP Address', 'From Port', 'To Port',
                                    'From Country (IP)', 'To Country (IP)'];

    Xks.data.searches = {
        multi_ip: {                                                   // [UG3] description, layout per [UG4]
            title: 'Multiple Search: IP Addresses',
            multi: true,
            fields: ['-', { label: 'IP Address', type: 'dir', value: 'Either', options: DIR, builder: 'ip' }].concat(MULTI_TAIL)
        },
        multi_mac: {                                                  // [UG4]
            title: 'Multiple Search: Mac Address',
            multi: true,
            fields: ['-', 'Mac Address'].concat(MULTI_TAIL)
        },
        multi_username: {                                             // [UG5]
            title: 'Multiple Search: Username',
            multi: true,
            fields: ['-', 'Username', 'Domain'].concat(MULTI_TAIL)
        },

        cne: {                                                        // [CNE22]
            title: 'Search: CNE',
            fields: std([COLLECTION], USER_REALM),
            results: ['Collection Technique', 'Username<realm>']
        },
        keylogger: {                                                  // [CNE23]
            title: 'Search: KEYLOGGER',
            fields: std([COLLECTION, 'Process Name', 'Window Name', 'Session ID', 'Process ID', 'Time', 'Key Strokes'],
                        USER_REALM),
            // [CNE24] results grid uses abbreviated headers
            results: ['Input Source', 'Proc Name', 'Wndw Name', 'Sess ID', 'Proc ID', 'Time', 'Key Strokes']
        },
        email_addresses: {                                            // [UG7]
            title: 'Search: Email Addresses',
            fields: std(['Email Username', '@Domain']),
            results: ['Email Username', '@Domain']
        },
        extracted_files: {                                            // [UG8]
            title: 'Search: Extracted Files',
            fields: std(['Extracted Filename', 'Extension', 'File Type (MIME Type)', 'Is Obfuscated(yes/no)',
                         'Obfuscated Real File Extension', 'File Size on Disk', 'Date File Created',
                         'File Last Access', 'File Last Modified']),
            results: ['Extracted Filename', 'Extension', 'File Type (MIME Type)', 'File Size on Disk']
        },
        logins_and_passwords: {                                       // [UG10], [TAO17], [TAO38]
            title: 'Search: Logins and Passwords',
            fields: std(['User Name', 'Password', 'Domain']),
            results: ['User Name', 'Password', 'Domain']
        },
        phone_number_extractor: {                                     // [UG10], [UG12]
            title: 'Search: Phone Number Extractor',
            fields: std(['Phone Number', 'Number Type', 'Country Code', 'Area']),
            results: ['Phone Number', 'Number Type', 'Country Code', 'Area']
        },
        http_activity: {                                              // [UG14], [TAO24]
            title: 'Search: HTTP Activity',
            fields: std([
                { label: 'HTTP Type', type: 'combo', options: ['get', 'post', 'response'] },  // http-activity-in-xks.pdf slide 10
                { label: 'Host', builder: 'url' },
                'URL Path', 'URL Args', 'Search Terms',
                { label: '*Language*', type: 'combo', options: ['ar', 'de', 'en', 'es', 'fa', 'fr', 'ru', 'ur', 'zh'] },
                { label: 'Character Encoding', type: 'combo', options: ['ISO-8859-1', 'UTF-8', 'windows-1251', 'windows-1256'] },
                'Content Start', 'Content Stop', 'Content Total', 'Referer', 'X Forwarded For'
            ], [
                { label: 'Browser', optional: true }                  // [TAO24]
            ]),
            // [UG14] grid header + http-activity-in-xks.pdf slide 8 metadata panel
            results: ['HTTP Type', 'Host', 'URL Path', 'URL Args', 'Search Terms', 'Language', 'Browser', 'Via', 'Referer']
        },
        document_metadata: {                                          // [UG16]
            title: 'Search: Document Metadata',
            fields: std(['Document Type', 'Encrypted?', 'Corrupted?', 'Filename', 'Extension', '*Subject*',
                         '*Creation Time*', '*Last Modified Time*', '*Unique ID*', 'Author', 'Last Author']),
            results: ['Document Type', 'Filename', 'Extension', 'Author', 'Last Author']
        },
        full_log: {                                                   // [TAO11], [TAO20]
            title: 'Search: Full Log',
            fields: [band(['Client IP', 'Username', { label: 'Attribute Info', type: 'textarea' }])]
                .concat(IP_BLOCK, ['-', 'Data Length'], COUNTRY),
            results: ['Client IP', 'Username', 'Attribute Info', 'Data Length']
        },

        user_activity: {                                              // [OSN13]
            title: 'Search: User Activity',
            // only "username" is seen in the combo; the rest of its list is not visible
            fields: std([{ label: 'Search For', type: 'combo', value: 'username', options: ['username'] },
                         'Search Value', 'Realm']),
            // [OSN16] results grid header, in order (cut off after Source)
            results: ['Search For', 'Search Value', '@Domain', 'Realm', 'Subject', 'Attribute Type', 'Chain',
                      'Attribute Value', 'Activity', 'Source']
        },
        web_file_transfer: {                                          // [FFU33]
            title: 'Search: Web File Transfer',
            // [FFU33] shows File URL ... File Size before the band is cut off;
            // Transfer Type and Site Name are on [FFU32], their place in the band is inferred
            fields: std(['File URL', 'Filename', 'File Type', 'Description', 'File Size',
                         'Transfer Type', 'Site Name']),
            // [FFU24] two grid fragments: File URL | Filename, Transfer Type | Upload ID | Delete ID | Site Name
            results: ['File URL', 'Filename', 'Transfer Type', 'Upload ID', 'Delete ID', 'Site Name']
        },
        cellular_dni: {                                               // [CELL8]
            title: 'Search: Cellular DNI',
            // [CELL8] is cut off after MCC; any later fields are not known
            fields: std(['Interface', 'Hit Status', 'IMSI', 'KI', 'TMSI', 'IMEI', 'MCC']),
            results: ['IMSI', 'Application Info', 'Application', 'AppID (+Fingerprints)']   // [CELL9]
        },
        tech_strings_in_documents: {                                  // no form screenshot
            title: 'Search: Tech Strings in Documents',
            // fields inferred from the result columns; Event Type values from [CNE30] / [TE19]
            fields: std([{ label: 'Event Type', type: 'combo', options: ['document_body', 'email_body', 'tech_body'] },
                         'Tech Dictionary', 'Tech Name', 'Tech Value', 'Tech Filename']),
            // [CNE30] grid header (Highlights column not reproduced); [TE19] gives the full names
            results: ['Event Type', 'Tech Dictionary', 'Tech Name', 'Tech Value', 'Tech Filename', 'Application']
        }
    };

    // Full Log DNI is the tree name for the Full Log form.
    Xks.data.searches.full_log_dni = Xks.data.searches.full_log;

    /*
     * Look up a search by key; searches without a definition get a
     * placeholder that has only the shared rows.
     */
    Xks.data.getSearch = function (key, text) {
        return Xks.data.searches[key] || {
            title: 'Search: ' + text,
            placeholder: true,
            fields: std([]),
            results: []
        };
    };
}());
