import { useCallback, useEffect, useRef, useState } from 'react';
import { loadConfig, requestCaption } from './lib/api.js';
import { loadGestureRecognizer } from './lib/gesture.js';
import { loadFrame } from './lib/capture.js';
import { onOutboxChange, startOutboxSync } from './lib/outbox.js';
import { unlockAudio } from './lib/sound.js';
import Attract from './screens/Attract.jsx';
import Camera from './screens/Camera.jsx';
import Preview from './screens/Preview.jsx';
import HandleScreen from './screens/Handle.jsx';
import Status from './screens/Status.jsx';

const FALLBACK_CONFIG = {
  accountHandle: 'jeromebakerdesigns',
  aiEnabled: true,
  captionTemplate: '{ai_caption}',
  hashtags: '',
  regenLimit: 3,
  defaultCamera: 'user',
  defaultCountdown: 5,
  resetSeconds: 20,
  approvalMode: false,
  testMode: false,
  gesture: { enabled: false, confidence: 0.7, holdMs: 500, countdownSec: 3, sound: true },
  frameVersion: 0,
};

export default function Kiosk() {
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [screen, setScreen] = useState('attract');
  const [photo, setPhoto] = useState(null); // { dataUrl, base64 }
  const [caption, setCaption] = useState(null); // { status, caption, source, regens }
  const [result, setResult] = useState(null);
  const [recognizer, setRecognizer] = useState(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const captionReq = useRef(0);

  // App start: config, frame, gesture model (once), offline sync.
  useEffect(() => {
    const refresh = () =>
      loadConfig().then((c) => {
        if (!c) return;
        setConfig({ ...FALLBACK_CONFIG, ...c });
        loadFrame(c.frameVersion);
      });
    refresh();
    const t = setInterval(refresh, 60000);
    loadGestureRecognizer().then(setRecognizer);
    const stopSync = startOutboxSync();
    const off = onOutboxChange(setOutboxCount);
    return () => {
      clearInterval(t);
      stopSync();
      off();
    };
  }, []);

  const reset = useCallback(() => {
    captionReq.current++;
    setPhoto(null);
    setCaption(null);
    setResult(null);
    setScreen('attract');
    loadConfig().then((c) => c && setConfig({ ...FALLBACK_CONFIG, ...c }));
  }, []);

  const fetchCaption = useCallback(
    (base64, regens) => {
      const req = ++captionReq.current;
      setCaption({ status: 'loading', caption: '', source: null, regens });
      if (!config.aiEnabled) {
        setCaption({ status: 'ready', caption: '', source: 'disabled', regens });
        return;
      }
      requestCaption(base64).then((r) => {
        if (req === captionReq.current) setCaption({ status: 'ready', caption: r.caption || '', source: r.source, regens });
      });
    },
    [config.aiEnabled],
  );

  return (
    <div className="kiosk">
      {config.testMode && <div className="banner">TEST MODE — posting to the test account</div>}
      {!config.testMode && config.dryRun && <div className="banner">DRY RUN — Instagram not configured</div>}

      {screen === 'attract' && (
        <Attract
          outboxCount={outboxCount}
          onStart={() => {
            unlockAudio();
            setScreen('camera');
          }}
        />
      )}
      {screen === 'camera' && (
        <Camera
          config={config}
          recognizer={config.gesture?.enabled ? recognizer : null}
          onCapture={(p) => {
            setPhoto(p);
            setScreen('preview');
          }}
          onCancel={reset}
        />
      )}
      {screen === 'preview' && photo && (
        <Preview
          photo={photo}
          onRetake={() => setScreen('camera')}
          onUse={() => {
            fetchCaption(photo.base64, 0); // in parallel with the handle screen
            setScreen('handle');
          }}
        />
      )}
      {screen === 'handle' && photo && (
        <HandleScreen
          config={config}
          photo={photo}
          caption={caption}
          onRegenerate={() => fetchCaption(photo.base64, (caption?.regens || 0) + 1)}
          onBack={() => setScreen('camera')}
          onSubmit={(payload) => {
            setResult({ payload });
            setScreen('status');
          }}
        />
      )}
      {screen === 'status' && result && (
        <Status config={config} payload={result.payload} onDone={reset} onBack={() => setScreen('handle')} />
      )}
    </div>
  );
}
