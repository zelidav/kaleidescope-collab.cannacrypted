export async function api(path, { method = 'GET', body, token, timeout = 15000 } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-admin-token': token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const CONFIG_KEY = 'booth.config';

/** Kiosk config, with the last good copy kept for offline starts. */
export async function loadConfig() {
  try {
    const cfg = await api('/api/config', { timeout: 8000 });
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    } catch {}
    return cfg;
  } catch {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null;
    } catch {
      return null;
    }
  }
}

/** Caption request; any failure resolves to an empty fallback caption. */
export async function requestCaption(imageBase64) {
  try {
    // Server enforces its own 6s model budget; allow a little for upload.
    return await api('/api/caption', { method: 'POST', body: { image: imageBase64 }, timeout: 9000 });
  } catch {
    return { caption: '', source: 'fallback' };
  }
}
