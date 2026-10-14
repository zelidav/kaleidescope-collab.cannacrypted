import { useCallback, useEffect, useRef, useState } from 'react';
import { getStream } from '../lib/camera.js';
import { captureFrame, loadFrame } from '../lib/capture.js';
import { useThumbsUp } from '../lib/gesture.js';
import { beep } from '../lib/sound.js';

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

export default function Camera({ config, recognizer, onCapture, onCancel }) {
  const videoRef = useRef(null);
  const [facing, setFacing] = useState(config.defaultCamera || 'user');
  const [countdownSel, setCountdownSel] = useState(config.defaultCountdown || 5);
  const [count, setCount] = useState(null); // seconds remaining, or null
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);
  const g = config.gesture || {};
  const sound = g.sound !== false;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    getStream(facing)
      .then((stream) => {
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setError(null);
      })
      .catch((err) => !cancelled && setError(err.name === 'NotAllowedError' ? 'Camera access was blocked.' : 'Camera unavailable.'));
    return () => {
      cancelled = true;
    };
  }, [facing]);

  useEffect(() => () => clearInterval(timer.current), []);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const frame = await loadFrame(config.frameVersion);
    setFlash(true);
    const shot = captureFrame(video, { mirror: facing === 'user', frame });
    setTimeout(() => onCapture(shot), 180);
  }, [config.frameVersion, facing, onCapture]);

  // Same path for the shutter button and the thumbs-up trigger.
  const startCountdown = useCallback(
    (seconds) => {
      if (count !== null) return;
      let n = seconds;
      setCount(n);
      if (sound) beep(660);
      timer.current = setInterval(() => {
        n -= 1;
        if (n > 0) {
          setCount(n);
          if (sound) beep(660);
        } else {
          clearInterval(timer.current);
          setCount(0);
          if (sound) beep(1320, 220);
          capture();
        }
      }, 1000);
    },
    [count, sound, capture],
  );

  // Gestures are ignored from countdown start until the guest is back on this screen.
  const progress = useThumbsUp({
    recognizer,
    videoRef,
    active: ready && count === null && !error,
    threshold: g.confidence ?? 0.7,
    holdMs: g.holdMs ?? 500,
    onTrigger: () => startCountdown(g.countdownSec || 3),
  });

  return (
    <div className="screen camera">
      <div className="stage">
        <video
          ref={videoRef}
          className={`live ${facing === 'user' ? 'mirror' : ''}`}
          playsInline
          muted
          autoPlay
          onLoadedData={() => setReady(true)}
        />
        <img className="frame-live" src={`/api/frame.png?v=${config.frameVersion ?? 0}`} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </div>

      <div className="cam-top">
        <button className="pill" onClick={onCancel} aria-label="Cancel">
          ✕
        </button>
        <div className="seg">
          {[3, 5, 10].map((s) => (
            <button key={s} className={s === countdownSel ? 'on' : ''} onClick={() => setCountdownSel(s)} disabled={count !== null}>
              {s}s
            </button>
          ))}
        </div>
        <button
          className="pill"
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          disabled={count !== null}
          aria-label="Switch camera"
        >
          ⟲ Flip
        </button>
      </div>

      {recognizer && count === null && !error && (
        <div className="hint">👍 Give us a thumbs up to start the countdown</div>
      )}

      {progress > 0 && count === null && (
        <div className="thumb-ring" aria-hidden>
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={RING_R} className="track" />
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              className="fill"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress)}
            />
          </svg>
          <span>👍</span>
        </div>
      )}

      {count !== null && count > 0 && (
        <div className="countdown" key={count}>
          {count}
        </div>
      )}
      {flash && <div className="flash" />}
      {error && <div className="cam-error">{error} Ask a staff member for help.</div>}

      <div className="cam-bottom">
        <button
          className="shutter"
          onClick={() => startCountdown(countdownSel)}
          disabled={!ready || count !== null}
          aria-label="Take photo"
        />
      </div>
    </div>
  );
}
