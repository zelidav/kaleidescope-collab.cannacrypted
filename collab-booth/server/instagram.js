// Instagram Graph API (Instagram account linked to a Facebook Page).
const VERSION = process.env.GRAPH_API_VERSION || 'v24.0';
const HOST = process.env.GRAPH_API_HOST || 'https://graph.facebook.com';

export class GraphError extends Error {
  constructor(message, { status, code, subcode, transient, body } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.subcode = subcode;
    this.transient = !!transient;
    this.body = body;
  }
}

// Rate limit / temporary / server errors worth retrying later.
const TRANSIENT_CODES = new Set([1, 2, 4, 17, 32, 341, 613, 80002]);

/** Which account to post to: the real one, or the test account in test mode. */
export function credentials(testMode) {
  const userId = testMode ? process.env.IG_TEST_USER_ID : process.env.IG_USER_ID;
  const token = testMode ? process.env.IG_TEST_ACCESS_TOKEN : process.env.IG_ACCESS_TOKEN;
  const dryRun = process.env.DRY_RUN === '1' || !userId || !token;
  return { userId, token, dryRun };
}

async function graph(method, pathname, params, token) {
  const url = new URL(`${HOST}/${VERSION}/${pathname}`);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, access_token: token })) {
    if (v === undefined || v === null) continue;
    (method === 'GET' ? url.searchParams : body).set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      body: method === 'GET' ? undefined : body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new GraphError(`Network error: ${err.message}`, { transient: true });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new GraphError(e.error_user_msg || e.message || `HTTP ${res.status}`, {
      status: res.status,
      code: e.code,
      subcode: e.error_subcode,
      transient: res.status >= 500 || e.is_transient || TRANSIENT_CODES.has(e.code),
      body: json,
    });
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForContainer(containerId, token) {
  const started = Date.now();
  let delay = 1500;
  while (Date.now() - started < 90000) {
    const { status_code: code, status } = await graph('GET', containerId, { fields: 'status_code,status' }, token);
    if (code === 'FINISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new GraphError(`Container ${code}: ${status || 'unknown'}`, { code: 'CONTAINER_' + code });
    }
    await sleep(delay);
    delay = Math.min(delay * 1.5, 5000);
  }
  throw new GraphError('Timed out waiting for Instagram to process the photo', { transient: true });
}

async function createContainer({ userId, token, imageUrl, caption, collaborators, userTags }) {
  const { id } = await graph(
    'POST',
    `${userId}/media`,
    {
      image_url: imageUrl,
      caption,
      collaborators: collaborators?.length ? collaborators : undefined,
      user_tags: userTags?.length ? userTags : undefined,
    },
    token,
  );
  await waitForContainer(id, token);
  return id;
}

/**
 * Create container (with the guest as collaborator), wait for FINISHED, publish.
 * If the collaborator invite is rejected (private / nonexistent account), retry
 * without it and report collabFailed. Returns { mediaId, permalink, collabFailed, collabError }.
 */
export async function publishPhoto({ testMode, imageUrl, caption, handle, photoTags }) {
  const { userId, token, dryRun } = credentials(testMode);
  const userTags = (photoTags || []).map((username, i) => ({ username, x: 0.1 + 0.15 * i, y: 0.9 }));

  if (dryRun) {
    await sleep(1200);
    return { mediaId: `dryrun_${Date.now()}`, permalink: null, collabFailed: false, dryRun: true };
  }

  let containerId;
  let collabFailed = false;
  let collabError = null;
  try {
    containerId = await createContainer({ userId, token, imageUrl, caption, collaborators: [handle], userTags });
  } catch (err) {
    if (err.transient) throw err;
    console.warn(`[ig] collaborator @${handle} rejected, retrying without:`, err.message);
    collabFailed = true;
    collabError = err.message;
    containerId = await createContainer({ userId, token, imageUrl, caption, collaborators: [], userTags });
  }

  const { id: mediaId } = await graph('POST', `${userId}/media_publish`, { creation_id: containerId }, token);
  let permalink = null;
  try {
    ({ permalink } = await graph('GET', mediaId, { fields: 'permalink' }, token));
  } catch (err) {
    console.warn('[ig] could not read permalink:', err.message);
  }
  return { mediaId, permalink, collabFailed, collabError };
}

// ---- Publishing limit (cached) ------------------------------------------

const limitCache = new Map();

export async function publishingLimit(testMode, { fresh = false } = {}) {
  const key = testMode ? 'test' : 'live';
  const cached = limitCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < 60000) return cached.value;

  const { userId, token, dryRun } = credentials(testMode);
  let value;
  if (dryRun) {
    value = { ok: true, used: 0, total: 100, remaining: 100, dryRun: true };
  } else {
    try {
      const { data } = await graph('GET', `${userId}/content_publishing_limit`, { fields: 'quota_usage,config' }, token);
      const used = data?.[0]?.quota_usage ?? 0;
      const total = data?.[0]?.config?.quota_total ?? 100;
      value = { ok: true, used, total, remaining: total - used };
    } catch (err) {
      value = { ok: false, error: err.message };
    }
  }
  limitCache.set(key, { at: Date.now(), value });
  return value;
}

export function bumpLimitCache(testMode) {
  const c = limitCache.get(testMode ? 'test' : 'live');
  if (c?.value?.ok) {
    c.value.used += 1;
    c.value.remaining -= 1;
  }
}

/** Token health: can we read the account, and when does the token expire? */
export async function tokenHealth(testMode) {
  const { userId, token, dryRun } = credentials(testMode);
  if (dryRun) return { ok: false, dryRun: true, error: 'No IG credentials configured — running in dry-run mode.' };
  const out = { ok: false, account: testMode ? 'test' : 'live', graphVersion: VERSION };
  try {
    const me = await graph('GET', userId, { fields: 'id,username' }, token);
    out.ok = true;
    out.username = me.username;
  } catch (err) {
    out.error = err.message;
  }
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (appId && appSecret) {
    try {
      const { data } = await graph(
        'GET',
        'debug_token',
        { input_token: token },
        `${appId}|${appSecret}`,
      );
      out.valid = data.is_valid;
      out.expiresAt = data.expires_at ? new Date(data.expires_at * 1000).toISOString() : 'never';
      out.scopes = data.scopes;
    } catch (err) {
      out.debugError = err.message;
    }
  }
  return out;
}
