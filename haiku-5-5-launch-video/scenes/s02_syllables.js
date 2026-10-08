// s02_syllables (3.0 to 7.0, paper): the haiku as 17 ink tiles in 5-7-5, then the seal returns small.
// Helpers carry the s02 prefix. Everything is a pure function of t; nothing reads the clock or Math.random.

const s02 = {
  layout: null, // tile widths and positions, measured on the first draw (fonts are loaded by then)
  dots: null,   // seal speckles, generated once from a fixed seed
  digit: null,  // digit height as a fraction of the font size, for the seal glyph
};

const S02_ROWS = [
  { cy: 380, count: '5', words: ['small', 'mod', 'el', 'big', 'aim'],
    cues: [3.25, 3.375, 3.5, 3.625, 3.75] },
  { cy: 540, count: '7', words: ['fast', 're', 'plies', 'sharp', 'rea', 'son', 'ing'],
    cues: [4.0, 4.125, 4.25, 4.375, 4.5, 4.625, 4.75] },
  { cy: 700, count: '5', words: ['read', 'y', 'when', 'you', 'are'],
    cues: [5.25, 5.375, 5.5, 5.625, 5.75] },
];

const S02_TILE = { h: 128, r: 20, padX: 28, gap: 24, size: 64, weight: 500 };
const S02_COUNT = { size: 28, weight: 500, tracking: 0.08 * 28, gutter: 40 };
const S02_SEAL = { size: 96, cx: H.W - H.SAFE - 48, cy: H.SAFE + 48 };

// Measured ascent of a string, in px, for the given font. Used to centre glyphs optically.
function s02Ascent(ctx, str, size, weight, family) {
  ctx.save();
  ctx.font = H.font(size, weight, family);
  const a = ctx.measureText(str).actualBoundingBoxAscent;
  ctx.restore();
  return a;
}

function s02Build(ctx) {
  const xh = s02Ascent(ctx, 'x', S02_TILE.size, S02_TILE.weight, H.FONT.sans);
  const digit = s02Ascent(ctx, '5', S02_COUNT.size, S02_COUNT.weight, H.FONT.mono);
  const rows = S02_ROWS.map(row => {
    const tiles = row.words.map((word, i) => ({
      word,
      cue: row.cues[i],
      w: H.measure(ctx, word, S02_TILE.size, S02_TILE.weight) + 2 * S02_TILE.padX,
    }));
    const width = tiles.reduce((s, tl) => s + tl.w, 0) + S02_TILE.gap * (tiles.length - 1);
    const left = (H.W - width) / 2;
    let x = left;
    for (const tl of tiles) { tl.x = x; x += tl.w + S02_TILE.gap; }
    return { cy: row.cy, count: row.count, tiles, left };
  });
  // Each syllable count sits just left of its own row.
  for (const r of rows) {
    const w = H.measure(ctx, r.count, S02_COUNT.size, S02_COUNT.weight, H.FONT.mono, S02_COUNT.tracking);
    r.countX = r.left - S02_COUNT.gutter - w;
  }
  return { rows, xh, digit };
}

// Speckles for the seal's ink texture: fixed positions in seal units, alpha at most 0.11.
function s02MakeDots() {
  const rnd = H.prng(0x5e4c2);
  const out = [];
  for (let i = 0; i < 150; i++) {
    out.push({
      x: rnd() - 0.5,
      y: rnd() - 0.5,
      r: 0.005 + rnd() * 0.014,
      a: 0.02 + rnd() * 0.09,
    });
  }
  return out;
}

// The vermilion hanko with "5.5" knocked out. Same design as the s01 seal, drawn at any size.
// The knocked-out glyph is paper, the colour of the page behind the seal, so it is drawn at full alpha.
function s02Seal(ctx, cx, cy, size, rot, scale, alpha) {
  if (!s02.dots) s02.dots = s02MakeDots();
  if (s02.digit === null) s02.digit = s02Ascent(ctx, '5', 100, 600, H.FONT.sans) / 100;
  const r = size * 0.12;
  const a0 = ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha = a0 * alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  H.rrect(ctx, -size / 2, -size / 2, size, size, r);
  ctx.fillStyle = H.COLOR.seal;
  ctx.fill();

  ctx.save();
  H.rrect(ctx, -size / 2, -size / 2, size, size, r);
  ctx.clip();
  ctx.fillStyle = H.COLOR.ink;
  for (const d of s02.dots) {
    ctx.globalAlpha = a0 * alpha * d.a;
    ctx.beginPath();
    ctx.arc(d.x * size, d.y * size, d.r * size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const fs = size * 0.38;
  ctx.globalAlpha = a0 * alpha;
  H.text(ctx, '5.5', 0, s02.digit * fs / 2, {
    size: fs, weight: 600, color: H.COLOR.paper, align: 'center', tracking: -0.03 * fs,
  });
  ctx.restore();
}

H.scene({ id: "s02_syllables", start: 3, end: 7, draw(ctx, t, local, dur) {
  if (!s02.layout) s02.layout = s02Build(ctx);
  const L = s02.layout;

  // Exit: the whole scene fades to nothing between 6.6 and 7.0.
  const out = 1 - H.easeInOutCubic(H.ramp(t, 6.6, 7.0));
  if (out <= 0) return;

  // 6.2: the three rows slide up together by 40 px.
  const lift = -40 * H.easeInOutCubic(H.ramp(t, 6.2, 6.6));
  // 6.0: the syllable counts appear in the left margin.
  const countA = H.easeOutExpo(H.ramp(t, 6.0, 6.35));

  for (const row of L.rows) {
    const cy = row.cy + lift;

    if (countA > 0) {
      H.text(ctx, row.count, row.countX, cy + L.digit / 2, {
        size: S02_COUNT.size, weight: S02_COUNT.weight, family: H.FONT.mono,
        color: H.COLOR.mute, tracking: S02_COUNT.tracking, alpha: countA * out,
      });
    }

    for (const tl of row.tiles) {
      // Each tile rises 24 px and fades in at its TILE cue.
      const e = H.easeOutExpo(H.ramp(t, tl.cue, tl.cue + 0.35));
      if (e <= 0) continue;
      const dy = 24 * (1 - e);
      const top = cy - S02_TILE.h / 2 + dy;
      ctx.save();
      ctx.globalAlpha = e * out;
      H.rrect(ctx, tl.x, top, tl.w, S02_TILE.h, S02_TILE.r);
      ctx.fillStyle = H.COLOR.ink;
      ctx.fill();
      // The text is paper, the colour behind the tile, so it stays at full alpha.
      // This matches a group fade of the whole tile.
      ctx.globalAlpha = 1;
      H.text(ctx, tl.word, tl.x + tl.w / 2, cy + dy + L.xh / 2, {
        size: S02_TILE.size, weight: S02_TILE.weight, color: H.COLOR.paper, align: 'center',
      });
      ctx.restore();
    }
  }

  // 6.2: the seal returns small (96 px) at the top-right safe area, stamping in as in s01.
  const sp = H.ramp(t, 6.2, 6.55);
  if (sp > 0) {
    const eo = H.easeOutSoft(sp);
    const sealA = H.ramp(t, 6.2, 6.35);
    s02Seal(ctx, S02_SEAL.cx, S02_SEAL.cy, S02_SEAL.size,
      H.lerp(-4 * Math.PI / 180, 0, eo), H.lerp(1.35, 1, eo), sealA * out);
  }
} });
