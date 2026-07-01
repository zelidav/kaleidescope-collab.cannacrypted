# Collab Genetics — Internal Genetics Alignment

Internal working tool for the **Jerome Baker × The Kaleidoscope Collective** teams to align on
genetics, terpene profiles, lineage and imagery for the flower drop. **Not customer-facing** —
it may become the public page later, once fully populated and validated by the Kaleidoscope team.

Branding/palette pulled from the collab label (`TKC_Label_R2` p1): the kaleidoscope emblem +
six jewel tones (blue/yellow/green/purple/red/orange) on a holographic ring.

## How it works

- **Gated:** the static shell (this repo / GitHub Pages) carries **no genetics data**. On load it
  shows a **Team access** lock; enter the shared team password to unlock.
- **Live shared data:** after unlock, the page fetches the canonical data from the backend and
  renders it. Everyone on the team sees the same version.
- **Edit → Publish:** turn on **Edit mode**, change any field (name, type, breeder, lineage,
  terpenes, aroma, THC, notes, sources) or add images, then click **Publish live** — the change is
  saved to the backend and visible to the whole team. **Get latest** pulls the newest published
  version. Edits autosave locally as an unpublished draft until you Publish.

No JSON export/import — publishing is the whole flow.

## Architecture

```
GitHub Pages (static shell, public)          Cloud Run: kaleidescope-collab (project jbd-glass)
  index.html  ── fetch /data (X-Team-Key) ──►  GET  /check   validate password
  assets/…                                     GET  /data     canonical JSON   (key required)
  cannacrypted.json  = empty placeholder       POST /publish  overwrite JSON   (key required)
                                                     │
                                               GCS: gs://jbd-glass-kaleidescope-collab/cannacrypted.json
```

- **Frontend:** `index.html` (self-contained). API base + team-key handling live in the inline script.
- **Backend:** `server/` — Flask on Cloud Run (`us-east1`), auth via a single shared `TEAM_KEY`
  (env var), data stored as one object in a GCS bucket. `server/.publish_key.local` holds the key
  locally and is gitignored.

### Backend ops

```bash
# redeploy after editing server/
cd server
gcloud run deploy kaleidescope-collab --source . --project=jbd-glass --region=us-east1 \
  --allow-unauthenticated \
  --set-env-vars="BUCKET=jbd-glass-kaleidescope-collab,OBJECT=cannacrypted.json,TEAM_KEY=<key>"

# rotate the team password
gcloud run services update kaleidescope-collab --project=jbd-glass --region=us-east1 \
  --update-env-vars="TEAM_KEY=<new-key>"

# read/replace canonical data directly
gcloud storage cat  gs://jbd-glass-kaleidescope-collab/cannacrypted.json
gcloud storage cp cannacrypted.json gs://jbd-glass-kaleidescope-collab/cannacrypted.json
```

## Going customer-facing later

When validated, flip this to public by baking the (approved) data back into the page and removing
the lock — or keep the backend and just drop the gate on `/data`. Ask before doing this; the whole
point right now is that it stays internal.
