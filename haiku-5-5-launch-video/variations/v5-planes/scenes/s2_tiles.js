// v5_s2_tiles: Parallax Planes, the poem (5 to 10 s).
// Seventeen syllable tiles float on planes while the camera sweeps. They pop in on the 0.5 s
// grid, then lock into the 5-7-5 rows one row at a time (7.5 to 9.0), and each row gets its
// copy line underneath as it locks.
(function () {
  const START = 5, END = 10;
  const F = 1000, CX = H.W / 2, CY = H.H / 2;
  const TS = 120, TG = 18;                       // tile size and gap, in px on the lock plane
  const LOCK_Z = 1000;                           // at this depth world units equal screen px
  const ROWS = [5, 7, 5];
  const ROW_TOP = [250, 480, 710];
  const LOCK_AT = [7.5, 8.0, 8.5];               // each row locks over 0.5 s
  const CAP_AT = [8.0, 8.5, 9.0];                // caption appears as its row settles
  const LINES = ['Small model, big aim.', 'Fast replies, sharp reasoning.', 'Ready when you are.'];
  const ENTER = [5.0, 5.5, 6.0];                 // tiles pop in in groups of 6, 6, 5
  const ACCENT = 8;                              // one amber tile
  const CAM_X = [[5.0, -260], [6.0, 230], [7.0, -60], [7.5, 0]];
  const CAM_Y = [[5.0, 60], [6.5, -40], [7.5, 0]];
  const CAP_GAP = 62;                            // caption baseline below each row's tiles
  const N = 17;

  const tiles = [];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    const rowW = ROWS[r] * TS + (ROWS[r] - 1) * TG;
    for (let j = 0; j < ROWS[r]; j++, n++) {
      const cx = CX - rowW / 2 + j * (TS + TG) + TS / 2;
      tiles.push({
        row: r,
        idx: n,
        lx: cx - CX,                             // lock position, relative to the camera axis
        ly: ROW_TOP[r] + TS / 2 - CY,
        fx: (H.hash(n * 3 + 1) * 2 - 1) * 760,   // float position
        fy: (H.hash(n * 3 + 2) * 2 - 1) * 380,
        fz: 700 + H.hash(n * 3 + 3) * 1100,
        roll: (H.hash(n + 90) - 0.5) * 0.9,
        enter: ENTER[Math.floor(n / 6)],
        accent: n === ACCENT,
      });
    }
  }
  // Preallocated per-tile state, updated in place each frame.
  const st = [];
  const order = [];
  for (let i = 0; i < N; i++) { st.push({ x: 0, y: 0, z: 1, roll: 0, a: 0 }); order.push(i); }

  // Eased keyframes: hold the first value, ease between keys, hold the last.
  function keyed(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        return H.lerp(a[1], b[1], H.easeInOutCubic(H.ramp(t, a[0], b[0])));
      }
    }
    return keys[keys.length - 1][1];
  }

  function tileState(tile, t, out) {
    const i = tile.idx;
    const e = H.easeOutCubic(H.ramp(t, tile.enter, tile.enter + 0.5));   // fly in from far
    const k = H.easeInOutCubic(H.ramp(t, LOCK_AT[tile.row], LOCK_AT[tile.row] + 0.5));
    const float = 1 - k;                                                 // drift only while floating
    out.x = H.lerp(tile.fx + 24 * Math.sin(t * 0.8 + i * 1.3) * float, tile.lx, k);
    out.y = H.lerp(tile.fy + 16 * Math.cos(t * 0.6 + i * 0.7) * float, tile.ly, k);
    out.z = H.lerp(3000, H.lerp(tile.fz, LOCK_Z, k), e);
    out.roll = H.lerp(tile.roll + 0.12 * Math.sin(t * 0.9 + i) * float, 0, k);
    out.a = H.ramp(t, tile.enter, tile.enter + 0.15);
  }

  function draw(ctx, t) {
    if (t < START || t >= END) return;
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    const camX = keyed(t, CAM_X), camY = keyed(t, CAM_Y);
    for (let i = 0; i < N; i++) tileState(tiles[i], t, st[i]);
    order.sort((a, b) => st[b].z - st[a].z);       // far to near

    for (let k = 0; k < N; k++) {
      const i = order[k], p = st[i];
      if (p.a <= 0.002) continue;
      const s = F / p.z;
      ctx.save();
      ctx.translate(CX + (p.x - camX) * s, CY + (p.y - camY) * s);
      ctx.rotate(p.roll);
      ctx.scale(s, s);
      H.rrect(ctx, -TS / 2, -TS / 2, TS, TS, 16);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = tiles[i].accent ? V.accent : V.light.surface;
      ctx.fill();
      ctx.lineWidth = 1.5 / s;
      ctx.strokeStyle = V.light.mute;
      ctx.globalAlpha = p.a * 0.45;
      ctx.stroke();
      ctx.restore();
    }

    // Copy lines: flat on the screen plane, one per row, once that row has settled.
    for (let r = 0; r < 3; r++) {
      const a = H.ramp(t, CAP_AT[r], CAP_AT[r] + 0.15);
      if (a <= 0) continue;
      H.text(ctx, LINES[r], CX, ROW_TOP[r] + TS + CAP_GAP, {
        size: 50, weight: 500, color: V.light.text, align: 'center', baseline: 'alphabetic', alpha: a,
      });
    }
  }

  H.scene({ id: 'v5_s2_tiles', start: START, end: END, draw });
})();
