// v3_s6_end (25.0 to 30.0), dark, held readable to the end.
// 25.0 the terminal clears (hard cut) and the next command starts at once: `$ claude --model claude-haiku-5-5`
// types two characters per 0.125 s tick and finishes at 27.0. The caret moves along it until 25.5.
// "Meet Haiku 5.5." types from 25.5, one character per tick, with "5.5" in accent; the caret moves to it.
// The caption `claude-haiku-5-5` streams in from 27.0, two characters per tick, complete by 27.875.
(function () {
  const D = V.dark, A = V.accent, F = H.FONT;
  const T_CLEAR = 25.0, T_HEAD = 25.5, T_CAP = 27.0, TICK = 0.125;

  const CMD = '$ claude --model claude-haiku-5-5';
  const CMD_BASE = 340;
  const CMD_F = { size: 40, weight: 500, family: F.mono };

  const HEAD = 'Meet Haiku 5.5.';
  const HEAD_SIZE = 140, HEAD_BASE = 530;
  const HEAD_F = { size: HEAD_SIZE, weight: 500, family: F.mono };
  const CAP = 'claude-haiku-5-5';
  const CAP_BASE = 630;
  const CAP_F = { size: 44, weight: 500, family: F.mono };
  const LEFT = H.SAFE;

  // Colour runs of HEAD, as [from, to, colour]. "5.5" sits at indices 11 to 13.
  const RUNS = [[0, 11, D.text], [11, 14, A], [14, 15, D.text]];

  // Characters visible at t: `per` characters on each 0.125 s tick from `t0`, capped at `total`.
  function revealed(t, t0, per, total) {
    if (t < t0) return 0;
    return Math.min(total, per * (Math.floor((t - t0) / TICK + 1e-9) + 1));
  }

  H.scene({ id: "v3_s6_end", start: 25.0, end: 30.0, draw(ctx, t) {
    if (t < T_CLEAR) return;

    // Cleared ground for the whole frame.
    ctx.fillStyle = D.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Command line, typed from 25.0 (two characters per tick, done at 27.0).
    const nCmd = revealed(t, T_CLEAR, 2, CMD.length);
    if (nCmd > 0) H.text(ctx, CMD.slice(0, nCmd), LEFT, CMD_BASE, { ...CMD_F, color: D.mute });

    // Headline, typed from 25.5 (one character per tick).
    const nH = revealed(t, T_HEAD, 1, HEAD.length);
    for (const [a, b, colour] of RUNS) {
      const e = Math.min(b, nH);
      if (e <= a) continue;
      const x = LEFT + H.measure(ctx, HEAD.slice(0, a), HEAD_SIZE, HEAD_F.weight, HEAD_F.family);
      H.text(ctx, HEAD.slice(a, e), x, HEAD_BASE, { ...HEAD_F, color: colour });
    }

    // Caption, streamed from 27.0 (two characters per tick, done at 27.875).
    const nC = revealed(t, T_CAP, 2, CAP.length);
    if (nC > 0) H.text(ctx, CAP.slice(0, nC), LEFT, CAP_BASE, { ...CAP_F, color: D.mute });

    // One caret: on the command line until 25.5, then after the headline. Blinks 500 ms on and off from 25.0.
    if ((t - T_CLEAR) % 1 < 0.5) {
      ctx.fillStyle = A;
      if (t < T_HEAD) {
        const x = Math.round(LEFT + H.measure(ctx, CMD.slice(0, nCmd), CMD_F.size, CMD_F.weight, CMD_F.family));
        ctx.fillRect(x, CMD_BASE - 34, 12, 46);
      } else {
        const x = Math.round(LEFT + H.measure(ctx, HEAD.slice(0, nH), HEAD_SIZE, HEAD_F.weight, HEAD_F.family));
        ctx.fillRect(x, HEAD_BASE - 98, 12, 104);
      }
    }
  } });
})();
