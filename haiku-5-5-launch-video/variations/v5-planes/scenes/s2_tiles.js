// v5_s2_tiles: Parallax Planes, the poem (5 to 10 s).
// Twelve word tiles (each as wide as its syllables) float among seven decoy cards while the
// camera orbits. Rows lock in turn (7.5, 8.0, 8.5) and each tile's word fades in as it locks.
// The decoys dissolve as the grid settles, and the grid is set by 9.0.
(function () {
  const START = 5, END = 10;
  const F = 1000, CX = H.W / 2, CY = H.H / 2;
  const TS = 160, TG = 18, UNIT = 160;      // tile height, gap, and the width of one syllable
  const LOCK_Z = 1000;                      // at this depth world units equal screen px
  const ROW_TOP = [260, 460, 660];
  const LOCK_AT = [7.5, 8.0, 8.5];
  const ENTER = [5.0, 5.5, 6.0];
  const ORBIT_START = 5.0, ORBIT_END = 7.5, ORBIT_PERIOD = 1.25;
  const ORBIT_RX = 300, ORBIT_RY = 110;
  const DECOY_W = 300, DECOY_H = 170, DECOY_R = 26;
  const DECOY_OUT = [8.0, 8.5];
  const ACCENT = 6;                         // 'sharp', one amber tile

  // Copy-bank words, one tile per word. Syllable count sets the tile width.
  const ROWS = [
    [['Small', 1], ['model,', 2], ['big', 1], ['aim.', 1]],
    [['Fast', 1], ['replies,', 2], ['sharp', 1], ['reasoning.', 3]],
    [['Ready', 2], ['when', 1], ['you', 1], ['are.', 1]],
  ];
  // Decoys: [label, enter, base x, base y, base depth, flip time (-1 for none), label after flip]
  const DECOYS = [
    ['Fast.', 5.0, -620, -250, 900, -1, ''],
    ['Sharp.', 5.0, 560, -300, 1150, 6.5, 'Claude'],
    ['Everyday.', 5.5, -380, 300, 760, -1, ''],
    ['Claude', 5.5, 640, 200, 1400, 7.0, 'Fast.'],
    ['Sharp.', 5.5, 80, -380, 1300, -1, ''],
    ['Fast.', 6.0, -820, 60, 1500, -1, ''],
    ['Everyday.', 6.0, 300, 420, 980, -1, ''],
  ];

  // One list of every card on the field: word tiles first (kind 0), then decoys (kind 1).
  const items = [];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    const row = ROWS[r];
    let total = (row.length - 1) * TG;
    for (const word of row) total += word[1] * UNIT;
    let x = CX - total / 2;
    for (const word of row) {
      const w = word[1] * UNIT;
      const cx = x + w / 2;
      x += w + TG;
      items.push({
        kind: 0, w, h: TS, r: 18, text: word[0], row: r, idx: n, accent: n === ACCENT,
        lx: cx - CX, ly: ROW_TOP[r] + TS / 2 - CY,                 // lock position
        fx: (H.hash(n * 3 + 1) * 2 - 1) * 820,                      // float position
        fy: (H.hash(n * 3 + 2) * 2 - 1) * 400,
        fz: 700 + H.hash(n * 3 + 3) * 1000,
        roll: (H.hash(n + 90) - 0.5) * 0.9,
        enter: ENTER[r], bx: 0, by: 0, bz: 1, flipAt: -1, flipTo: '',
      });
      n++;
    }
  }
  for (let d = 0; d < DECOYS.length; d++) {
    const s = DECOYS[d];
    items.push({
      kind: 1, w: DECOY_W, h: DECOY_H, r: DECOY_R, text: s[0], row: -1, idx: n, accent: false,
      enter: s[1], lx: 0, ly: 0, fx: 0, fy: 0, fz: 1, roll: 0,
      bx: s[2], by: s[3], bz: s[4], flipAt: s[5], flipTo: s[6],
    });
    n++;
  }
  const COUNT = items.length;
  // Preallocated per-card state, updated in place each frame.
  const st = [], order = [];
  for (let i = 0; i < COUNT; i++) {
    st.push({ x: 0, y: 0, z: 1, roll: 0, a: 0, tk: 0, sq: 1, label: '' });
    order.push(i);
  }

  // Camera orbit: a fast ellipse from 5.0, easing to rest at the origin by 7.5.
  function orbit(t) {
    const env = 1 - H.easeInOutCubic(H.ramp(t, 6.5, ORBIT_END));
    const phi = (t - ORBIT_START) * 2 * Math.PI / ORBIT_PERIOD;
    return { x: ORBIT_RX * Math.sin(phi) * env, y: ORBIT_RY * (Math.cos(phi) - 1) * env };
  }

  function setState(it, t, p) {
    const i = it.idx;
    if (it.kind === 0) {
      const e = H.easeOutCubic(H.ramp(t, it.enter, it.enter + 0.5));          // fly in from far
      const k = H.easeInOutCubic(H.ramp(t, LOCK_AT[it.row], LOCK_AT[it.row] + 0.5));
      const fl = 1 - k;                                                       // drift only while floating
      p.x = H.lerp(it.fx + 30 * Math.sin(t * 0.9 + i * 1.3) * fl, it.lx, k);
      p.y = H.lerp(it.fy + 20 * Math.cos(t * 0.7 + i * 0.7) * fl, it.ly, k);
      p.z = H.lerp(3000, H.lerp(it.fz, LOCK_Z, k), e);
      p.roll = H.lerp(it.roll + 0.14 * Math.sin(t * 1.1 + i) * fl, 0, k);
      p.a = H.ramp(t, it.enter, it.enter + 0.15);
      p.tk = k * p.a;                                                         // word fades in as the tile locks
      p.sq = 1;
      p.label = it.text;
    } else {
      const e = H.easeOutCubic(H.ramp(t, it.enter, it.enter + 0.5));
      p.x = it.bx + 40 * Math.sin(t * 0.9 + i * 1.9);
      p.y = it.by + 30 * Math.cos(t * 0.7 + i * 1.7);
      p.z = H.lerp(3000, it.bz, e);
      p.roll = 0.08 * Math.sin(t * 1.2 + i);
      p.a = H.ramp(t, it.enter, it.enter + 0.15) * (1 - H.ramp(t, DECOY_OUT[0], DECOY_OUT[1]));
      p.tk = p.a;
      if (it.flipAt >= 0) {
        const k = H.ramp(t, it.flipAt, it.flipAt + 0.25);                     // text flip
        p.sq = Math.max(Math.abs(Math.cos(Math.PI * k)), 0.001);
        p.label = k >= 0.5 ? it.flipTo : it.text;
      } else {
        p.sq = 1;
        p.label = it.text;
      }
    }
  }

  function draw(ctx, t) {
    if (t < START || t >= END) return;
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    const cam = orbit(t);
    for (let i = 0; i < COUNT; i++) setState(items[i], t, st[i]);
    order.sort((a, b) => st[b].z - st[a].z);     // far to near

    for (let k = 0; k < COUNT; k++) {
      const i = order[k], it = items[i], p = st[i];
      if (p.a <= 0.002) continue;
      const s = F / p.z;
      const decoy = it.kind === 1;
      ctx.save();
      ctx.translate(CX + (p.x - cam.x) * s, CY + (p.y - cam.y) * s);
      ctx.rotate(p.roll);
      ctx.scale(s * p.sq, s);
      H.rrect(ctx, -it.w / 2, -it.h / 2, it.w, it.h, it.r);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = decoy ? V.dark.surface : (it.accent ? V.accent : V.light.surface);
      ctx.fill();
      if (!decoy) {
        ctx.lineWidth = 1.5 / s;
        ctx.strokeStyle = V.light.mute;
        ctx.globalAlpha = p.a * 0.45;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (p.tk > 0.002) {
        H.text(ctx, p.label, 0, 0, {
          size: decoy ? 52 : 48,
          weight: 500,
          color: decoy ? V.dark.text : V.light.text,
          align: 'center',
          baseline: 'middle',
          alpha: p.tk,
        });
      }
      ctx.restore();
    }
  }

  H.scene({ id: 'v5_s2_tiles', start: START, end: END, draw });
})();
