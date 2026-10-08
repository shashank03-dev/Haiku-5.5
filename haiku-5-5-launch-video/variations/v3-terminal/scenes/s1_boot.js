// v3_s1_boot, 0-5 s. Accent flash at 0.0, the terminal window appears at 0.3,
// the model command types 0.5-2.0 on the 0.125 s grid, Enter at 2.0, the ready
// lines stream from 2.5, the footer shows the model from 3.5. Cursor blinks on
// the 0.5 s grid whenever it is idle. No randomness: every frame is a pure
// function of t.
(function () {
  const D = V.dark, ACC = V.accent, MONO = H.FONT.mono;
  const { clamp, ramp, lerp, easeOutCubic, text, rrect, measure } = H;

  const CMD = '$ claude --model claude-haiku-5-5';
  // colour runs over CMD: [from, to, colour] (character indices)
  const CMD_RUNS = [[0, 2, D.mute], [2, 8, D.text], [8, 17, D.mute], [17, 33, ACC]];
  const WIN = { x: 260, y: 220, w: 1400, h: 640 };
  const TX = WIN.x + 56, SIZE = 36, TITLE = 22;
  const BASE = [360, 416, 472, 528, 584]; // text baselines, lines 0 to 4
  const FOOT_T = 3.5;

  // Typing: 11 grid steps from 0.5 s, 0.125 s apart. Chunk sizes sum to 33 characters.
  const TYPE = (() => {
    let n = 0;
    return [2, 3, 3, 2, 3, 4, 3, 2, 3, 4, 4].map((c, k) => { n += c; return { t: 0.5 + 0.125 * k, n }; });
  })();
  // Streamed output: first character at t0, cps characters per 0.125 s step.
  const STREAMS = [
    { t0: 2.5, cps: 2, line: 1, text: 'Haiku 5.5', color: ACC },
    { t0: 3.25, cps: 2, line: 2, text: 'Ready when you are.', color: D.text },
  ];

  const advCache = {};
  // Mono advance width, measured once the font is loaded (first draw), then cached.
  const advance = (ctx, size) => advCache[size] || (advCache[size] = measure(ctx, '0000000000', size, 400, MONO) / 10);
  const typed = t => { let n = 0; for (const s of TYPE) { if (t >= s.t) n = s.n; else break; } return n; };
  const streamed = (t, s) => (t < s.t0 ? 0 : Math.min(s.text.length, (Math.floor((t - s.t0) / 0.125 + 1e-6) + 1) * s.cps));
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

  function chrome(ctx, title) {
    rrect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 16);
    ctx.fillStyle = D.surface;
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.3;
    ctx.strokeStyle = D.mute;
    ctx.lineWidth = 2;
    rrect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 16);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    rrect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 16);
    ctx.clip();
    ctx.fillStyle = D.bg;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, 52);
    ctx.globalAlpha *= 0.3;
    ctx.fillStyle = D.mute;
    ctx.fillRect(WIN.x, WIN.y + 52, WIN.w, 2);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = D.mute;
      ctx.beginPath();
      ctx.arc(WIN.x + 28 + i * 20, WIN.y + 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    text(ctx, title, WIN.x + WIN.w / 2, WIN.y + 33, { size: TITLE, weight: 400, family: MONO, color: D.mute, align: 'center' });
  }

  function footer(ctx, t) {
    const a = ramp(t, FOOT_T, FOOT_T + 0.125);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a * 0.3;
    ctx.fillStyle = D.mute;
    ctx.fillRect(WIN.x, WIN.y + WIN.h - 64, WIN.w, 2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(TX + 6, 818, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text(ctx, 'claude-haiku-5-5', TX + 26, 826, { size: 24, weight: 400, family: MONO, color: D.mute, alpha: a });
  }

  H.scene({
    id: 'v3_s1_boot', start: 0, end: 5,
    draw(ctx, t, local, dur) {
      const L = clamp(local, 0, dur);
      const adv = advance(ctx, SIZE);

      ctx.fillStyle = D.bg;
      ctx.fillRect(0, 0, H.W, H.H);

      // 0.0 accent flash: full for 0.1 s, gone by 0.3 s.
      const flash = 1 - ramp(L, 0.1, 0.3);
      if (flash > 0) {
        ctx.globalAlpha = flash;
        ctx.fillStyle = ACC;
        ctx.fillRect(0, 0, H.W, H.H);
        ctx.globalAlpha = 1;
      }

      // 0.3 window appears (small scale-in, 0.12 s).
      const wa = ramp(L, 0.3, 0.42);
      if (wa <= 0) return;
      const sc = lerp(0.96, 1, easeOutCubic(wa));
      ctx.save();
      ctx.translate(H.W / 2, H.H / 2);
      ctx.scale(sc, sc);
      ctx.translate(-H.W / 2, -H.H / 2);
      ctx.globalAlpha *= wa;

      chrome(ctx, 'Haiku 5.5');

      // Command: typed 0.5-2.0.
      const n = typed(L);
      runs(ctx, CMD, CMD_RUNS, n, TX, BASE[0], SIZE, adv);

      // Output streams, then the cursor sits on the next free line.
      let active = null, idle = 1;
      for (const st of STREAMS) {
        const k = streamed(L, st);
        if (k > 0) text(ctx, st.text.slice(0, k), TX, BASE[st.line], { size: SIZE, weight: 400, family: MONO, color: st.color });
        if (L >= st.t0 && k < st.text.length) { active = { st, k }; break; }
        if (L >= st.t0) idle = st.line + 1;
      }

      let cx = TX, cy = BASE[idle], solid = false;
      if (L < 2.0) {
        cx = TX + n * adv;
        cy = BASE[0];
        solid = L >= 0.5; // solid while typing, blinking when idle
      } else if (active) {
        cx = TX + active.k * adv;
        cy = BASE[active.st.line];
        solid = true;
      }
      if (solid || blinkOn(L)) cursor(ctx, cx, cy, SIZE, adv);

      footer(ctx, L);
      ctx.restore();
    },
  });
})();
