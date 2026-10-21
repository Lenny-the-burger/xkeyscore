# XKEYSCORE GUI reconstruction: progress notes

Goal: recreate the XKEYSCORE web frontend as faithfully as the leaked documents
allow, using the same UI library and layout, with every field traced back to a
screenshot.

## Running it

The GUI is static HTML/JS with no backend. Serve `code/opt/xkeyscore/www/` with any
static server and open `secured/index.html`, for example:

```
cd code/opt/xkeyscore/www
python -m http.server 8643 --bind 127.0.0.1
# then open http://127.0.0.1:8643/secured/index.html
```

It also opens directly from disk (`file://`), because all data is inline JS.

## UI library: Ext JS 3.4 (not Ext JS 4)

- The screenshots show the original Ext JS 2.x/3.x "blue" theme: the
  Navigation Menu panel header with its `«` collapse tool, the folder tree with
  dotted elbow lines, toolbar menu buttons with `▾`, date fields with calendar
  triggers, combo triggers, and grids with row numberers and checkbox columns.
- Ext JS 4 (April 2011) looks different, and the earliest screenshots are from
  January 2009.
- The sysadmin deck requires "Firefox/3.0.* and above" and says Internet
  Explorer is not supported, which fits the 2008-2010 era.
- `Brand_Name_2012127-FINAL.pdf` (the Ext JS 4 purchase) is a USSOCOM / DCGS
  procurement, not NSA/XKS. It confirms the vendor family, not the version.
- I'm using Ext JS 3.4.1 (GPLv3), vendored at `www/html/ext-3.4.1/` from
  cdnjs `extjs/3.4.1-1`. It keeps the 2.x look.
- Icons are the famfamfam Silk set (CC-BY 2.5), at `www/html/icons/silk/`. The
  toolbar and menu icons in the screenshots match Silk.

## GUI versions seen in the documents

| Version | Main sources | Notes |
|---|---|---|
| Jan 2009 | `unofficial-xks-user-guide.pdf` | Top toolbar: Home / Users / Workflow Central / Search / Results / Statistics / Preferences / Help. Plain forms. |
| Jul 2009 | `using-xks-to-enable-tao.pdf` | Many forms: Full Log, Logins and Passwords, HTTP Activity. Justification is a textarea. |
| Oct 2009 | `cne-analysis-in-xks.pdf` (slides 22-25) | Full Firefox-window screenshots. Toolbar adds Admin, Tagging, Tasking, My Account, XK Forum, Help ▾. Bold required labels, "Recent Justifications", a blue band behind the search-specific fields, "[IP Address Field Builder]" links, and a collapsed Help panel above each form. Backend URLs are JSP / `.do` (Java). |
| 2011 "New GUI" | `xks-workflows-2011.pdf` (slides 7-8) | No top toolbar: a single Navigation Menu tree (Explorer / Search / Results / Statistics / Tagging), a Preferences + Help bar, and a new home page that links to "the old GUI". |

**Approach (agreed): a patchwork.** The window shell is the 2011 one, because
that's the only full layout with the tree. Forms and grids use the newest
version that has a screenshot. Code comments cite the source and version.

The green bands in the TAO and Keylogger slides are the presenters' own
highlighting: some slides are collages of pasted crops. The GUI band seen in
the CNE slide is light blue.

## Project layout

```
code/opt/xkeyscore/www/
  html/
    ext-3.4.1/            Ext JS 3.4.1 (core, CSS, default theme images)
    icons/silk/           famfamfam Silk icons
  secured/
    index.html            the GUI
    css/xks.css           banners, home page, search form, grid styles
    js/xks/util.js        Xks.map (Ext 3 has no Ext.map)
    js/ux/TimeSpinner.js  HH:MM spinner (stand-in for Ext.ux.form.SpinnerField)
    js/data/navtree.js    Navigation Menu tree (sources per group)
    js/data/searches.js   search form definitions (sources per form)
    js/data/sample.js     fake result data generator
    js/data/workflows.js  Workflow Central data: databases, group-by columns, follow-on scripts
    js/xks/SearchForm.js  search form builder + Search Value Help
    js/xks/ResultsGrid.js My Recent Results + per-query results grid
    js/xks/Workflow.js    Workflow Request Wizard, My Workflows, workflow XML
    js/xks/SessionViewer.js  X-KEYSCORE C2C Session Viewer and its formatters
    js/xks/App.js         viewport, banners, home page, tabs, fake federated query
ocr/                      Tesseract OCR of every scanned PDF, page-marked
```

The other folders under `code/` (`export/data/xkeyscore`, `opt/xkeyscore/...`,
`xks_data`) are the directory layout from `xks-system-administration.pdf`.
Each has a `note.txt` quoting the deck.

## What's built

### Shell (2011, `xks-workflows-2011.pdf` slide 8)
- The black audit banner ("This system is audited for USSID 18 and Human Rights
  Act compliance") and the orange classification banner, at top and bottom.
- The "XKEYSCORE  Welcome: <user>  switch users" line.
- A collapsible Navigation Menu on the west, and a Preferences / Help toolbar
  above a tab panel.
- Home tab: "Welcome to the *New* XKEYSCORE Home Page!" plus the Human Rights
  Act / USSID 18 / USSID 9 notice. The left edge of that notice is cut off in
  the screenshot, so the first letter or two of each line was restored.

### Navigation Menu tree
- **Explorer**: Home, Workflow Central (Request, My Workflows).
- **Search > Classic > MultiSearch**: IP Addresses, Mac Address, Username.
- **Search > Classic > Classic A-M** (union of Jan and Oct 2009): ASF and WMV
  Metadata, Alert, BlackBerry, CNE, Call Logs, Category DNI, Cellular DNI, Cisco
  Passwords, DNS, Document Metadata, Document Tagging, Email Addresses,
  Extracted Files, Full Log DNI, HTTP Activity, IKE Parser, IRC Cafe
  Geolocation, Logins and Passwords, Microplugin Metadata.
- **Search > Classic > Classic N-Z**: KEYLOGGER (sic, under N-Z), Network Logs,
  PDF Metadata, PILBEAM, PPF VoIP Metadata, Passport, Phone Number Extractor,
  RBGAN, REGISTRY, RTP, Radius Logs, SIP, SSL Parser, TOR Log, Tech Strings in
  Documents, User Activity, WLAN, Web File Transfer, Web Proxy, Wireshark.
- **Search > Common**: Category DNI, Document Metadata, Email Addresses. The
  rest of the list is cut off in the screenshot.
- **Search**, other folders (contents unknown): Dictionary Hits, File
  Transfer, Network Management, UserActivity, VoIP, Wireless.
- **Results**: My Recent Results, My Previous Results, My Ongoing Results,
  My Downloads.
- **Statistics**: Link Summarization.
- **Tagging**: Local Tagging, Tech Extractor Tagging (cut off).
- The GUI sorts items ASCII-wise (`CNE` before `Call Logs`, `PDF` before
  `PILBEAM` before `Passport`); the tree keeps that order.

### Search forms
Shared parts of every form:
- A toolbar: **Fields ▾** (show/hide individual fields), **Advanced
  Features ▾**, **Show Hidden Search Fields**, **Clear Search Values**,
  **Reload Last Search Values**. MultiSearch forms have no Advanced Features
  menu.
- A monospace title, e.g. `Search: HTTP Activity`.
- The header rows: **Query Name**, **Justification** (textarea plus "Recent
  Justifications"), Additional Justification, Miranda Number, then
  **Datetime** (1 Day / 1 Week / 1 Month / Custom), Start date + time,
  Stop date + time, and a help icon.
- The shared footer: IP Address (From) and IP Address (To), each with an
  [IP Address Field Builder] link; Port (From); Port (To); and Country with
  an Either/From/To combo.
- Optional fields stay hidden until "Show Hidden Search Fields" is clicked,
  and then appear with an enable checkbox in front (TAO slide 24).

Forms reconstructed field by field:

| Form | Source |
|---|---|
| Multiple Search: IP Addresses / Mac Address / Username | UG p.3-5 (Content Must Exist, Max Results for a Single DB, Search Forms checklist with Clear, Save in / Load From my Favorites); Snippet Must Exist from tracking-targets-on-online-social-networks.pdf (OSN) slide 16 |
| CNE | CNE slide 22 (Collection Technique, Username<realm>) |
| KEYLOGGER | CNE slide 23 (Collection Technique, Process Name, Window Name, Session ID, Process ID, Time, Key Strokes, Username<realm>); results grid per CNE slide 24 (Input Source, Proc Name, Wndw Name, Sess ID, Proc ID, Time, Key Strokes) |
| Email Addresses | UG p.7 (Email Username, @Domain) |
| Extracted Files | UG p.8 (Extracted Filename, Extension, File Type (MIME Type), Is Obfuscated(yes/no), Obfuscated Real File Extension, File Size on Disk, Date File Created, File Last Access, File Last Modified) |
| Logins and Passwords | UG p.10, TAO 17/38 (User Name, Password, Domain) |
| Phone Number Extractor | UG p.10-12 (Phone Number, Number Type, Country Code, Area) |
| HTTP Activity | UG p.14, TAO 24 (HTTP Type, Host + [Populate with URL Field Builder], URL Path, URL Args, Search Terms, \*Language\*, Character Encoding, Content Start/Stop/Total, Referer, X Forwarded For, optional Browser) |
| Document Metadata | UG p.16 (Document Type, Encrypted?, Corrupted?, Filename, Extension, \*Subject\*, \*Creation Time\*, \*Last Modified Time\*, \*Unique ID\*, Author, Last Author) |
| Full Log / Full Log DNI | TAO 11/20 (Client IP, Username, Attribute Info, Data Length) |
| User Activity | OSN 13 (Search For, Search Value, Realm); results grid per OSN 16 (Search For, Search Value, @Domain, Realm, Subject, Attribute Type, Chain, Attribute Value, Activity, Source) |
| Web File Transfer | free-file-uploaders.pdf 33 (File URL, Filename, File Type, Description, File Size) and 32 (Transfer Type, Site Name); results per FFU 24 (File URL, Filename, Transfer Type, Upload ID, Delete ID, Site Name) |
| Cellular DNI | analyzing-mobile-cellular-dni-in-xks.pdf 8 (Interface, Hit Status, IMSI, KI, TMSI, IMEI, MCC; cut off below); results per slide 9 (IMSI, Application Info, Application, AppID (+Fingerprints)) |
| Tech Strings in Documents | results grid only: CNE 30 / xks-tech-extractor-2010.pdf 19 (Event Type, Tech Dictionary, Tech Name, Tech Value, Tech Filename, Application); the form fields are inferred from those columns |

All other tree entries open a placeholder form with only the shared rows, and
it says so on the page.

**Search Value Help** (Advanced Features menu) is the operator table copied
word for word from UG p.24.

### Results
- **Submitting a search fakes the federated query.** The row appears in
  *My Recent Results* with Status "running", and **Num DBs** counts up to
  "51 of 51" (the number on workflows slide 7), then the rows are generated.
- **My Recent Results**: Help, Actions ▾, View ▾; columns are a checkbox,
  Query Name (link), Search Type, Status, Num Results, Num DBs, Datetime
  Submitted, Query ID. It lists the last 24 hours (inferred).
- **My Previous Results** (CNE slide 16, the Oct 2009 "All Previous
  Results" tab): Help, Actions ▾, View ▾, a yellow **FILTERS:** button
  listing the filters in force; columns Query Text, Actions (red X,
  page-with-pencil, database icons = delete / repopulate / open results,
  a guess), Status ("finished", as on the slide), Query Type (the internal
  key, e.g. `extracted_files`), Num DBs, Datetime Submitted, then Query Name
  (off the slide's edge, inferred). Below it a closable **Query Text** panel
  shows the full WHERE clause of the selected rows, e.g.
  `WHERE datetime >= '…' AND datetime <= '…' AND ( ext_extension = 'ppt' )`.
  Five made-up older queries (2-20 days back) are seeded so it isn't empty.
- **My Ongoing Results**: same layout (inferred); queries still running plus
  those started by a standing (recurring) workflow.
- **My Downloads** (no screenshot; all inferred): Filename, Query Name,
  Sessions, Size, Destination (Local / Agility), Status, Datetime
  Requested, Actions (save, delete). Filled by the session viewer's
  *Send to: Download Session* and by a workflow's **Download Sessions**
  action (Filename, ROWR and Send To Agility are honoured; GZIP is not).
- **My Archived Results** and the **All ...** views (All Downloads, All
  Recent / Previous / Archived / Ongoing Results) come from the Oct 2009 tree
  (CNE slide 12) and are added to the 2011 Results folder in that order.
  The All views list every user's queries / downloads and add a User column
  (inferred). "Archive Results" in the row menu now works: it moves a
  finished query from Previous / Recent to Archived. Made-up users
  `xksuser2` / `xksuser3` own a few seeded queries (one still running at
  37 of 51 DBs) and two downloads.
- Each results tab filters its own copy of the query list, so a filter in
  one tab doesn't hide rows in another; rename / delete apply everywhere.
- **Right-click menu** (workflows slide 7):
  - *Result Grid Row Actions*: View Metadata, View Metadata (New Window),
    Delete Row, Rename Query, Share Results.., Repopulate this Search into
    Form, Create Workflow from this Search, Split Both Sides of Traffic,
    Archive Results.
  - *Result Grid Cell Actions*: Filter: <col> Equal '<value>',
    Filter: <col> Not Equal to '<value>', Show Full Cell Value.
- **Per-query results grid** (UG p.14): row numbers, checkbox, State, ID
  (link), Datetime, Datetime End, the search's own columns, then From/To
  IP Address, From/To Port, From/To Country (IP). Toolbar: Help, Actions ▾,
  Reports ▾ (Export to CSV), View ▾.
- **Fake data** is deterministic per query name. It uses only RFC 5737
  documentation IPs, `example.com` / `.net` / `.org` hosts and ISO
  user-assigned country codes (AA, XA-XC, ZZ). Plain (non-wildcard) values
  typed into the form appear verbatim in the rows.

### Workflow Central (xks-workflows-2011.pdf slides 2-25)

- **Request Wizard** (Explorer > Workflow Central > Request, or right-click a
  row in My Recent Results > *Create Workflow from this Search*, which fills
  the wizard from that query). It is a 7-step card window with
  Cancel / Prev ... Next / Submit along the bottom:
  1. Search Type: a combo with the description box and a collapsed
     *Search Type Help* (slide 9).
  2. Basic Information: name, justification, Datetime row,
     *Reccurring Search* (sic) / *One Time Search* tabs at the bottom
     (slide 10). Recurring offers every 1/2/3/4/6/8/12/24 hours plus a
     start-hour offset (slide 4).
  3. Add Search Fields: the AND/OR note verbatim, a Search Field / Value /
     Remove grid, and *Single Field Search* / *Multiple Field Search* tabs
     with the green PLUS button (slides 11, 21-24). Multiple fields are
     added as "From IP Address OR To IP Address".
  4. Group Search Fields: No/Yes, Table / Global Unique Values, and the
     column checkboxes (slide 12).
  5. Select the Database(s) to query: the aliases (AUS / F6 / NZ sites) and
     the database list with the red-on-yellow TURBOPOUND warning,
     Content must exist, and Check All / Uncheck All (slides 13, 24).
  6. Follow-on Actions: Email Alert, SQL Report, Download Sessions, and
     Find and Foward VoIP (sic), each with its own argument fields
     (slides 14-17). The SQL Report action rejects SQL that isn't a
     `SELECT ... FROM %{OUTPUT_TABLE}` statement (slide 25).
  7. Workflow Review: *Workflow Values* / *Workflow XML* tabs (slide 18).
- **My Workflows** (slides 19-20): Query Type, Query Name, Last Modified,
  State and Actions columns, a "+" row expander that shows the review text,
  and a paging bar with Page Size 30. Pending rows are yellow and approved
  rows green. The action icons approve, delete, run (only once approved;
  it sends a query to My Recent Results), edit (opens the *Edit Request
  Wizard*), and open the *Workflow: name* XML window with Cancel /
  Save/Submit.
- **All Workflows** and **All Pending Workflows** come from the Oct 2009
  tree (CNE slides 12 and 30), listed between Request and My Workflows as
  on slide 30. Neither is shown open, so each one is the My Workflows grid
  over every user's workflows (All Pending: only pending ones) with a User
  column (inferred). Approving a row in All Pending Workflows takes it off
  that list. Made-up users `xksuser2` / `xksuser3` own three seeded
  workflows (one pending).
- Validation: name and justification are required, names must be unique
  per user (slide 10), and there must be at least one search field and
  one database.

### C2C Session Viewer (TAO slides 12 and 36, CNE slide 25)

To open it, double-click a row in a query's results, click the row's
envelope icon, or right-click the row and choose *View Session*. Clicking
the ID still opens the metadata window. The window has:
- the title *X-KEYSCORE C2C Session Viewer*, with *[from archive]* added
  for sessions older than 3 days;
- a paging bar: Session N of M, first/prev/next/last, refresh, and the
  "●●● Read-ahead: On" marker;
- a one-row header: Datetime, Case Notation, From IP, To IP, From Port and
  To Port (as links), Protocol, Length;
- tabs *Session* / *Header (n)* / *Meta (n)*.

The Session tab has the blue-and-gold toolbar (Formatter, Send to:
Download Session, Mode: Full Session / Snippet, Options, Search Content
with highlighting and *clear*), the "AUTO FORMATTER: app_id= ... Viewer=
... formatter. Info=" line, and the yellow **Quick Clicks** tree. Each
One-Click Search in the tree runs a new query into My Recent Results.

Formatters, picked by search type or port:
- **DNI_PRESENTER** (HTTP): the *Display Information: HTTP-GET* table
  with request line, headers, one cookie per line, Via and
  X-Forwarded-For (TAO 36). It adds *Find proxy hash* and
  *Find x-forwarded-for IP*.
- **ASCII** (telnet, `terminal/telnet/from_server(port23)`): a login
  banner (TAO 12). It adds *Find fingerprint*.
- **KEYLOGGER**: "Output columns are designated by process name/process
  id/session id", the Keystroke Legend with a Window Title row, and one
  timestamped row per burst of typing (CNE 25).
- **HEX**: a hexdump of any session.

Session content is generated from the fake row. It uses only
documentation IPs, example.* hosts, preference cookies, a generic
"Authorized users only" banner and harmless typing in Notepad, Excel,
Word and IE. *Download Session* saves the raw text.

### Tech Extractor Tagging (Tagging folder; all inferred)

No screenshot exists. The page is built from the tasking rules in
xks-tech-extractor-2010.pdf (slides 10, 13-15). It has a form for Tech
Dictionary, Tech Name, Term, Case Sensitive, Match (Substring / Whole Word
/ Regular Expression) and Classification (REL FVEY only), plus *Add Term*.
Below that is a grid of tasked terms showing the date each was tasked and
who tasked it. The seven dictionary/name/term combinations seen on CNE 30
and TE 19 are seeded, for example classic/vpn/pptp and classic/gsm/IMSI.
Tech Strings in Documents results only use terms tasked before the
session's datetime, because tagging is not retrospective (TE 13). So a
term added today won't appear in today's fake results.

### Preferences and Help (top bar; all inferred)

- **Preferences** is what the sysadmin deck calls MyXKS: "Can edit user
  settings, disable/enable access to databases, edit a search form search
  setting, and restore default settings" (slide 32). No screenshot exists,
  so it has three inferred tabs:
  - *User Settings*: Username, Default Datetime, and Default Max Results for
    a Single DB, which fills in the MultiSearch forms.
  - *Databases*: a checkbox per database. Unchecked ones are greyed out in
    the Request Wizard.
  - *Search Form Settings*: a Datetime range per form and Show Hidden
    Search Fields on open.

  There are also Save and Restore Default Settings buttons. Settings are
  kept in this browser's localStorage.
- **Help** is now a menu of the four items slide 32 lists: Help
  Documentation, XK Forum, Account Maintenance, About XKEYSCORE. The first
  three open pages that quote their source. About is a plain message box,
  since its real contents are unknown.

## Marked as inferred / not from a screenshot

These are flagged in code comments:
- The Submit / Clear buttons at the bottom of forms.
- The contents of the Advanced Features, Actions, Reports and View menus.
- The options in Additional Justification and Collection Technique.
- The Help panel text and the Field Builder dialog's contents.
- The datetime-range options beyond those seen (1 Day, 1 Week, 1 Month,
  Custom).
- The Search Type column in My Recent Results (implied by slide 7). Status
  "finished" is from CNE slide 16; "running" is a guess in the same style.
- The Recent (24 h) / Previous (finished) / Ongoing split, the Previous
  Results Actions-icon meanings and Query Name column, the FILTERS: menu
  contents, and all of My Downloads; the User column and contents of the
  All ... views; what Archive Results does; the contents of All Workflows /
  All Pending Workflows.
- New forms: the other Search For options (only "username" is seen), where
  Transfer Type / Site Name sit in the Web File Transfer band, any Cellular
  DNI fields below MCC (not visible), and the whole Tech Strings in
  Documents form. These slides draw the search band green (Aug-Sep 2009);
  the blue Oct 2009 band is kept for consistency.
- Workflows: the Recurring Search tab's layout, the one-time wording in the
  review, the one-time `<start>`/`<stop>` and `<actions>` XML tags, most
  XML field names (only fm_ip, to_ip, to_port and fingerprint are on
  slide 20), the list of added follow-on actions, the Search Type Help
  text, and group-by columns for types other than Full Log. The fifth
  action icon is a mortarboard on slide 19; Silk has none, so
  `script_code` stands in.
- Session viewer:
  - the Header and Meta tab contents;
  - the HEX formatter and the Options menu;
  - the 3-day "[from archive]" cut-off;
  - the full keylogger app_id (the slide cuts it off at "dn_payload/k...");
  - the client-side telnet app_id;
  - the X logo in Quick Clicks, drawn as an inline SVG.

## Not built yet

- The Oct 2009 tree (CNE slides 12, 16-18) also has Statistics → Signal
  Acquisition, Tasking → VoIP Tasking and My Account. Its extra Results
  and Workflow Central entries have been added; these have not.
- Results manipulation (TAO slide 29, CNE slides 11 / 16 / 18):
  - Built: the column header menu (ResultsMenu.js), with Sort Ascending /
    Descending, Filters > (a "contains" box), Color By, Group By > (dedupe,
    per TAO 29), Show/Hide... and AutoFit Column Width. The submenu contents
    are inferred.
  - Not built: the Histogram, Pivot Data and Histogram Grid panels. The
    three items are in the menu where slide 29 has them, but each only says
    it has not been reconstructed. Also not built: the FILTERS: button with its tool icons on the
    per-query grid, and the paging bar. A safety classifier stopped the
    panels file twice, so they are on hold.
- Workflows don't run on their own schedule; *run* is manual. Edited
  workflow XML is not read back. (Left as is by choice, 2026-10-20.)
- Statistics: the 2011 tree has Link Summarization; the Oct 2009 tree (CNE
  slide 17) also has a Signal Acquisition folder, shown collapsed. Both are
  in the tree now, but neither has a screenshot. Link Summarization's only
  other mention is the sysadmin "link summary" service ("sets up xks link
  summary GUI", slide 90), and its page says so. "Histo: Query Type" (UG
  p.18) is an open tab with a Clear Selection toolbar while the Results
  folder is showing, so it looks like a column histogram from a results
  list. It belongs with the results tools above, not with Statistics.
- Tagging > Local Tagging: no screenshot; its page quotes the only other
  mention, the sysadmin "local tagging" service ("checks and/or loads
  tagging file", slide 85).
- The Oct 2009 VoIP Tasking and My Account entries, and the contents of
  the empty search folders (Dictionary Hits, File Transfer, Network
  Management, UserActivity, VoIP, Wireless), Signal Acquisition and Local
  Tagging: the PDFs name them but show nothing more.
- The remaining placeholder search forms.
- The session viewer's pop-out browser window (CNE 25 shows it as a
  separate Firefox window, `layouts/popOutLayout.jsp`); here it is an Ext
  window inside the page. (Left as is by choice, 2026-10-20.)
- Server-side reconstruction from `xks-system-administration.pdf`
  (`xscore.cfg`, `bashrc`, crontab, the beacon scripts and the like). The
  placeholder files exist but are empty.

## Testing status

Everything has been tested in Chrome (2026-10-20), with no console errors:
- all 52 tree leaves open (real forms, placeholders, and the "not built" views);
- the Oct 2009 form styling: bold labels, Justification textarea, Help panel,
  blue band, Field Builder window, Search Value Help, optional fields with
  Show Hidden Search Fields;
- CNE, KEYLOGGER and Full Log forms;
- Submit -> fake federated query -> My Recent Results -> session grid
  (searched values appear in their columns), Equal/Not Equal filters,
  Clear Search Values, Reload Last Search Values.
- Workflow Central: all seven wizard steps with their validation, Create
  Workflow from this Search, My Workflows approve / run / edit / XML /
  expander, and the pending (yellow) and approved (green) rows.
- Session viewer: the HTTP, KEYLOGGER and telnet sessions, paging, HEX,
  search highlight, Snippet mode, One-Click Searches, and opening by row
  double-click. The last fix (telnet sessions found by *To Port 23* now
  keep the row's direction) is now browser-tested too.
- Grid filtering (rewritten in `ResultsGrid.js`): Equal / Not Equal,
  stacked filters, value-set filters, "contains" filters, Group By
  de-duplication and paging, all checked against expected row counts.
  The session viewer pages through the filtered rows only.
- Fixed: Ext 3.4's deferred row rendering dropped rows added while a
  results tab was still being laid out. Our grids now render rows
  immediately.
- Previous / Ongoing Results and My Downloads: the 5 seeded queries list
  with CNE-style Query Text; a running query shows in Recent and Ongoing,
  then moves to Previous when it finishes; a standing workflow's query
  stays in Ongoing and its Download Sessions action adds `wf_dl.txt`
  (Agility, "sent"); the viewer's Download Session adds a row; filtering
  Previous leaves Recent alone; rename / delete reach every tab; FILTERS:
  lists the filter in force. No console errors.
- Archived / All views: all 10 Results leaves open with the right counts;
  Archive Results moves a query from Previous to Archived in both the My
  and All views and is then disabled; deleting from All Downloads removes
  it everywhere; a new search shows in My and All Recent. No console errors.

## Tooling notes

- Most PDFs are image-only scans. They were rendered with PyMuPDF and OCR'd
  with Tesseract 5.4 (`C:\Program Files\Tesseract-OCR`); the output is in
  `ocr/`.
- OCR is good for finding pages but unreliable on small GUI labels. Field
  names were read from the rendered images instead.
- Ext JS 3 gotchas: there's no `Ext.map` (use `Xks.map`). A component's `id`
  must be passed at construction, not applied afterwards. Collapsed tree
  nodes aren't built until they're expanded.
- Python's `http.server` lets the browser cache files, so a no-cache server
  helps during development.
