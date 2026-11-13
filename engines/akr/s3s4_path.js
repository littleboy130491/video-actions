/* One continuous camera move across the S3 -> S4 cut (times in S3-local seconds; S4 local = t - 6.0).
   C1-continuous: position, zoom, rotations, perspective and their velocities match at the cut. */
window.S3S4_PATH = K.spline([
  [5.20, { x: 590, y: 490, zoom: 0.97, rx: 0, ry: 0, rz: 0, persp: 2400 }],
  [6.40, { x: 610, y: 1350, zoom: 0.74, rx: 28, ry: 0, rz: -9, persp: 3400 }],
  [8.05, { x: 600, y: 2250, zoom: 0.74, rx: 28, ry: 0, rz: -7, persp: 3400 }],
]);
window.S3S4_CUT = 6.0;
