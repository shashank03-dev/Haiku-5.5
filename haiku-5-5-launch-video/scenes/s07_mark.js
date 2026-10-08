// s07_mark (23.0 to 26.5, paper): the 5:7:5 bar mark and the vermilion seal, then the lockup
// with the "Haiku 5.5" wordmark and the mono caption. Helpers are prefixed s07_ because every
// scene file shares one global scope.

// Layout constants (px). The mark is centred on x = 960, then moves to x = 700 for the lockup.
const S07_LAYOUT = {
  YA: 510,        // mark centre y; the lockup group is centred on the canvas
  BAR_W: [260, 364, 260], // 5u, 7u, 5u with u = 52
  BAR_H: 56,
  BAR_PITCH: 84,  // 56 px bar + 28 px gap
  BAR_R: 14,
  BAR_SLIDE: 300, // bars travel in from 300 px to the left
  SEAL: 120,
  SEAL_DX: 34,    // seal centre offset from the bottom-right corner of the bottom bar
  SEAL_DY: 34,
  WORD_GAP: 64,   // mark right edge to wordmark ink left
  CAP_GAP: 84,    // wordmark baseline to caption baseline
};

// Offscreen seal, rasterised once at 2x. Built on first draw so the Geist fonts are ready.
let s07_sealCanvas = null;
function s07_seal() {
  if (s07_sealCanvas) return s07_sealCanvas;
  const L = S07_LAYOUT.SEAL, S = 2;
  const c = document.createElement('canvas');
  c.width = c.height = L * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  H.rrect(g, 0, 0, L, L, 12);
  g.fillStyle = H.COLOR.seal;
  g.fill();
  // Subtle ink texture, inside the seal only, under 12 % opacity.
  g.save();
  H.rrect(g, 0, 0, L, L, 12);
  g.clip();
  const rnd = H.prng(507);
  g.fillStyle = H.COLOR.ink;
  for (let i = 0; i < 300; i++) {
    const x = rnd() * L, y = rnd() * L, r = 0.35 + rnd() * 1.2;
    g.globalAlpha = 0.02 + rnd() * 0.10;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // "5.5" knocked out in paper colour, ink-centred on the seal.
  g.save();
  g.font = H.font(54, 600);
  g.fillStyle = H.COLOR.paper;
  g.textBaseline = 'alphabetic';
  const m = g.measureText('5.5');
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const x0 = L / 2 - inkW / 2 + m.actualBoundingBoxLeft;
  const base = L / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  g.fillText('5.5', x0, base);
  g.restore();
  s07_sealCanvas = c;
  return c;
}

// Ink metrics of a string: l = ink left offset from the origin, r = ink right offset, asc = ink top above baseline.
function s07_metrics(ctx, str, size, weight, family, tracking) {
  ctx.save();
  ctx.font = H.font(size, weight, family);
  if ('letterSpacing' in ctx) ctx.letterSpacing = tracking + 'px';
  const m = ctx.measureText(str);
  ctx.restore();
  return { w: m.width, l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent };
}

H.scene({ id: "s07_mark", start: 23, end: 26.5, draw(ctx, t, local, dur) {
  const L = S07_LAYOUT;
  const YA = L.YA;
  const CX0 = H.W / 2;   // 960: mark centre at rest
  const CX1 = 700;       // mark centre in the lockup

  // Cover the ink of s06 while it fades out, so the scene starts on paper.
  ctx.save();
  ctx.globalAlpha = H.ramp(t, 22.5, 23.0);
  ctx.fillStyle = H.COLOR.paper;
  ctx.fillRect(0, 0, H.W, H.H);
  ctx.restore();

  // Everything fades out together between 26.2 and 26.5.
  const fo = 1 - H.ramp(t, 26.2, 26.5);
  if (fo <= 0) return;

  // Mark centre x: rest at 960 until WORDMARK (24.5), then ease to 700 over 0.8 s.
  const mx = H.lerp(CX0, CX1, H.easeInOutCubic(H.ramp(t, 24.5, 25.3)));

  // Bars: slide in from the left at 23.00, 23.25, 23.50 (0.6 s, easeOutExpo).
  const barCues = [0, 0.25, 0.5];
  for (let i = 0; i < 3; i++) {
    const cue = barCues[i];
    const a = H.ramp(local, cue, cue + 0.15);
    if (a <= 0) continue;
    const e = H.easeOutExpo(H.ramp(local, cue, cue + 0.6));
    const w = L.BAR_W[i];
    const x = mx - w / 2 - (1 - e) * L.BAR_SLIDE;
    const y = YA - (L.BAR_PITCH + L.BAR_H) + i * L.BAR_PITCH;
    ctx.save();
    ctx.globalAlpha = a * fo;
    ctx.fillStyle = H.COLOR.ink;
    H.rrect(ctx, x, y, w, L.BAR_H, L.BAR_R);
    ctx.fill();
    ctx.restore();
  }

  // Seal: stamps in at 24.0 (same motion as s01), at the bottom-right of the mark.
  const sa = H.ramp(t, 24.0, 24.15);
  if (sa > 0) {
    const e = H.easeOutSoft(H.ramp(t, 24.0, 24.35));
    const sc = H.lerp(1.35, 1.0, e);
    const rot = H.lerp(-4, 0, e) * Math.PI / 180;
    const sx = mx + L.BAR_W[2] / 2 + L.SEAL_DX;
    const sy = YA + (L.BAR_PITCH + L.BAR_H) + L.SEAL_DY;
    ctx.save();
    ctx.globalAlpha = sa * fo;
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.drawImage(s07_seal(), -L.SEAL / 2, -L.SEAL / 2, L.SEAL, L.SEAL);
    ctx.restore();
  }

  // Wordmark: slides in from the right edge of the frame, starting 24.7 (after the mark has
  // cleared its path), 0.9 s, easeOutExpo. Its ink left edge ends GAP px right of the mark.
  const WM = 200, WT = -6, WW = 600;
  const cap = s07_metrics(ctx, 'H', WM, WW, H.FONT.sans, WT);
  const wordFinalInkLeft = CX1 + L.BAR_W[1] / 2 + L.WORD_GAP;
  const wp = H.ramp(t, 24.7, 25.6);
  const inkLeft = wordFinalInkLeft + (H.W - wordFinalInkLeft) * (1 - H.easeOutExpo(wp));
  const originX = inkLeft - cap.l;
  const baseY = YA + cap.asc / 2;   // cap height centred on the mark's centre line
  if (wp > 0) {
    const wA = s07_metrics(ctx, 'Haiku ', WM, WW, H.FONT.sans, WT).w;
    H.text(ctx, 'Haiku ', originX, baseY, { size: WM, weight: WW, color: H.COLOR.ink, tracking: WT, alpha: fo });
    H.text(ctx, '5.5', originX + wA, baseY, { size: WM, weight: WW, color: H.COLOR.seal, tracking: WT, alpha: fo });
  }

  // Caption: mono, mute, aligned to the wordmark's ink left edge; mask-rise from 25.2.
  const CS = 32, CT = 0.08 * CS;
  const capBase = baseY + L.CAP_GAP;
  const ce = H.easeOutExpo(H.ramp(t, 25.2, 25.9));
  const cdy = (1 - ce) * 40;
  const cl = s07_metrics(ctx, 'c', CS, 500, H.FONT.mono, CT).l;
  ctx.save();
  ctx.beginPath();
  ctx.rect(inkLeft - 20, capBase - 34, 900, 44);
  ctx.clip();
  H.text(ctx, 'claude-haiku-5-5', inkLeft - cl, capBase + cdy, {
    size: CS, weight: 500, family: H.FONT.mono, color: H.COLOR.mute, tracking: CT,
    alpha: H.ramp(t, 25.2, 25.5) * fo,
  });
  ctx.restore();
} });
