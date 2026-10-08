// s08_outro (26.5 to 30.0), ink.
// "Meet Haiku 5.5." mask-rises word by word, the mono caption fades in, and the hanko stamps
// bottom-right (same hanko as s01). Everything then fades to plain ink from 29.4 to 30.0.
// Helpers are prefixed s08 because all scene files share one global script scope.

// Cached once, on the first draw (fonts are loaded by then, which they are not at file load).
let s08Cache = null;

// Hanko: the same sprite recipe as s01 (220 px, radius 26, 1600 speckles from H.prng(20255),
// "5.5" with a 150 px ink width). Here the carved "5.5" is filled paper rather than knocked out,
// because this scene is on ink; on screen it reads exactly like s01 on paper.
const S08_SEAL = 220;
const S08_SEAL_R = 26;
const S08_GLYPH_INK_W = 150;

function s08MakeHanko() {
  const SEAL = S08_SEAL;
  const RS = 2; // rasterised at 2x for crisp edges when scaled and rotated
  const c = document.createElement('canvas');
  c.width = c.height = SEAL * RS;
  const g = c.getContext('2d');
  g.scale(RS, RS);

  // Body: vermilion rounded square.
  g.fillStyle = H.COLOR.seal;
  H.rrect(g, 0, 0, SEAL, SEAL, S08_SEAL_R);
  g.fill();

  // Ink texture: paper-coloured specks inside the body only, each under 12% opacity.
  const rnd = H.prng(20255);
  g.save();
  H.rrect(g, 0, 0, SEAL, SEAL, S08_SEAL_R);
  g.clip();
  g.fillStyle = H.COLOR.paper;
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * SEAL, y = rnd() * SEAL;
    const r = 0.3 + Math.pow(rnd(), 4) * 1.3;
    g.globalAlpha = 0.02 + rnd() * 0.10;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Carved "5.5": size solved from the measured ink width, box centred on the seal.
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.font = H.font(100, 600);
  const m0 = g.measureText('5.5');
  const size = 100 * S08_GLYPH_INK_W / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight);
  g.font = H.font(size, 600);
  const m = g.measureText('5.5');
  const x = SEAL / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
  const y = SEAL / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  g.globalAlpha = 1;
  g.fillStyle = H.COLOR.paper;
  g.fillText('5.5', x, y);
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
  const S = S08_SEAL;            // hanko size, same as s01
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
    hanko: s08MakeHanko(),
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
