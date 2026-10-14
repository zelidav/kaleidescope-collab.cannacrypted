import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const TOKEN_KEY = 'booth.adminToken';
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export default function Admin() {
  const [token, setToken] = useState(getToken);
  const [tab, setTab] = useState('queue');

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    setToken(null);
  }, []);

  if (!token) return <Login onToken={setToken} />;
  const call = (path, opts = {}) =>
    api(`/api/admin${path}`, { ...opts, token }).catch((err) => {
      if (err.status === 401) logout();
      throw err;
    });

  return (
    <div className="admin">
      <header className="admin-head">
        <strong>Collab Booth Admin</strong>
        <nav>
          {['queue', 'log', 'settings', 'status'].map((t) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <button className="link" onClick={logout}>
          Lock
        </button>
      </header>
      <LimitBar call={call} />
      {tab === 'queue' && <Queue call={call} />}
      {tab === 'log' && <Log call={call} token={token} />}
      {tab === 'settings' && <Settings call={call} />}
      {tab === 'status' && <Status call={call} />}
    </div>
  );
}

function Login({ onToken }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const { token } = await api('/api/admin/login', { method: 'POST', body: { pin } });
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {}
      onToken(token);
    } catch (err) {
      setError(err.message);
      setPin('');
    }
  };
  return (
    <form className="admin login" onSubmit={submit}>
      <h1>Admin PIN</h1>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        autoFocus
      />
      {error && <p className="err">{error}</p>}
      <button className="btn primary">Unlock</button>
    </form>
  );
}

function usePoll(fn, ms, deps) {
  useEffect(() => {
    let alive = true;
    const run = () => alive && fn();
    run();
    const t = setInterval(run, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function LimitBar({ call }) {
  const [h, setH] = useState(null);
  usePoll(() => call('/health').then(setH).catch(() => {}), 60000, []);
  if (!h) return null;
  const l = h.limit;
  const acct = h.testMode ? h.test : h.live;
  return (
    <div className={`limitbar ${l.blocked ? 'warn' : ''}`}>
      {h.testMode && <b className="tag">TEST MODE</b>}
      {l.ok ? (
        <span>
          Publishes left (24h): <b>{l.remaining}</b> / {l.total}
          {l.blocked && ' — publishing paused, posts are being held'}
          {l.dryRun && ' (dry run)'}
        </span>
      ) : (
        <span>Publishing limit unavailable: {l.error}</span>
      )}
      {acct?.dryRun ? (
        <span className="muted">Instagram: dry run (no credentials)</span>
      ) : (
        <span className={acct?.ok ? 'ok' : 'bad'}>Token: {acct?.ok ? `OK (@${acct.username})` : `problem — ${acct?.error || 'not configured'}`}</span>
      )}
    </div>
  );
}

const STATUS_LABEL = {
  pending_approval: 'Needs approval',
  held_limit: 'Held (limit)',
  queued: 'Queued',
  publishing: 'Publishing',
  retrying: 'Retrying',
  posted: 'Posted',
  failed: 'Failed',
  rejected: 'Rejected',
};

function Queue({ call }) {
  const [entries, setEntries] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(null);
  const load = () => call('/entries').then(setEntries).catch(() => {});
  usePoll(load, 5000, []);

  const waiting = entries.filter((e) => ['pending_approval', 'held_limit', 'failed'].includes(e.status));
  const inFlight = entries.filter((e) => ['queued', 'publishing', 'retrying'].includes(e.status));

  const act = async (e, action, extra = {}) => {
    setBusy(e.id);
    try {
      await call(`/entries/${e.id}/${action}`, {
        method: 'POST',
        body: action === 'approve' ? { caption: drafts[e.id] ?? e.finalCaption, ...extra } : {},
      });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="admin-body">
      {inFlight.length > 0 && <p className="muted">{inFlight.length} publishing now…</p>}
      {waiting.length === 0 && <p className="muted">Nothing waiting. Approval mode and held posts show up here.</p>}
      {waiting.map((e) => (
        <article key={e.id} className="q-card">
          <img src={`/media/${e.id}.jpg`} alt="" />
          <div className="q-main">
            <div className="q-meta">
              <b>@{e.handle}</b> · {new Date(e.createdAt).toLocaleTimeString()} ·{' '}
              <span className={`st st-${e.status}`}>{STATUS_LABEL[e.status]}</span>
              {e.testMode && <span className="tag">test</span>}
            </div>
            {e.error && <p className="err">{e.error}</p>}
            <textarea
              rows={6}
              value={drafts[e.id] ?? e.finalCaption}
              onChange={(ev) => setDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
            />
            <div className="row">
              <button className="btn primary" disabled={busy === e.id} onClick={() => act(e, 'approve')}>
                {e.status === 'failed' ? 'Retry' : 'Approve & post'}
              </button>
              {e.status === 'held_limit' && (
                <button className="btn ghost" disabled={busy === e.id} onClick={() => act(e, 'approve', { force: true })}>
                  Post anyway
                </button>
              )}
              <button className="btn danger" disabled={busy === e.id} onClick={() => act(e, 'reject')}>
                Reject
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function Log({ call, token }) {
  const [entries, setEntries] = useState([]);
  usePoll(() => call('/entries').then(setEntries).catch(() => {}), 10000, []);
  return (
    <section className="admin-body">
      <div className="row">
        <a className="btn ghost" href={`/api/admin/log.csv?token=${encodeURIComponent(token)}`}>
          Export CSV
        </a>
        <span className="muted">{entries.length} sessions</span>
      </div>
      <div className="table-wrap">
        <table className="log">
          <thead>
            <tr>
              <th>Time</th>
              <th>Handle</th>
              <th>Email</th>
              <th>AI caption</th>
              <th>Final caption</th>
              <th>Status</th>
              <th>Post</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
                <td>@{e.handle}</td>
                <td>{e.email}</td>
                <td>{e.aiCaption || <i className="muted">({e.captionSource})</i>}</td>
                <td className="pre">{e.finalCaption}</td>
                <td>
                  <span className={`st st-${e.status}`}>{STATUS_LABEL[e.status] || e.status}</span>
                  {e.collabFailed && <div className="err">no collab</div>}
                  {e.testMode && <div className="tag">test</div>}
                  {e.error && !e.collabFailed && <div className="err small">{e.error}</div>}
                </td>
                <td>
                  {e.permalink ? (
                    <a href={e.permalink} target="_blank" rel="noreferrer">
                      open
                    </a>
                  ) : (
                    <a href={`/p/${e.id}`} target="_blank" rel="noreferrer">
                      photo
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Settings({ call }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(null);
  const [test, setTest] = useState(null);
  const [frameV, setFrameV] = useState(Date.now());

  useEffect(() => {
    call('/settings').then(setS).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!s) return <section className="admin-body muted">Loading…</section>;

  const up = (patch) => setS((cur) => ({ ...cur, ...patch }));
  const upG = (patch) => setS((cur) => ({ ...cur, gesture: { ...cur.gesture, ...patch } }));

  const save = async () => {
    try {
      const next = await call('/settings', { method: 'PUT', body: s });
      setS(next);
      setSaved('Saved ✓ (the kiosk picks it up within a minute, or on its next reset)');
    } catch (err) {
      setSaved(`Error: ${err.message}`);
    }
  };

  const runTest = async () => {
    setTest({ loading: true });
    try {
      setTest(await call('/test-caption', { method: 'POST', body: { stylePrompt: s.stylePrompt }, timeout: 20000 }));
    } catch (err) {
      setTest({ error: err.message });
    }
  };

  const uploadFrame = async (file) => {
    if (!file) return;
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
    try {
      await call('/frame', { method: 'POST', body: { image: dataUrl }, timeout: 30000 });
      setFrameV(Date.now());
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="admin-body settings">
      <div className="savebar">
        <button className="btn primary" onClick={save}>
          Save settings
        </button>
        {saved && <span className="muted">{saved}</span>}
      </div>

      <fieldset>
        <legend>Posting</legend>
        <Toggle label="Approval mode (staff approve each post from this page)" checked={s.approvalMode} onChange={(v) => up({ approvalMode: v })} />
        <Toggle label="Test mode (post to the IG_TEST_* account)" checked={s.testMode} onChange={(v) => up({ testMode: v })} />
        <label>
          Our account handle (consent text)
          <input value={s.accountHandle} onChange={(e) => up({ accountHandle: e.target.value.replace(/^@/, '') })} />
        </label>
        <label>
          Hold posts when this many publishes (or fewer) remain in 24h
          <input type="number" min="0" value={s.limitBuffer} onChange={(e) => up({ limitBuffer: e.target.value })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Caption</legend>
        <label>
          Caption template — <code>{'{ai_caption}'}</code> <code>{'{hashtags}'}</code> <code>{'{handle}'}</code>
          <textarea rows={6} value={s.captionTemplate} onChange={(e) => up({ captionTemplate: e.target.value })} />
        </label>
        <label>
          Hashtags (fills <code>{'{hashtags}'}</code>)
          <input value={s.hashtags} onChange={(e) => up({ hashtags: e.target.value })} />
        </label>
        <label>
          Photo tags — accounts tagged on the image (comma separated, no @)
          <input
            value={Array.isArray(s.photoTags) ? s.photoTags.join(', ') : s.photoTags}
            onChange={(e) => up({ photoTags: e.target.value })}
            placeholder="jeromebakerdesigns, hallofflowers"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>AI captions</legend>
        <Toggle label="AI captions on" checked={s.aiEnabled} onChange={(v) => up({ aiEnabled: v })} />
        <label>
          Style prompt
          <textarea rows={10} value={s.stylePrompt} onChange={(e) => up({ stylePrompt: e.target.value })} />
        </label>
        <label>
          Max “New caption” regenerations per guest
          <input type="number" min="0" max="10" value={s.regenLimit} onChange={(e) => up({ regenLimit: e.target.value })} />
        </label>
        <div className="row">
          <button className="btn ghost" onClick={runTest} disabled={test?.loading}>
            {test?.loading ? 'Testing…' : 'Test on last photo'}
          </button>
          <span className="muted">Uses the prompt above (saved or not).</span>
        </div>
        {test && !test.loading && (
          <div className="test-out">
            {test.photo && <img src={test.photo} alt="" />}
            <div>
              {test.error && <p className="err">{test.error}</p>}
              {test.source === 'ai' && <p className="caption-text">{test.caption}</p>}
              {test.source === 'fallback' && <p className="err">Fell back to template ({test.reason}).</p>}
              {test.ms != null && <small className="muted">{test.ms} ms</small>}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Camera</legend>
        <label>
          Default camera
          <select value={s.defaultCamera} onChange={(e) => up({ defaultCamera: e.target.value })}>
            <option value="user">Front</option>
            <option value="environment">Rear</option>
          </select>
        </label>
        <label>
          Default countdown (shutter button)
          <select value={s.defaultCountdown} onChange={(e) => up({ defaultCountdown: +e.target.value })}>
            {[3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n}s
              </option>
            ))}
          </select>
        </label>
        <label>
          Reset to attract screen after (seconds)
          <input type="number" min="5" value={s.resetSeconds} onChange={(e) => up({ resetSeconds: e.target.value })} />
        </label>
        <div className="frame-row">
          <img src={`/api/frame.png?v=${frameV}`} alt="Frame overlay" />
          <div>
            <p className="muted">Frame overlay: transparent PNG, 1080×1350.</p>
            <input type="file" accept="image/png" onChange={(e) => uploadFrame(e.target.files?.[0])} />
            <button
              className="link"
              onClick={() =>
                call('/frame', { method: 'DELETE' })
                  .then(() => setFrameV(Date.now()))
                  .catch(() => {})
              }
            >
              Reset to default frame
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Thumbs-up trigger</legend>
        <Toggle label="Gesture trigger on" checked={s.gesture.enabled} onChange={(v) => upG({ enabled: v })} />
        <label>
          Confidence threshold ({Number(s.gesture.confidence).toFixed(2)})
          <input
            type="range"
            min="0.3"
            max="0.99"
            step="0.01"
            value={s.gesture.confidence}
            onChange={(e) => upG({ confidence: +e.target.value })}
          />
        </label>
        <label>
          Hold time (ms)
          <input type="number" min="100" max="3000" step="50" value={s.gesture.holdMs} onChange={(e) => upG({ holdMs: e.target.value })} />
        </label>
        <label>
          Countdown after thumbs-up (seconds)
          <input type="number" min="1" max="10" value={s.gesture.countdownSec} onChange={(e) => upG({ countdownSec: e.target.value })} />
        </label>
        <Toggle label="Countdown sound" checked={s.gesture.sound} onChange={(v) => upG({ sound: v })} />
      </fieldset>

      <div className="savebar">
        <button className="btn primary" onClick={save}>
          Save settings
        </button>
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Status({ call }) {
  const [h, setH] = useState(null);
  const [loading, setLoading] = useState(false);
  const refresh = () => {
    setLoading(true);
    call('/health', { timeout: 30000 })
      .then(setH)
      .catch((err) => setH({ error: err.message }))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const Account = ({ title, a }) =>
    a && (
      <div className="health">
        <h3>{title}</h3>
        {a.dryRun ? (
          <p className="muted">{a.error}</p>
        ) : (
          <ul>
            <li className={a.ok ? 'ok' : 'bad'}>{a.ok ? `Token works — @${a.username}` : `Token problem: ${a.error}`}</li>
            {a.expiresAt && <li>Expires: {a.expiresAt === 'never' ? 'never' : new Date(a.expiresAt).toLocaleString()}</li>}
            {a.valid === false && <li className="bad">Meta reports this token as invalid</li>}
            {a.scopes && <li>Scopes: {a.scopes.join(', ')}</li>}
            {a.debugError && <li className="muted">Expiry check failed: {a.debugError}</li>}
          </ul>
        )}
      </div>
    );

  return (
    <section className="admin-body">
      <button className="btn ghost" onClick={refresh} disabled={loading}>
        {loading ? 'Checking…' : 'Run health check'}
      </button>
      {h?.error && <p className="err">{h.error}</p>}
      {h && !h.error && (
        <>
          <Account title="Live account (IG_USER_ID)" a={h.live} />
          <Account title="Test account (IG_TEST_USER_ID)" a={h.test} />
          <div className="health">
            <h3>Publishing limit ({h.testMode ? 'test' : 'live'} account)</h3>
            {h.limit.ok ? (
              <p>
                {h.limit.used} used / {h.limit.total} per rolling 24h — <b>{h.limit.remaining} left</b>
                {h.limit.blocked && <span className="bad"> — holding new posts (buffer {h.limit.buffer})</span>}
              </p>
            ) : (
              <p className="bad">{h.limit.error}</p>
            )}
          </div>
          <div className="health">
            <h3>Other</h3>
            <ul>
              <li className={h.anthropic ? 'ok' : 'bad'}>
                Anthropic API key {h.anthropic ? 'set' : 'missing (captions fall back to template)'} — model {h.captionModel}
              </li>
              <li className={h.publicBaseUrl ? 'ok' : 'bad'}>PUBLIC_BASE_URL: {h.publicBaseUrl || 'not set — Instagram cannot fetch photos'}</li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
