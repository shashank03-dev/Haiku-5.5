// v2_s3_zoom (10.0 to 15.0): pattern interrupt at 10.0. The poem frame (a frozen snapshot of
// v2_s2_count) whips from full frame to 0.18 scale with motion ghosts, and becomes one card in a grid.
// Then the camera pushes through two layered grids with parallax: a far fill grid (zoom 1.12 octaves/s)
// and a near outline grid (zoom 2.4 octaves/s). The poem card is the first cell of the near grid,
// and it passes the camera between 12.5 and 13.0. Each grid level is a precomputed-free loop of
// fillRect or strokeRect calls over a handful of levels, so no per-cell objects are built.
const v2s3_BASE_A = { px: 128, py: 72 };      // far grid pitch at zoom 0
const v2s3_BASE_B = { px: 360, py: 202.5 };   // near grid pitch: its first cell is the poem card's size
const v2s3_RATE_A = 1.12, v2s3_RATE_B = 2.4;  // zoom, octaves per second
let v2s3_snapCanvas = null;

function v2s3_smooth(a, b, x) {
  const u = H.clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}

// Frozen poem frame, drawn once from v2_s2_count at 9.99 (its state is constant after 9.75).
function v2s3_getSnap() {
  if (v2s3_snapCanvas) return v2s3_snapCanvas;
  const s2 = H.scenes.find(s => s.id === 'v2_s2_count');
  if (!s2) return null;
  const c = document.createElement('canvas');
  c.width = H.W; c.height = H.H;
  s2.draw(c.getContext('2d'), 9.99, 4.99, 5);
  v2s3_snapCanvas = c;
  return c;
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

// One zoomable grid. g = zoom in octaves. Level k has world pitch base * 2^k, so on screen it sits at
// base * 2^(k + g). A level fades in from v = -0.5 to 0 and out from 1.5 to 0.5, which keeps the
// zoom continuous with no pop when a level comes in or leaves.
function v2s3_layer(ctx, base, g, fill, alpha) {
  if (alpha <= 0) return;
  const kc = Math.floor(-g);
  ctx.save();
  if (fill) ctx.fillStyle = V.dark.surface;
  else { ctx.strokeStyle = V.accent; ctx.lineWidth = 3; }
  for (let k = kc - 1; k <= kc + 3; k++) {
    const v = k + g;
    const a = alpha * v2s3_smooth(-0.5, 0, v) * v2s3_smooth(1.5, 0.5, v);
    if (a <= 0.004) continue;
    const px = base.px * Math.pow(2, v), py = base.py * Math.pow(2, v);
    const nx = Math.ceil(H.W / 2 / px) + 1, ny = Math.ceil(H.H / 2 / py) + 1;
    ctx.globalAlpha = a;
    for (let j = -ny; j <= ny; j++) {
      const cy = H.H / 2 + j * py;
      for (let i = -nx; i <= nx; i++) {
        const cx = H.W / 2 + i * px;
        if (fill) ctx.fillRect(cx - px * 0.43, cy - py * 0.43, px * 0.86, py * 0.86);
        else ctx.strokeRect(cx - px * 0.48, cy - py * 0.48, px * 0.96, py * 0.96);
      }
    }
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

  // Poem card: whip with ghosts (larger, fainter copies trailing behind), then pushed by the far grid zoom.
  const snap = v2s3_getSnap();
  const cardA = 1 - H.ramp(t, 12.5, 13.0);
  if (snap && cardA > 0) {
    if (t < 10.4) {
      if (u >= 0.07) v2s3_card(ctx, snap, v2s3_whip(u - 0.07), 0.15 * cardA);
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
