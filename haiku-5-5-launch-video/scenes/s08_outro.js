// s08_outro (26.5 to 30.0), ink.
// "Meet Haiku 5.5." mask-rises word by word, the mono caption fades in, and the hanko stamps
// bottom-right (same hanko as s01). Everything then fades to plain ink from 29.4 to 30.0.
// Helpers are prefixed s08 because all scene files share one global script scope.

// Cached once, on the first draw (fonts are loaded by then, which they are not at file load).
let s08Cache = null;

// Hanko, the same design as s01: a rounded vermilion square, a paper-coloured "5.5" on it,
// and paper speckles at 3% to 12% opacity, clipped to the seal. Rasterised at 2x.
function s08MakeHanko(ctx, S) {
  const R = 2;
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(S * R);
  const g = c.getContext('2d');
  g.scale(R, R);

  // Body.
  g.fillStyle = H.COLOR.seal;
  H.rrect(g, 0, 0, S, S, S * 0.12);
  g.fill();

  // Ink texture: speckles only where the seal already is (source-atop).
  const rnd = H.prng(0x5508);
  const n = Math.round((S * S) / 40);
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = H.COLOR.paper;
  for (let i = 0; i < n; i++) {
    const x = rnd() * S, y = rnd() * S;
    const r = 0.25 + rnd() * rnd() * 1.6;
    g.globalAlpha = 0.03 + rnd() * 0.09; // never above 0.12
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Carved "5.5": sized to about 62% of the seal width, optically centred.
  const w100 = H.measure(g, '5.5', 100, 600, H.FONT.sans, 0);
  const gs = Math.min(0.46 * S, (0.62 * S) / (w100 / 100));
  H.text(g, '5.5', S / 2, S / 2 + 0.355 * gs, {
    size: gs, weight: 600, family: H.FONT.sans, color: H.COLOR.paper,
    align: 'center', baseline: 'alphabetic', tracking: -0.02 * gs,
  });
  return c;
}

function s08Layout(ctx) {
  if (s08Cache) return s08Cache;
  const FULL = 'Meet Haiku 5.5.';
  const track = sz => -0.03 * sz;
  // Visual width: measureText includes the trailing tracking, so remove it.
  const vis = sz => H.measure(ctx, FULL, sz, 600, H.FONT.sans, track(sz)) - track(sz);
  const maxW = H.W - 2 * H.SAFE;
  let hs = 200;
  if (vis(hs) > maxW) hs = Math.floor(hs * maxW / vis(hs));
  const tr = track(hs);
  const m = s => H.measure(ctx, s, hs, 600, H.FONT.sans, tr);

  const left = H.W / 2 - vis(hs) / 2;
  const xHaiku = left + m('Meet ');
  const xFive = left + m('Meet Haiku ');
  const xDot = left + m('Meet Haiku 5.5');

  const base = 470 + 0.355 * hs; // caps centred on y 470
  const S = 200;                 // hanko size
  s08Cache = {
    hs, base, drop: 0.95 * hs, clipTop: base - hs, clipH: 1.14 * hs,
    words: [
      { cue: 26.6, parts: [{ t: 'Meet', x: left, c: H.COLOR.paper }] },
      { cue: 26.66, parts: [{ t: 'Haiku', x: xHaiku, c: H.COLOR.paper }] },
      { cue: 26.72, parts: [{ t: '5.5', x: xFive, c: H.COLOR.seal }, { t: '.', x: xDot, c: H.COLOR.paper }] },
    ],
    capBase: base + 100,
    S,
    sealX: H.W - H.SAFE - S / 2,
    sealY: H.H - H.SAFE - S / 2,
    hanko: s08MakeHanko(ctx, S),
  };
  return s08Cache;
}

H.scene({ id: "s08_outro", start: 26.5, end: 30, draw(ctx, t, local, dur) {
  const C = H.COLOR, F = H.FONT, E = H.easeOutExpo;

  // Ground: ink cross-fades in over the end of s07 (paper), then stays ink.
  const ground = H.ramp(t, 26.2, 26.5);
  if (ground <= 0) return;
  ctx.save();
  ctx.globalAlpha = ground;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, H.W, H.H);
  ctx.restore();

  const L = s08Layout(ctx);

  // Everything fades to ink from 29.4 to 30.0 (ease in-out, so the last frame is plain ink).
  const keep = 1 - H.easeInOutCubic(H.ramp(t, 29.4, 30.0));
  if (keep <= 0) return;

  // Headline: word mask-rise. The clip band sits on the baseline, so each word slides up out of it.
  for (const w of L.words) {
    const p = H.ramp(t, w.cue, w.cue + 0.9);
    if (p <= 0) continue;
    const y = L.base + L.drop * (1 - E(p));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.clipTop, H.W, L.clipH);
    ctx.clip();
    for (const part of w.parts) {
      H.text(ctx, part.t, part.x, y, {
        size: L.hs, weight: 600, family: F.sans, color: part.c,
        tracking: -0.03 * L.hs, alpha: keep,
      });
    }
    ctx.restore();
  }

  // Caption: mono, mute, fades in at 27.6 with a small rise.
  const capP = H.ramp(t, 27.6, 28.3);
  if (capP > 0) {
    const ce = E(capP);
    H.text(ctx, 'claude-haiku-5-5', H.W / 2, L.capBase + 14 * (1 - ce), {
      size: 34, weight: 500, family: F.mono, color: C.mute, align: 'center',
      alpha: ce * keep, tracking: 34 * 0.08,
    });
  }

  // Hanko: stamps in bottom-right at 27.0, scale 1.35 to 1.0 (easeOutSoft), fixed -3 degrees.
  const sp = H.ramp(t, 27.0, 27.35);
  const sa = H.ramp(t, 27.0, 27.15) * keep;
  if (sa > 0) {
    const sc = H.lerp(1.35, 1.0, H.easeOutSoft(sp));
    ctx.save();
    ctx.globalAlpha *= sa;
    ctx.translate(L.sealX, L.sealY);
    ctx.rotate(-3 * Math.PI / 180);
    ctx.scale(sc, sc);
    ctx.drawImage(L.hanko, -L.S / 2, -L.S / 2, L.S, L.S);
    ctx.restore();
  }
} });
