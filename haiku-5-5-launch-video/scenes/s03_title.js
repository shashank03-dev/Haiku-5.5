// s03_title (7.0 to 11.0, ink): the title beat.
// The small seal travels from its s02 spot (top-right) to the top-left at TITLE_KICK, the "CLAUDE"
// label fades in at 7.1, and "Haiku 5.5" mask-rises glyph by glyph from 7.2. It holds, then mask-falls
// from 10.4 and the ink fades out between 10.8 and 11.0.
// Helpers and state use the S03 prefix so no names leak into the other scenes.
// Fonts are not loaded when this file runs, so all text measuring and offscreen rasterising
// happens inside draw(), which only runs after the engine has loaded Geist.

const S03 = {
  TITLE: 'Haiku 5.5',
  SIZE: 240,          // display size, Geist 600
  WEIGHT: 600,
  TRACK: -7.2,        // -0.03em
  LABEL_Y: 470,       // baseline of the mono "CLAUDE" label
  LABEL_GAP: 56,      // label baseline to title cap top
  DROP: 0.9,          // mask travel, in em
  seal: null,         // offscreen seal raster, made on first draw
};

// Cap height of the display face, read from the font so the layout follows the real metrics.
function s03CapHeight(ctx) {
  ctx.save();
  ctx.font = H.font(S03.SIZE, S03.WEIGHT);
  const m = ctx.measureText('H');
  ctx.restore();
  return m.actualBoundingBoxAscent;
}

// The hanko, rasterised once at 288 px (4x the 72 px target) and scaled down when drawn.
// Vermilion rounded square, "5.5" knocked out so the background shows through, faint speckle at most 12%.
function s03SealImage() {
  if (S03.seal) return S03.seal;
  const N = 288;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = H.COLOR.seal;
  H.rrect(g, 0, 0, N, N, N * 0.12);
  g.fill();

  g.globalCompositeOperation = 'destination-out';
  const rnd = H.prng(3003);
  for (let i = 0; i < 180; i++) {
    const x = rnd() * N, y = rnd() * N, r = 0.5 + rnd() * 2.2;
    g.globalAlpha = 0.02 + rnd() * 0.10;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const fs = N * 0.42;
  g.font = H.font(fs, 600);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const w = g.measureText('5.5').width;
  const cap = g.measureText('5').actualBoundingBoxAscent;
  g.fillText('5.5', (N - w) / 2, (N + cap) / 2);
  g.globalCompositeOperation = 'source-over';

  S03.seal = c;
  return c;
}

function s03DrawSeal(ctx, x, y, size, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s03SealImage(), x, y, size, size);
  ctx.restore();
}

H.scene({ id: "s03_title", start: 7.0, end: 11.0, draw(ctx, t, local, dur) {
  const W = H.W;
  const SZ = S03.SIZE;
  const TEXT = S03.TITLE;
  const n = TEXT.length;
  const outA = 1 - H.ramp(t, 10.8, 11.0); // ink fade-out at the end of the scene

  // 1. Ink ground cross-fades in over the paper of s02, then fades out at the end.
  const groundA = H.ramp(t, 6.6, 7.0) * outA;
  if (groundA > 0) {
    ctx.save();
    ctx.globalAlpha = groundA;
    ctx.fillStyle = H.COLOR.ink;
    ctx.fillRect(0, 0, W, H.H);
    ctx.restore();
  }

  // 2. Small seal (72 px). It starts where the s02 seal sat (top-right, 96 px) and moves to the
  //    top-left safe area at TITLE_KICK (7.00).
  const sk = H.easeInOutCubic(H.ramp(t, 7.0, 7.9));
  const sealSize = H.lerp(96, 72, sk);
  const sealX = H.lerp(W - H.SAFE - 96, H.SAFE, sk);
  const sealA = H.ramp(t, 6.8, 7.0) * outA;
  s03DrawSeal(ctx, sealX, H.SAFE, sealSize, sealA);

  // 3. "CLAUDE" mono label, mute, uppercase, +0.2em tracking. Fades in at 7.1, out 10.4 to 10.8.
  //    The +3.6 px offset cancels the trailing letter-spacing that canvas adds after the last glyph.
  const labelA = H.easeOutExpo(H.ramp(t, 7.1, 7.7)) * (1 - H.ramp(t, 10.4, 10.8)) * outA;
  H.text(ctx, 'CLAUDE', W / 2 + 3.6, S03.LABEL_Y, {
    size: 36, weight: 500, family: H.FONT.mono, color: H.COLOR.mute,
    align: 'center', tracking: 7.2, alpha: labelA,
  });

  // 4. "Haiku 5.5" in Geist 600 at 240 px, centred. The "5.5" is seal colour.
  //    Each glyph rises from a baseline mask starting at 7.2, staggered 0.05 s, 0.9 s with easeOutExpo.
  //    On the way out it mask-falls with a 0.04 s stagger and 0.28 s with easeInCubic, from 10.4.
  const capH = s03CapHeight(ctx);
  const baseY = S03.LABEL_Y + S03.LABEL_GAP + capH;
  const DROP = S03.DROP * SZ;
  const total = H.measure(ctx, TEXT, SZ, S03.WEIGHT, H.FONT.sans, 0) + (n - 1) * S03.TRACK;
  const x0 = (W - total) / 2;

  ctx.save();
  // The mask is the line box: one em of ascent above the baseline, and a little below it so that
  // round glyph overshoot is not clipped at rest.
  ctx.beginPath();
  ctx.rect(0, baseY - SZ, W, SZ * 1.06);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const ch = TEXT[i];
    // Position from prefix widths, so pair kerning inside the string is kept.
    const pre = H.measure(ctx, TEXT.slice(0, i + 1), SZ, S03.WEIGHT, H.FONT.sans, 0);
    const adv = H.measure(ctx, ch, SZ, S03.WEIGHT, H.FONT.sans, 0);
    const x = x0 + pre - adv + i * S03.TRACK;
    const rise = H.easeOutExpo(H.ramp(t, 7.2 + 0.05 * i, 7.2 + 0.05 * i + 0.9));
    const fall = H.easeInCubic(H.ramp(t, 10.4 + 0.04 * i, 10.4 + 0.04 * i + 0.28));
    const dy = (1 - rise) * DROP + fall * DROP;
    const color = i >= 6 ? H.COLOR.seal : H.COLOR.paper; // "5.5" starts at index 6
    H.text(ctx, ch, x, baseY + dy, { size: SZ, weight: S03.WEIGHT, color, alpha: outA });
  }
  ctx.restore();
} });
