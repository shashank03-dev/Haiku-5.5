// v3_s6_end (25.0 to 30.0), dark, held readable to the end.
// 25.0 the terminal clears (hard cut, caret at the start of the line). "Meet Haiku 5.5." types from 25.5,
// one character per 0.125 s tick, with "5.5" in accent. The caption `claude-haiku-5-5` streams in from 27.0,
// two characters per tick, and is complete by 27.875. The caret blinks on the 0.5 s grid to the end.
(function () {
  const D = V.dark, A = V.accent, F = H.FONT;
  const T_CLEAR = 25.0, T_HEAD = 25.5, T_CAP = 27.0, TICK = 0.125;

  const HEAD = 'Meet Haiku 5.5.';
  const HEAD_SIZE = 140, HEAD_BASE = 530;
  const HEAD_F = { size: HEAD_SIZE, weight: 500, family: F.mono };
  const CAP = 'claude-haiku-5-5';
  const CAP_BASE = 630;
  const CAP_F = { size: 44, weight: 500, family: F.mono };
  const LEFT = H.SAFE;

  // Colour runs of HEAD, as [from, to, colour]. "5.5" sits at indices 11 to 13.
  const RUNS = [[0, 11, D.text], [11, 14, A], [14, 15, D.text]];

  // Characters visible at t. Both counts are quantised to the 0.125 s tick.
  function headCount(t) {
    if (t < T_HEAD) return 0;
    return Math.min(HEAD.length, Math.floor((t - T_HEAD) / TICK + 1e-9) + 1);
  }
  function capCount(t) {
    if (t < T_CAP) return 0;
    return Math.min(CAP.length, 2 * (Math.floor((t - T_CAP) / TICK + 1e-9) + 1));
  }

  H.scene({ id: "v3_s6_end", start: 25.0, end: 30.0, draw(ctx, t) {
    if (t < T_CLEAR) return;

    // Cleared ground for the whole frame.
    ctx.fillStyle = D.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    const nH = headCount(t);
    for (const [a, b, colour] of RUNS) {
      const e = Math.min(b, nH);
      if (e <= a) continue;
      const x = LEFT + H.measure(ctx, HEAD.slice(0, a), HEAD_SIZE, HEAD_F.weight, HEAD_F.family);
      H.text(ctx, HEAD.slice(a, e), x, HEAD_BASE, { ...HEAD_F, color: colour });
    }

    const nC = capCount(t);
    if (nC > 0) H.text(ctx, CAP.slice(0, nC), LEFT, CAP_BASE, { ...CAP_F, color: D.mute });

    // Caret after the typed text, blinking 500 ms on and 500 ms off from 25.0.
    if ((t - T_CLEAR) % 1 < 0.5) {
      const x = Math.round(LEFT + H.measure(ctx, HEAD.slice(0, nH), HEAD_SIZE, HEAD_F.weight, HEAD_F.family));
      ctx.fillStyle = A;
      ctx.fillRect(x, HEAD_BASE - 98, 12, 104);
    }
  } });
})();
