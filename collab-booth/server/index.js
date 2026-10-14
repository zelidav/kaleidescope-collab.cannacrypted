import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { FRAME_PATH, PHOTO_DIR, flushLog, getEntry, getSettings, listEntries, photoPath, updateSettings } from './store.js';
import { generateCaption, getLastPhoto, setLastPhoto } from './caption.js';
import { PostError, approvePost, limitStatus, rejectPost, resumePending, submitPost, waitForSettled } from './posts.js';
import { credentials, publishingLimit, tokenHealth } from './instagram.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = process.env.ADMIN_PIN || '';

if (!ADMIN_PIN) console.warn('[boot] ADMIN_PIN is not set — /admin is locked until you set it.');

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '15mb' }));

const b64 = (dataUrlOrB64) => String(dataUrlOrB64 || '').replace(/^data:[^;]+;base64,/, '');

// ---- Public kiosk API -------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/config', async (_req, res) => {
  const s = getSettings();
  const limit = await limitStatus(s.testMode);
  res.json({
    accountHandle: s.accountHandle,
    aiEnabled: s.aiEnabled,
    captionTemplate: s.captionTemplate,
    hashtags: s.hashtags,
    regenLimit: s.regenLimit,
    defaultCamera: s.defaultCamera,
    defaultCountdown: s.defaultCountdown,
    resetSeconds: s.resetSeconds,
    approvalMode: s.approvalMode,
    testMode: s.testMode,
    dryRun: credentials(s.testMode).dryRun,
    gesture: s.gesture,
    frameVersion: frameVersion(),
    publishingBlocked: limit.blocked,
  });
});

app.post('/api/caption', async (req, res) => {
  const s = getSettings();
  const image = b64(req.body?.image);
  if (!image) return res.status(400).json({ error: 'Missing image' });
  if (!s.aiEnabled) {
    setLastPhoto(image);
    return res.json({ caption: '', source: 'disabled' });
  }
  res.json(await generateCaption({ imageBase64: image, stylePrompt: s.stylePrompt }));
});

const publicEntry = (e) =>
  e && {
    id: e.id,
    status: e.status,
    permalink: e.permalink,
    collabFailed: e.collabFailed,
    downloadUrl: `/p/${e.id}`,
  };

app.post('/api/post', async (req, res) => {
  try {
    const b = req.body || {};
    const entry = await submitPost({ ...b, imageBase64: b64(b.image) });
    res.json(publicEntry(await waitForSettled(entry.id, 25000)));
  } catch (err) {
    if (err instanceof PostError) return res.status(err.status).json({ error: err.message });
    console.error('[api/post]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/post/:id', (req, res) => {
  const e = getEntry(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(publicEntry(e));
});

// Frame overlay: uploaded PNG on the volume, else the bundled default.
function frameVersion() {
  try {
    return Math.round(fs.statSync(FRAME_PATH).mtimeMs);
  } catch {
    return 0;
  }
}

app.get('/api/frame.png', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  if (fs.existsSync(FRAME_PATH)) return res.sendFile(FRAME_PATH);
  const fallback = [path.join(DIST, 'frame-default.png'), path.join(ROOT, 'public', 'frame-default.png')].find((p) =>
    fs.existsSync(p),
  );
  return fallback ? res.sendFile(fallback) : res.status(404).end();
});

// Public photo files (Instagram fetches these by URL; guests download them via QR).
app.use('/media', express.static(PHOTO_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

app.get('/p/:id', (req, res) => {
  const id = req.params.id;
  const ready = /^[a-zA-Z0-9-]{8,64}$/.test(id) && fs.existsSync(photoPath(id));
  const e = ready ? getEntry(id) : null;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your B*NG Garden photo</title>
${ready ? '' : '<meta http-equiv="refresh" content="15">'}
<style>body{margin:0;background:#0f1a12;color:#fff8ec;font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:24px}
img{width:100%;max-width:540px;border-radius:16px;display:block;margin:16px auto}
a.btn{display:inline-block;background:#f2c94c;color:#0f1a12;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;margin:8px}
p{opacity:.85;max-width:540px;margin:8px auto;line-height:1.4}</style></head><body>
<h1>🌷 The B*NG Garden</h1>
${
  ready
    ? `<img src="/media/${id}.jpg" alt="Your photo from the B*NG Garden">
<a class="btn" href="/media/${id}.jpg" download="bng-garden-${id.slice(0, 8)}.jpg">Download photo</a>
${e?.permalink ? `<a class="btn" href="${escapeHtml(e.permalink)}">View on Instagram</a>` : ''}
<p>Tip: on iPhone, press and hold the photo and choose “Save to Photos”.</p>`
    : '<p>Your photo is still uploading from the booth. This page refreshes automatically.</p>'
}
</body></html>`);
});

// ---- Admin -----------------------------------------------------------------

const adminToken = () => crypto.createHmac('sha256', ADMIN_PIN).update('jbd-collab-booth-admin').digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const failures = new Map(); // ip -> { count, until }
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip;
  const f = failures.get(ip);
  if (f && f.until > Date.now()) return res.status(429).json({ error: 'Too many attempts. Wait a few minutes.' });
  if (ADMIN_PIN && safeEqual(req.body?.pin || '', ADMIN_PIN)) {
    failures.delete(ip);
    return res.json({ token: adminToken() });
  }
  const count = (f?.count || 0) + 1;
  failures.set(ip, { count, until: count >= 8 ? Date.now() + 5 * 60000 : 0 });
  res.status(401).json({ error: 'Wrong PIN' });
});

const admin = express.Router();
admin.use((req, res, next) => {
  const token = req.get('x-admin-token') || req.query.token;
  if (ADMIN_PIN && token && safeEqual(token, adminToken())) return next();
  res.status(401).json({ error: 'Unauthorized' });
});

admin.get('/settings', (_req, res) => res.json(getSettings()));

admin.put('/settings', (req, res) => {
  const p = req.body || {};
  const clean = { ...p };
  if ('defaultCountdown' in p) clean.defaultCountdown = [3, 5, 10].includes(+p.defaultCountdown) ? +p.defaultCountdown : 5;
  if ('defaultCamera' in p) clean.defaultCamera = p.defaultCamera === 'environment' ? 'environment' : 'user';
  if ('photoTags' in p) {
    clean.photoTags = (Array.isArray(p.photoTags) ? p.photoTags : String(p.photoTags).split(/[\s,]+/))
      .map((t) => String(t).replace(/^@/, '').trim().toLowerCase())
      .filter(Boolean);
  }
  if (p.gesture) {
    const g = p.gesture;
    clean.gesture = {
      ...g,
      confidence: Math.min(0.99, Math.max(0.3, +g.confidence || 0.7)),
      holdMs: Math.min(3000, Math.max(100, Math.round(+g.holdMs || 500))),
      countdownSec: Math.min(10, Math.max(1, Math.round(+g.countdownSec || 3))),
    };
  }
  for (const k of ['regenLimit', 'resetSeconds', 'limitBuffer']) if (k in p) clean[k] = Math.max(0, Math.round(+p[k] || 0));
  res.json(updateSettings(clean));
});

admin.post('/frame', (req, res) => {
  const buf = Buffer.from(b64(req.body?.image), 'base64');
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return res.status(400).json({ error: 'Upload a PNG file' });
  fs.writeFileSync(FRAME_PATH, buf);
  res.json({ ok: true, frameVersion: frameVersion() });
});

admin.delete('/frame', (_req, res) => {
  fs.rmSync(FRAME_PATH, { force: true });
  res.json({ ok: true, frameVersion: 0 });
});

admin.post('/test-caption', async (req, res) => {
  const photo = getLastPhoto();
  if (!photo) return res.status(400).json({ error: 'No photo captured yet. Take one on the kiosk first.' });
  const stylePrompt = req.body?.stylePrompt || getSettings().stylePrompt;
  const started = Date.now();
  const result = await generateCaption({ imageBase64: photo, stylePrompt, record: false });
  res.json({ ...result, ms: Date.now() - started, photo: `data:image/jpeg;base64,${photo}` });
});

admin.get('/entries', (_req, res) => res.json(listEntries().slice(0, 500)));

const handleAction = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
admin.post('/entries/:id/approve', handleAction((req) => approvePost(req.params.id, req.body || {})));
admin.post('/entries/:id/reject', handleAction((req) => rejectPost(req.params.id)));

admin.get('/health', async (_req, res) => {
  const s = getSettings();
  const [live, test, limit] = await Promise.all([
    tokenHealth(false),
    process.env.IG_TEST_USER_ID ? tokenHealth(true) : null,
    publishingLimit(s.testMode, { fresh: true }),
  ]);
  res.json({
    live,
    test,
    limit: { ...limit, buffer: s.limitBuffer, blocked: limit.ok && limit.remaining <= s.limitBuffer },
    testMode: s.testMode,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    captionModel: process.env.CAPTION_MODEL || 'claude-haiku-5-5',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
  });
});

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

admin.get('/log.csv', (_req, res) => {
  const cols = ['createdAt', 'handle', 'email', 'aiCaption', 'captionSource', 'finalCaption', 'status', 'permalink', 'collabFailed', 'testMode', 'error', 'id'];
  const rows = [cols.join(','), ...listEntries().map((e) => cols.map((c) => csvCell(e[c])).join(','))];
  res.type('text/csv').attachment(`collab-booth-log-${new Date().toISOString().slice(0, 10)}.csv`).send(rows.join('\r\n'));
});

app.use('/api/admin', admin);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Frontend (built by Vite) -----------------------------------------------

app.use(
  express.static(DIST, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`) || file.includes(`${path.sep}mediapipe${path.sep}`)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);
app.get('/{*splat}', (_req, res) => {
  const index = path.join(DIST, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index, { headers: { 'Cache-Control': 'no-cache' } });
  res.status(503).send('Frontend not built. Run `npm run build`.');
});

resumePending();
const server = app.listen(PORT, () => console.log(`[boot] Collab Booth on :${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    flushLog();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
