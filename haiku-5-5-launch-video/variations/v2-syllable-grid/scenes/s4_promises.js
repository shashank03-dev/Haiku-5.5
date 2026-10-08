// v2_s4_promises: three promises, each a card built from cells. Every card holds 1.5 s and hard-cuts to the next.
// Timeline: 15.0 card 1 (stopwatch), 16.5 card 2 (target), 18.0 card 3 (loop), 19.5 three columns, 20.0 s5 invert.
(function () {
  const T0 = 15.0, T1 = 20.0, CARD = 1.5, STEP = 0.25;
  const PITCH = 48, CELL = 36, RAD = 7;      // cell pitch, cell size and corner radius (px)
  const NX = 39, NY = 21;                    // background field; cell (19, 10) sits on the frame centre
  const IX = 960, IY = 444;                  // icon centre; the icon is 11 x 11 cells
  const LABEL_Y = 860, LABEL_SIZE = 104, LABEL_MAX_W = 1560;

  // Icon frames: arrays of [u, v, key] where (u, v) is a cell offset from the icon centre (-5..5)
  // and key is 'hi' (text colour), 'ac' (accent) or 'lo' (dim track). Six frames per card, one per 0.25 s step.

  // Stopwatch: ring of radius 4, crown on top, and a needle that turns 56 deg per step (12 o'clock to 190 deg).
  function stopwatchFrames() {
    const frames = [];
    for (let k = 0; k < 6; k++) {
      const out = [];
      for (let v = -5; v <= 5; v++) for (let u = -5; u <= 5; u++) {
        if (Math.abs(Math.hypot(u, v) - 4) < 0.55) out.push([u, v, 'hi']);
      }
      for (let u = -1; u <= 1; u++) out.push([u, -5, 'hi']);
      out.push([0, 0, 'ac']);
      const a = (-90 + 56 * k) * Math.PI / 180;
      const seen = { '0,0': 1 };
      for (let d = 0.5; d <= 3.5; d += 0.5) {
        const u = Math.round(d * Math.cos(a)), v = Math.round(d * Math.sin(a));
        if (!seen[u + ',' + v]) { seen[u + ',' + v] = 1; out.push([u, v, 'ac']); }
      }
      frames.push(out);
    }
    return frames;
  }

  // Target: a centre cell and three one-cell rings (radius 5, 3, and a 3 x 3 ring at 1.2). Rings appear
  // inner first, then the inner ring and the middle ring pulse in accent on steps 4 and 5.
  function targetFrames() {
    const RADII = [5, 3, 1.2];               // outer, middle, inner
    const APPEAR = [3, 2, 1];                // step at which each ring turns on
    const frames = [];
    for (let k = 0; k < 6; k++) {
      const out = [[0, 0, 'ac']];
      for (let v = -5; v <= 5; v++) for (let u = -5; u <= 5; u++) {
        const r = Math.hypot(u, v);
        for (let idx = 0; idx < 3; idx++) {
          if (Math.abs(r - RADII[idx]) <= 0.5) {
            let key = null;
            if (k >= APPEAR[idx]) key = 'hi';
            if ((k === 4 && idx === 2) || (k === 5 && idx === 1)) key = 'ac';
            if (key) out.push([u, v, key]);
          }
        }
      }
      frames.push(out);
    }
    return frames;
  }

  // Loop: a figure-eight track (x = 4.8 cos th, y = 3.2 sin 2th) with a comet that runs once around it.
  // 240 samples keep the rounded track 8-connected, so the loop has no gaps.
  function loopFrames() {
    const N = 240, track = [];
    for (let s = 0; s < N; s++) {
      const th = s / N * 2 * Math.PI;
      track.push([Math.round(4.8 * Math.cos(th)), Math.round(3.2 * Math.sin(2 * th))]);
    }
    const frames = [];
    for (let k = 0; k < 6; k++) {
      const cells = new Map();
      for (const [u, v] of track) cells.set(u + ',' + v, [u, v, 'lo']);
      const head = (k * 40) % N;               // the comet moves 40 samples (60 deg) per step
      for (let d = 28; d >= 0; d--) {
        const [u, v] = track[(head - d + N) % N];
        cells.set(u + ',' + v, [u, v, d === 0 ? 'hi' : 'ac']);
      }
      frames.push([...cells.values()]);
    }
    return frames;
  }

  const CARDS = [
    { label: 'Quick to answer.', frames: stopwatchFrames() },
    { label: 'Sharp in the details.', frames: targetFrames() },
    { label: 'Built for everyday work.', frames: loopFrames() },
  ];

  // Built on first draw, after the fonts have loaded (core.js renders nothing before that).
  let ready = false, bgCanvas = null;

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
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = H.W;
    bgCanvas.height = H.H;
    const g = bgCanvas.getContext('2d');
    g.fillStyle = V.dark.bg;
    g.fillRect(0, 0, H.W, H.H);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      cellRect(g, 960 + (i - 19) * PITCH, 540 + (j - 10) * PITCH, 1, V.dark.surface);
    }
    for (const c of CARDS) {
      let size = LABEL_SIZE;
      const w0 = H.measure(ctx, c.label, size, 600, H.FONT.sans, -2);
      if (w0 > LABEL_MAX_W) size = Math.floor(LABEL_SIZE * LABEL_MAX_W / w0);
      c.size = size;
      c.x = H.W / 2 - H.measure(ctx, c.label, size, 600, H.FONT.sans, -2) / 2;
    }
  }

  H.scene({
    id: "v2_s4_promises",
    start: 15,
    end: 20,
    draw(ctx, t, local, dur) {
      if (t < T0 || t >= T1) return;
      ensure(ctx);
      ctx.save();
      ctx.drawImage(bgCanvas, 0, 0);

      if (t >= 19.5) {
        // Three columns of cells, the last beat before the s5 invert.
        const col = t < 19.75 ? V.dark.text : V.accent;
        for (const ic of [1, 5, 9]) for (let jr = 0; jr < 11; jr++) {
          cellRect(ctx, IX + (ic - 5) * PITCH, IY + (jr - 5) * PITCH, 1, col);
        }
        ctx.restore();
        return;
      }

      const c = Math.min(2, Math.floor((t - T0) / CARD + 1e-9));
      const l = t - T0 - c * CARD;              // 0 to 1.5 s inside the card
      const card = CARDS[c];
      const k = Math.min(5, Math.floor(l / STEP + 1e-9));
      // Card entrance: three columns, then five, then the whole icon.
      const keep = l < 0.25 ? ic => ic % 4 === 1 : l < 0.5 ? ic => ic % 2 === 1 : () => true;
      for (const [u, v, key] of card.frames[k]) {
        if (!keep(u + 5)) continue;
        const x = IX + u * PITCH, y = IY + v * PITCH;
        if (key === 'lo') {
          ctx.globalAlpha = 0.4;
          cellRect(ctx, x, y, 1, V.dark.mute);
          ctx.globalAlpha = 1;
        } else {
          cellRect(ctx, x, y, 1, key === 'ac' ? V.accent : V.dark.text);
        }
      }
      riseText(ctx, card.label, card.x, LABEL_Y, card.size, 600, V.dark.text, l / 0.4, -2);
      ctx.restore();
    },
  });
})();
