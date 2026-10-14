// Post-build: self-host the MediaPipe wasm + gesture model so the kiosk doesn't
// depend on third-party CDNs over venue wifi. Paths are versioned => cacheable forever.
import fs from 'node:fs';
import path from 'node:path';

const pkgDir = 'node_modules/@mediapipe/tasks-vision';
const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
const out = path.join('dist', 'mediapipe', version);
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

fs.mkdirSync(path.join(out, 'wasm'), { recursive: true });
for (const f of fs.readdirSync(path.join(pkgDir, 'wasm'))) {
  fs.copyFileSync(path.join(pkgDir, 'wasm', f), path.join(out, 'wasm', f));
}
console.log(`[assets] copied MediaPipe ${version} wasm`);

try {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(path.join(out, 'gesture_recognizer.task'), Buffer.from(await res.arrayBuffer()));
  console.log('[assets] downloaded gesture_recognizer.task');
} catch (err) {
  console.warn(`[assets] could not download gesture model (${err.message}); the kiosk will load it from Google at runtime.`);
}
