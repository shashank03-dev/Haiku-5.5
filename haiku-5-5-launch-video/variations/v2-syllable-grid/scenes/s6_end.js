// v2_s6_end: the cells converge into a seal (25.0 to 25.75), the seal stamps (25.5), then the copy and the caption.
// The end card is clean and holds readable from 28.5 to 30.0 on the palette's dark base.
(function () {
  const T0 = 25.0;
  const SX = 960, SY = 365, SS = 220;        // seal centre and size, px
  const TEXT_Y = 685, CAP_Y = 785;           // baselines of the headline and the caption
  const PITCH = 48, CELL = 36, RAD = 7, NX = 39, NY = 21;
  const rnd = H.prng(0x7e3);

  // Field cells and their paths into the seal. Cells far from the seal start at 25.0, near ones at 25.25.
  const field = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x0 = 960 + (i - 19) * PITCH, y0 = 540 + (j - 10) * PITCH;
    field.push({ x0, y0, dl: Math.hypot(x0 - SX, y0 - SY) > 520 ? 0 : 0.25, ac: rnd() < 0.16 });
  }
  // Ink speckles inside the seal, drawn at 12% opacity.
  const specks = [];
  for (let n = 0; n < 70; n++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * SS * 0.42;
    specks.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, s: 1.2 + rnd() * 2.6 });
  }

  // Built on first draw, after the fonts have loaded.
  let ready = false, words = [], capText = 'claude-haiku-5-5', capX = 0;

  function cellRect(g, x, y, sc, color) {
    const s = CELL * sc;
    g.fillStyle = color;
    H.rrect(g, x - s / 2, y - s / 2, s, s, RAD * sc);
    g.fill();
  }

  // Mask-rise: the line slides up out of a clip box. p runs 0 to 1.
  function riseText(ctx, str, x, y, size, weight, color, p, tracking, family = H.FONT.sans) {
    const w = H.measure(ctx, str, size, weight, family, tracking);
    const e = H.easeOutExpo(H.clamp(p));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 12, y - size, w + 24, size * 1.35);
    ctx.clip();
    H.text(ctx, str, x, y + (1 - e) * size * 1.2, { size, weight, family, color, tracking });
    ctx.restore();
  }

  function ensure(ctx) {
    if (ready) return;
    ready = true;
    // Headline split into segments so "5.5" can take the accent colour. Each segment rises on its own stagger.
    const HEAD = 'Meet Haiku 5.5.', HS = 150, HT = -4;
    const segs = [['Meet ', 'text'], ['Haiku ', 'text'], ['5.5', 'ac'], ['.', 'text']];
    const total = H.measure(ctx, HEAD, HS, 600, H.FONT.sans, HT);
    const x0 = H.W / 2 - total / 2;
    let prefix = '';
    segs.forEach(([s, c]) => {
      words.push({ s, c, x: x0 + H.measure(ctx, prefix, HS, 600, H.FONT.sans, HT) });
      prefix += s;
    });
    capX = H.W / 2 - H.measure(ctx, capText, 40, 500, H.FONT.mono, 1.6) / 2;
  }

  function drawSeal(ctx, sc, rot, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(SX, SY);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.fillStyle = V.accent;
    H.rrect(ctx, -SS / 2, -SS / 2, SS, SS, 26);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.12;
    ctx.fillStyle = V.dark.bg;
    for (const s of specks) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // "5.5" knocked out of the seal, in the base colour.
    H.text(ctx, '5.5', 0, 40, { size: 112, weight: 700, color: V.dark.bg, align: 'center' });
    ctx.restore();
  }

  H.scene({
    id: "v2_s6_end",
    start: 25,
    end: 30,
    draw(ctx, t, local, dur) {
      if (t < T0) return;
      ensure(ctx);
      const l = t - T0;
      ctx.save();
      ctx.fillStyle = V.dark.bg;
      ctx.fillRect(0, 0, H.W, H.H);

      // Converge: the field cells move into the seal and shrink away behind it. Dark cells are drawn
      // first so the accent cells stay whole on top of them.
      if (l < 0.75) {
        for (const pass of [false, true]) {
          for (const c of field) {
            if (c.ac !== pass) continue;
            const e = H.easeInOutCubic(H.clamp((l - c.dl) / 0.5));
            cellRect(ctx, c.x0 + (SX - c.x0) * e, c.y0 + (SY - c.y0) * e, 1 - 0.85 * e, pass ? V.accent : V.dark.surface);
          }
        }
      }

      // Stamp: scale 1.35 to 1 with a small overshoot, rotation -4 deg to 0, at 25.5 for 0.5 s.
      if (l >= 0.5) {
        const e = H.easeOutSoft(H.clamp((l - 0.5) / 0.5));
        drawSeal(ctx, 1.35 - 0.35 * e, -4 * (1 - e) * Math.PI / 180, H.clamp((l - 0.5) / 0.15));
      }

      // Copy: "Meet Haiku 5.5." words rise on an 0.08 s stagger from 26.5.
      if (l >= 1.5) {
        words.forEach((w, i) => {
          riseText(ctx, w.s, w.x, TEXT_Y, 150, 600, w.c === 'ac' ? V.accent : V.dark.text, (l - 1.5 - i * 0.08) / 0.5, -4);
        });
      }

      // Caption from 27.5.
      if (l >= 2.5) riseText(ctx, capText, capX, CAP_Y, 40, 500, V.dark.mute, (l - 2.5) / 0.4, 1.6, H.FONT.mono);
      ctx.restore();
    },
  });
})();
