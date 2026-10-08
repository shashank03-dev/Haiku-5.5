// v1_s4_tiles (15.0 to 20.0, paper). The 17 syllable tiles reflow in five hard cuts on the
// 0.5 s grid (15.5, 16.0, 16.5, 17.0, 17.5). The 17.5 cut settles them into the 5-7-5 haiku.
// From 18.0 the three rows take the accent in turn (18.0, 18.5, 19.0); 19.5 resets to ink.
// Nothing fades: every change is a cut, and nothing is drawn outside 15.0 to 20.0.
// Layouts are measured on the first draw, because Geist is only loaded by then.
(function () {
  const START = 15.0, END = 20.0, EPS = 1e-6;
  const SIZE = 68, WEIGHT = 500, TH = 136, PADX = 28, GAP = 24, ROW_GAP = 24, RAD = 24;

  // Syllable tiles in haiku order: 5 (small mod el big aim), 7 (fast re plies sharp rea son ing), 5 (read y when you are).
  const TILES = ['small', 'mod', 'el', 'big', 'aim', 'fast', 're', 'plies', 'sharp', 'rea', 'son', 'ing', 'read', 'y', 'when', 'you', 'are'];

  // Each cut: its time, a horizontal nudge for the whole block, and its rows (tile indices, left to right).
  // Every cut lists all 17 tiles exactly once.
  const CUTS = [
    { t: 15.0, nudge: -36, rows: [[12, 3, 8, 14], [0, 16, 9, 6, 1], [11, 5, 15, 2, 13], [7, 4, 10]] },
    { t: 15.5, nudge: 48, rows: [[10, 4, 7, 13, 1, 16], [2, 5, 12, 9, 0], [15, 8, 3, 6, 14, 11]] },
    { t: 16.0, nudge: -24, rows: [[9, 0, 14, 3], [6, 12, 1, 16, 8], [5, 11, 4, 13, 2, 7, 15, 10]] },
    { t: 16.5, nudge: 36, rows: [[16, 1, 9, 13, 3], [12, 5, 0, 8, 2, 14], [7, 10, 4, 11, 6, 15]] },
    { t: 17.0, nudge: -12, rows: [[1, 0, 2, 4, 3], [5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16]] },
    { t: 17.5, nudge: 0, rows: [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16]] }, // settled 5-7-5
  ];
  const SETTLED = CUTS.length - 1;

  // Rows that take the accent after the settle. -1 means none.
  const accentRow = t => {
    if (t >= 19.5 - EPS) return -1;
    if (t >= 19.0 - EPS) return 2;
    if (t >= 18.5 - EPS) return 1;
    if (t >= 18.0 - EPS) return 0;
    return -1;
  };

  // Tile geometry per cut, built once: rows of { items: [{ text, x, y, w }] }.
  let LAY = null;
  function build(ctx) {
    LAY = CUTS.map(cut => {
      const rows = cut.rows.map(idx => {
        const items = idx.map(i => ({
          text: TILES[i],
          w: H.measure(ctx, TILES[i], SIZE, WEIGHT, H.FONT.sans) + PADX * 2,
          x: 0, y: 0,
        }));
        const width = items.reduce((s, it) => s + it.w, 0) + GAP * (items.length - 1);
        return { items, width };
      });
      const blockH = rows.length * TH + (rows.length - 1) * ROW_GAP;
      let y = H.H / 2 - blockH / 2;
      rows.forEach(row => {
        let x = H.W / 2 - row.width / 2 + cut.nudge;
        row.items.forEach(it => { it.x = x; it.y = y; x += it.w + GAP; });
        y += TH + ROW_GAP;
      });
      return rows;
    });
  }

  H.scene({ id: "v1_s4_tiles", start: 15, end: 20, draw(ctx, t, local, dur) {
    if (t < START - EPS || t >= END - EPS) return;
    if (!LAY) build(ctx);

    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Current cut: the last cut whose time has passed.
    let k = 0;
    for (let i = 0; i < CUTS.length; i++) if (t >= CUTS[i].t - EPS) k = i;
    const acc = k === SETTLED ? accentRow(t) : -1;

    LAY[k].forEach((row, r) => {
      const on = r === acc;
      row.items.forEach(it => {
        ctx.fillStyle = on ? V.accent : V.light.text;
        H.rrect(ctx, it.x, it.y, it.w, TH, RAD);
        ctx.fill();
        H.text(ctx, it.text, it.x + it.w / 2, it.y + TH / 2, {
          size: SIZE, weight: WEIGHT, family: H.FONT.sans,
          color: on ? V.light.text : V.light.bg, align: 'center', baseline: 'middle',
        });
      });
    });
  } });
})();
