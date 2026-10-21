/*
 * Data for Workflow Central (Request Wizard, My Workflows).
 *
 * Sources:
 *   [WF#]  xks-workflows-2011.pdf slide #
 * The wizard screenshots carry 2009 dates (2009-03-04), so this is the
 * 2009 Workflow Central as still shown in the 2011 deck.
 */
Ext.ns('Xks.data');

Xks.data.workflow = {
    // [WF4] "Every 1, 2, 3, 4, 6, 8, 12 or 24 hours"
    intervals: [1, 2, 3, 4, 6, 8, 12, 24],

    // [WF9] only the Full Log description is visible
    typeHelp: {
        full_log: 'Every session collected, indexed by "standard" DNI meta-data ' +
                  '(to/from IP, port, casenotation, application id, sigad, etc).'
    },

    // [WF11] [WF18] [WF21-24]: extra fields offered in Add Search Fields
    // besides the form's own. Seen on Full Log; assumed common DNI metadata.
    extraFields: ['Casenotation', 'SIGAD', 'AppID (+Fingerprints)*'],

    // [WF20] internal names used in the Workflow XML. Others are derived
    // (lowercase, underscores) and are a guess.
    xmlNames: {
        'From IP Address': 'fm_ip',
        'To IP Address': 'to_ip',
        'To Port': 'to_port',          // slide reads "to_ap", hard to make out
        'AppID (+Fingerprints)*': 'fingerprint',
        'Extension': 'ext_extension'   // cne-analysis-in-xks.pdf slide 16 Query Text
    },

    // [WF12] Full Log "Columns to Group By"; the list is cut off after
    // From Latitude (IP). Spelling "X-Fowarded-For" as on the slide.
    groupColumns: {
        full_log: ['Datetime', 'Client IP (X-Fowarded-For)', 'Username', 'Attribute Info',
                   'From IP Address', 'To IP Address', 'From Port', 'To Port',
                   'From Country (IP)', 'To Country (IP)', 'From City (IP)', 'To City (IP)',
                   'From Latitude (IP)']
    },

    // [WF24] aliases at the top of the list, [WF13] databases.
    // The first entry on [WF13] is hidden behind the slide text.
    databases: [
        { name: 'AUS sites', alias: true },
        { name: 'F6 sites', alias: true },
        { name: 'NZ sites', alias: true },
        { name: 'TAO STAT Team', db: 'tao-stat:xs_web_db' },
        { name: 'TEC', db: 'tc1xks1.tec.ces.nsa:xs_web_db' },
        { name: 'TEC DEEPDIVE', db: 'xksdd1.tec.ces.nsa:xs_web_db' },
        { name: 'TEC SSO DEEPDIVE NOFORN', db: 'ssoxksdd1:xs_web_db' },
        { name: 'TEC TURTLERACE', db: 'turtlerace:xs_web_db' },
        { name: 'Timberline SV', db: 'timberline-sv:xs_web_db' },
        { name: 'TURBULENCE at the TEC', db: 'turbotec:xs_web_db' },
        { name: 'TURBULENCE MHS live (TURBOPOUND)', db: 'turbopound:xs_web_db',
          warning: 'Please only enable if necessary' },
        { name: 'TURTLEALE MHS live system', db: 'turboale:xs_web_db' },
        { name: 'XKSVOIP1 NOFORN', db: 'xksvoip-nf:q0' },
        { name: 'XKSVOIP2 REL', db: 'xksvoip-rel:q0' },
        { name: 'Yakima Deep Dive', db: 'jacknife-dd:xs_web_db' },
        { name: 'Yakima mission system', db: 'jacknife:xs_web_db' }
    ],

    // [WF14] script list; arguments per [WF14] [WF16] [WF17].
    // Find and Foward VoIP (sic) arguments are not shown.
    scripts: {
        'Email Alert': [
            { label: 'Email To' },
            { label: 'ROWR', check: 'Return Only With Results' },
            { label: 'Share Results', check: 'Share Results with users above' }
        ],
        'SQL Report': [
            { label: 'Type', combo: ['CSV', 'HTML'] },
            { label: 'Email To' },
            { label: 'Email Subject' },
            { label: 'Email Content' },
            { label: 'Email Attachment', check: 'Email Attachment' },
            { label: 'ROWR', check: 'Return Only With Results' },
            { label: 'Filename' },
            { label: 'Mail Order Trigraph' },
            { label: 'SQL', textarea: 'SELECT\nFROM %{OUTPUT_TABLE}\nWHERE\nGROUP BY' },
            { label: 'GZIP', check: 'Compress Contents' }
        ],
        'Download Sessions': [
            { label: 'User ID' },
            { label: 'Email To' },
            { label: 'Email Subject' },
            { label: 'Email Content' },
            { label: 'ROWR', check: 'Return Only With Results' },
            { label: 'Filename' },
            { label: 'Mail Order Trigraph' },
            { label: 'GZIP', check: 'Compress Contents' },
            { label: 'Send To Agility', check: 'Send To Agility' }
        ],
        'Find and Foward VoIP': []
    }
};
