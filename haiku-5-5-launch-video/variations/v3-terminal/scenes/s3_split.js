// v3_s3_split, 10-15 s. Pattern interrupt at exactly 10.0: a hard full-frame
// invert (dark to light) and the single terminal splits into a 3 x 4 grid over
// 0.25 s. Each window types the same copy-bank command. Rows start on the 0.5 s
// cut (0.5, 1.0, 1.5 s), columns stagger by 0.125 s. Typing runs 1.0 s on the
// grid, then "Ready when you are." streams. The scene draws nothing before 10.0,
// so the interrupt is a hard cut. No randomness.
(function () {
  const D = V.dark, LT = V.light, ACC = V.accent, MONO = H.FONT.mono;
  const { clamp, ramp, lerp, easeOutCubic, text, rrect, measure } = H;

  const CMD = '$ claude --model claude-haiku-5-5';
  const CMD_RUNS = [[0, 2, D.mute], [2, 8, D.text], [8, 17, D.mute], [17, 33, ACC]];
  const OUT = 'Ready when you are.';
  const WIN = { x: 260, y: 220, w: 1400, h: 640 };          // the single terminal before the split
  const GRID = { x: 150, y: 170, w: 1620, h: 740, gap: 16, cols: 4, rows: 3 }; // inside the safe area
  const TW = (GRID.w - GRID.gap * (GRID.cols - 1)) / GRID.cols; // 393
  const TH = (GRID.h - GRID.gap * (GRID.rows - 1)) / GRID.rows; // 236
  const SIZE = 18;

  // Precomputed at load: cell rectangle and typing start for each of the 12 windows.
  const TILES = Array.from({ length: GRID.cols * GRID.rows }, (_, k) => {
    const r = Math.floor(k / GRID.cols), c = k % GRID.cols;
    return {
      cell: { x: GRID.x + c * (TW + GRID.gap), y: GRID.y + r * (TH + GRID.gap), w: TW, h: TH },
      t0: 0.5 * (r + 1) + 0.125 * c,
    };
  });

  const advCache = {};
  const advance = (ctx, size) => advCache[size] || (advCache[size] = measure(ctx, '0000000000', size, 400, MONO) / 10);
  const blinkOn = t => Math.floor(t * 2 + 1e-6) % 2 === 0;

  function cursor(ctx, x, base, size, adv) {
    ctx.save();
    ctx.fillStyle = ACC;
    ctx.fillRect(x, base - size * 0.8, adv, size);
    ctx.restore();
  }

  function runs(ctx, str, list, n, x, base, size, adv) {
    for (const [a, b, color] of list) {
      const hi = Math.min(b, n);
      if (hi > a) text(ctx, str.slice(a, hi), x + a * adv, base, { size, weight: 400, family: MONO, color });
    }
  }

  // One terminal window at rect r, at local time L (seconds since 10.0).
  function tile(ctx, r, t0, L, adv) {
    const { x, y, w, h } = r;
    rrect(ctx, x, y, w, h, 10);
    ctx.fillStyle = D.bg;
    ctx.fill();
    ctx.save();
    rrect(ctx, x, y, w, h, 10);
    ctx.clip();
    ctx.fillStyle = D.surface;
    ctx.fillRect(x, y, w, 34);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = D.mute;
      ctx.beginPath();
      ctx.arc(x + 14 + i * 12, y + 17, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const tx = x + 16, b0 = y + 68, b1 = y + 96, b2 = y + 124;
    const outStart = t0 + 1.25;
    // command: 4 characters per 0.125 s step, 33 characters, done at t0 + 1.0
    const n = L < t0 ? 0 : Math.min(CMD.length, (Math.floor((L - t0) / 0.125 + 1e-6) + 1) * 4);
    runs(ctx, CMD, CMD_RUNS, n, tx, b0, SIZE, adv);
    // output: 2 characters per 0.125 s step
    const m = L < outStart ? 0 : Math.min(OUT.length, (Math.floor((L - outStart) / 0.125 + 1e-6) + 1) * 2);
    if (m > 0) text(ctx, OUT.slice(0, m), tx, b1, { size: SIZE, weight: 400, family: MONO, color: D.text });

    // cursor: solid while typing or streaming, otherwise blinks on the next free line
    let cx = tx, cy = b0, solid = false;
    if (L >= t0 && n < CMD.length) { cx = tx + n * adv; solid = true; }
    else if (L >= outStart && m < OUT.length) { cx = tx + m * adv; cy = b1; solid = true; }
    else if (L >= outStart) { cy = b2; }
    else if (L >= t0 + 1.0) { cy = b1; }
    if (solid || blinkOn(L)) cursor(ctx, cx, cy, SIZE, adv);
  }

  H.scene({
    id: 'v3_s3_split', start: 10, end: 15,
    draw(ctx, t, local, dur) {
      if (local < 0) return; // hard cut at 10.0
      const L = clamp(local, 0, dur);
      const adv = advance(ctx, SIZE);

      // Full-frame invert: the light palette replaces the dark frame.
      ctx.globalAlpha = 1;
      ctx.fillStyle = LT.bg;
      ctx.fillRect(0, 0, H.W, H.H);

      // Split: each window moves from the single terminal rect into its grid cell over 0.25 s.
      const P = easeOutCubic(ramp(L, 0, 0.25));
      for (const tl of TILES) {
        const c = tl.cell;
        const r = {
          x: lerp(WIN.x, c.x, P), y: lerp(WIN.y, c.y, P),
          w: lerp(WIN.w, c.w, P), h: lerp(WIN.h, c.h, P),
        };
        tile(ctx, r, tl.t0, L, adv);
      }
    },
  });
})();
