// s04_particles (11.0 to 15.0), ink. The coded image.
// The "5.5" is sampled once from Geist 600 at load (offscreen canvas, 9 px grid, about 2200 points).
// Particles gather into it (11.0 to 12.0), hold it (12.0 to 13.0), then flow out of it into three
// rows of 5, 7 and 5 dots, the haiku's syllables (13.0 onward). A riser accelerates a rising line of
// dots off the right edge (13.0 to 15.0). Everything is a pure function of t; all randomness is
// H.prng at load, so any frame re-renders identically.
(function () {
  const C = H.COLOR;
  const rnd = H.prng(0x55a4);

  const GLYPH_PX = 640;          // Geist 600 size of the "5.5"
  const STEP = 9;                // sample grid pitch in px (gives about 2200 points)
  const ROW_Y = [380, 540, 700]; // same row centres as s02
  const ROW_N = [5, 7, 5];       // 17 syllables: 5, 7, 5
  const ROW_PITCH = 180;         // dot spacing inside a row
  const DOT_R = 46;              // dot radius: each dot is a golden-angle disc of its particles
  const FLOW_AMP = 70;           // px, peak sideways drift of the flow field during the move
  const SEAL_RATE = 0.1;         // one in ten particles is seal coloured
  const BUCKETS = 20;            // alpha quantisation, so each frame is a few batched fills
  const RISER_N = 90;
  const RISER_A = 1100;          // px/s^2, riser acceleration

  let P = null;   // particle state, built once
  let RS = null;  // riser state, built once
  let AX = null, AY = null, AA = null, AB = null, AS = null; // per-frame scratch (typed arrays)

  // Sample the "5.5" glyph on a STEP px grid, centred on the canvas. Returns [{x, y}] in scene px.
  function sampleGlyph() {
    const font = `600 ${GLYPH_PX}px ${H.FONT.sans}`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const m = probe.measureText('5.5');
    const inkLeftOff = -m.actualBoundingBoxLeft, inkRightOff = m.actualBoundingBoxRight;
    const inkTopOff = -m.actualBoundingBoxAscent, inkBottomOff = m.actualBoundingBoxDescent;
    const inkW = inkRightOff - inkLeftOff, inkH = inkBottomOff - inkTopOff;
    const inkLeft = H.W / 2 - inkW / 2, inkTop = H.H / 2 - inkH / 2;
    const originX = inkLeft - inkLeftOff, baseY = inkTop - inkTopOff;

    const pad = 8;
    const ox = inkLeft - pad, oy = inkTop - pad;
    const cw = Math.ceil(inkW) + pad * 2, ch = Math.ceil(inkH) + pad * 2;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = font;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText('5.5', originX - ox, baseY - oy);
    const data = g.getImageData(0, 0, cw, ch).data;

    const pts = [];
    for (let y = inkTop + STEP / 2; y < inkTop + inkH; y += STEP) {
      for (let x = inkLeft + STEP / 2; x < inkLeft + inkW; x += STEP) {
        const lx = Math.round(x - ox), ly = Math.round(y - oy);
        if (data[(ly * cw + lx) * 4 + 3] > 127) pts.push({ x, y });
      }
    }
    return pts;
  }

  // Golden-angle (Vogel) disc: n points evenly spread inside radius R around (cx, cy).
  function discSlots(cx, cy, n, R) {
    const out = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < n; k++) {
      const r = R * Math.sqrt((k + 0.5) / n), a = k * ga;
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return out;
  }

  function build() {
    const pts = sampleGlyph();
    const N = pts.length;
    const K = Math.floor(N / 17);       // particles per syllable dot
    const M = 17 * K;

    // Keep exactly 17 K glyph points (drop a few at random so every dot has the same count).
    const idx = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    const use = idx.slice(0, M).sort((a, b) => pts[a].y - pts[b].y); // top to bottom

    // Rows take the top 5K, middle 7K and bottom 5K of the glyph, so the flow reads top-down.
    // Within a row, particles are split left to right into one group per dot.
    const dots = [];
    let band = 0;
    for (let r = 0; r < 3; r++) {
      const n = ROW_N[r];
      const rowPts = use.slice(band, band + n * K).sort((a, b) => pts[a].x - pts[b].x);
      band += n * K;
      const x0 = H.W / 2 - (n - 1) * ROW_PITCH / 2;
      for (let d = 0; d < n; d++) {
        const cx = x0 + d * ROW_PITCH, cy = ROW_Y[r];
        const group = rowPts.slice(d * K, (d + 1) * K).sort((a, b) => pts[a].y - pts[b].y);
        const slots = discSlots(cx, cy, K, DOT_R).sort((a, b) => a.y - b.y);
        for (let k = 0; k < K; k++) dots.push({ g: pts[group[k]], s: slots[k] });
      }
    }

    // Per-particle state, in typed arrays for the per-frame loop.
    const SX = new Float32Array(M), SY = new Float32Array(M), CX = new Float32Array(M), CY = new Float32Array(M);
    const GX = new Float32Array(M), GY = new Float32Array(M), RX = new Float32Array(M), RY = new Float32Array(M);
    const GD = new Float32Array(M), FD = new Float32Array(M), RAD = new Float32Array(M);
    const SEAL = new Uint8Array(M);
    AX = new Float32Array(M); AY = new Float32Array(M); AA = new Float32Array(M);
    AB = new Uint8Array(M); AS = new Uint8Array(M);

    for (let i = 0; i < M; i++) {
      const { g, s } = dots[i];
      GX[i] = g.x; GY[i] = g.y; RX[i] = s.x; RY[i] = s.y;
      // Start anywhere around the frame, then curve in along a gentle bow.
      SX[i] = 60 + rnd() * (H.W - 120);
      SY[i] = 60 + rnd() * (H.H - 120);
      const mx = (SX[i] + GX[i]) / 2, my = (SY[i] + GY[i]) / 2;
      const dx = GX[i] - SX[i], dy = GY[i] - SY[i], bow = (rnd() - 0.5) * 0.6;
      CX[i] = mx - dy * bow; CY[i] = my + dx * bow;
      GD[i] = rnd() * 0.2;            // gather stagger (0 to 0.2 s)
      FD[i] = rnd() * 0.12;           // flow stagger (0 to 0.12 s)
      RAD[i] = 2.5 + rnd() * 1.5;     // radius 2.5 to 4 px
      SEAL[i] = rnd() < SEAL_RATE ? 1 : 0;
    }
    P = { M, SX, SY, CX, CY, GX, GY, RX, RY, GD, FD, RAD, SEAL };

    // Riser: dots born at the left edge, spawned ever faster (rising pitch), accelerating right.
    const B = new Float32Array(RISER_N);
    for (let j = 0; j < RISER_N; j++) B[j] = 13.0 + 1.5 * (1 - Math.pow(1 - j / RISER_N, 2));
    RS = { B };
    return true;
  }

  // Build once: as soon as the Geist 600 face is in (at load), or on the first draw if that is later.
  function ensure() {
    if (P) return true;
    if (!document.fonts.check(`600 ${GLYPH_PX}px Geist`)) return false;
    return build();
  }
  document.fonts.load(`600 ${GLYPH_PX}px Geist`).then(ensure);

  H.scene({ id: "s04_particles", start: 11.0, end: 15.0, draw(ctx, t, local, dur) {
    if (!ensure()) return;
    const fade = 1 - H.ramp(t, 14.7, 15.0);
    const bgA = H.ramp(t, 10.8, 11.0) * fade;
    if (bgA <= 0) return;

    // Ink background, cross-fading with s03 on the way in.
    ctx.save();
    ctx.globalAlpha = bgA;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, H.W, H.H);
    ctx.restore();

    const { M, SX, SY, CX, CY, GX, GY, RX, RY, GD, FD, RAD, SEAL } = P;
    const T = Math.max(0, t - 13.0);
    for (let i = 0; i < M; i++) {
      // Gather: quadratic bow from a start point into the glyph sample, eased.
      const g = H.easeInOutCubic(H.ramp(t, 11.0 + GD[i], 11.8 + GD[i]));
      const om = 1 - g;
      let x = om * om * SX[i] + 2 * om * g * CX[i] + g * g * GX[i];
      let y = om * om * SY[i] + 2 * om * g * CY[i] + g * g * GY[i];

      // Flow: from the glyph into its row dot, with a smooth sin/cos drift that is zero at both ends.
      const f = H.easeInOutCubic(H.ramp(t, 13.0 + FD[i], 13.9 + FD[i]));
      if (f > 0) {
        const bump = Math.sin(Math.PI * f) * FLOW_AMP;
        x = H.lerp(x, RX[i], f) + bump * Math.sin(y * 0.011 + T * 2.2);
        y = H.lerp(y, RY[i], f) + bump * Math.cos(x * 0.009 - T * 1.7);
      }

      const a = H.ramp(t, 11.0 + GD[i], 11.2 + GD[i]) * fade;
      AX[i] = x; AY[i] = y; AA[i] = a;
      AB[i] = Math.round(a * BUCKETS);
      AS[i] = SEAL[i];
    }

    // Batched fills: one path per (colour, alpha bucket).
    for (let colour = 0; colour < 2; colour++) {
      ctx.fillStyle = colour ? C.seal : C.paper;
      for (let b = 1; b <= BUCKETS; b++) {
        let open = false;
        for (let i = 0; i < M; i++) {
          if (AB[i] !== b || AS[i] !== colour) continue;
          if (!open) { ctx.globalAlpha = b / BUCKETS; ctx.beginPath(); open = true; }
          const r = RAD[i];
          ctx.moveTo(AX[i] + r, AY[i]);
          ctx.arc(AX[i], AY[i], r, 0, Math.PI * 2);
        }
        if (open) ctx.fill();
      }
    }

    // Riser: a line of dots rising to the right, accelerating off the right edge.
    ctx.fillStyle = C.paper;
    for (let j = 0; j < RISER_N; j++) {
      const tau = t - RS.B[j];
      if (tau < 0) continue;
      const x = 150 + 0.5 * RISER_A * tau * tau;
      if (x > H.W + 20) continue;
      const y = 900 - 70 * (x - 150) / (H.W - 300);
      const a = H.ramp(tau, 0, 0.12) * fade;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } });
})();
