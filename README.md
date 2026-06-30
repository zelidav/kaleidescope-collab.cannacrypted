# kaleidescope-collab.cannacrypted

Interactive, editable strain reference for JBD / Dragonfly menu planning — built from the
**New Strains — Breeder, Lineage & Terpene Report** (June 2026). Hosted under the
`cannacrypted` schema, call id **`kaleidescope-collab.cannacrypted`**.

10 strains with breeder of record, lineage, dominant terpene profiles (color-coded),
aroma, typical THC, sourcing flags, notes, and external source links — all editable
in the browser, with image slots per strain.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The site. Self-contained — no build step, no dependencies. Open it directly or serve it. |
| `cannacrypted.json` | The data, in the `cannacrypted` schema. Edit this to change the defaults baked into the page. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. |

## Deploy to GitHub Pages

1. Create a repo (e.g. `kaleidescope-collab.cannacrypted`) and push these files to the `main` branch root.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
3. Your page goes live at `https://<user>.github.io/<repo>/` within a minute or two.

```bash
git init
git add index.html cannacrypted.json README.md .nojekyll
git commit -m "cannacrypted: kaleidescope-collab strain report"
git branch -M main
git remote add origin https://github.com/<user>/kaleidescope-collab.cannacrypted.git
git push -u origin main
```

## How editing works

The page is a static site, so edits are saved in **your browser** (localStorage key
`kaleidescope-collab.cannacrypted`) — they survive reloads on the same machine/browser.

- **✎ Edit mode** — click any field (name, type, breeder, lineage, terpenes, aroma, THC,
  notes, flags, sources) to edit inline. Changes autosave locally.
- **Images** — in Edit mode each card shows **URL / Upload / Clear**. Paste a hosted image
  URL, or upload a local file (stored inline as a data URL).
- **⤓ Export JSON** — download the current state as `cannacrypted.json`. Commit it back to
  the repo to make your edits the new defaults for everyone.
- **⤒ Import JSON** — load a previously exported file.
- **⤓ Download HTML** — a self-contained snapshot with your current edits baked in.
- **↺ Reset** — clears local edits back to the committed report.

To make edits permanent for all visitors: edit on the page → **Export JSON** → replace
`cannacrypted.json` in the repo → also paste that JSON into the `<script id="seed">` block
in `index.html` (or just re-run the one-liner below) → commit.

```bash
# re-bake cannacrypted.json into index.html's seed block
python3 - <<'PY'
import json,re
data=open('cannacrypted.json').read().strip()
html=open('index.html').read()
html=re.sub(r'(<script id="seed" type="application/json">)(.*?)(</script>)',
            lambda m:m.group(1)+"\n"+data+"\n"+m.group(3), html, flags=re.S)
open('index.html','w').write(html)
print('re-baked')
PY
```

## Sourcing caveats

Lineages reflect breeder-of-record claims and the most widely documented pedigrees as of
mid-2026. Several names (Subzero, Lime, MOB, Blue Nerdz) are used by multiple breeders and
are flagged on their cards — confirm the cut and batch COA before committing anything to
packaging. Terpene and THC figures are directional, not guaranteed.
