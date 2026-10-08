// v3_s4_diff (15.0 to 20.0), dark. A terminal window shows a short diff of the call in s05 of the main film.
// Hard cut in at 15.0 (the opaque ground covers s3). Two rows are removed (struck through, mute) and four are
// added (accent). Each row lands on the 0.5 s grid. The scene draws nothing from 20.0, where s5's flash takes over.
(function () {
  const D = V.dark, A = V.accent, F = H.FONT;
  const T0 = 15.0, T1 = 20.0;

  // Window: 1560 px wide, centred. Rows are 52 px, with a 64 px title bar.
  const WIN_W = 1560, WIN_R = 24, BAR_H = 64, PAD_Y = 36;
  const LH = 52, BASE = 34;                  // row height, baseline offset inside a row
  const MONO = { size: 30, weight: 500, family: F.mono };
  const WIN_H = BAR_H + PAD_Y * 2 + 8 * LH;  // 552
  const WIN_X = (H.W - WIN_W) / 2, WIN_Y = (H.H - WIN_H) / 2;
  const TEXT_X = WIN_X + 104, MARK_X = WIN_X + 56;
  const RISE_END = 15.4, RISE_PX = 36;
  const STRIKE_DUR = 0.25, WIPE_DUR = 0.125;

  // Rows, copied from the s05 snippet of the main film.
  // k: 'c' context, '-' removed, '+' added. t: the time the row lands (on the 0.5 s grid).
  const ROWS = [
    { k: 'c', s: 'const client = new Anthropic();', t: 15.5 },
    { k: '-', s: 'const reply = await client.messages.create({', t: 16.0 },
    { k: '-', s: '  max_tokens: 512,', t: 16.5 },
    { k: '+', s: 'const reply = await client.messages.create({', t: 17.0 },
    { k: '+', s: '  model: "claude-haiku-5-5",', t: 17.5 },
    { k: '+', s: '  max_tokens: 512,', t: 18.0 },
    { k: '+', s: '  messages: [{ role: "user", content: "Summarize this release note." }],', t: 18.5 },
    { k: 'c', s: '});', t: 19.0 },
  ];

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // +/- signs are drawn as bars, not glyphs, so the only text on screen is code.
  function marker(ctx, cx, cy, kind, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - 9, cy - 1.5, 18, 3);
    if (kind === '+') ctx.fillRect(cx - 1.5, cy - 9, 3, 18);
  }

  let widths = null; // row text widths, measured once on the first draw (fonts are ready by then)

  H.scene({ id: "v3_s4_diff", start: 15.0, end: 20.0, draw(ctx, t) {
    if (t < T0 || t >= T1) return;
    if (!widths) widths = ROWS.map(r => H.measure(ctx, r.s, MONO.size, MONO.weight, MONO.family));

    // Opaque ground for the whole frame.
    ctx.fillStyle = D.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Window rises into place over 0.4 s.
    const wy = WIN_Y + (1 - H.easeOutExpo(H.ramp(t, T0, RISE_END))) * RISE_PX;
    ctx.save();
    ctx.fillStyle = D.surface;
    H.rrect(ctx, WIN_X, wy, WIN_W, WIN_H, WIN_R);
    ctx.fill();
    H.rrect(ctx, WIN_X, wy, WIN_W, WIN_H, WIN_R);
    ctx.clip();

    // Title bar: the window body is the surface colour, with three dots and a faint hairline under the bar.
    ctx.fillStyle = D.mute;
    ctx.save();
    ctx.globalAlpha *= 0.25;
    ctx.fillRect(WIN_X, wy + BAR_H, WIN_W, 2);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(WIN_X + 40 + i * 26, wy + BAR_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Diff rows.
    const top = wy + BAR_H + PAD_Y;
    ROWS.forEach((R, i) => {
      if (t < R.t) return;
      const y = top + i * LH;
      const base = y + BASE;
      if (R.k === '+') {
        // Added rows get an accent wash that wipes in from the left.
        ctx.fillStyle = rgba(A, 0.10);
        ctx.fillRect(WIN_X, y, WIN_W * H.ramp(t, R.t, R.t + WIPE_DUR), LH);
      }
      const color = R.k === '+' ? A : R.k === '-' ? D.mute : D.text;
      H.text(ctx, R.s, TEXT_X, base, { ...MONO, color });
      if (R.k === '-') {
        // Removed rows are struck through, drawn left to right.
        ctx.fillStyle = D.mute;
        ctx.fillRect(TEXT_X, base - 9, widths[i] * H.ramp(t, R.t, R.t + STRIKE_DUR), 3);
      }
      if (R.k !== 'c') marker(ctx, MARK_X, y + 26, R.k, R.k === '+' ? A : D.mute);
    });
    ctx.restore();
  } });
})();
