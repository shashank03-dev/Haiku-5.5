// v1_s2_stack (5 to 10 s): a word stack builds with hard cuts on the 0.5 s grid.
// Every cut re-aligns the stack (left, right, centre) and the newest word snaps in from 1.12x.
// The stack resets at 7.0 and flashes to vermilion at 9.5.
(function () {
  const W = H.W, HT = H.H, SAFE = H.SAFE, SANS = H.FONT.sans;
  const D = V.dark, L = V.light, A = V.accent;
  const SIZE = 210, LH = 186, TRK = -0.02 * SIZE;
  const STACKS = [['Quick', 'to', 'answer.'], ['Sharp', 'in', 'the', 'details.']];
  const THEME = {
    light: { bg: L.bg, fg: L.text },
    dark: { bg: D.bg, fg: D.text },
    accent: { bg: A, fg: D.bg },
  };
  const X = { left: SAFE, right: W - SAFE, center: W / 2 };
  // [local time, stack, words shown, alignment, theme]. Local time 0 is 5.0 s in the film.
  const CUTS = [
    [0.0, 0, 1, 'left', 'light'],
    [0.5, 0, 2, 'right', 'light'],
    [1.0, 0, 3, 'center', 'light'],
    [1.5, 0, 3, 'left', 'light'],
    [2.0, 1, 1, 'right', 'dark'],
    [2.5, 1, 2, 'center', 'dark'],
    [3.0, 1, 3, 'left', 'dark'],
    [3.5, 1, 4, 'right', 'dark'],
    [4.0, 1, 4, 'center', 'dark'],
    [4.5, 1, 4, 'left', 'accent'],
  ];

  H.scene({ id: 'v1_s2_stack', start: 5, end: 10, draw(ctx, t, T) {
    if (T < 0 || T >= 5) return;
    let cut = CUTS[0];
    for (const c of CUTS) if (T >= c[0]) cut = c;
    const [t0, si, n, align, theme] = cut;
    const th = THEME[theme];
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, HT);

    // The block is centred on the frame for however many words it holds.
    const hit = H.easeOutExpo(H.ramp(T, t0, t0 + 0.1));
    const base0 = HT / 2 - ((n - 1) * LH) / 2 + 0.36 * SIZE;
    STACKS[si].slice(0, n).forEach((word, i) => {
      const s = i === n - 1 ? 1.12 - 0.12 * hit : 1;
      ctx.save();
      ctx.translate(X[align], base0 + i * LH);
      ctx.scale(s, s);
      H.text(ctx, word, 0, 0, { size: SIZE, weight: 700, family: SANS, color: th.fg, align, tracking: TRK });
      ctx.restore();
    });
  } });
})();
