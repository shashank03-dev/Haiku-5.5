// v1_s6_end (25.0 to 30.0, paper). 25.0 cut to the wordmark "Haiku 5.5", which mask-rises from 25.2
// (0.04 s per glyph). 26.5 cut to "Meet Haiku 5.5." (mask rise). 27.0 the seal stamps bottom-right,
// 27.5 the caption "claude-haiku-5-5" appears. The frame then holds, readable, to 30.0. No fade, so
// the last frame is the readable end card.
(function () {
  const START = 25.0, EPS = 1e-6;
  const SAFE = H.SAFE;
  const RISE_T = 0.35, STAGGER = 0.04, RISE_DIST = 1.1;
  const SEAL = 140, SEAL_R = 28;
  const GIANT_W = 1500;                         // target width of the wordmark, px

  // Glyph layout for a line of coloured runs: per-glyph x offset (with tracking) and total width.
  function layout(ctx, runs, size, weight, tracking) {
    const list = [];
    let s = '';
    runs.forEach(run => {
      for (const c of run.s) {
        list.push({ c, x: H.measure(ctx, s, size, weight, H.FONT.sans, tracking), color: run.color });
        s += c;
      }
    });
    return { list, width: H.measure(ctx, s, size, weight, H.FONT.sans, tracking) };
  }

  // Mask rise: each glyph slides up out of a clip box (its line box), staggered by STAGGER from t0.
  function rise(ctx, lay, x0, baseline, size, weight, t0, t) {
    lay.list.forEach((g, i) => {
      const p = H.easeOutExpo(H.ramp(t, t0 + i * STAGGER, t0 + i * STAGGER + RISE_T));
      if (p <= 0) return;
      const gx = x0 + g.x;
      const cw = H.measure(ctx, g.c, size, weight, H.FONT.sans, 0);
      ctx.save();
      ctx.beginPath();
      // Mask line sits on the baseline (a little below, for overshoot), so glyphs emerge from it.
      ctx.rect(gx - 4, baseline - size * 0.95, cw + 8, size * 1.01);
      ctx.clip();
      H.text(ctx, g.c, gx, baseline + (1 - p) * size * RISE_DIST, {
        size, weight, family: H.FONT.sans, color: g.color, align: 'left',
      });
      ctx.restore();
    });
  }

  // Seal, the same recipe as the variation's s5: vermilion body, "5.5" carved out, paper specks.
  let sealSprite = null;
  function buildSeal() {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = c.height = SEAL * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    g.fillStyle = V.accent;
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.fill();
    const rnd = H.prng(0x5e41);
    g.save();
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.clip();
    g.fillStyle = V.light.bg;
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * SEAL, y = rnd() * SEAL;
      const r = 0.3 + Math.pow(rnd(), 4) * 1.3;
      g.globalAlpha = 0.02 + rnd() * 0.10;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.globalAlpha = 1;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = H.font(100, 600);
    const m0 = g.measureText('5.5');
    const size = 100 * (SEAL * 0.56) / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight);
    g.font = H.font(size, 600);
    const m = g.measureText('5.5');
    const x = SEAL / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const y = SEAL / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.globalCompositeOperation = 'destination-out';
    g.fillText('5.5', x, y);
    g.globalCompositeOperation = 'source-over';
    return c;
  }
  function drawSeal(ctx, cx, cy) {
    if (!sealSprite) sealSprite = buildSeal();
    ctx.drawImage(sealSprite, cx - SEAL / 2, cy - SEAL / 2, SEAL, SEAL);
  }

  // Text layouts, built once on first draw (fonts are loaded by then).
  let giant = null, meet = null;
  function build(ctx) {
    const ink = V.light.text, acc = V.accent;
    const w100 = H.measure(ctx, 'Haiku 5.5', 100, 600, H.FONT.sans, -3);
    const gs = 100 * GIANT_W / w100;
    giant = {
      size: gs,
      lay: layout(ctx, [{ s: 'Haiku ', color: ink }, { s: '5.5', color: acc }], gs, 600, -0.03 * gs),
    };
    meet = {
      size: 170,
      lay: layout(ctx, [{ s: 'Meet Haiku ', color: ink }, { s: '5.5', color: acc }, { s: '.', color: ink }], 170, 600, -0.03 * 170),
    };
  }

  H.scene({ id: "v1_s6_end", start: 25, end: 30, draw(ctx, t, local, dur) {
    if (t < START - EPS) return;
    if (!giant) build(ctx);

    // 25.0 strobe, matching the audio hit: two paper frames (25.000, 25.017), then ink until the rise at 25.2.
    const strobeInk = t >= START + 2 / H.FPS - EPS && t < 25.2 - EPS;
    ctx.fillStyle = strobeInk ? V.dark.bg : V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);
    if (strobeInk) return;

    if (t < 26.5 - EPS) {
      // 25.0 to 26.5: the wordmark, centred on the frame, rising from 25.2.
      const g = giant;
      rise(ctx, g.lay, H.W / 2 - g.lay.width / 2, H.H / 2 + g.size * 0.36, g.size, 600, 25.2, t);
      return;
    }

    // 26.5 on: left-aligned on the safe edge.
    rise(ctx, meet.lay, SAFE, 500, meet.size, 600, 26.5, t);
    if (t >= 27.0 - EPS) drawSeal(ctx, H.W - SAFE - SEAL / 2, H.H - SAFE - SEAL / 2);
    if (t >= 27.5 - EPS) {
      H.text(ctx, 'claude-haiku-5-5', SAFE, 600, {
        size: 48, weight: 500, family: H.FONT.mono, color: V.light.text, align: 'left', tracking: 1.9,
      });
    }
  } });
})();
