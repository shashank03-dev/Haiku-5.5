// v4_s6_end (25.0 to 30.0). The light ground is painted back in from 25.0 behind a brush front.
// "Meet Haiku 5.5." wipes in at 25.5 (the 5.5 in cinnabar), an ink underline is painted at 26.0, and
// at 27.0 the caption wipes in and the seal stamps bottom-right, with an ink bleed that spreads and
// fades by 29.0. The last frame holds on the light ground: readable, with nothing left to change.
const v4s6 = (function () {
  const STEPS = 120, MID = H.W / 2;
  const SEAL = 220, SEAL_R = 26, GLYPH = '5.5', GLYPH_INK_W = 150;
  const SEAL_X = 1640, SEAL_Y = 800;
  const HEAD_BASE = 470, CAP_BASE = 640, HEAD_MAX_W = 1500;

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

  // Path2D of the first p (0 to 1) of an outline, so a stroke is painted along its length.
  function strokePath(O, p) {
    const n = Math.max(1, Math.round(STEPS * H.clamp(p)));
    const P = new Path2D();
    P.moveTo(O.A[0][0], O.A[0][1]);
    for (let i = 1; i <= n; i++) P.lineTo(O.A[i][0], O.A[i][1]);
    for (let i = n; i >= 0; i--) P.lineTo(O.B[i][0], O.B[i][1]);
    P.closePath();
    return P;
  }

  // Brush front: clips to everything left of a front that travels x0 to x1. The edge is jagged by noise.
  function wipe(ctx, x0, x1, y0, y1, p, jag) {
    const front = H.lerp(x0, x1, p), n = 14;
    ctx.beginPath();
    ctx.moveTo(-400, y0);
    for (let j = 0; j <= n; j++) ctx.lineTo(front + 16 * jag(j * 0.8), H.lerp(y0, y1, j / n));
    ctx.lineTo(-400, y1);
    ctx.closePath();
    ctx.clip();
  }

  // Text on its own canvas, so it can be wiped. runs: [{ t, color }], placed left to right.
  function makeText(runs, size, weight, family, track) {
    const mg = document.createElement('canvas').getContext('2d');
    mg.font = H.font(size, weight, family);
    if ('letterSpacing' in mg) mg.letterSpacing = track + 'px';
    let w = 0;
    for (const r of runs) w += mg.measureText(r.t).width;
    const asc = Math.ceil(size * 0.95), desc = Math.ceil(size * 0.3);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w) + 40; c.height = asc + desc;
    const g = c.getContext('2d');
    g.font = mg.font;
    if ('letterSpacing' in g) g.letterSpacing = track + 'px';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    let x = 20;
    for (const r of runs) {
      g.fillStyle = r.color;
      g.fillText(r.t, x, asc);
      x += g.measureText(r.t).width;
    }
    return { c, w: Math.ceil(w), asc, desc };
  }

  // Seal sprite: the s01 recipe, built once (after Geist has loaded). Speckles use s01's seed.
  let seal = null, bleed = null, head = null, caption = null;
  function buildSeal() {
    const rnd = H.prng(20255);
    const S = 2; // rasterised at 2x, as in s01
    const c = document.createElement('canvas');
    c.width = c.height = SEAL * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    g.fillStyle = V.accent;
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.fill();
    g.save();
    H.rrect(g, 0, 0, SEAL, SEAL, SEAL_R);
    g.clip();
    g.fillStyle = V.light.bg;
    for (let i = 0; i < 1600; i++) {
      const x = rnd() * SEAL, y = rnd() * SEAL;
      const r = 0.3 + Math.pow(rnd(), 4) * 1.3;
      g.globalAlpha = 0.02 + rnd() * 0.10;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = H.font(100, 600);
    const m0 = g.measureText(GLYPH);
    const size = 100 * GLYPH_INK_W / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight);
    g.font = H.font(size, 600);
    const m = g.measureText(GLYPH);
    const x = SEAL / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const y = SEAL / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    g.fillText(GLYPH, x, y);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // Ink bleed: a soft ring around the seal edge. Its inner edge is exactly the seal, so the ring
  // never tints the knocked-out "5.5"; only its outer edge spreads.
  function buildBleed() {
    const P = 64, Z = SEAL + 2 * P;
    const c = document.createElement('canvas');
    c.width = c.height = Z;
    const g = c.getContext('2d');
    const wob = noise(777), path = new Path2D(), R = SEAL / 2 + 12, M = 180;
    for (let i = 0; i < M; i++) {
      const th = i / M * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      const rr = R * (1 + 0.06 * wob(i * 0.11));
      const x = Z / 2 + rr * Math.sign(cs) * Math.pow(Math.abs(cs), 0.3);
      const y = Z / 2 + rr * Math.sign(sn) * Math.pow(Math.abs(sn), 0.3);
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
    const o = P, s = SEAL, r = SEAL_R; // inner hole: the seal's rounded square
    path.moveTo(o + r, o);
    path.arcTo(o + s, o, o + s, o + s, r);
    path.arcTo(o + s, o + s, o, o + s, r);
    path.arcTo(o, o + s, o, o, r);
    path.arcTo(o, o, o + s, o, r);
    path.closePath();
    g.filter = 'blur(4px)';
    g.fillStyle = V.accent;
    g.fill(path, 'evenodd');
    return c;
  }

  // Seal centred on (x, y), with scale, rotation (radians) and opacity.
  function drawSeal(ctx, x, y, scale, rot, alpha) {
    if (!seal) seal = buildSeal();
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(seal, -SEAL / 2, -SEAL / 2, SEAL, SEAL);
    ctx.restore();
  }

  // Headline: "Meet Haiku 5.5." with the 5.5 in cinnabar. Built on first draw; fitted to HEAD_MAX_W.
  function buildHead() {
    const runs = [{ t: 'Meet Haiku ', color: V.light.text }, { t: '5.5', color: V.accent }, { t: '.', color: V.light.text }];
    let h = makeText(runs, 190, 600, H.FONT.sans, -0.03 * 190);
    if (h.w > HEAD_MAX_W) h = makeText(runs, 190 * HEAD_MAX_W / h.w, 600, H.FONT.sans, -0.03 * 190 * HEAD_MAX_W / h.w);
    return h;
  }

  const JAG = noise(6006);
  const UNDER = outline({ seed: 611, x0: 520, x1: 1400, yc: 520, slope: 0, amp: 3, freq: 2, w: 12, inS: 0.1, outS: 0.22 });

  function paint(ctx, O, p, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(strokePath(O, p));
    ctx.restore();
  }

  return {
    JAG, UNDER, HEAD_BASE, CAP_BASE, SEAL_X, SEAL_Y, SEAL, paint, wipe, drawSeal,
    headSprite: () => (head || (head = buildHead())),
    captionSprite: () => (caption || (caption = makeText([{ t: 'claude-haiku-5-5', color: V.light.mute }], 38, 500, H.FONT.mono, 1.5))),
    bleedSprite: () => (bleed || (bleed = buildBleed())),
  };
})();

H.scene({ id: "v4_s6_end", start: 25, end: 30, draw(ctx, t, local, dur) {
  if (t < 25.0) return;
  const S = v4s6;

  // 25.0 to 25.5: the light ground is painted back in behind a brush front.
  const gp = H.easeOutCubic(H.ramp(t, 25.0, 25.5));
  if (gp > 0) {
    ctx.save();
    S.wipe(ctx, -200, 2120, -40, H.H + 40, gp, S.JAG);
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(-40, -40, H.W + 80, H.H + 80);
    ctx.restore();
  }

  // Headline wipes in from 25.5 to 26.0.
  const hp = H.easeOutCubic(H.ramp(t, 25.5, 26.0));
  if (hp > 0) {
    const h = S.headSprite();
    const L = (H.W - h.w) / 2;
    ctx.save();
    S.wipe(ctx, L - 40, L + h.w + 40, S.HEAD_BASE - h.asc - 4, S.HEAD_BASE + h.desc + 4, hp, S.JAG);
    ctx.drawImage(h.c, L - 20, S.HEAD_BASE - h.asc);
    ctx.restore();
  }

  // Ink underline painted from 26.0 to 26.5.
  const up = H.easeOutCubic(H.ramp(t, 26.0, 26.5));
  if (up > 0) S.paint(ctx, S.UNDER, up, V.light.text, 1);

  // Caption wipes in at 27.0 (the cue shared with the seal stamp).
  const cp = H.easeOutCubic(H.ramp(t, 27.0, 27.5));
  if (cp > 0) {
    const k = S.captionSprite();
    const L = (H.W - k.w) / 2;
    ctx.save();
    S.wipe(ctx, L - 40, L + k.w + 40, S.CAP_BASE - k.asc - 4, S.CAP_BASE + k.desc + 4, cp, S.JAG);
    ctx.drawImage(k.c, L - 20, S.CAP_BASE - k.asc);
    ctx.restore();
  }

  // Ink bleed: from the impact at 27.35, spreads slightly and fades by 29.0. Drawn under the seal.
  const bleedA = 0.45 * H.ramp(t, 27.0, 27.35) * (1 - H.ramp(t, 27.35, 29.0));
  if (bleedA > 0) {
    const b = S.bleedSprite();
    const Z = b.width * (1 + 0.06 * H.easeOutCubic(H.ramp(t, 27.35, 29.0)));
    ctx.save();
    ctx.globalAlpha = bleedA;
    ctx.drawImage(b, S.SEAL_X - Z / 2, S.SEAL_Y - Z / 2, Z, Z);
    ctx.restore();
  }

  // Seal stamp bottom-right at 27.0: scale 1.35 to 1.0, rotation -3 to 0 degrees, opacity over 0.15 s.
  const a = H.ramp(t, 27.0, 27.15);
  if (a > 0) {
    const settle = H.easeOutSoft(H.ramp(t, 27.0, 27.35));
    S.drawSeal(ctx, S.SEAL_X, S.SEAL_Y, H.lerp(1.35, 1.0, settle), H.lerp(-3, 0, settle) * Math.PI / 180, a);
  }
} });
