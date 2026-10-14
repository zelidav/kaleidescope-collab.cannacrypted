import { useMemo, useState } from 'react';
import { buildCaption, cleanHandle, isValidHandle } from '../../shared/caption.js';

export default function HandleScreen({ config, photo, caption, onRegenerate, onBack, onSubmit }) {
  const [rawHandle, setRawHandle] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  const handle = cleanHandle(rawHandle);
  const handleOk = isValidHandle(handle);
  const loading = !caption || caption.status === 'loading';
  const regensLeft = Math.max(0, (config.regenLimit ?? 3) - (caption?.regens || 0));
  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Live preview with their handle filled in as they type.
  const preview = useMemo(
    () =>
      buildCaption({
        template: config.captionTemplate,
        aiCaption: caption?.caption || '',
        handle: handle || 'yourhandle',
        hashtags: config.hashtags,
      }),
    [config.captionTemplate, config.hashtags, caption?.caption, handle],
  );

  const canPost = handleOk && consent && emailOk && !loading;

  return (
    <div className="screen handle">
      <div className="handle-grid">
        <div className="handle-photo">
          <img src={photo.dataUrl} alt="Your photo" />
          <button className="btn ghost" onClick={onBack}>
            ← Retake
          </button>
        </div>

        <div className="handle-form">
          <div className="caption-card">
            {loading ? (
              <div className="caption-loading">
                <span className="dots">Writing your caption</span>
              </div>
            ) : (
              <p className="caption-text">{preview}</p>
            )}
            {config.aiEnabled && caption?.source === 'ai' && (
              <button className="link" onClick={onRegenerate} disabled={loading || regensLeft === 0}>
                ↻ New caption {regensLeft < (config.regenLimit ?? 3) ? `(${regensLeft} left)` : ''}
              </button>
            )}
          </div>

          <label className="field">
            <span>Your Instagram username</span>
            <div className={`at-input ${touched && rawHandle && !handleOk ? 'bad' : ''}`}>
              <b>@</b>
              <input
                value={rawHandle}
                onChange={(e) => setRawHandle(e.target.value.replace(/^\s*@+/, ''))}
                onBlur={() => setTouched(true)}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="next"
                maxLength={60}
              />
            </div>
            {touched && rawHandle && !handleOk && (
              <small className="err">Letters, numbers, periods and underscores only (max 30).</small>
            )}
          </label>

          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to have this photo posted to @{config.accountHandle}</span>
          </label>

          <label className="field">
            <span>
              Email <em>(optional)</em>
            </span>
            <input
              className={`plain ${!emailOk ? 'bad' : ''}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <button
            className="btn primary big wide"
            disabled={!canPost}
            onClick={() =>
              onSubmit({
                id: crypto.randomUUID(),
                image: photo.base64,
                handle,
                email: email.trim(),
                consent: true,
                aiCaption: caption?.caption || '',
                captionSource: caption?.source || 'fallback',
              })
            }
          >
            {loading ? 'Finishing caption…' : 'Post to Instagram'}
          </button>
        </div>
      </div>
    </div>
  );
}
