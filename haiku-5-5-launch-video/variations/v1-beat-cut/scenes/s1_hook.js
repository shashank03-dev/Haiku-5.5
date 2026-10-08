// v1_s1_hook (0 to 5 s): a full-frame "5.5" slam, the HAIKU letter hits, then hard cuts through the copy bank.
// Every cut sits on the 0.5 s grid. The scene paints its own background and draws nothing outside its window.
(function () {
  const W = H.W, HT = H.H, SAFE = H.SAFE, SANS = H.FONT.sans;
  const D = V.dark, L = V.light, A = V.accent;
  const CAP = 0.36;         // half a cap height (0.72 em): puts a centred line's caps on the frame's middle
  const MAX_W = 1500;       // every display line is fitted to this width
  const HAIKU = 300;        // size of the HAIKU / 5.5 lockup
  const LETTERS = 'HAIKU';  // the copy-bank word "Haiku", set in capitals as the brief asks

  // Text is measured once, on first draw (Geist is loaded by then). Later frames only read the memo.
  const memo = new Map();
  const once = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); };
  const fit = (ctx, s, maxS) => once(`fit|${s}|${maxS}`, () => {
    const w = H.measure(ctx, s, 100, 700, SANS, -2); // tracking is -0.02 em, so it scales with size
    return Math.min(maxS, 100 * MAX_W / w);
  });
  const lay = ctx => once('haiku', () => {
    const xs = [], ws = [];
    let pre = '';
    for (const ch of LETTERS) {
      xs.push(SAFE + H.measure(ctx, pre, HAIKU, 700, SANS, -0.02 * HAIKU));
      ws.push(H.measure(ctx, ch, HAIKU, 700, SANS, -0.02 * HAIKU));
      pre += ch;
    }
    return { xs, ws };
  });

  const bg = (ctx, c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, HT); };
  const txt = (ctx, s, x, y, size, color, align = 'center') =>
    H.text(ctx, s, x, y, { size, weight: 700, family: SANS, color, align, tracking: -0.02 * size });
  const snap = (T, t0, dur) => H.easeOutExpo(H.ramp(T, t0, t0 + dur)); // 0 at t0, 1 at t0 + dur
  const yMid = size => HT / 2 + size * CAP;                              // baseline that centres a line

  // 0.0 to 0.5: "5.5" slams full-frame (scale 2.6 to 1, blur 18 to 0 over 0.25 s), then holds.
  function slam(ctx, T) {
    const size = fit(ctx, '5.5', 1100);
    const k = snap(T, 0, 0.25);
    const s = 2.6 - 1.6 * k;
    const blur = 18 * (1 - k);
    bg(ctx, L.bg);
    ctx.save();
    ctx.translate(W / 2, HT / 2);
    ctx.scale(s, s);
    if (blur > 0.05) ctx.filter = `blur(${blur.toFixed(2)}px)`;
    txt(ctx, '5.5', 0, size * CAP, size, L.text);
    ctx.restore();
  }

  // 0.5 to 1.0: HAIKU, one letter every 0.04 s, each hitting from 1.3x down to 1x.
  function word(ctx, T) {
    bg(ctx, D.bg);
    const { xs, ws } = lay(ctx);
    const y = yMid(HAIKU);
    for (let i = 0; i < LETTERS.length; i++) {
      const t0 = 0.5 + 0.04 * i;
      if (T < t0) continue;
      const p = snap(T, t0, 0.1);
      ctx.save();
      ctx.globalAlpha *= Math.min(1, p * 3);
      ctx.translate(xs[i] + ws[i] / 2, y);
      ctx.scale(1.3 - 0.3 * p, 1.3 - 0.3 * p);
      txt(ctx, LETTERS[i], 0, 0, HAIKU, D.text);
      ctx.restore();
    }
  }

  // 1.0 to 1.5: "5.5" cuts in on the right in the seal colour, sliding 120 px into place.
  function lockup(ctx, T) {
    word(ctx, T);
    const p = snap(T, 1.0, 0.1);
    txt(ctx, '5.5', W - SAFE + 120 * (1 - p), yMid(HAIKU), HAIKU, A, 'right');
  }

  // Full-frame cards on hard cuts: [start, end, background, text, copy]. Each card hits from 1.08x.
  const CARDS = [
    [1.5, 2.0, A, D.bg, 'Fast.'],
    [2.0, 2.5, D.bg, D.text, 'Sharp.'],
    [2.5, 3.0, A, D.bg, 'Everyday.'],
    [4.0, 4.5, D.bg, D.text, 'Claude'],
    [4.5, 5.0, A, D.bg, 'Haiku 5.5'],
  ];
  function card(ctx, T, t0, bgc, fg, s) {
    bg(ctx, bgc);
    const size = fit(ctx, s, 460);
    const p = snap(T, t0, 0.1);
    ctx.save();
    ctx.translate(W / 2, HT / 2);
    ctx.scale(1.08 - 0.08 * p, 1.08 - 0.08 * p);
    txt(ctx, s, 0, size * CAP, size, fg);
    ctx.restore();
  }

  // 3.0 to 4.0: light card, two lines, the second in the seal colour.
  function small(ctx, T) {
    bg(ctx, L.bg);
    const size = fit(ctx, 'Small model,', 300);
    const lh = size;
    const y1 = HT / 2 - lh / 2 + size * CAP;
    [['Small model,', L.text, 0.0], ['big aim.', A, 0.04]].forEach(([s, col, d], i) => {
      const p = snap(T, 3.0 + d, 0.12);
      txt(ctx, s, SAFE - 90 * (1 - p), y1 + i * lh, size, col, 'left');
    });
  }

  H.scene({ id: 'v1_s1_hook', start: 0, end: 5, draw(ctx, t, T) {
    if (T < 0 || T >= 5) return;
    if (T < 0.5) return slam(ctx, T);
    if (T < 1.0) return word(ctx, T);
    if (T < 1.5) return lockup(ctx, T);
    if (T >= 3.0 && T < 4.0) return small(ctx, T);
    for (const [a, b, bgc, fg, s] of CARDS) if (T >= a && T < b) return card(ctx, T, a, bgc, fg, s);
  } });
})();
