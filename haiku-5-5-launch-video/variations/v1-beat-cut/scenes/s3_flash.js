// v1_s3_flash (10 to 15 s): the 10.0 pattern interrupt (a 0.1 s light strobe, then dark), a 5 x 3 square
// grid that scales in and out on the 0.5 s grid, the install line typed fast, then a vermilion hit before s4.
(function () {
  const W = H.W, HT = H.H, MONO = H.FONT.mono;
  const D = V.dark, L = V.light, A = V.accent;
  const bg = (ctx, c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, HT); };

  // Grid: 5 columns by 3 rows of 216 px squares with 24 px gaps, centred.
  const COLS = 5, ROWS = 3, SQ = 216, GAP = 24;
  const GX = (W - (COLS * SQ + (COLS - 1) * GAP)) / 2;
  const GY = (HT - (ROWS * SQ + (ROWS - 1) * GAP)) / 2;
  const STEP = [0.5, 1.0, 1.5, 2.0, 2.5];           // local seconds: 10.5, 11.0, 11.5, 12.0, 12.5
  const cells = f => {                              // 1 = square on; index = row * 5 + col
    const out = [];
    for (let i = 0; i < ROWS * COLS; i++) out.push(f(Math.floor(i / COLS), i % COLS) ? 1 : 0);
    return out;
  };
  const MASK = [
    cells((r, c) => c === 2),                       // a vertical bar
    cells((r, c) => (r + c) % 2 === 0),             // checker
    cells((r, c) => r === 0 || r === 2 || c === 0 || c === 4), // frame
    cells((r, c) => r === 1 || c === 2),            // cross
    cells(() => true),                              // full
  ];
  const HOT = [7, 6, 0, 7, 12];                     // the one vermilion square in each step (always on in its step)

  function grid(ctx, T) {
    bg(ctx, D.bg);
    let k = 0;
    for (let j = 0; j < STEP.length; j++) if (T >= STEP[j]) k = j;
    const p = H.easeOutExpo(H.ramp(T, STEP[k], STEP[k] + 0.12)); // squares snap in and out over 0.12 s
    for (let i = 0; i < ROWS * COLS; i++) {
      const x = GX + (i % COLS) * (SQ + GAP), y = GY + Math.floor(i / COLS) * (SQ + GAP);
      ctx.globalAlpha = 0.35;                       // ghost outline keeps the grid visible while squares are off
      ctx.strokeStyle = D.mute;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, SQ - 2, SQ - 2);
      ctx.globalAlpha = 1;
      const from = k > 0 ? MASK[k - 1][i] : 0;
      const s = from + (MASK[k][i] - from) * p;
      if (s > 0.01) {
        const w = SQ * s;
        ctx.fillStyle = HOT[k] === i ? A : D.text;
        ctx.fillRect(x + (SQ - w) / 2, y + (SQ - w) / 2, w, w);
      }
    }
  }

  // Install line: "$ claude --model " in paper, the model string in the seal colour. Typed over 0.7 s, cursor left on.
  const CMD = '$ claude --model ', MODEL = 'claude-haiku-5-5';
  const FULL = CMD + MODEL, LSZ = 64, Y = HT / 2 + LSZ * 0.36;
  let layout = null; // measured on first draw, once Geist Mono is loaded
  function line(ctx, T) {
    bg(ctx, D.bg);
    if (!layout) layout = {
      x0: (W - H.measure(ctx, FULL, LSZ, 500, MONO, 0)) / 2,
      cmd: H.measure(ctx, CMD, LSZ, 500, MONO, 0),
    };
    const n = Math.floor(H.clamp((T - 3.0) / 0.7) * FULL.length);
    const f = { size: LSZ, weight: 500, family: MONO };
    H.text(ctx, CMD.slice(0, Math.min(n, CMD.length)), layout.x0, Y, { ...f, color: D.text });
    H.text(ctx, MODEL.slice(0, Math.max(0, n - CMD.length)), layout.x0 + layout.cmd, Y, { ...f, color: A });
    const cx = layout.x0 + H.measure(ctx, FULL.slice(0, n), LSZ, 500, MONO, 0);
    ctx.fillStyle = D.text;
    ctx.fillRect(cx + 4, Y - 46, 30, 56);
  }

  H.scene({ id: 'v1_s3_flash', start: 10, end: 15, draw(ctx, t, T) {
    if (T < 0 || T >= 5) return;
    if (T < 0.1) return bg(ctx, L.bg);              // 10.0: white strobe, the pattern interrupt
    if (T < 0.5) return bg(ctx, D.bg);              // light to dark
    if (T < 3.0) return grid(ctx, T);               // 10.5 to 13.0
    if (T < 4.5) return line(ctx, T);               // 13.0 to 14.5
    bg(ctx, A);                                     // 14.5 to 15.0: vermilion hit into s4
  } });
})();
