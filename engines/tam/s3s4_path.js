/* One continuous camera move across the S3 -> S4 cut (times in S3-local seconds; S4 local = t - 6.0).
   C1-continuous (Hermite/Catmull-Rom): position, zoom, rotations, perspective and their velocities match at the cut.
   S3 eases into the first key at 5.20 (zero velocity), then both scenes evaluate this same spline. */
window.S3S4_PATH_START = { x: 600, y: 470, zoom: 0.95, rx: 0, ry: 0, rz: 0, persp: 2400 };
window.S3S4_PATH = K.spline([
  [5.20, window.S3S4_PATH_START],
  [6.40, { x: 610, y: 1250, zoom: 0.74, rx: 28, ry: 0, rz: -9, persp: 3400 }],
  [8.05, { x: 600, y: 2150, zoom: 0.74, rx: 28, ry: 0, rz: -7, persp: 3400 }],
]);
window.S3S4_CUT = 6.0;
/* the cursor leaves the hero button towards S4's first action; both scenes use the same hand curve */
window.S3S4_CURSOR = { x: 0, y: 801, t0: 5.72, dur: 0.45 };   // -> S4's first action: drawRect auction-bg from its top-left
/* S4 starts its cursor from the same point S3's last action (hero-btn-label typing, away: 0) ended on:
   the hero-btn-label click point, travelling with the same hand curve and timing. */
