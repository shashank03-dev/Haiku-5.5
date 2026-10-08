// v3_s5_seal (20.0 to 25.0), dark. 20.0 is the pattern interrupt: a full-frame accent flash for 0.1 s,
// then the terminal window collapses to a point. The seal stamps at 20.5 with the s01 recipe of the main film
// (220 px, radius 26, "5.5" knocked out, 1600 speckles from H.prng(20255)). A caret blinks from 21.0, and
// "Built for everyday work." types from 22.0 on the 0.125 s grid. Nothing is drawn from 25.0 (s6 clears).
(function () {
  const D = V.dark, L = V.light, A = V.accent, F = H.FONT;
  const T_FLASH = 20.0, T_COLLAPSE = 20.1, T_POINT = 20.45, T_STAMP = 20.5;
  const T_CARET = 21.0, T_TYPE = 22.0, T_END = 25.0;
  const TICK = 0.125;

  // Seal: same recipe as s01 of the main film, with the body in the variation accent.
  const SEAL = 220, SEAL_R = 26, GLYPH = '5.5', GLYPH_INK_W = 150;
  const C = { x: H.W / 2, y: 470 };          // stamp centre, and the point the window collapses to

  // Speckles precomputed at load, in the order s01 draws them: x, y, radius, alpha, four values per speck.
  const SPECKS = (() => {
    const rnd = H.prng(20255);
    const out = [];
    for (let i = 0; i < 1600; i++) {
      const x = rnd() * SEAL, y = rnd() * SEAL;
      const r = 0.3 + Math.pow(rnd(), 4) * 1.3;
      const a = 0.02 + rnd() * 0.10;
      out.push(x, y, r, a);
    }
    return out;
  })();

  // Typed line, left-aligned at a fixed x so the typing does not shift it.
  const TYPED = 'Built for everyday work.';
  const TYPE = { size: 72, weight: 500, family: F.mono };
  const TYPE_BASE = 730;

  let sprite = null; // built on the first draw, when the Geist faces are loaded
  let typed = null;  // { left } measured on the first draw

  // Built once, then reused. Same steps as s01: body, speckles clipped to the body, then "5.5" carved out.
  function buildSprite() {
    const S = 2; // rasterised at 2x for crisp edges when scaled and rotated
    const c = document.createElement('canvas');
    c.width = c.height = SEAL * S;
    const g = c.getContext('2d');
    g.scale(S, S);

    g.fillStyle = A;
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.fill();

    g.save();
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.clip();
    g.fillStyle = L.bg;
    for (let i = 0; i < SPECKS.length; i += 4) {
      g.globalAlpha = SPECKS[i + 3];
      g.beginPath();
      g.arc(SPECKS[i], SPECKS[i + 1], SPECKS[i + 2], 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = H.font(100, 600);
    const m0 = g.measureText(GLYPH);
    const size = 100 * GLYPH_INK_W / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight);
    g.font = H.font(size, 600);
    const m = g.measureText(GLYPH);
    const x = SEAL / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const y = SEAL / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    g.fillText(GLYPH, x, y);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Seal centred on (x, y), with scale, rotation (radians) and opacity.
  function drawSeal(ctx, x, y, scale, rot, alpha) {
    if (!sprite) sprite = buildSprite();
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, -SEAL / 2, -SEAL / 2, SEAL, SEAL);
    ctx.restore();
  }

  // Window shrinking from full frame (p = 0) to the point C (p = 1), with an accent edge.
  function drawWindow(ctx, p) {
    const x0 = H.lerp(0, C.x, p), x1 = H.lerp(H.W, C.x, p);
    const y0 = H.lerp(0, C.y, p), y1 = H.lerp(H.H, C.y, p);
    const w = x1 - x0, h = y1 - y0;
    const r = Math.min(24 * (1 - p), w / 2, h / 2);
    ctx.save();
    ctx.fillStyle = D.surface;
    H.rrect(ctx, x0, y0, w, h, r);
    ctx.fill();
    ctx.strokeStyle = A;
    ctx.lineWidth = 3;
    ctx.globalAlpha *= 0.9;
    H.rrect(ctx, x0, y0, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  // Number of typed characters at t: one per 0.125 s tick, starting at T_TYPE.
  function typedCount(t) {
    if (t < T_TYPE) return 0;
    return Math.min(TYPED.length, Math.floor((t - T_TYPE) / TICK + 1e-9) + 1);
  }

  H.scene({ id: "v3_s5_seal", start: 20.0, end: 25.0, draw(ctx, t) {
    if (t < T_FLASH || t >= T_END) return;

    // Pattern interrupt: the whole frame flashes accent for 0.1 s.
    if (t < T_COLLAPSE) {
      ctx.fillStyle = A;
      ctx.fillRect(0, 0, H.W, H.H);
      return;
    }

    ctx.fillStyle = D.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Collapse to a point, then the seal stamps at C (scale 1.35 to 1.0, rotation -4 to 0 degrees, as s01).
    if (t < T_STAMP) {
      const p = H.easeInCubic(H.ramp(t, T_COLLAPSE, T_POINT));
      if (p < 1) {
        drawWindow(ctx, p);
      } else {
        ctx.fillStyle = A;
        ctx.beginPath();
        ctx.arc(C.x, C.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const settle = H.easeOutSoft(H.ramp(t, T_STAMP, T_STAMP + 0.35));
      const alpha = H.ramp(t, T_STAMP, T_STAMP + 0.15);
      drawSeal(ctx, C.x, C.y, H.lerp(1.35, 1.0, settle), H.lerp(-4, 0, settle) * Math.PI / 180, alpha);
    }

    // Caret from 21.0 (500 ms on, 500 ms off), then the typed line from 22.0.
    if (t >= T_CARET) {
      if (!typed) {
        const w = H.measure(ctx, TYPED, TYPE.size, TYPE.weight, TYPE.family);
        typed = { left: H.W / 2 - w / 2 };
      }
      const n = typedCount(t);
      if (n > 0) H.text(ctx, TYPED.slice(0, n), typed.left, TYPE_BASE, { ...TYPE, color: D.text });
      if ((t - T_CARET) % 1 < 0.5) {
        const cx = Math.round(typed.left + H.measure(ctx, TYPED.slice(0, n), TYPE.size, TYPE.weight, TYPE.family));
        ctx.fillStyle = A;
        ctx.fillRect(cx, TYPE_BASE - 50, 5, 60);
      }
    }
  } });
})();
