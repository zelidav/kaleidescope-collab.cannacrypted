// Post pipeline: save photo -> (approval / limit hold) -> serial publish queue with retries.
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { buildCaption, cleanHandle, isValidHandle } from '../shared/caption.js';
import { addEntry, getEntry, getSettings, listEntries, photoPath, updateEntry } from './store.js';
import { bumpLimitCache, publishPhoto, publishingLimit } from './instagram.js';

const events = new EventEmitter();
events.setMaxListeners(100);

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const RETRY_DELAYS_S = [20, 45, 90, 180, 300, 600, 900];

// Statuses: pending_approval | held_limit | queued | publishing | retrying | posted | failed | rejected
const SETTLED = new Set(['pending_approval', 'held_limit', 'posted', 'failed', 'rejected']);

export function publicPhotoUrl(id) {
  return `${PUBLIC_BASE_URL}/media/${id}.jpg`;
}

function set(id, patch) {
  const e = updateEntry(id, patch);
  events.emit(id, e);
  return e;
}

export class PostError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Is publishing currently blocked by the 24h cap? */
export async function limitStatus(testMode) {
  const s = getSettings();
  const limit = await publishingLimit(testMode);
  const blocked = limit.ok && limit.remaining <= s.limitBuffer;
  return { ...limit, buffer: s.limitBuffer, blocked };
}

export async function submitPost({ id, imageBase64, handle: rawHandle, email, aiCaption, captionSource, consent }) {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id || '')) throw new PostError('Bad id');
  const existing = getEntry(id);
  if (existing) return existing; // offline-queue retry: idempotent

  const handle = cleanHandle(rawHandle);
  if (!isValidHandle(handle)) throw new PostError('Invalid Instagram handle');
  if (consent !== true) throw new PostError('Consent required');
  if (!imageBase64 || imageBase64.length > 12_000_000) throw new PostError('Missing or oversized image');

  const buf = Buffer.from(imageBase64, 'base64');
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new PostError('Image must be a JPEG');
  fs.writeFileSync(photoPath(id), buf);

  const s = getSettings();
  const ai = s.aiEnabled ? String(aiCaption || '').slice(0, 400) : '';
  const finalCaption = buildCaption({ template: s.captionTemplate, aiCaption: ai, handle, hashtags: s.hashtags });

  const entry = addEntry({
    id,
    createdAt: new Date().toISOString(),
    handle,
    email: String(email || '').trim().slice(0, 200),
    aiCaption: ai,
    captionSource: ai ? captionSource || 'ai' : 'fallback',
    finalCaption,
    testMode: s.testMode,
    status: 'queued',
    permalink: null,
    collabFailed: false,
    error: null,
    attempts: 0,
  });

  if (s.approvalMode) return set(id, { status: 'pending_approval' });
  if ((await limitStatus(s.testMode)).blocked) return set(id, { status: 'held_limit' });
  enqueue(id);
  return entry;
}

/** Wait until the entry settles (or the timeout passes) and return it. */
export function waitForSettled(id, timeoutMs) {
  return new Promise((resolve) => {
    const e = getEntry(id);
    if (!e || SETTLED.has(e.status)) return resolve(e);
    const done = (entry) => {
      if (entry && !SETTLED.has(entry.status)) return;
      clearTimeout(timer);
      events.off(id, done);
      resolve(getEntry(id));
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    events.on(id, done);
  });
}

// ---- Admin actions --------------------------------------------------------

export async function approvePost(id, { caption, force = false } = {}) {
  const e = getEntry(id);
  if (!e) throw new PostError('Not found', 404);
  if (!['pending_approval', 'held_limit', 'failed'].includes(e.status)) throw new PostError(`Cannot approve a ${e.status} post`);
  if (caption !== undefined) e.finalCaption = String(caption).slice(0, 2200);
  if (!force && (await limitStatus(e.testMode)).blocked) return set(id, { status: 'held_limit' });
  set(id, { status: 'queued', error: null, attempts: 0 });
  enqueue(id);
  return getEntry(id);
}

export function rejectPost(id) {
  const e = getEntry(id);
  if (!e) throw new PostError('Not found', 404);
  if (['posted', 'publishing'].includes(e.status)) throw new PostError(`Cannot reject a ${e.status} post`);
  dequeue(id);
  return set(id, { status: 'rejected' });
}

// ---- Serial publish queue --------------------------------------------------

const queue = [];
const timers = new Map();
let running = false;

function enqueue(id) {
  if (!queue.includes(id)) queue.push(id);
  pump();
}

function dequeue(id) {
  const i = queue.indexOf(id);
  if (i >= 0) queue.splice(i, 1);
  clearTimeout(timers.get(id));
  timers.delete(id);
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) await processOne(queue.shift());
  } finally {
    running = false;
  }
}

async function processOne(id) {
  const e = getEntry(id);
  if (!e || !['queued', 'retrying'].includes(e.status)) return;
  set(id, { status: 'publishing', attempts: (e.attempts || 0) + 1 });
  try {
    const s = getSettings();
    const result = await publishPhoto({
      testMode: e.testMode,
      imageUrl: publicPhotoUrl(id),
      caption: e.finalCaption,
      handle: e.handle,
      photoTags: s.photoTags,
    });
    bumpLimitCache(e.testMode);
    set(id, {
      status: 'posted',
      postedAt: new Date().toISOString(),
      mediaId: result.mediaId,
      permalink: result.permalink,
      collabFailed: result.collabFailed,
      error: result.collabFailed ? `Collab invite failed: ${result.collabError}` : null,
      dryRun: !!result.dryRun,
    });
    if (result.collabFailed) console.warn(`[post ${id}] published WITHOUT collaborator @${e.handle}`);
  } catch (err) {
    const attempts = getEntry(id).attempts;
    if (err.transient && attempts <= RETRY_DELAYS_S.length) {
      const delay = RETRY_DELAYS_S[attempts - 1];
      console.warn(`[post ${id}] transient error, retry in ${delay}s:`, err.message);
      set(id, { status: 'retrying', error: err.message, nextAttemptAt: new Date(Date.now() + delay * 1000).toISOString() });
      timers.set(id, setTimeout(() => enqueue(id), delay * 1000));
    } else {
      console.error(`[post ${id}] failed:`, err.message);
      set(id, { status: 'failed', error: err.message });
    }
  }
}

/** On boot, resume anything that was mid-flight when the server stopped. */
export function resumePending() {
  for (const e of [...listEntries()].reverse()) {
    if (['queued', 'publishing', 'retrying'].includes(e.status)) {
      updateEntry(e.id, { status: 'queued' });
      enqueue(e.id);
    }
  }
}
