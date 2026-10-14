# JBD Collab Booth

iPad kiosk for the Jerome Baker Designs **B*NG Garden** at Hall of Flowers NYC. A guest takes a photo, gets an AI caption, and the photo is posted to our Instagram with the guest invited as a **collaborator**.

**Setup and deployment: see [SETUP.md](SETUP.md).**

## Flow

Attract → camera (👍 thumbs-up or shutter; 3/5/10 s countdown) → preview (Retake / Use This) → handle screen (the caption is generated in the background; the handle fills in live) → status (accept the collab request, plus a QR code to download the photo) → back to attract after 20 s.

## Stack

- **Frontend:** React + Vite (`src/`). Camera via `getUserMedia`; canvas composite to a 1080×1350 JPEG; MediaPipe Gesture Recognizer (`@mediapipe/tasks-vision@1.1.0`, self-hosted at `/mediapipe/1.1.0/`, GPU with CPU fallback, ~10 fps). An IndexedDB outbox retries posts when wifi drops, and a service worker keeps the app shell available offline.
- **Backend:** Express (`server/`), with JSON files and photos stored on a Railway volume (`DATA_DIR`).
  - `POST /api/caption`: Anthropic Messages API (`CAPTION_MODEL`, 6 s budget, last 10 captions sent as "do not repeat"). Falls back to the template silently.
  - `POST /api/post`: saves the photo, then either holds it for approval / the publishing limit, or queues it. The serial queue creates the container with `collaborators`, waits for `FINISHED`, publishes, and records the permalink. If the collaborator is rejected, it re-publishes without one; transient errors retry with backoff.
  - `/admin`: PIN-protected queue / log (CSV) / settings / health.
- `shared/caption.js`: handle cleaning, `{handle}` filling and template assembly, shared by the server and the kiosk preview.

## Develop

```bash
npm install
npm run build          # also fetches the gesture model into dist/
ADMIN_PIN=1234 npm start   # http://localhost:3000; no IG vars = dry run
npm run dev            # Vite on :5173 with API proxy (gesture assets load from CDN in dev)
npm test
```
