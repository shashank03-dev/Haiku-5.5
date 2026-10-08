// v3_s2_task, 5-10 s. A prompt types 0-1.0 on the 0.125 s grid (copy-bank text,
// since the brief allows only copy-bank strings), Enter at 1.0, a spinner
// 1.0-1.25, "Summary ready in one pass." streams from 1.25, then three copy-bank
// lines appear in turn at 2.5, 3.0 and 3.5 (each on screen at least 1.5 s).
// Footer at 4.0. The scene is cut in at 5.0 with a 0.125 s fade. No randomness.
(function () {
  const D = V.dark, ACC = V.accent, MONO = H.FONT.mono;
  const { clamp, ramp, text, rrect, measure } = H;

  const PROMPT = 'Fast replies, sharp reasoning.';
  const SUMMARY = 'Summary ready in one pass.';
  const WIN = { x: 260, y: 220, w: 1400, h: 640 };
  const TX = WIN.x + 56;       // chevron and markers
  const CX = TX + 36;          // text column
  const SIZE = 36, TITLE = 22;
  const BASE = [360, 416, 472, 528, 584, 640]; // text baselines, lines 0 to 5
  const FOOT_T = 4.0;

  // Prompt typing: 8 grid steps from 0 s, chunk sizes sum to 30 characters.
  const TYPE = (() => {
    let n = 0;
    return [4, 4, 4, 4, 4, 4, 3, 3].map((c, k) => { n += c; return { t: 0.125 * k, n }; });
  })();
  const SUMMARY_T0 = 1.25, SUMMARY_CPS = 3;
  // Lines printed in turn: t (local), line index, copy-bank text.
  const LIST = [
    { t: 2.5, line: 2, text: 'Quick to answer.' },
    { t: 3.0, line: 3, text: 'Sharp in the details.' },
    { t: 3.5, line: 4, text: 'Built for everyday work.' },
  ];

  const advCache = {};
  const advance = (ctx, size) => advCache[size] || (advCache[size] = measure(ctx, '0000000000', size, 400, MONO) / 10);
  const typed = t => { let n = 0; for (const s of TYPE) { if (t >= s.t) n = s.n; else break; } return n; };
  const summaryCount = t => (t < SUMMARY_T0 ? 0 : Math.min(SUMMARY.length, (Math.floor((t - SUMMARY_T0) / 0.125 + 1e-6) + 1) * SUMMARY_CPS));
  const blinkOn = t => Math.floor(t * 2 + 1e-6) % 2 === 0;

  function cursor(ctx, x, base, size, adv) {
    ctx.save();
    ctx.fillStyle = ACC;
    ctx.fillRect(x, base - size * 0.8, adv, size);
    ctx.restore();
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
    id: 'v3_s2_task', start: 5, end: 10,
    draw(ctx, t, local, dur) {
      if (local < -0.125) return; // not yet: the previous scene is still on screen
      const L = clamp(local, 0, dur);
      const adv = advance(ctx, SIZE);

      ctx.globalAlpha = ramp(local, -0.125, 0);
      ctx.fillStyle = D.bg;
      ctx.fillRect(0, 0, H.W, H.H);

      chrome(ctx, 'Haiku 5.5');

      // Prompt: chevron drawn as a shape, input typed 0-0.875, Enter at 1.0.
      ctx.save();
      ctx.strokeStyle = ACC;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(TX, BASE[0] - 24);
      ctx.lineTo(TX + 12, BASE[0] - 12);
      ctx.lineTo(TX, BASE[0]);
      ctx.stroke();
      ctx.restore();
      const n = typed(L);
      text(ctx, PROMPT.slice(0, n), CX, BASE[0], { size: SIZE, weight: 400, family: MONO, color: D.text });

      // Spinner 1.0-1.25 (a shape, four turns per second).
      if (L >= 1.0 && L < SUMMARY_T0) {
        const a = L * Math.PI * 8;
        ctx.save();
        ctx.strokeStyle = ACC;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(TX + 12, BASE[1] - 13, 10, a, a + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      }

      // Summary streams letter by letter.
      const k = summaryCount(L);
      if (k > 0) text(ctx, SUMMARY.slice(0, k), CX, BASE[1], { size: SIZE, weight: 400, family: MONO, color: D.text });

      // Three lines in turn, each with an accent square marker.
      let shown = 0;
      for (const it of LIST) {
        if (L < it.t) continue;
        shown++;
        ctx.save();
        ctx.fillStyle = ACC;
        ctx.fillRect(TX, BASE[it.line] - 20, 14, 14);
        ctx.restore();
        text(ctx, it.text, CX, BASE[it.line], { size: SIZE, weight: 400, family: MONO, color: D.text });
      }

      // Cursor: solid while typing or streaming, otherwise it sits on the next free line and blinks.
      if (L < 1.0) {
        cursor(ctx, CX + n * adv, BASE[0], SIZE, adv);
      } else if (L < SUMMARY_T0) {
        // spinner is showing, no cursor
      } else if (k < SUMMARY.length) {
        cursor(ctx, CX + k * adv, BASE[1], SIZE, adv);
      } else if (blinkOn(L)) {
        cursor(ctx, CX, BASE[2 + shown], SIZE, adv);
      }

      footer(ctx, L);
    },
  });
})();
