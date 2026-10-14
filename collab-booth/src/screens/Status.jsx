import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { postOrQueue } from '../lib/outbox.js';

const MESSAGES = {
  posted: {
    title: 'Posted! 🌷',
    body: 'Open Instagram and ACCEPT the collab request so it shows on your profile.',
  },
  posting: {
    title: 'Posting… 🌷',
    body: 'It’ll be live in a moment. Open Instagram and ACCEPT the collab request so it shows on your profile.',
  },
  pending_approval: {
    title: 'You’re in! 🌷',
    body: 'Our team will post your photo shortly. Watch for the collab request in Instagram and ACCEPT it so it shows on your profile.',
  },
  offline: {
    title: 'Saved! 🌷',
    body: 'The wifi is taking a breather — your photo is saved and will post automatically. ACCEPT the collab request when it arrives.',
  },
  failed: {
    title: 'Hmm, Instagram hiccuped',
    body: 'We saved your photo and our team will take a look. Scan the code to download it now.',
  },
};

function messageFor(r) {
  if (r.status === 'posted' && r.collabFailed) {
    return {
      title: 'Posted! 🌷',
      body: 'We couldn’t send you a collab invite — your account may be private or the username may be off. The photo is live on our page, and you can scan to download it.',
    };
  }
  if (['queued', 'publishing', 'retrying'].includes(r.status)) return MESSAGES.posting;
  if (r.status === 'held_limit') return MESSAGES.pending_approval;
  return MESSAGES[r.status] || MESSAGES.failed;
}

export default function Status({ config, payload, onDone, onBack }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [qr, setQr] = useState(null);
  const [left, setLeft] = useState(config.resetSeconds || 20);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invoke guard
    started.current = true;
    QRCode.toDataURL(`${location.origin}/p/${payload.id}`, { margin: 1, width: 360, color: { dark: '#0f1a12', light: '#fff8ec' } })
      .then(setQr)
      .catch(() => {});
    postOrQueue(payload).then(setResult, (err) => setError(err.message));
  }, [payload]);

  // Auto-reset once there's an outcome.
  useEffect(() => {
    if (!result) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [result]);
  useEffect(() => {
    if (result && left <= 0) onDone();
  }, [left, result, onDone]);

  if (error) {
    return (
      <div className="screen status">
        <h2>Almost there</h2>
        <p className="lede">{error}</p>
        <button className="btn primary big" onClick={onBack}>
          Fix it
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="screen status">
        <div className="spinner" />
        <h2>Planting your photo in the garden…</h2>
      </div>
    );
  }

  const msg = messageFor(result);
  return (
    <div className="screen status" onClick={() => setLeft(config.resetSeconds || 20)}>
      <h2 className="status-title">{msg.title}</h2>
      <p className="lede">{msg.body}</p>
      {qr && (
        <div className="qr">
          <img src={qr} alt="QR code to download your photo" />
          <span>Scan to download your photo</span>
        </div>
      )}
      <button
        className="btn ghost big"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Done ({Math.max(0, left)})
      </button>
    </div>
  );
}
