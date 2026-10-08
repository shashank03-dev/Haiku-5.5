// v4_s1_stroke (0 to 5 s, light paper). A full-width stroke sweeps in at 0.0 with a faint trail,
// the outer rows follow on 0.5 (the poem's 5, 7, 5 bars), and "Haiku 5.5" is wiped in by 1.0.
// Then a cinnabar swash (2.0), an ink underline (2.5) and a cinnabar dab after the title (3.5).
// Everything fades out 4.5 to 5.0.
//
// This file also defines window.V4B, the procedural brush library. index.html loads s1 first, so
// s2 and s3 can build their geometry at load time from it. Each path is built once, from seeded
// noise, and a frame only clips and fills cached Path2D objects.
window.V4B = (function () {
  const TAU = Math.PI * 2;
  const smooth = (a, b, x) => { const t = H.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Seeded value noise: n values in [-1, 1]. vn() interpolates them smoothly; x is in table units.
  function table(seed, n) {
    const r = H.prng(seed), a = [];
    for (let i = 0; i < n; i++) a.push(r() * 2 - 1);
    return a;
  }
  function vn(tab, x) {
    const n = tab.length, f = Math.floor(x), u = x - f, s = u * u * (3 - 2 * u);
    const i0 = ((f % n) + n) % n, i1 = (i0 + 1) % n;
    return tab[i0] + (tab[i1] - tab[i0]) * s;
  }
  // Per-step offsets for the ragged leading edge of a wipe (one value per clip step).
  function jagTable(seed) {
    const r = H.prng(seed), a = [];
    for (let k = 0; k <= 12; k++) a.push(r() * 2 - 1);
    return a;
  }

  // Dry brush stroke from (x0, y0) to (x1, y1). Built in its own frame: x runs 0..len along the
  // stroke and y is across it. Options: w (body width px), seed, bow (arc px), disp (centre-line
  // wobble px), taper (0..1, how far the tail thins), dry (0..1, bristle gaps near the tail), N.
  function stroke(x0, y0, x1, y1, o) {
    const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const seed = o.seed, N = o.N || 110, w = o.w;
    const tC = table(seed * 3 + 1, 16), tW = table(seed * 3 + 2, 16), tE = table(seed * 3 + 3, 64);
    const bow = o.bow || 0, disp = o.disp != null ? o.disp : w * 0.08;
    const taper = o.taper != null ? o.taper : 0.7, dry = o.dry != null ? o.dry : 0.6;
    const xs = [], cy = [], hw = [], jt = [], jb = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      xs.push(u * len);
      cy.push(bow * Math.sin(Math.PI * u) + disp * vn(tC, u * 4));
      const swell = 0.45 + 0.55 * smooth(0, 0.12, u);     // blunt start that fills in
      const tail = 1 - taper * 0.9 * smooth(0.5, 1, u);    // the tail thins
      const press = 1 + 0.22 * vn(tW, u * 5) + 0.07 * vn(tE, u * 19); // pressure variation
      hw.push(Math.max(1.5, 0.5 * w * swell * tail * press));
      const rag = 0.04 + 0.12 * smooth(0.55, 1, u);        // edges get ragged as the brush runs dry
      jt.push(rag * vn(tE, u * 31));
      jb.push(rag * vn(tE, u * 27 + 13));
    }
    const path = new Path2D();
    path.moveTo(xs[0], cy[0] - hw[0] * (1 + jt[0]));
    for (let i = 1; i <= N; i++) path.lineTo(xs[i], cy[i] - hw[i] * (1 + jt[i]));
    for (let i = N; i >= 0; i--) path.lineTo(xs[i], cy[i] + hw[i] * (1 + jb[i]));
    path.closePath();
    // Dry-brush gaps: thin slivers inside the body, cut out by the evenodd fill.
    const pr = H.prng(seed * 5 + 9);
    const K = Math.round(dry * (3 + w / 25));
    for (let k = 0; k < K; k++) {
      const ua = 0.28 + pr() * 0.62, ub = Math.min(0.99, ua + 0.05 + pr() * 0.16);
      const ia = Math.round(ua * N), ib = Math.round(ub * N);
      if (ib - ia < 3) continue;
      const span = ib - ia, lane = (pr() * 2 - 1) * 0.5, gap = 0.01 + pr() * 0.02;
      path.moveTo(xs[ia], cy[ia] + lane * hw[ia]);
      for (let i = ia; i <= ib; i++) path.lineTo(xs[i], cy[i] + lane * hw[i] - gap * hw[i] * Math.sin(Math.PI * (i - ia) / span));
      for (let i = ib; i >= ia; i--) path.lineTo(xs[i], cy[i] + lane * hw[i] + gap * hw[i] * Math.sin(Math.PI * (i - ia) / span));
      path.closePath();
    }
    let hb = 0;
    for (let i = 0; i <= N; i++) hb = Math.max(hb, Math.abs(cy[i]) + hw[i] * 1.2 + 4);
    return { path, x0, y0, ang, len, hb, amp: o.amp != null ? o.amp : Math.min(70, w * 0.4), jag: jagTable(seed * 7 + 2) };
  }

  // A wipe box for text: a rectangle in its own frame (origin at its left, centre line at y = 0).
  function box(x0, yMid, len, hb, seed, amp) {
    return { x0, y0: yMid, ang: 0, len, hb, amp: amp || 18, jag: jagTable(seed) };
  }

  // Clips to the part of a box or stroke that a brush front has passed. p runs 0 to 1 along the
  // length. The front is ragged across the width, like a bristle edge. Call inside ctx.save().
  function wipeClip(ctx, st, p) {
    const a = st.amp, F = H.lerp(-2 * a - 2, st.len + 2 * a + 2, p);
    const K = st.jag.length - 1, hb = st.hb;
    ctx.beginPath();
    ctx.moveTo(-4000, -hb);
    for (let k = 0; k <= K; k++) ctx.lineTo(F + a * st.jag[k], -hb + (2 * hb * k) / K);
    ctx.lineTo(-4000, hb);
    ctx.closePath();
    ctx.clip();
  }

  // Paints a stroke revealed to progress p. dx shifts it along its own direction (a trail uses a negative dx).
  function paint(ctx, st, p, color, alpha, dx) {
    if (p <= 0 || alpha <= 0) return;
    const d = dx || 0;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(st.x0 + d * Math.cos(st.ang), st.y0 + d * Math.sin(st.ang));
    ctx.rotate(st.ang);
    wipeClip(ctx, st, p);
    ctx.fillStyle = color;
    ctx.fill(st.path, 'evenodd');
    ctx.restore();
  }

  // Unit-radius splash or ink flood: a noisy disc with optional spikes and droplets. Scale it to any radius.
  function blob(seed, o) {
    const pr = H.prng(seed), N = 240;
    const amp = o.amp || 0, spikes = o.spikes || 0, drops = o.drops || 0;
    const hs = [];
    for (let k = 2; k <= 6; k++) hs.push({ k, a: (pr() * 2 - 1) / k, ph: pr() * TAU });
    const sp = [];
    for (let s = 0; s < spikes; s++) sp.push({ th: pr() * TAU, len: 0.12 + pr() * 0.3, wd: 0.02 + pr() * 0.05 });
    const path = new Path2D();
    for (let i = 0; i <= N; i++) {
      const th = (TAU * i) / N;
      let r = 1;
      for (const h of hs) r += amp * h.a * Math.cos(h.k * th + h.ph);
      for (const s of sp) {
        let d = Math.abs(th - s.th);
        if (d > Math.PI) d = TAU - d;
        const f = Math.max(0, 1 - d / s.wd);
        r += s.len * f * f;
      }
      const x = Math.cos(th) * r, y = Math.sin(th) * r;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
    for (let d = 0; d < drops; d++) {
      const th = pr() * TAU, dist = 1.12 + pr() * 0.3, rr = 0.012 + pr() * 0.03;
      path.moveTo(Math.cos(th) * dist + rr, Math.sin(th) * dist);
      path.arc(Math.cos(th) * dist, Math.sin(th) * dist, rr, 0, TAU);
    }
    return path;
  }

  // Unit-radius brush ring. Its thickness is 0.03 of the radius, so it thickens as it expands.
  function ring(seed) {
    const pr = H.prng(seed), N = 260;
    const hs = [], ht = [];
    for (let k = 2; k <= 7; k++) hs.push({ k, a: (pr() * 2 - 1) / (k * 1.6), ph: pr() * TAU });
    for (let k = 3; k <= 9; k++) ht.push({ k, a: (pr() * 2 - 1) / k, ph: pr() * TAU });
    const outer = [], inner = [];
    for (let i = 0; i <= N; i++) {
      const th = (TAU * i) / N;
      let ro = 1, thick = 0.03;
      for (const h of hs) ro += 0.035 * h.a * Math.cos(h.k * th + h.ph);
      for (const h of ht) thick += 0.012 * h.a * Math.cos(h.k * th + h.ph);
      outer.push([Math.cos(th) * ro, Math.sin(th) * ro]);
      inner.push([Math.cos(th) * (ro - thick), Math.sin(th) * (ro - thick)]);
    }
    const path = new Path2D();
    outer.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
    path.closePath();
    for (let i = N; i >= 0; i--) {
      const q = inner[i];
      if (i === N) path.moveTo(q[0], q[1]); else path.lineTo(q[0], q[1]);
    }
    path.closePath();
    return path;
  }

  return { stroke, box, wipeClip, paint, blob, ring };
})();

// ---- s1 ----
(function () {
  const B = window.V4B;
  const F = H.FONT;
  const SAFE = H.SAFE, U = (H.W - 2 * SAFE) / 7;          // one syllable unit: the bars are 5U, 7U, 5U
  const BAR_H = 150;
  const ROW_Y = [420, 600, 780];                           // poem rows, top to bottom
  const ROW_X = [
    [H.W / 2 - 2.5 * U, H.W / 2 + 2.5 * U],                // 5U
    [SAFE, H.W - SAFE],                                    // 7U (full width)
    [H.W / 2 - 2.5 * U, H.W / 2 + 2.5 * U],                // 5U
  ];
  const TITLE = 'Haiku 5.5', TSIZE = 150, TWEIGHT = 600, TTRACK = -0.03 * TSIZE, TY = 262;

  // Strokes, built once at load.
  const SWEEP = B.stroke(SAFE - 20, ROW_Y[1], H.W - SAFE + 20, ROW_Y[1], { w: 170, seed: 11, bow: 6, disp: 10, taper: 0.8, dry: 0.8 });
  const ROW_A = B.stroke(ROW_X[0][0], ROW_Y[0], ROW_X[0][1], ROW_Y[0], { w: BAR_H, seed: 21, bow: -4, disp: 8, taper: 0.6, dry: 0.7 });
  const ROW_C = B.stroke(ROW_X[2][1], ROW_Y[2], ROW_X[2][0], ROW_Y[2], { w: BAR_H, seed: 33, bow: 4, disp: 8, taper: 0.6, dry: 0.7 });
  const SWASH = B.stroke(330, 400, 1600, 850, { w: 30, seed: 41, disp: 12, taper: 0.9, dry: 0.9 });
  const UNDERLINE = B.stroke(300, 896, 1640, 896, { w: 12, seed: 52, bow: 3, disp: 4, taper: 0.5, dry: 0.4 });
  const DAB = B.blob(61, { amp: 0.14 });

  // Title measurements need the Geist faces, so they are taken on the first draw, not at load.
  let lay = null;
  function layout(ctx) {
    if (lay) return lay;
    const tw = H.measure(ctx, TITLE, TSIZE, TWEIGHT, F.sans, TTRACK);
    lay = { tw, tx: (H.W - tw) / 2, pre: H.measure(ctx, 'Haiku ', TSIZE, TWEIGHT, F.sans, TTRACK) };
    return lay;
  }

  H.scene({ id: "v4_s1_stroke", start: 0, end: 5, draw(ctx, t, local, dur) {
    if (t >= 5) return;                                    // s2 takes over at the 5.0 cut
    const L = layout(ctx);
    const ink = V.light.text, acc = V.accent;
    ctx.save();
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);
    ctx.globalAlpha = 1 - H.ramp(t, 4.5, 5.0);             // the marks fade; the paper holds until the cut

    // 0.0: a fast full-width stroke, with a faint copy trailing behind it.
    const pSweep = H.easeOutQuart(H.ramp(t, 0.0, 0.45));
    B.paint(ctx, SWEEP, pSweep, ink, 0.22, -120);
    B.paint(ctx, SWEEP, pSweep, ink, 1);

    // 0.5: the two outer rows (5 units each) are painted together, done by 0.9.
    const pRows = H.easeOutCubic(H.ramp(t, 0.5, 0.9));
    B.paint(ctx, ROW_A, pRows, ink, 1);
    B.paint(ctx, ROW_C, pRows, ink, 1);

    // 0.5 to 0.95: the title is wiped in, "5.5" in cinnabar.
    const pTitle = H.easeOutExpo(H.ramp(t, 0.5, 0.95));
    if (pTitle > 0) {
      const bx = B.box(L.tx - 30, TY - 70, L.tw + 60, 130, 71, 26);
      ctx.save();
      ctx.translate(bx.x0, bx.y0);
      B.wipeClip(ctx, bx, pTitle);
      const base = TY - bx.y0;
      H.text(ctx, 'Haiku ', L.tx - bx.x0, base, { size: TSIZE, weight: TWEIGHT, family: F.sans, color: ink, tracking: TTRACK });
      H.text(ctx, '5.5', L.tx - bx.x0 + L.pre, base, { size: TSIZE, weight: TWEIGHT, family: F.sans, color: acc, tracking: TTRACK });
      ctx.restore();
    }

    // 2.0: a cinnabar swash crosses the three rows.
    B.paint(ctx, SWASH, H.easeInOutCubic(H.ramp(t, 2.0, 2.4)), acc, 1);
    // 2.5: an ink underline below the bars.
    B.paint(ctx, UNDERLINE, H.easeOutCubic(H.ramp(t, 2.5, 2.95)), ink, 1);
    // 3.5: a cinnabar dab after the title, stamped with a small overshoot.
    const rDab = 17 * H.easeOutSoft(H.ramp(t, 3.5, 3.8));
    if (rDab > 0.5) {
      ctx.save();
      ctx.translate(L.tx + L.tw + 42, TY - 20);
      ctx.scale(rDab, rDab);
      ctx.fillStyle = acc;
      ctx.fill(DAB);
      ctx.restore();
    }
    ctx.restore();
  } });
})();
