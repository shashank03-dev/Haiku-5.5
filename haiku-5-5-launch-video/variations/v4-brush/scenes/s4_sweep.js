// v4_s4_sweep (15.0 to 20.0), rice paper. Eight parallel brush sweeps, one every 0.5 s on the grid.
// Each sweep paints a band across the frame and carries one line of copy, knocked out of the ink
// so the paper shows through. The first band is cinnabar. Stroke geometry is computed at load;
// the band sprites are rasterised on first draw, after core.js has loaded Geist.
const v4s4 = (function () {
  const N = 8, T0 = 15.0, STEP = 0.5, SWEEP = 0.5, CUT = 20.0;
  const PHRASES = ['Quick to answer.', 'Sharp in the details.', 'Built for everyday work.'];
  const PITCH = 96, Y0 = 198, SLOPE = -0.012, MID = H.W / 2; // one slope for all bands: they stay parallel
  const TEXT = 44, TEXT_DROP = 16, STEPS = 120;

  // Seeded 1D value noise, smoothstep between table entries. Returns f(x), roughly in [-1, 1].
  function noise(seed) {
    const r = H.prng(seed), tab = [];
    for (let i = 0; i < 256; i++) tab.push(r() * 2 - 1);
    return x => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      const a = tab[i & 255], b = tab[(i + 1) & 255];
      return a + (b - a) * u;
    };
  }

  // Outline of a brush stroke: a centre line displaced by noise, width swelling in and drying out.
  function outline(o) {
    const wob = noise(o.seed), press = noise(o.seed + 3), dry = noise(o.seed + 9);
    const C = [], Wd = [];
    for (let i = 0; i <= STEPS; i++) {
      const s = i / STEPS, x = H.lerp(o.x0, o.x1, s);
      C.push([x, o.yc + o.slope * (x - MID) + o.amp * wob(s * o.freq)]);
      const a = H.clamp(s / o.inS), b = H.clamp((1 - s) / o.outS);
      const entry = 0.2 + 0.8 * a * a * (3 - 2 * a);
      const tail = 0.06 + 0.94 * Math.pow(b, 0.7);
      Wd.push(0.5 * o.w * entry * tail * (0.86 + 0.14 * press(s * 5)) * (1 + 0.05 * dry(s * 60)));
    }
    const A = [], B = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = C[Math.max(0, i - 1)], q = C[Math.min(STEPS, i + 1)];
      const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
      const nx = (-ty / tl) * Wd[i], ny = (tx / tl) * Wd[i];
      A.push([C[i][0] + nx, C[i][1] + ny]);
      B.push([C[i][0] - nx, C[i][1] - ny]);
    }
    return { C, A, B };
  }

  // Path2D of the first p (0 to 1) of an outline, so a stroke can be painted along its length.
  function strokePath(O, p) {
    const n = Math.max(1, Math.round(STEPS * H.clamp(p)));
    const P = new Path2D();
    P.moveTo(O.A[0][0], O.A[0][1]);
    for (let i = 1; i <= n; i++) P.lineTo(O.A[i][0], O.A[i][1]);
    for (let i = n; i >= 0; i--) P.lineTo(O.B[i][0], O.B[i][1]);
    P.closePath();
    return P;
  }

  // Band geometry, computed once at load (pure maths, no fonts needed).
  const BANDS = [];
  for (let k = 0; k < N; k++) {
    const r = H.prng(4001 + k * 37);
    const xs = -150 + 90 * r(), xe = 1990 + 90 * r();
    const w = 66 + 12 * r(), yc = Y0 + PITCH * k;
    const O = outline({ seed: 101 + k * 17, x0: xs, x1: xe, yc, slope: SLOPE, amp: 3 + 4 * r(), freq: 2 + 2 * r(), w, inS: 0.1 + 0.08 * r(), outS: 0.18 + 0.12 * r() });
    let minY = Infinity, maxY = -Infinity;
    for (const q of O.A.concat(O.B)) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }
    const left = k % 2 === 0, tx = left ? 200 : 1720;
    const ox = Math.floor(xs) - 24, oy = Math.floor(minY) - 8;
    BANDS.push({
      k, t0: T0 + STEP * k, O, w, xs, xe, yc, ox, oy,
      bw: Math.ceil(xe) + 24 - ox, bh: Math.ceil(maxY) + 8 - oy,
      full: strokePath(O, 1), jag: noise(555 + k),
      color: k === 0 ? V.accent : V.light.text,
      text: PHRASES[k % PHRASES.length], align: left ? 'left' : 'right',
      tx, ty: yc + SLOPE * (tx - MID) + TEXT_DROP, sprite: null,
    });
  }

  // Band sprite: ink fill, dry-brush streaks erased from it, then the line of copy knocked out.
  function bandSprite(B) {
    const c = document.createElement('canvas');
    c.width = B.bw; c.height = B.bh;
    const g = c.getContext('2d');
    g.translate(-B.ox, -B.oy);
    g.fillStyle = B.color;
    g.fill(B.full);
    g.globalCompositeOperation = 'destination-out';
    g.strokeStyle = '#000';
    const r = H.prng(900 + B.k);
    for (let j = 0; j < 6; j++) {
      const i0 = Math.floor(STEPS * (0.02 + 0.7 * r()));
      const i1 = Math.min(STEPS, i0 + Math.floor(STEPS * (0.08 + 0.2 * r())));
      const off = (r() - 0.5) * B.w * 0.6;
      g.globalAlpha = 0.25 + 0.3 * r();
      g.lineWidth = 2 + 2 * r();
      g.beginPath();
      for (let i = i0; i <= i1; i++) {
        const x = B.O.C[i][0], y = B.O.C[i][1] + off;
        if (i === i0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.font = H.font(TEXT, 600, H.FONT.sans);
    g.textAlign = B.align;
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText(B.text, B.tx, B.ty);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Paint one band up to front p (0 to 1). The clip front is a convex brush nose, not a straight wipe.
  function drawBand(ctx, B, p) {
    if (!B.sprite) B.sprite = bandSprite(B);
    ctx.save();
    if (p < 1) { // a finished band needs no clip
      const front = B.xs + (B.xe - B.xs) * p;
      const hw = B.w / 2 + 2;
      const y0 = B.oy - 2, y1 = B.oy + B.bh + 2;
      ctx.beginPath();
      ctx.moveTo(-400, y0);
      for (let j = 0; j <= 16; j++) {
        const y = y0 + (y1 - y0) * j / 16;
        const u = (y - (B.yc + SLOPE * (front - MID))) / hw;
        const nose = u * u < 1 ? 0.5 * hw * Math.sqrt(1 - u * u) : 0;
        ctx.lineTo(front + nose + 6 * B.jag(j * 0.9), y);
      }
      ctx.lineTo(-400, y1);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(B.sprite, B.ox, B.oy);
    ctx.restore();
  }

  return { BANDS, drawBand, CUT };
})();

H.scene({ id: "v4_s4_sweep", start: 15, end: 20, draw(ctx, t, local, dur) {
  if (t >= v4s4.CUT) return; // 20.0 is the pattern interrupt, drawn by s5
  // Rice paper fades in over the previous scene, 14.5 to 15.0.
  const ground = H.ramp(t, 14.5, 15.0);
  if (ground > 0) {
    ctx.save();
    ctx.globalAlpha = ground;
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);
    ctx.restore();
  }
  // Each sweep crosses in 0.5 s, starting on the grid: 15.0, 15.5 ... 18.5.
  for (const B of v4s4.BANDS) {
    const p = H.easeOutCubic(H.ramp(t, B.t0, B.t0 + 0.5));
    if (p > 0) v4s4.drawBand(ctx, B, p);
  }
} });
