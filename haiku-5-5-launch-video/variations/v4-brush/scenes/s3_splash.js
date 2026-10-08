// v4_s3_splash (10 to 15 s). The 10.0 pattern interrupt: a cinnabar splash hits from the centre at
// near full size, so the first frame at 10.0 already changes, then spreads. From 10.5 an ink flood
// fills the frame (full ink from 11.0). Bloom rings expand from the centre every 0.5 s on the ink.
// The whole scene fades to paper over 14.5 to 15.0.
// Uses window.V4B from s1 (index.html loads s1 first).
(function () {
  const B = window.V4B;
  const CX = H.W / 2, CY = H.H / 2;
  const SPLASH = B.blob(81, { amp: 0.22, spikes: 14, drops: 20 });  // unit radius, scaled per frame
  const FLOOD = B.blob(83, { amp: 0.12 });
  const RINGS = [B.ring(91), B.ring(92)];

  H.scene({ id: "v4_s3_splash", start: 10, end: 15, draw(ctx, t, local, dur) {
    if (t < 10 || t >= 15) return;
    const out = 1 - H.ramp(t, 14.5, 15.0);
    if (out <= 0) return;
    ctx.save();
    ctx.globalAlpha = out;
    ctx.fillStyle = V.light.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // 10.0: the splash. It starts at 230 px (not a point) and reaches 1000 px by 10.5.
    if (t < 11) {
      const rS = H.lerp(230, 1000, H.easeOutExpo(H.ramp(t, 10.0, 10.5)));
      ctx.save();
      ctx.translate(CX, CY);
      ctx.scale(rS, rS);
      ctx.fillStyle = V.accent;
      ctx.fill(SPLASH);
      ctx.restore();
    }

    // 10.5 to 11.0: the ink floods over the splash from the centre.
    if (t >= 10.5 && t < 11) {
      const rF = 1500 * H.easeOutCubic(H.ramp(t, 10.5, 11.0));
      ctx.save();
      ctx.translate(CX, CY);
      ctx.scale(rF, rF);
      ctx.fillStyle = V.dark.bg;
      ctx.fill(FLOOD);
      ctx.restore();
    }
    if (t >= 11) {
      ctx.fillStyle = V.dark.bg;
      ctx.fillRect(0, 0, H.W, H.H);
    }

    // Bloom rings: spawn on the 0.5 s grid from 11.0, each lasts 1.5 s and expands from the centre.
    // Cinnabar and paper alternate.
    for (let k = 0; k < 7; k++) {
      const tau = (t - (11.0 + 0.5 * k)) / 1.5;
      if (tau < 0 || tau >= 1) continue;
      const R = 1250 * H.easeOutCubic(tau);
      if (R < 1) continue;
      ctx.save();
      ctx.globalAlpha *= Math.pow(1 - tau, 1.2);
      ctx.translate(CX, CY);
      ctx.scale(R, R);
      ctx.fillStyle = k % 2 ? V.dark.text : V.accent;
      ctx.fill(RINGS[k % 2]);
      ctx.restore();
    }
    ctx.restore();
  } });
})();
