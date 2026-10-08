// v1_s5_build (20.0 to 25.0). 20.0 pattern interrupt: full vermilion. At 20.5 the frame inverts
// to ink and the mark assembles in four hard cuts: bar 5 (20.5), bar 7 (21.0), bar 5 (21.5), and the
// seal (22.0). 22.5 inverts to paper. 23.0 the mark moves up, 23.5 "Built for everyday work."
// appears, 24.5 the three bars take the accent. 25.0 is the cut to the end card. Nothing fades.
(function () {
  const START = 20.0, END = 25.0, EPS = 1e-6;
  const U = 60, BAR_H = 64, BAR_GAP = 32, BAR_R = 16;
  const BAR_W = [5 * U, 7 * U, 5 * U];          // 5 : 7 : 5, in px
  const MARK_H = 3 * BAR_H + 2 * BAR_GAP;       // 256
  const SEAL = 140, SEAL_R = 28, SEAL_GAP = 48;
  const CX = H.W / 2;
  const TOP_BUILD = H.H / 2 - MARK_H / 2;       // mark centred
  const TOP_UP = 270;                           // mark after 23.0, leaves room for the line
  const LINE = 'Built for everyday work.';
  const LINE_SIZE = 96, LINE_Y = 720;

  // Seal: vermilion rounded square with "5.5" carved out (destination-out), so the background shows through.
  // Built once, on first use. Fonts are loaded by then.
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

    // Specks in paper colour, inside the body only, each under 12% opacity.
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

    // Carve "5.5" at a size where its ink spans 56% of the seal, centred on both axes.
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

  H.scene({ id: "v1_s5_build", start: 20, end: 25, draw(ctx, t, local, dur) {
    if (t < START - EPS || t >= END - EPS) return;

    // 20.0 to 20.5: pattern interrupt, full vermilion.
    if (t < 20.5 - EPS) {
      ctx.fillStyle = V.accent;
      ctx.fillRect(0, 0, H.W, H.H);
      return;
    }

    // Ink from 20.5 to 22.5, paper from 22.5 on.
    const dark = t < 22.5 - EPS;
    ctx.fillStyle = dark ? V.dark.bg : V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);
    const ink = dark ? V.dark.text : V.light.text;

    // Assembly cuts: bars at 20.5, 21.0, 21.5; seal at 22.0.
    const bars = t >= 21.5 - EPS ? 3 : t >= 21.0 - EPS ? 2 : 1;
    const top = t >= 23.0 - EPS ? TOP_UP : TOP_BUILD;
    ctx.fillStyle = t >= 24.5 - EPS ? V.accent : ink;
    let y = top;
    for (let k = 0; k < bars; k++) {
      H.rrect(ctx, CX - BAR_W[k] / 2, y, BAR_W[k], BAR_H, BAR_R);
      ctx.fill();
      y += BAR_H + BAR_GAP;
    }
    if (t >= 22.0 - EPS) {
      // Seal sits to the right of the bottom bar, centred on it.
      const bottomMid = top + 2 * (BAR_H + BAR_GAP) + BAR_H / 2;
      drawSeal(ctx, CX + BAR_W[2] / 2 + SEAL_GAP + SEAL / 2, bottomMid);
    }

    // 23.5: the line appears under the mark (hard cut, no motion).
    if (t >= 23.5 - EPS) {
      H.text(ctx, LINE, CX, LINE_Y, {
        size: LINE_SIZE, weight: 600, family: H.FONT.sans, color: V.light.text,
        align: 'center', tracking: -0.03 * LINE_SIZE,
      });
    }
  } });
})();
