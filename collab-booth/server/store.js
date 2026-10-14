// Tiny JSON-file persistence on the Railway volume (DATA_DIR).
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const PHOTO_DIR = path.join(DATA_DIR, 'photos');
export const FRAME_PATH = path.join(DATA_DIR, 'frame.png');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const LOG_PATH = path.join(DATA_DIR, 'log.json');

fs.mkdirSync(PHOTO_DIR, { recursive: true });

export const DEFAULT_STYLE_PROMPT =
  "You write one short, playful Instagram caption (max 25 words) for a photo taken at the Jerome Baker Designs 'B*NG Garden' at Hall of Flowers NYC. The B*NG Garden is five giant hand-blown glass b*ngs set in grass and flowers behind a white picket fence. Always spell it B*NG, never the full word. Write as the brand welcoming a guest, using the literal placeholder {handle} where the guest's Instagram handle goes, e.g. 'Guess who stopped by the B*NG Garden? {handle}...' Vary the opening every time and don't reuse 'Guess who stopped by' in back-to-back captions. Be specific to THIS photo: energy, poses, expressions, group size, how they're interacting with the glass, fence, flowers or grass. Garden and glass wordplay welcome (blooming, in full bloom, fresh-picked, growing season, glass act, hand-blown). Never comment on physical appearance, body, age, ethnicity, clothing fit or attractiveness. Never mention smoking, getting high, or drug use. No hashtags. At most one emoji. Output only the caption.";

export const DEFAULT_SETTINGS = {
  accountHandle: 'jeromebakerdesigns',
  aiEnabled: true,
  stylePrompt: DEFAULT_STYLE_PROMPT,
  captionTemplate:
    '{ai_caption}\n\n📍 The B*NG Garden by @jeromebakerdesigns at @hallofflowers NYC\n{hashtags}',
  hashtags: '#HallOfFlowers #JeromeBaker #BNGGarden #GlassArt #HandBlownGlass',
  // Accounts tagged on the photo itself (Instagram user_tags). Usernames, no @.
  photoTags: [],
  regenLimit: 3,
  defaultCamera: 'user', // 'user' (front) | 'environment' (rear)
  defaultCountdown: 5, // 3 | 5 | 10
  resetSeconds: 20,
  approvalMode: false,
  testMode: false, // post to the IG_TEST_* account instead of the real one
  limitBuffer: 5, // hold posts when this many (or fewer) publishes remain in the 24h window
  gesture: {
    enabled: true,
    confidence: 0.7,
    holdMs: 500,
    countdownSec: 3,
    sound: true,
  },
};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

let settings = merge(DEFAULT_SETTINGS, readJson(SETTINGS_PATH, {}));

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    if (!(k in base)) continue;
    const b = base[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? { ...b, ...(v || {}) } : v;
  }
  return out;
}

export function getSettings() {
  return settings;
}

export function updateSettings(patch) {
  settings = merge(settings, patch);
  writeJson(SETTINGS_PATH, settings);
  return settings;
}

// ---- Session log ---------------------------------------------------------

let log = readJson(LOG_PATH, []);
let saveTimer = null;

function persistLog() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeJson(LOG_PATH, log), 50);
}

export function flushLog() {
  clearTimeout(saveTimer);
  writeJson(LOG_PATH, log);
}

export function listEntries() {
  return log;
}

export function getEntry(id) {
  return log.find((e) => e.id === id);
}

export function addEntry(entry) {
  log.unshift(entry);
  persistLog();
  return entry;
}

export function updateEntry(id, patch) {
  const e = getEntry(id);
  if (!e) return null;
  Object.assign(e, patch, { updatedAt: new Date().toISOString() });
  persistLog();
  return e;
}

export function photoPath(id) {
  return path.join(PHOTO_DIR, `${id}.jpg`);
}
