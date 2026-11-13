/* Shared camera paths across scene files (CONTINUOUS cuts). Times are GLOBAL seconds.
 * A1 -> A2: the pull-back after the prototype noodles keeps moving down into the empty lower Beranda; A2 starts at 13.5
 * on the same spline (C1-continuous) and covers it with the split-screen panels. */
window.BYP = {};
BYP.A1_END = 13.5;
BYP.A12 = K.spline([
  [12.40, { x: 1900, y: 330, zoom: 0.27 }],
  [13.50, { x: 1250, y: 1250, zoom: 0.20 }],
  [14.40, { x: 820, y: 2350, zoom: 0.25 }],
]);
/* A2 -> A3: the panels collapse into one frame on the finished Beranda (A2 local 10.15..11.0), the camera keeps
 * pulling back into A3's site-map wide shot. Global times. */
BYP.A2_END = 24.5;
BYP.A23 = K.spline([
  [23.65, { x: 600, y: 1735, zoom: 0.55 }],
  [24.50, { x: 760, y: 2150, zoom: 0.36 }],
  [26.00, { x: 1250, y: 3422, zoom: 0.198 }],
]);
