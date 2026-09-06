# TUBERO — The Feet

A tongue-in-cheek, single-page tribute site for Adrian and Adam Tubero (and their feet).
Served by GitHub Pages at `/tubero/` alongside the collab tool.

- `index.html` — self-contained page (CSS + JS inline). No build step.
- `assets/` — web-sized photos, portrait/foot crops, and animated WebP loops for the
  "wiggle reel" (also the fallback when WebGL is unavailable).

The live wiggle is a WebGL mesh warp: each foot crop is stretched over a 48×36 grid, a
slow travelling wave keeps the toe region idling, and pointer/touch positions are fed in
as up to four "pokes" that push the mesh away from the finger in real time. Toe hotspots
play pentatonic notes via WebAudio. The Wiggle-Off counts taps per sibling over ten
seconds; on phones, shake-to-wiggle uses DeviceMotion after an opt-in.
