// s01_seal (0.0 to 3.0, paper): a hairline grid draws in from the top-left, a vermilion
// hanko stamps in on a grid intersection, travels to the centre and fades to paper.
// Helpers live on one prefixed object so they cannot clash with other scene files.
const s01 = (function () {
  const SEAL = 220;                  // hanko edge, px
  const SEAL_R = 26;                 // corner radius of the rounded square
  const GLYPH = '5.5';
  const GLYPH_INK_W = 150;           // target ink width of the carved "5.5", px
  const GRID = 120;                  // hairline spacing, px
  const SPOT = { x: 360, y: 360 };   // stamp point: a grid intersection, upper left
  const CENTRE = { x: H.W / 2, y: H.H / 2 };
  const rnd = H.prng(20255);         // speckle seed, consumed once when the sprite is built
  let sprite = null;

  // Built on first draw, not at file load: the Geist faces only exist once core.js has
  // loaded them, and the first draw happens after that. It runs once and is then reused.
  function buildSprite() {
    const S = 2; // rasterised at 2x, so the stamp keeps crisp edges when scaled and rotated
    const c = document.createElement('canvas');
    c.width = c.height = SEAL * S;
    const g = c.getContext('2d');
    g.scale(S, S);

    // Body: vermilion rounded square.
    g.fillStyle = H.COLOR.seal;
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.fill();

    // Ink texture: paper-coloured specks inside the body only, every one under 12% opacity.
    g.save();
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.clip();
    g.fillStyle = H.COLOR.paper;
    for (let i = 0; i < 1600; i++) {
      const x = rnd() * SEAL, y = rnd() * SEAL;
      const r = 0.3 + Math.pow(rnd(), 4) * 1.3;
      g.globalAlpha = 0.02 + rnd() * 0.10;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // Carve "5.5": destination-out removes it, so the paper underneath shows through.
    // Size is solved from the measured ink width, and the ink box is centred on the seal.
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

  // Seal centred on (x, y) with scale, rotation (radians) and opacity.
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

  // Hairlines on a 120 px grid, origin top-left. `front` is a diagonal reveal line
  // (x + y): each line is drawn only as far as the front has reached.
  function drawGrid(ctx, front, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = H.COLOR.paper2;
    for (let x = 0; x < H.W; x += GRID) {
      const len = H.clamp(front - x, 0, H.H);
      if (len > 0) ctx.fillRect(x, 0, 1, len);
    }
    for (let y = 0; y < H.H; y += GRID) {
      const len = H.clamp(front - y, 0, H.W);
      if (len > 0) ctx.fillRect(0, y, len, 1);
    }
    ctx.restore();
  }

  return { drawSeal, drawGrid, SPOT, CENTRE };
})();

H.scene({ id: "s01_seal", start: 0.0, end: 3.0, draw(ctx, t, local, dur) {
  // Hairline grid: the reveal front sweeps out from the top-left corner over 0 to 1 s,
  // then fades out between 1.9 and 2.4 s, before the seal's move ends.
  const gridAlpha = 1 - H.ramp(local, 1.9, 2.4);
  if (gridAlpha > 0) {
    const front = H.easeOutExpo(H.ramp(local, 0.0, 1.0)) * (H.W + H.H);
    s01.drawGrid(ctx, front, gridAlpha);
  }

  // Hanko: stamps in at 0.50 s (scale 1.35 to 1.0, rotation -4 to 0 deg, opacity over 0.15 s).
  // It moves to the centre over 2.0 to 2.8 s, then everything fades out over 2.7 to 3.0 s.
  const settle = H.easeOutSoft(H.ramp(local, 0.5, 0.85));
  const opacity = H.ramp(local, 0.5, 0.65) * (1 - H.ramp(local, 2.7, 3.0));
  if (opacity > 0) {
    const mv = H.easeInOutCubic(H.ramp(local, 2.0, 2.8));
    const x = H.lerp(s01.SPOT.x, s01.CENTRE.x, mv);
    const y = H.lerp(s01.SPOT.y, s01.CENTRE.y, mv);
    s01.drawSeal(ctx, x, y, H.lerp(1.35, 1.0, settle), H.lerp(-4, 0, settle) * Math.PI / 180, opacity);
  }
} });
