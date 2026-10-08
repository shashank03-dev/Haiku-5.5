// v2_s2_count (5.0 to 10.0): the field collapses. 17 of its cells morph into the three poem rows
// (5, 7, 5 tiles). Each tile pops on the 0.25 s grid (ticks 5.5 to 8.5) with its syllable, so every
// syllable is fully on screen for at least 1.25 s. A single accent pulse runs across the poem at 9.5.
// The frame is frozen after 9.75; v2_s3_zoom reads this state at 9.99 for its whip.
const v2s2_SIZE = 68, v2s2_PAD = 34, v2s2_GAP = 20;
const v2s2_CW = 144, v2s2_CH = 138;                       // field cell size (tile height matches it)
const v2s2_poem = [
  ["small", "mod", "el", "big", "aim"],
  ["fast", "re", "plies", "sharp", "rea", "son", "ing"],
  ["read", "y", "when", "you", "are"],
];
const v2s2_fieldRow = [2, 3, 4];                          // field rows the poem rows grow from
const v2s2_fieldCols = [[3, 4, 5, 6, 7], [2, 3, 4, 5, 6, 7, 8], [3, 4, 5, 6, 7]];
const v2s2_rowY = [386, 540, 694];                        // equal to the field row centres
let v2s2_lay = null;

// Tile geometry is measured once, on the first frame, when the fonts are ready.
function v2s2_layout(ctx) {
  if (v2s2_lay) return v2s2_lay;
  // The 12 x 7 field, precomputed once: centre, row and key (r * 12 + c) for each cell.
  const field = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 12; c++) {
      field.push({ r, key: r * 12 + c, cx: 8 + c * 160 + v2s2_CW / 2, cy: 9 + r * 154 + v2s2_CH / 2 });
    }
  }
  const tiles = [], srcKeys = new Set();
  for (let ri = 0; ri < 3; ri++) {
    const words = v2s2_poem[ri];
    const widths = words.map(w => H.measure(ctx, w, v2s2_SIZE, 500, H.FONT.sans, 0) + 2 * v2s2_PAD);
    const total = widths.reduce((a, b) => a + b, 0) + v2s2_GAP * (words.length - 1);
    let x = H.W / 2 - total / 2;
    words.forEach((word, i) => {
      const idx = tiles.length;
      const col = v2s2_fieldCols[ri][i], row = v2s2_fieldRow[ri];
      srcKeys.add(row * 12 + col);
      tiles.push({
        word, w: widths[i], cx: x + widths[i] / 2, cy: v2s2_rowY[ri],
        sx: 8 + col * 160 + v2s2_CW / 2,                 // source cell centre x
        pop: 5.5 + 0.25 * Math.floor(idx * 13 / 17),     // 17 tiles over 13 grid ticks (5.5 to 8.5)
      });
      x += widths[i] + v2s2_GAP;
    });
  }
  return (v2s2_lay = { field, tiles, srcKeys });
}

function v2s2_frame(ctx, t) {
  const L = v2s2_layout(ctx);
  const C = V.dark;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, H.W, H.H);

  // Field cells that do not become tiles collapse, rows nearest the poem first.
  ctx.fillStyle = C.surface;
  for (const f of L.field) {
    if (L.srcKeys.has(f.key)) continue;
    // Rows 2 to 4 (the poem's rows) are gone by 5.2, before the morph reaches them; outer rows lag a little.
    const delay = 0.04 * Math.max(0, Math.abs(f.r - 3) - 1);
    const s = 1 - H.easeInOutCubic(H.ramp(t, 5.0 + delay, 5.2 + delay));
    if (s <= 0) continue;
    const w = v2s2_CW * s, h = v2s2_CH * s;
    H.rrect(ctx, f.cx - w / 2, f.cy - h / 2, w, h, Math.min(16, w / 2, h / 2));
    ctx.fill();
  }

  // Source cells morph into tiles (x and width only; the rows share the field's y).
  const morph = H.easeInOutCubic(H.ramp(t, 5.1, 5.5));
  const pulse = 1 - Math.abs(2 * H.ramp(t, 9.5, 9.75) - 1); // 0, 1, 0 across 9.5 to 9.75
  for (const tile of L.tiles) {
    const cx = H.lerp(tile.sx, tile.cx, morph);
    const w = H.lerp(v2s2_CW, tile.w, morph);
    const pp = H.ramp(t, tile.pop, tile.pop + 0.25);
    const sc = 1 + 0.08 * Math.sin(Math.PI * pp);  // pop: a bump that starts and ends at scale 1
    const rr = Math.min(18, w / 2, v2s2_CH / 2);
    ctx.save();
    ctx.translate(cx, tile.cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = C.surface;
    H.rrect(ctx, -w / 2, -v2s2_CH / 2, w, v2s2_CH, rr);
    ctx.fill();
    const flash = pp > 0 ? (1 - H.easeOutCubic(pp)) * 0.9 : 0; // accent on pop, fading to surface
    const glow = Math.max(flash, pulse * 0.35);
    if (glow > 0) {
      ctx.globalAlpha = glow;
      ctx.fillStyle = V.accent;
      H.rrect(ctx, -w / 2, -v2s2_CH / 2, w, v2s2_CH, rr);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (pp > 0) {
      H.text(ctx, tile.word, 0, 0, { size: v2s2_SIZE, weight: 500, color: C.text, align: 'center', baseline: 'middle', alpha: pp });
    }
    ctx.restore();
  }
}

// Frozen poem frame, built once during the static hold (from 9.0) so that the 10.0 whip in
// v2_s3_zoom does not pay for it on the interrupt frame.
let v2s2_frozen = null;
function v2s2_getFrozen() {
  if (!v2s2_frozen) {
    const c = document.createElement('canvas');
    c.width = H.W; c.height = H.H;
    v2s2_frame(c.getContext('2d'), 9.99);
    v2s2_frozen = c;
  }
  return v2s2_frozen;
}

H.scene({ id: "v2_s2_count", start: 5, end: 10, draw(ctx, t, local, dur) {
  if (t < 5 || t >= 10) return;
  if (t >= 9.0) v2s2_getFrozen();
  v2s2_frame(ctx, t);
} });
