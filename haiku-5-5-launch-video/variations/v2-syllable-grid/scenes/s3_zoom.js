// v2_s3_zoom (10.0 to 15.0): pattern interrupt at 10.0. The poem frame (the frozen frame from
// v2_s2_count) whips from full frame to 0.18 scale with a motion ghost, and becomes one card in a grid.
// Then the camera pushes through two layered grids with parallax: a far fill grid (zoom 1.12 octaves/s)
// and a near outline grid (zoom 2.4 octaves/s). The poem card is the first cell of the near grid,
// and it passes the camera between 12.5 and 13.0. Each grid is drawn as one path per zoom level.
const v2s3_BASE_A = { px: 144, py: 81 };      // far grid pitch at zoom 0
const v2s3_BASE_B = { px: 360, py: 202.5 };   // near grid pitch: its first cell is the poem card's size
const v2s3_RATE_A = 1.12, v2s3_RATE_B = 2.4;  // zoom, octaves per second

function v2s3_smooth(a, b, x) {
  const u = H.clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

// The frozen poem frame, shared with v2_s2_count (built there during its static hold).
function v2s3_getSnap() {
  return typeof v2s2_getFrozen === 'function' ? v2s2_getFrozen() : null;
}

// Whip scale, u seconds after 10.0. Ease-out expo: the first frame at 10.0 is already moving (0.66),
// and the scale reaches exactly 0.18 at u = 0.4.
function v2s3_whip(u) {
  const k = H.easeOutExpo(H.clamp((u + 1 / 30) / (0.4 + 1 / 30)));
  return 1 - 0.82 * k;
}

// The snapshot as a rounded card, centred, at scale S.
function v2s3_card(ctx, snap, S, alpha) {
  const w = H.W * S, h = H.H * S;
  const x = (H.W - w) / 2, y = (H.H - h) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  H.rrect(ctx, x, y, w, h, Math.min(48 * S, w / 2, h / 2));
  ctx.clip();
  ctx.drawImage(snap, x, y, w, h);
  ctx.restore();
}

// Cell offsets (cells from the centre), precomputed once. A level only uses the ones inside its screen range.
const v2s3_OFF_I = [], v2s3_OFF_J = [];
for (let j = -10; j <= 10; j++) {
  for (let i = -12; i <= 12; i++) { v2s3_OFF_I.push(i); v2s3_OFF_J.push(j); }
}

// One zoomable grid. g = zoom in octaves. Level k has world pitch base * 2^k, so on screen it sits at
// base * 2^(k + g). A level fades in from v = -0.25 to 0 and out from 1.5 to 0.5, which keeps the
// zoom continuous with no pop when a level comes in or leaves.
function v2s3_layer(ctx, base, g, fill, alpha) {
  if (alpha <= 0) return;
  const kc = Math.floor(-g);
  ctx.save();
  if (fill) ctx.fillStyle = V.dark.surface;
  else { ctx.strokeStyle = V.accent; ctx.lineWidth = 2.5; }
  const strength = fill ? 1 : 0.55; // the near outlines sit under the card, so keep them quieter
  for (let k = kc - 1; k <= kc + 3; k++) {
    const v = k + g;
    const a = strength * alpha * v2s3_smooth(-0.25, 0, v) * v2s3_smooth(1.5, 0.5, v);
    if (a <= 0.02) continue;
    const px = base.px * Math.pow(2, v), py = base.py * Math.pow(2, v);
    const nx = Math.ceil(H.W / 2 / px) + 1, ny = Math.ceil(H.H / 2 / py) + 1;
    // One path per level: all of its visible cells are filled (or stroked) in a single call.
    ctx.globalAlpha = a;
    ctx.beginPath();
    for (let n = 0; n < v2s3_OFF_I.length; n++) {
      const i = v2s3_OFF_I[n], j = v2s3_OFF_J[n];
      if (i < -nx || i > nx || j < -ny || j > ny) continue;
      const cx = H.W / 2 + i * px, cy = H.H / 2 + j * py;
      if (fill) ctx.rect(cx - px * 0.43, cy - py * 0.43, px * 0.86, py * 0.86);
      else ctx.rect(cx - px * 0.48, cy - py * 0.48, px * 0.96, py * 0.96);
    }
    if (fill) ctx.fill(); else ctx.stroke();
  }
  ctx.restore();
}

function v2s3_frame(ctx, t) {
  ctx.fillStyle = V.dark.bg;
  ctx.fillRect(0, 0, H.W, H.H);
  const u = t - 10.0;                 // 0 at the interrupt
  const e = Math.max(0, t - 10.4);    // camera push, starts once the whip has landed
  const gA = v2s3_RATE_A * e, gB = v2s3_RATE_B * e;

  // Far grid fades in behind the shrinking card during the whip.
  v2s3_layer(ctx, v2s3_BASE_A, gA, true, H.ramp(u, 0, 0.3));

  // Poem card: whip with one motion ghost (a larger, fainter copy trailing behind), then pushed by the far grid zoom.
  const snap = v2s3_getSnap();
  const cardA = 1 - H.ramp(t, 12.5, 13.0);
  if (snap && cardA > 0) {
    if (t < 10.4) {
      if (u >= 0.035) v2s3_card(ctx, snap, v2s3_whip(u - 0.035), 0.35 * cardA);
      v2s3_card(ctx, snap, v2s3_whip(u), cardA);
    } else {
      v2s3_card(ctx, snap, 0.18 * Math.pow(2, gA), cardA);
    }
  }

  // Near outline grid fades in after the card has landed, and zooms faster (parallax).
  v2s3_layer(ctx, v2s3_BASE_B, gB, false, H.ramp(t, 10.8, 11.4));
}

H.scene({ id: "v2_s3_zoom", start: 10, end: 15, draw(ctx, t, local, dur) {
  if (t < 10 || t >= 15) return;
  v2s3_frame(ctx, t);
} });
