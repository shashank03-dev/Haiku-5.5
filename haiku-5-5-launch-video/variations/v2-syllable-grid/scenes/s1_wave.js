// v2_s1_wave (0.0 to 5.0): a 12 x 7 cell field. Anti-diagonal d flips on the 0.5 s grid (T = 0.5 * d).
// By 1.0 the centre cells part and "Haiku 5.5" rises in the gap; the cells close again at 3.4 to 3.9.
// The scene ends on a hard cut at 5.0, when the field is back at rest.
const v2s1_COLS = 12, v2s1_ROWS = 7;
const v2s1_X0 = 8, v2s1_Y0 = 9, v2s1_PX = 160, v2s1_PY = 154; // cell pitch
const v2s1_CW = 144, v2s1_CH = 138;                              // cell size
const v2s1_SLIT = 60;                                            // px each half moves when the centre parts
const v2s1_rnd = H.prng(20260501);
const v2s1_cells = [];
for (let r = 0; r < v2s1_ROWS; r++) {
  for (let c = 0; c < v2s1_COLS; c++) {
    v2s1_cells.push({ c, r, d: c + r, x: v2s1_X0 + c * v2s1_PX, y: v2s1_Y0 + r * v2s1_PY, jit: v2s1_rnd() * 0.06 });
  }
}

// One title word rising out of a mask box (p 0..1; falling back down as p returns to 0).
function v2s1_word(ctx, str, x, baseY, size, color, p) {
  if (p <= 0) return;
  const w = H.measure(ctx, str, size, 600, H.FONT.sans, -6);
  const e = H.easeOutExpo(Math.min(1, p));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 12, baseY - size * 0.8, w + 24, size * 1.05);
  ctx.clip();
  H.text(ctx, str, x, baseY + (1 - e) * size * 0.5, { size, weight: 600, color, tracking: -6 });
  ctx.restore();
}

function v2s1_frame(ctx, t) {
  const C = V.dark;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, H.W, H.H);

  // Centre parting: open 0.5 to 1.0, close 3.4 to 3.9.
  const open = H.easeInOutCubic(H.ramp(t, 0.5, 1.0)) - H.easeInOutCubic(H.ramp(t, 3.4, 3.9));

  for (const c of v2s1_cells) {
    // Entrance: pop in from the top-left corner.
    const ent = H.easeOutExpo(H.clamp((t - (0.02 * c.d + c.jit)) / 0.35));
    if (ent <= 0) continue;
    // Wave: scaleY 1 to 0 to 1 over 0.5 s, colour dark to accent at the middle.
    const T = 0.5 * c.d;
    let flip = 1, acc = 0;
    if (t >= T && t < T + 0.5) {
      const f = Math.abs(2 * ((t - T) / 0.5) - 1); // 1 at the ends, 0 at the middle
      flip = H.easeInOutCubic(f);
      acc = H.easeOutCubic(1 - f);
    }
    // Parting: columns 2 to 9 only. Rows above the centre go up, rows below go down, the centre row closes.
    let dy = 0, k = 1;
    if (c.c >= 2 && c.c <= 9) {
      if (c.r < 3) dy = -v2s1_SLIT * open;
      else if (c.r > 3) dy = v2s1_SLIT * open;
      else k = 1 - open;
    }
    const w = v2s1_CW * ent, h = v2s1_CH * ent * flip * k;
    if (w < 1 || h < 1) continue;
    const cx = c.x + v2s1_CW / 2, cy = c.y + v2s1_CH / 2 + dy;
    const rad = Math.min(16, w / 2, h / 2);
    ctx.fillStyle = C.surface;
    H.rrect(ctx, cx - w / 2, cy - h / 2, w, h, rad);
    ctx.fill();
    if (acc > 0) {
      ctx.globalAlpha = acc;
      ctx.fillStyle = V.accent;
      H.rrect(ctx, cx - w / 2, cy - h / 2, w, h, rad);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Lockup in the parted centre: "Claude" label, then "Haiku 5.5" rising word by word.
  const out = 1 - H.ramp(t, 3.4, 3.8);
  const size = 200, gap = 44, baseY = 611;
  const wH = H.measure(ctx, "Haiku", size, 600, H.FONT.sans, -6);
  const w55 = H.measure(ctx, "5.5", size, 600, H.FONT.sans, -6);
  const x0 = H.W / 2 - (wH + gap + w55) / 2;
  v2s1_word(ctx, "Haiku", x0, baseY, size, C.text, H.ramp(t, 0.8, 1.4) * out);
  v2s1_word(ctx, "5.5", x0 + wH + gap, baseY, size, V.accent, H.ramp(t, 0.92, 1.52) * out);
  H.text(ctx, "Claude", H.W / 2, 432, {
    size: 34, weight: 500, family: H.FONT.mono, color: C.mute, align: 'center', tracking: 6,
    alpha: H.ramp(t, 1.2, 1.6) * out,
  });
}

H.scene({ id: "v2_s1_wave", start: 0, end: 5, draw(ctx, t, local, dur) {
  if (t < 0 || t >= 5) return;
  v2s1_frame(ctx, t);
} });
