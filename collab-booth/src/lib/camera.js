// One long-lived camera stream (re-opening it on iPad can re-prompt for permission).
let stream = null;
let facing = null;
let pending = null;

export async function getStream(wantFacing) {
  if (stream && facing === wantFacing && stream.getVideoTracks().some((t) => t.readyState === 'live')) return stream;
  if (pending) await pending.catch(() => {});
  stopStream();
  pending = navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: wantFacing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
  });
  try {
    stream = await pending;
    facing = wantFacing;
    return stream;
  } finally {
    pending = null;
  }
}

export function stopStream() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  facing = null;
}
