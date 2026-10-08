// v5_s5_mark (20.0 to 25.0). 20.0 is the pattern interrupt: the frame flashes to amber and the
// flight cards collapse to a point. At 20.5 the frame flips back to graphite and the cards re-expand.
// The three bars (5:7:5) fly in as planes and land on 22.0, 22.25 and 22.5. The camera locks at 23.0.
// The seal card arrives at 23.5, and the seal stamps onto it at 24.0 with the main film's s01 recipe
// (220 px, paper "5.5" knocked out, seeded speckles), redrawn in the variation's amber.
(function () {
  const FOCAL = 1000;
  const T_IN = 20.0, T_OUT = 25.0;
  const FLASH_END = 20.5;               // amber flash ends, on the grid
  const CLEAR_A = 21.0, CLEAR_B = 21.5; // flight cards fade out
  const LOCK_A = 21.0, LOCK_B = 23.0;   // camera pulls in and locks on the mark at 23.0
  const CARD_A = 23.5, CARD_B = 24.0;   // seal card arrives, on the grid
  const STAMP = 24.0;                   // seal stamps, on the grid
  const ZC = 9000;                      // collapse depth: cards shrink to a point here
  const Z_NEAR = 1100, Z_FAR = 3700, SPAN = Z_FAR - Z_NEAR;

  // Seal: the s01 recipe. 220 px, rasterised at 2x. Speckles are seeded and sit inside the body.
  const SEAL = 220, SEAL_R = 26, GLYPH = '5.5', GLYPH_INK_W = 150;
  const sealRnd = H.prng(20255);
  let sprite = null;

  // Built on first draw, so the Geist faces are loaded. Runs once.
  function buildSprite() {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = c.height = SEAL * S;
    const g = c.getContext('2d');
    g.scale(S, S);

    // Body: amber rounded square.
    g.fillStyle = V.accent;
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.fill();

    // Ink texture: paper-coloured specks inside the body only, each under 12% opacity.
    g.save();
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.clip();
    g.fillStyle = V.light.bg;
    for (let i = 0; i < 1600; i++) {
      const x = sealRnd() * SEAL, y = sealRnd() * SEAL;
      const r = 0.3 + Math.pow(sealRnd(), 4) * 1.3;
      g.globalAlpha = 0.02 + sealRnd() * 0.10;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // Carve "5.5" with destination-out, so whatever is behind the seal shows through.
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
    if (alpha <= 0) return;
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

  // Projection: a point at (x, y, z) with the camera at (cam.x, cam.y, 0).
  function proj(x, y, z, cam) {
    const k = FOCAL / z;
    return { x: H.W / 2 + (x - cam.x) * k, y: H.H / 2 + (y - cam.y) * k, k };
  }

  // A fronto-parallel rounded card, w x h in world px at z = FOCAL.
  function roundCard(ctx, p, w, h, r, fill, alpha, outline) {
    const cw = w * p.k, ch = h * p.k;
    ctx.save();
    ctx.globalAlpha *= alpha;
    H.rrect(ctx, p.x - cw / 2, p.y - ch / 2, cw, ch, r * p.k);
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = V.dark.mute;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Flight cards: the same depth flow as s4, with a different seed. Frozen from 20.0.
  const FLOW = [];
  {
    const r = H.prng(0x9a1f3);
    for (let i = 0; i < 18; i++) {
      const w = 380 + r() * 320;
      FLOW.push({
        x: (r() * 2 - 1) * 2200,
        y: (r() * 2 - 1) * 1300,
        w,
        h: w * (0.6 + r() * 0.12),
        z0: Z_NEAR + r() * SPAN,
      });
    }
  }
  function flowZ(c, u) {
    const v = (c.z0 - Z_NEAR - 480 * (u + 0.12 * u * u)) % SPAN;
    return Z_NEAR + (v < 0 ? v + SPAN : v);
  }

  // Mark: bars are centred on MARK_X, 56 px tall, 28 px apart, widths 5u : 7u : 5u with u = 52.
  const U = 52, BAR_H = 56, BAR_R = 14, MARK_X = -260;
  const BARS = [
    { w: 5 * U, y: -84, land: 22.00, fx: -1200, fy: -700, fz: 2400 },
    { w: 7 * U, y: 0,   land: 22.25, fx: -1500, fy: 0,    fz: 2800 },
    { w: 5 * U, y: 84,  land: 22.50, fx: -1000, fy: 700,  fz: 2200 },
  ];
  // Each bar flies in over 0.75 s, ending on its landing cue.
  function barAt(b, t) {
    const p = H.easeOutExpo(H.ramp(t, b.land - 0.75, b.land));
    return { x: H.lerp(b.fx, MARK_X, p), y: H.lerp(b.fy, b.y, p), z: H.lerp(b.fz, FOCAL, p) };
  }
  const SEAL_CARD = { x: 290, y: 0, w: 340, h: 340, r: 40 };

  // Camera: pulls in from 21.0 to 23.0 and locks. After that it drifts gently.
  function camAt(t) {
    if (t < LOCK_A) return { x: 0, y: 0 };
    if (t < LOCK_B) {
      const e = 1 - H.easeInOutCubic(H.ramp(t, LOCK_A, LOCK_B));
      return { x: 240 * e, y: -120 * e };
    }
    const d = H.easeInOutCubic(H.ramp(t, LOCK_B, 23.5));
    const ph = (t - LOCK_B) * Math.PI / 2;
    return { x: 10 * d * Math.sin(ph), y: 6 * d * Math.sin(ph / 2) };
  }

  H.scene({ id: "v5_s5_mark", start: 20, end: 25, draw(ctx, t, local, dur) {
    if (t < T_IN || t >= T_OUT) return;
    const flash = t < FLASH_END;
    const cam = camAt(t);

    // Pattern interrupt: amber for 0.5 s, then graphite.
    ctx.fillStyle = flash ? V.accent : V.dark.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    const items = [];

    // Flight cards: collapse toward the vanishing point, then re-expand from it.
    const fade = 1 - H.ramp(t, CLEAR_A, CLEAR_B);
    if (fade > 0) {
      const uHold = Math.min(t - 15, 5);
      for (const c of FLOW) {
        const zr = flowZ(c, uHold);
        let z;
        if (flash) z = zr + (ZC - zr) * H.easeInCubic(H.ramp(t, T_IN, FLASH_END));
        else z = ZC + (zr - ZC) * H.easeOutExpo(H.ramp(t, FLASH_END, FLASH_END + 0.5));
        const p = proj(c.x, c.y, z, cam);
        items.push({ z, fn: () => roundCard(ctx, p, c.w, c.h, 22, flash ? V.dark.bg : V.dark.surface, fade, !flash) });
      }
    }

    // Bars: fly in as planes and land on the grid.
    for (const b of BARS) {
      const a = H.ramp(t, b.land - 0.75, b.land - 0.6);
      if (a <= 0) continue;
      const q = barAt(b, t);
      const p = proj(q.x, q.y, q.z, cam);
      items.push({ z: q.z, fn: () => roundCard(ctx, p, b.w, BAR_H, BAR_R, V.dark.text, a, false) });
    }

    // Seal card: flies in at 23.5. The seal stamps onto it at 24.0 (s01 recipe).
    const cardA = H.ramp(t, CARD_A, CARD_A + 0.2);
    if (cardA > 0) {
      const zc = H.lerp(2000, FOCAL, H.easeOutExpo(H.ramp(t, CARD_A, CARD_B)));
      const p = proj(SEAL_CARD.x, SEAL_CARD.y, zc, cam);
      const settle = H.easeOutSoft(H.ramp(t, STAMP, STAMP + 0.35));
      const stampOp = H.ramp(t, STAMP, STAMP + 0.15);
      const scale = H.lerp(1.35, 1.0, settle) * p.k;
      const rot = H.lerp(-4, 0, settle) * Math.PI / 180;
      items.push({ z: zc, fn: () => {
        roundCard(ctx, p, SEAL_CARD.w, SEAL_CARD.h, SEAL_CARD.r, V.dark.surface, cardA, true);
        drawSeal(ctx, p.x, p.y, scale, rot, stampOp * cardA);
      } });
    }

    // Far to near.
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.fn();
  } });
})();
