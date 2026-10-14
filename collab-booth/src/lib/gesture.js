// Thumbs-up trigger using MediaPipe Tasks Vision Gesture Recognizer.
import { useEffect, useRef, useState } from 'react';

/* global __MP_VERSION__ */
const LOCAL_BASE = `/mediapipe/${__MP_VERSION__}`;
const CDN_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MP_VERSION__}/wasm`;
const REMOTE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const SAMPLE_MS = 100; // ~10 fps keeps the iPad cool
const DROP_GRACE_MS = 150; // tolerate one missed sample before resetting the ring
const MIN_SAMPLES = 3; // also require a few positive frames, in case inference runs slow

let loading = null;

async function urlOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && !(res.headers.get('content-type') || '').includes('text/html');
  } catch {
    return false;
  }
}

/** Load the recognizer once per app session (GPU, falling back to CPU). Resolves null on failure. */
export function loadGestureRecognizer() {
  loading ??= (async () => {
    try {
      const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
      const local = await urlOk(`${LOCAL_BASE}/gesture_recognizer.task`);
      const fileset = await FilesetResolver.forVisionTasks(local ? `${LOCAL_BASE}/wasm` : CDN_WASM);
      const modelAssetPath = local ? `${LOCAL_BASE}/gesture_recognizer.task` : REMOTE_MODEL;
      const make = (delegate) =>
        GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
        });
      try {
        return await make('GPU');
      } catch (err) {
        console.warn('[gesture] GPU delegate failed, using CPU', err);
        return await make('CPU');
      }
    } catch (err) {
      console.warn('[gesture] recognizer unavailable; shutter button only', err);
      return null;
    }
  })();
  return loading;
}

function thumbScore(result) {
  let best = 0;
  for (const hand of result?.gestures || []) {
    for (const c of hand) if (c.categoryName === 'Thumb_Up' && c.score > best) best = c.score;
  }
  return best;
}

/**
 * Watches the <video> while `active`. Calls onTrigger once a thumbs-up (any hand)
 * is held at >= threshold for holdMs. Returns progress 0..1 for the ring.
 * The guest must lower their thumb once after arming, so a thumb still held up
 * from the last round doesn't immediately fire again.
 */
export function useThumbsUp({ recognizer, videoRef, active, threshold, holdMs, onTrigger }) {
  const [progress, setProgress] = useState(0);
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  useEffect(() => {
    if (!recognizer || !active) {
      setProgress(0);
      return;
    }
    let holdStart = 0;
    let positives = 0;
    let lastSeen = 0;
    let armed = false;
    let lastTs = 0;
    let fired = false;

    const tick = () => {
      const video = videoRef.current;
      if (fired || !video || video.readyState < 2 || !video.videoWidth) return;
      const now = performance.now();
      const ts = Math.max(now, lastTs + 1); // timestamps must strictly increase
      lastTs = ts;
      let score = 0;
      try {
        score = thumbScore(recognizer.recognizeForVideo(video, ts));
      } catch (err) {
        console.warn('[gesture] recognize failed', err);
        return;
      }
      const up = score >= threshold;
      if (!armed) {
        if (!up) armed = true;
        return;
      }
      if (up) {
        lastSeen = now;
        holdStart ||= now;
        positives += 1;
        const timeP = Math.min(1, (now - holdStart) / holdMs);
        const done = timeP >= 1 && positives >= MIN_SAMPLES;
        setProgress(done ? 1 : Math.max(0.04, Math.min(timeP, positives / MIN_SAMPLES, 0.95)));
        if (done) {
          fired = true;
          setProgress(0);
          triggerRef.current?.();
        }
      } else if (holdStart && now - lastSeen > DROP_GRACE_MS) {
        holdStart = 0;
        positives = 0;
        setProgress(0);
      }
    };

    const timer = setInterval(tick, SAMPLE_MS);
    return () => {
      clearInterval(timer);
      setProgress(0);
    };
  }, [recognizer, videoRef, active, threshold, holdMs]);

  return progress;
}
