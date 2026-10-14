export const OUT_W = 1080;
export const OUT_H = 1350;

let frameImg = null;
let frameKey = null;

/** Load (and cache) the branded PNG frame overlay. Resolves null if unavailable. */
export function loadFrame(version) {
  const key = String(version ?? 0);
  if (frameImg && frameKey === key) return Promise.resolve(frameImg);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frameImg = img;
      frameKey = key;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = `/api/frame.png?v=${key}`;
  });
}

/**
 * Grab the current video frame, cover-crop to 4:5, mirror for the front camera,
 * composite the frame overlay, and return a 1080x1350 JPEG.
 */
export function captureFrame(video, { mirror, frame }) {
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(OUT_W / vw, OUT_H / vh);
  const sw = OUT_W / scale;
  const sh = OUT_H / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(OUT_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
  ctx.restore();
  if (frame) ctx.drawImage(frame, 0, 0, OUT_W, OUT_H);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return { dataUrl, base64: dataUrl.split(',')[1] };
}
