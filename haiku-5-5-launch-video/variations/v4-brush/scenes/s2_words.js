// v4_s2_words (5 to 10 s, light paper). The three poem lines are wiped in as ink brush bands, one
// every 1.0 s (5.0, 6.0, 7.0). Each band carries its line knocked out in paper colour, revealed by the
// same ragged brush front. At 8.0 a cinnabar underline draws in and at 9.0 it wipes back out.
// The scene is a hard cut at 10.0 (the pattern interrupt), so nothing is drawn from 10.0 on.
// Uses window.V4B from s1 (index.html loads s1 first).
(function () {
  const B = window.V4B;
  const SAFE = H.SAFE, U = (H.W - 2 * SAFE) / 7;
  const BAR_H = 150, TEXT_SIZE = 76;
  const ROW_Y = [420, 600, 780];
  const ROW_X = [
    [H.W / 2 - 2.5 * U, H.W / 2 + 2.5 * U],
    [SAFE, H.W - SAFE],
    [H.W / 2 - 2.5 * U, H.W / 2 + 2.5 * U],
  ];
  // Copy-bank lines, exactly as they appear in the copy bank.
  const POEM = ['Small model, big aim.', 'Fast replies, sharp reasoning.', 'Ready when you are.'];

  const BANDS = [
    B.stroke(ROW_X[0][0], ROW_Y[0], ROW_X[0][1], ROW_Y[0], { w: BAR_H, seed: 61, disp: 6, taper: 0.25, dry: 0.3 }),
    B.stroke(ROW_X[1][0], ROW_Y[1], ROW_X[1][1], ROW_Y[1], { w: BAR_H, seed: 62, disp: 6, taper: 0.25, dry: 0.3 }),
    B.stroke(ROW_X[2][0], ROW_Y[2], ROW_X[2][1], ROW_Y[2], { w: BAR_H, seed: 63, disp: 6, taper: 0.25, dry: 0.3 }),
  ];
  const UNDER = B.stroke(430, 902, 1490, 902, { w: 16, seed: 71, disp: 5, taper: 0.7, dry: 0.5 });

  // One band: the ink stroke, then its line in paper colour, both under the same brush front.
  function band(ctx, i, p) {
    if (p <= 0) return;
    const b = BANDS[i];
    ctx.save();
    ctx.translate(b.x0, b.y0);
    B.wipeClip(ctx, b, p);
    ctx.fillStyle = V.light.text;
    ctx.fill(b.path, 'evenodd');
    H.text(ctx, POEM[i], b.len / 2, 27, {
      size: TEXT_SIZE, weight: 600, family: H.FONT.sans, color: V.light.bg, align: 'center',
    });
    ctx.restore();
  }

  H.scene({ id: "v4_s2_words", start: 5, end: 10, draw(ctx, t, local, dur) {
    if (t < 5 || t >= 10) return;                          // hard cut at 10.0
    ctx.save();
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);
    for (let i = 0; i < 3; i++) band(ctx, i, H.easeOutCubic(H.ramp(t, 5 + i, 5.5 + i)));

    // 8.0: cinnabar underline draws in from the left; 9.0: it retracts to the right.
    const under = t < 9
      ? H.easeInOutCubic(H.ramp(t, 8.0, 8.45))
      : 1 - H.easeInCubic(H.ramp(t, 9.0, 9.4));
    B.paint(ctx, UNDER, under, V.accent, 1);
    ctx.restore();
  } });
})();
