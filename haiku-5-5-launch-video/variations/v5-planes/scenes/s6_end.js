// v5_s6_end (25.0 to 30.0). The camera settles to the front plane. A card flies in from depth over
// 25.0 to 26.0. "Meet Haiku 5.5." mask-rises on the card at 25.5, and the caption fades in at 27.0.
// From 27.6 the frame is still and readable on graphite (the brand colour) to 30.0.
(function () {
  const FOCAL = 1000;
  const T_IN = 25.0;
  const SETTLE_A = 25.0, SETTLE_B = 26.0; // front card and camera settle, eased
  const HEAD_A = 25.5;                    // headline, on the grid
  const CAP_IN = 27.0;                    // caption, on the grid
  const Z_FROM = 2600;                    // start depth of the front card
  const Z_NEAR = 1100, Z_FAR = 3700, SPAN = Z_FAR - Z_NEAR;

  const CARD = { w: 1400, h: 560, r: 40 };
  const WORDS = ['Meet', 'Haiku', '5.5.'];  // copy: "Meet Haiku 5.5."; the last word takes the accent
  const HEAD_STR = WORDS.join(' ');
  const HEAD = { weight: 600, base: -10, max: 1240, size0: 150 };
  const CAP = { text: 'claude-haiku-5-5', size: 40, weight: 500, base: 118, track: 3.2 };

  // Flight cards that clear the frame during the settle.
  const FLOW = [];
  {
    const r = H.prng(0x3e4d5);
    for (let i = 0; i < 6; i++) {
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
  function flowAlpha(z) {
    return H.ramp(z, Z_NEAR, Z_NEAR + 200) * (1 - H.ramp(z, Z_FAR - 500, Z_FAR));
  }

  // Camera: settles from an offset to the front plane, eased.
  function camAt(t) {
    const s = H.easeInOutCubic(H.ramp(t, SETTLE_A, SETTLE_B));
    return { x: H.lerp(-240, 0, s), y: H.lerp(120, 0, s) };
  }

  // The front card, drawn in its own local coordinates (centre at 0,0) so its text scales with depth.
  function drawFront(ctx, t, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.k, p.k);

    // Card: surface fill, a 2 px hairline edge.
    H.rrect(ctx, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, CARD.r);
    ctx.fillStyle = V.dark.surface;
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = V.dark.mute;
    ctx.lineWidth = 2 / p.k;
    H.rrect(ctx, -CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, CARD.r);
    ctx.stroke();
    ctx.restore();

    // Headline, fitted to the card width.
    const size = HEAD.size0 * Math.min(1, HEAD.max / H.measure(ctx, HEAD_STR, HEAD.size0, HEAD.weight, H.FONT.sans, -0.03 * HEAD.size0));
    const track = -0.03 * size;
    const total = H.measure(ctx, HEAD_STR, size, HEAD.weight, H.FONT.sans, track);
    WORDS.forEach((w, i) => {
      const start = HEAD_A + i * 0.06;   // 0.06 s word stagger
      if (t < start) return;
      const pre = i ? WORDS.slice(0, i).join(' ') + ' ' : '';
      const x = -total / 2 + H.measure(ctx, pre, size, HEAD.weight, H.FONT.sans, track);
      const ww = H.measure(ctx, w, size, HEAD.weight, H.FONT.sans, track);
      const q = H.easeOutExpo(H.ramp(t, start, start + 0.6));
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 8, HEAD.base - size * 0.95, ww + 16, size * 1.25);
      ctx.clip();
      H.text(ctx, w, x, HEAD.base + (1 - q) * size * 0.55, {
        size, weight: HEAD.weight, family: H.FONT.sans, tracking: track,
        color: i === WORDS.length - 1 ? V.accent : V.dark.text,
      });
      ctx.restore();
    });

    // Caption: mono, mute, rises and fades in at 27.0.
    const cq = H.easeOutExpo(H.ramp(t, CAP_IN, CAP_IN + 0.6));
    if (cq > 0) {
      H.text(ctx, CAP.text, 0, CAP.base + (1 - cq) * 14, {
        size: CAP.size, weight: CAP.weight, family: H.FONT.mono, tracking: CAP.track,
        color: V.dark.mute, align: 'center', alpha: cq,
      });
    }
    ctx.restore();
  }

  H.scene({ id: "v5_s6_end", start: 25, end: 30, draw(ctx, t, local, dur) {
    if (t < T_IN) return;
    const u = t - 15;
    const cam = camAt(t);

    // Graphite, the brand colour of this variation.
    ctx.fillStyle = V.dark.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Front card depth, eased from Z_FROM to the front plane (z = FOCAL).
    const s = H.easeInOutCubic(H.ramp(t, SETTLE_A, SETTLE_B));
    const zf = H.lerp(Z_FROM, FOCAL, s);
    const kf = FOCAL / zf;
    const pf = { x: H.W / 2 + (0 - cam.x) * kf, y: H.H / 2 + (0 - cam.y) * kf, k: kf };

    // Flight cards clear out during the settle. Far to near, the front card is drawn last.
    const fadeOut = 1 - H.ramp(t, 25.4, 26.0);
    const items = [];
    if (fadeOut > 0) {
      for (const c of FLOW) {
        const z = flowZ(c, u);
        const a = flowAlpha(z) * fadeOut;
        if (a <= 0) continue;
        const k = FOCAL / z;
        const w = c.w * k, h = c.h * k;
        const cx = H.W / 2 + (c.x - cam.x) * k;
        const cy = H.H / 2 + (c.y - cam.y) * k;
        items.push({ z, fn: () => {
          ctx.save();
          ctx.globalAlpha *= a;
          H.rrect(ctx, cx - w / 2, cy - h / 2, w, h, 22 * k);
          ctx.fillStyle = V.dark.surface;
          ctx.fill();
          ctx.restore();
        } });
      }
    }
    items.push({ z: zf, fn: () => drawFront(ctx, t, pf) });
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.fn();
  } });
})();
