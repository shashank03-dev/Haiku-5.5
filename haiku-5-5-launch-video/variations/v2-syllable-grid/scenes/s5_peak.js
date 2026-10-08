// v2_s5_peak: 20.0 pattern interrupt (full invert), a cell strobe on 0.25 s steps, then "5.5" lights cell by cell.
// Timeline: 20.0 invert, 20.25 to 21.0 strobe, 21.0 to 24.0 reveal (12 steps of 0.25 s), 24.0 to 25.0 hold with flicker.
(function () {
  const T0 = 20.0, T1 = 25.0, STEP = 0.25;
  const PITCH = 48, CELL = 36, RAD = 7, NX = 39, NY = 21;
  const GLYPH = 820;                         // size of the "5.5" mask, px
  const rnd = H.prng(0x5a5);

  // Built on first draw, after the fonts have loaded.
  let ready = false, bg = null, lit = [], strobe = [], flick = [];

  function cellRect(g, x, y, sc, color) {
    const s = CELL * sc;
    g.fillStyle = color;
    H.rrect(g, x - s / 2, y - s / 2, s, s, RAD * sc);
    g.fill();
  }

  function ensure() {
    if (ready) return;
    ready = true;

    // Light field (the inverted state), pre-rendered once.
    bg = document.createElement('canvas');
    bg.width = H.W;
    bg.height = H.H;
    const g = bg.getContext('2d');
    g.fillStyle = V.light.bg;
    g.fillRect(0, 0, H.W, H.H);
    const cells = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      cells.push({ x: 960 + (i - 19) * PITCH, y: 540 + (j - 10) * PITCH });
    }
    for (const c of cells) cellRect(g, c.x, c.y, 1, V.light.surface);

    // "5.5" rasterised once and sampled at each cell centre: alpha above 127 means the cell is in the glyph.
    const m = document.createElement('canvas');
    m.width = H.W;
    m.height = H.H;
    const mg = m.getContext('2d');
    mg.font = H.font(GLYPH, 700);
    mg.textAlign = 'center';
    mg.textBaseline = 'alphabetic';
    mg.fillStyle = '#000';
    const mt = mg.measureText('5.5');
    mg.fillText('5.5', H.W / 2, H.H / 2 + (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2);
    const px = mg.getImageData(0, 0, H.W, H.H).data;
    for (const c of cells) c.g = px[(Math.round(c.y) * H.W + Math.round(c.x)) * 4 + 3] > 127;

    // Reveal order: a diagonal sweep from top-left to bottom-right, in 12 steps from 21.0 s.
    lit = cells.filter(c => c.g).sort((a, b) => (a.x + 0.35 * a.y) - (b.x + 0.35 * b.y));
    lit.forEach((c, r) => { c.at = 1.0 + Math.min(11, Math.floor(r / lit.length * 12)) * STEP; });

    // Strobe patterns for the steps 0 to 3 (index 1 to 3 are used) and flicker patterns outside the glyph.
    for (let k = 0; k < 4; k++) strobe.push(cells.filter(() => rnd() < 0.3));
    const rest = cells.filter(c => !c.g);
    for (let k = 0; k < 4; k++) flick.push(rest.filter(() => rnd() < 0.07));
  }

  H.scene({
    id: "v2_s5_peak",
    start: 20,
    end: 25,
    draw(ctx, t, local, dur) {
      if (t < T0 || t >= T1) return;
      ensure();
      const l = t - T0;
      ctx.save();
      ctx.drawImage(bg, 0, 0);
      if (l >= 0.25 && l < 1.0) {
        // Grid strobe on 0.25 s steps.
        const k = Math.floor(l / STEP + 1e-9);
        for (const c of strobe[k]) cellRect(ctx, c.x, c.y, 1, V.accent);
      } else if (l >= 1.0) {
        // "5.5" lights in sequence; each cell grows in over one step.
        for (const c of lit) {
          const age = l - c.at;
          if (age < 0) continue;
          const sc = H.easeOutExpo(H.clamp(age / STEP));
          if (sc > 0.02) cellRect(ctx, c.x, c.y, sc, V.accent);
        }
        if (l >= 4.0) {
          for (const c of flick[Math.min(3, Math.floor((l - 4.0) / STEP + 1e-9))]) cellRect(ctx, c.x, c.y, 1, V.accent);
        }
      }
      ctx.restore();
    },
  });
})();
