// v5_s4_code (15.0 to 20.0). A flight of cards runs past behind a large code card. The card rises
// from below and lands on 15.5. A five-line snippet (lines 5 to 9 of s05 in the main film) types in
// from 15.5 to 17.5, and the output chip lands on the grid at 18.0. The scene stops at 20.0, where
// the s05 pattern interrupt takes over. Everything is projected with sx = W/2 + (x - camX) F / z.
(function () {
  const FOCAL = 1000;                   // a card at z = FOCAL is drawn 1:1
  const T_IN = 15.0, T_OUT = 20.0;
  const RISE_A = 15.0, RISE_B = 15.5;   // code card rises from below and lands on the grid
  const TYPE_A = 15.5, TYPE_B = 17.5;   // typing, 2.0 s
  const CHIP_IN = 18.0;                 // output chip cue, on the grid
  const Z_NEAR = 1100, Z_FAR = 3700;    // flight range, always behind the code card
  const SPAN = Z_FAR - Z_NEAR;

  const WIN_W = 1480, WIN_H = 440, WIN_R = 28, BAR_H = 64;
  const CARD_Y = -40;                   // rest height: lifted 40 px, as in the main film
  const MONO = { size: 30, weight: 500, family: H.FONT.mono };
  const LH = 48, PAD_X = 64, BASE = 34;

  // Lines 5 to 9 of the s05 snippet, exactly as in the main film.
  const CODE = [
    'const reply = await client.messages.create({',
    '  model: "claude-haiku-5-5",',
    '  max_tokens: 512,',
    '  messages: [{ role: "user", content: "Summarize this release note." }],',
    '});',
  ];
  const FLAT = CODE.join('\n');
  const LINE_START = [];
  { let p = 0; CODE.forEach(s => { LINE_START.push(p); p += s.length + 1; }); }
  const TOKEN = '"claude-haiku-5-5"';  // the only accent run, quotes included
  const MODEL_LI = 1;
  const MODEL_S = CODE[MODEL_LI].indexOf(TOKEN), MODEL_E = MODEL_S + TOKEN.length;
  const isAccent = (li, col) => li === MODEL_LI && col >= MODEL_S && col < MODEL_E;

  // Typing schedule: each character gets a seeded, jittered slot, with longer beats at line ends.
  // DONE[i] is the progress (0 to 1) at which character i is complete.
  const typeRnd = H.prng(0x5c0de4);
  const DONE = [];
  {
    const wts = [];
    let total = 0;
    for (const c of FLAT) {
      let w = 0.8 + typeRnd() * 0.5;
      if (c === '\n') w = 2.2;
      else if (c === ' ') w = 0.7;
      else if (c === ';' || c === ',') w += 0.6;
      wts.push(w);
      total += w;
    }
    let acc = 0;
    for (const w of wts) { acc += w; DONE.push(acc / total); }
    DONE[DONE.length - 1] = 1;
  }

  // Number of characters typed by time t (binary search over DONE).
  function revealed(t) {
    const p = H.clamp((t - TYPE_A) / (TYPE_B - TYPE_A));
    let lo = 0, hi = DONE.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (DONE[mid] <= p) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // Index into FLAT to { li, col }.
  function locate(n) {
    for (let li = 0; li < CODE.length; li++) {
      if (n <= LINE_START[li] + CODE[li].length) return { li, col: n - LINE_START[li] };
    }
    const last = CODE.length - 1;
    return { li: last, col: CODE[last].length };
  }

  // One line, typed to vis characters. Runs of accent text are drawn in V.accent.
  function drawLine(ctx, li, vis, x, base) {
    const s = CODE[li];
    let i = 0;
    while (i < vis) {
      const acc = isAccent(li, i);
      let j = i + 1;
      while (j < vis && isAccent(li, j) === acc) j++;
      const xi = x + H.measure(ctx, s.slice(0, i), MONO.size, MONO.weight, MONO.family);
      H.text(ctx, s.slice(i, j), xi, base, {
        size: MONO.size, weight: MONO.weight, family: MONO.family, color: acc ? V.accent : V.dark.text,
      });
      i = j;
    }
  }

  // Flight cards. Each has a fixed world position and a depth that falls over time, so cards fly
  // outward from the centre. A speed ramp (u + 0.12 u^2) makes the flight accelerate into the cut.
  const FLOW = [];
  {
    const r = H.prng(0x7a11e);
    for (let i = 0; i < 16; i++) {
      const w = 380 + r() * 320;
      FLOW.push({
        x: (r() * 2 - 1) * 2200,
        y: (r() * 2 - 1) * 1300,
        w,
        h: w * (0.6 + r() * 0.12),
        z0: Z_NEAR + r() * SPAN,
      });
    }
  }
  // u is seconds after 15.0. The depth wraps inside [Z_NEAR, Z_FAR], and the alpha fades at both ends.
  function flowZ(c, u) {
    const v = (c.z0 - Z_NEAR - 480 * (u + 0.12 * u * u)) % SPAN;
    return Z_NEAR + (v < 0 ? v + SPAN : v);
  }
  function flowAlpha(z) {
    return H.ramp(z, Z_NEAR, Z_NEAR + 200) * (1 - H.ramp(z, Z_FAR - 500, Z_FAR));
  }
  function drawFlow(ctx, c, z, cam, alpha) {
    const k = FOCAL / z;
    const w = c.w * k, h = c.h * k;
    const cx = H.W / 2 + (c.x - cam.x) * k;
    const cy = H.H / 2 + (c.y - cam.y) * k;
    ctx.save();
    ctx.globalAlpha *= alpha;
    H.rrect(ctx, cx - w / 2, cy - h / 2, w, h, 22 * k);
    ctx.fillStyle = V.dark.surface;
    ctx.fill();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = V.dark.mute;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Camera: a slow eased drift over the scene. Parallax comes from the flight cards sitting behind the code card.
  function camAt(t) {
    const e = H.easeInOutCubic(H.ramp(t, T_IN, T_OUT));
    return { x: -60 * e, y: -24 * e };
  }

  H.scene({ id: "v5_s4_code", start: 15, end: 20, draw(ctx, t, local, dur) {
    if (t < T_IN || t >= T_OUT) return;
    const u = t - T_IN;
    const cam = camAt(t);

    // Graphite field.
    ctx.fillStyle = V.dark.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Flight cards, far to near.
    const order = FLOW.map(c => ({ c, z: flowZ(c, u) })).sort((a, b) => b.z - a.z);
    for (const { c, z } of order) {
      const a = flowAlpha(z);
      if (a > 0) drawFlow(ctx, c, z, cam, a);
    }

    // Code card. At z = FOCAL the projection is 1:1, so the card keeps its 1480 x 440 size.
    const rise = H.easeOutExpo(H.ramp(t, RISE_A, RISE_B));
    const cardY = H.lerp(1100, CARD_Y, rise);
    const cx = H.W / 2 - cam.x;
    const cy = H.H / 2 + cardY - cam.y;
    const left = cx - WIN_W / 2, top = cy - WIN_H / 2;

    ctx.save();
    H.rrect(ctx, left, top, WIN_W, WIN_H, WIN_R);
    ctx.fillStyle = V.dark.surface;
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = V.dark.mute;
    ctx.lineWidth = 2;
    H.rrect(ctx, left, top, WIN_W, WIN_H, WIN_R);
    ctx.stroke();
    ctx.restore();

    H.rrect(ctx, left, top, WIN_W, WIN_H, WIN_R);
    ctx.clip();

    // Title bar with three dots.
    ctx.fillStyle = V.dark.bg;
    ctx.fillRect(left, top, WIN_W, BAR_H);
    ctx.fillStyle = V.dark.mute;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(left + 40 + i * 26, top + BAR_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Typed code, centred vertically in the body.
    const n = t >= RISE_B ? revealed(t) : 0;
    const codeTop = top + BAR_H + (WIN_H - BAR_H - CODE.length * LH) / 2;
    CODE.forEach((s, li) => {
      const vis = H.clamp(n - LINE_START[li], 0, s.length);
      if (vis > 0) drawLine(ctx, li, vis, left + PAD_X, codeTop + li * LH + BASE);
    });

    // Caret: 0.5 s on, 0.5 s off, on the scene clock.
    if (t >= RISE_B && (u % 1) < 0.5) {
      const { li, col } = locate(n);
      const x = left + PAD_X + H.measure(ctx, CODE[li].slice(0, col), MONO.size, MONO.weight, MONO.family);
      ctx.fillStyle = V.dark.text;
      ctx.fillRect(Math.round(x), codeTop + li * LH + BASE - 26, 3, 34);
    }
    ctx.restore();

    // Output chip: slides in from the right and lands on the grid at 18.0.
    const chipP = H.easeOutExpo(H.ramp(t, CHIP_IN, CHIP_IN + 0.5));
    if (chipP > 0) {
      const label = 'Summary ready in one pass.';
      const tw = H.measure(ctx, label, 40, 500, H.FONT.sans);
      const cw = tw + 96, chH = 84;
      const chX = cx - cw / 2 + (1 - chipP) * 120;
      const chY = top + WIN_H + 56;
      ctx.save();
      ctx.globalAlpha *= H.ramp(t, CHIP_IN, CHIP_IN + 0.15);
      ctx.fillStyle = V.light.bg;
      H.rrect(ctx, chX, chY, cw, chH, chH / 2);
      ctx.fill();
      H.text(ctx, label, chX + cw / 2, chY + chH / 2, {
        size: 40, weight: 500, family: H.FONT.sans, color: V.light.text, align: 'center', baseline: 'middle',
      });
      ctx.restore();
    }
  } });
})();
