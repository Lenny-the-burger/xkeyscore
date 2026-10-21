# XKEYSCORE web GUI reconstruction

A frontend-only rebuild of the XKEYSCORE web interface, made from the PDFs
in this folder. It uses Ext JS 3.4.1 and the famfamfam Silk icons, both
included in the repo. There is no build step, no backend and no internet
access needed. All data is fake: RFC 5737 IPs, `example.*` domains and
made-up users.

See [PROGRESS.md](PROGRESS.md) for what is built, where each part comes
from and what is inferred.

## Starting it

You need Python 3 and a current browser (tested in Chrome).

1. From this folder, serve `code/opt/xkeyscore/www`:

   ```
   python -m http.server 8643 --bind 127.0.0.1 --directory code/opt/xkeyscore/www
   ```

   Any static web server works, as long as its root is that `www` folder;
   the page loads `../html/...` for Ext JS and the icons. Any free port works
   too.

2. Open <http://127.0.0.1:8643/secured/index.html>.

3. Stop the server with Ctrl+C.

If a change to the code doesn't show up, do a hard refresh (Ctrl+F5); the
plain Python server lets the browser cache files.

## Things to try

- **Search:** open a form from *Search > Classic*, fill in Query Name,
  Justification and a field, then *Submit*. The query appears in *Results >
  My Recent Results* and counts up its databases. Click its name when it
  finishes to see the rows.
- **Results grid:** double-click a row for the session viewer. Click an ID
  for metadata. Right-click a cell for filters. Use the ▾ on a column header
  for Sort, Filters, Color By, Group By, Show/Hide and AutoFit.
- **Workflows:** *Explorer > Workflow Central > Request* opens the 7-step
  wizard. Approve and run the result from *My Workflows*.
- **Other pages:** *Preferences* and the *Help* menu are on the top bar.
  *Tagging > Tech Extractor Tagging* lets you task terms.

Items with no source behind them say "has not been reconstructed yet".

## State

Everything you do lives in the page and is gone after a reload. The seeded
example queries, workflows and downloads come back each time. The one
exception is *Preferences*, which is saved in the browser's localStorage. Use
*Restore Default Settings* there to reset it.

## Layout

```
code/opt/xkeyscore/www/
  html/                 Ext JS 3.4.1 and Silk icons (vendored)
  secured/index.html    the app
  secured/css/xks.css
  secured/js/data/      tree, search forms, fake data, workflow lists
  secured/js/xks/       app code (App.js wires it together)
ocr/                    OCR text of the PDFs, used to find sources
```

The rest of `code/` (config, beacon, bin.shells, xks_data and so on) is the
start of a later server-side pass. Most of it is still empty placeholders
and short `note.txt` files.
