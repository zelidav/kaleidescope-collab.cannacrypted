# TUBERO — The Feet

A tongue-in-cheek, single-page tribute site for Adrian and Adam Tubero (and their feet).
Served by GitHub Pages at `/tubero/` alongside the collab tool.

- `index.html` — self-contained page (CSS + JS inline). No build step.
- `assets/` — web-sized photos, portrait/foot crops, animated WebP "wiggle reel" loops,
  and 24-frame sprite sheets (`*_sheet.jpg`, 6 columns) that the page drives on `<canvas>`
  so the toes wiggle in response to the cursor and clicks.

The wiggle frames were generated with a Pillow mesh warp that displaces only the toe
region with a travelling sine wave, then inset-cropped to hide the warped borders.
