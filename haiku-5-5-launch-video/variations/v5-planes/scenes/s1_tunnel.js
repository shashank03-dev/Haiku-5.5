// v5_s1_tunnel: Parallax Planes, opening (0 to 5 s).
// A ring of cards whips past the camera. The 5.5 card lands in front at 1.0, the camera
// steadies by 2.0 and then makes short eased moves. The front card flips to "Haiku 5.5" at 2.5.
(function () {
  const START = 0, END = 5;
  const F = 1000;                              // focal length: sx = W/2 + (x - camX) * F / z
  const CX = H.W / 2, CY = H.H / 2;
  const TUNNEL_LEN = 3600, Z_NEAR = 170;       // depth band the tunnel wraps through
  const SPEED0 = 4200, TAU = 0.7;              // entry speed (units/s) and how fast it settles
  const N = 28;                                // tunnel cards
  const TW = 340, TH = 200, TR = 22, TLABEL = 56;
  const LABELS = ['Fast.', 'Sharp.', 'Everyday.', 'Haiku', 'Claude', '5.5'];
  const FW = 600, FH = 360, FR = 30;           // front card
  const FRONT = N;                             // slot of the front card in the depth arrays
  const CAM_X = [[2.0, 0], [3.0, 150], [4.0, -110], [5.0, 60]];
  const CAM_Y = [[2.0, 0], [3.5, -50], [5.0, 25]];

  const cards = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996323 + 0.3;            // golden-angle spacing round the tunnel
    const r = 330 + H.hash(i + 1) * 380;
    cards.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.62,
      zb: H.hash(i + 17) * TUNNEL_LEN,
      roll: (H.hash(i + 41) - 0.5) * 0.16,
      label: LABELS[i % LABELS.length],
    });
  }
  const zs = new Float64Array(N + 1);
  const order = [];
  for (let i = 0; i <= N; i++) order.push(i);

  // Forward distance: fast at 0, settling to almost still by 2.0.
  const travel = t => SPEED0 * TAU * (1 - Math.exp(-t / TAU));

  // Eased keyframes: hold the first value, ease between keys, hold the last.
  function keyed(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        return H.lerp(a[1], b[1], H.easeInOutCubic(H.ramp(t, a[0], b[0])));
      }
    }
    return keys[keys.length - 1][1];
  }

  // Front card: flies in from up-right and lands centred at 1.0 (depth 1500 -> 620).
  // It is glued to the camera axis, so it stays centred while the tunnel moves past it.
  function front(t) {
    const e = H.easeOutCubic(H.ramp(t, 0.5, 1.0));
    return {
      z: H.lerp(1500, 620, e),
      ox: 760 * (1 - e),
      oy: -300 * (1 - e),
      alpha: H.ramp(t, 0.4, 0.6),
    };
  }

  // A flat card on its own plane. The label is drawn in the same transform, so it stays sharp.
  function card(ctx, sx, sy, s, w, h, r, roll, alpha, fill, label, size, color) {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(roll);
    ctx.scale(s, s);
    H.rrect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.5 / s;
    ctx.strokeStyle = V.dark.mute;
    ctx.globalAlpha = alpha * 0.35;
    ctx.stroke();
    ctx.globalAlpha = alpha;
    if (label) H.text(ctx, label, 0, 0, { size, weight: 500, color, align: 'center', baseline: 'middle' });
    ctx.restore();
  }

  function drawFront(ctx, t, fade) {
    const f = front(t);
    if (f.alpha <= 0.002) return;
    const s = F / f.z;
    const k = H.ramp(t, 2.5, 2.75);                 // flip: "5.5" -> "Haiku 5.5"
    const squeeze = Math.max(Math.abs(Math.cos(Math.PI * k)), 0.001);
    ctx.save();
    ctx.translate(CX + f.ox * s, CY + f.oy * s);
    ctx.scale(s * squeeze, s);
    H.rrect(ctx, -FW / 2, -FH / 2, FW, FH, FR);
    ctx.globalAlpha = f.alpha * fade;
    ctx.fillStyle = V.dark.surface;
    ctx.fill();
    ctx.lineWidth = 1.5 / s;
    ctx.strokeStyle = V.dark.mute;
    ctx.globalAlpha = f.alpha * fade * 0.35;
    ctx.stroke();
    ctx.globalAlpha = f.alpha * fade;
    if (k < 0.5) {
      H.text(ctx, '5.5', 0, 0, { size: 230, weight: 600, color: V.accent, align: 'center', baseline: 'middle' });
    } else {
      const w1 = H.measure(ctx, 'Haiku ', 100, 500);
      const w2 = H.measure(ctx, '5.5', 100, 600);
      const x0 = -(w1 + w2) / 2;
      H.text(ctx, 'Haiku ', x0, 0, { size: 100, weight: 500, color: V.dark.text, baseline: 'middle' });
      H.text(ctx, '5.5', x0 + w1, 0, { size: 100, weight: 600, color: V.accent, baseline: 'middle' });
    }
    ctx.restore();
  }

  function draw(ctx, t) {
    if (t < START || t >= END) return;
    const fade = 1 - H.ramp(t, 4.8, 5.0);          // content dissolves into the cut at 5.0
    ctx.fillStyle = V.dark.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    const camX = keyed(t, CAM_X), camY = keyed(t, CAM_Y);
    const D = travel(t);
    for (let i = 0; i < N; i++) {
      let m = (cards[i].zb - D) % TUNNEL_LEN;
      if (m < 0) m += TUNNEL_LEN;
      zs[i] = Z_NEAR + m;
    }
    zs[FRONT] = front(t).z;
    order.sort((a, b) => zs[b] - zs[a]);           // far to near

    for (let k = 0; k <= N; k++) {
      const i = order[k];
      if (i === FRONT) { drawFront(ctx, t, fade); continue; }
      const c = cards[i], z = zs[i], s = F / z;
      // fade in out of the far fog and out as a card passes the lens
      const alpha = H.ramp(z, Z_NEAR, 560) * (1 - H.ramp(z, 2000, 3700)) * fade;
      card(ctx, CX + (c.x - camX) * s, CY + (c.y - camY) * s, s, TW, TH, TR, c.roll,
        alpha, V.dark.surface, c.label, TLABEL, V.dark.text);
    }
  }

  H.scene({ id: 'v5_s1_tunnel', start: START, end: END, draw });
})();
