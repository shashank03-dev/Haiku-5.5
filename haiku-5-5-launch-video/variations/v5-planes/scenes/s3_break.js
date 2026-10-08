// v5_s3_break: Parallax Planes, the break (10 to 15 s).
// 10.0 pattern interrupt: a full-frame amber flash, then the amber wipes off to the left
// (10.25 to 10.75). Nine cards fly in around the 5.5 seal, and the camera dollies through them.
(function () {
  const START = 10, END = 15;
  const F = 1000, CX = H.W / 2, CY = H.H / 2;
  const GW = 400, GH = 236, GAP = 120;           // card size and gap, world units
  // [column, row, label, enter time, alternate label flipped in at 13.0]
  const CELLS = [
    [0, 0, '5.5', 10.75, null],
    [-1, -1, 'Fast.', 11.25, null], [0, -1, 'Haiku', 11.25, null], [1, -1, 'Sharp.', 11.25, null],
    [-1, 0, 'Fast.', 12.25, 'Claude'], [1, 0, 'Sharp.', 12.25, null],
    [-1, 1, 'Everyday.', 11.75, null], [0, 1, 'Claude', 11.75, null], [1, 1, 'Haiku 5.5', 11.75, null],
  ];
  const N = CELLS.length;
  const DOLLY = [[10.75, 0], [12.0, 0], [13.5, 260], [15, 420]];   // camera push, into the cards
  const SWAY = [[10.75, 0], [12.5, 0], [13.75, 120], [15, -60]];   // camera drift, sideways
  const SEAL_ROLL = [[13.5, 0], [14.0, 0.12], [14.5, -0.1], [15, 0]];

  const zs = new Float64Array(N);
  const order = [];
  for (let i = 0; i < N; i++) order.push(i);

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

  // A card on its own plane. flipX squeezes it horizontally (text flip); seal = amber card.
  function card(ctx, sx, sy, s, roll, flipX, alpha, seal, label) {
    if (alpha <= 0.002) return;
    const w = GW, h = GH, r = 26;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(roll);
    ctx.scale(s * Math.max(flipX, 0.001), s);
    H.rrect(ctx, -w / 2, -h / 2, w, h, r);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = seal ? V.accent : V.dark.surface;
    ctx.fill();
    if (!seal) {
      ctx.lineWidth = 1.5 / s;
      ctx.strokeStyle = V.dark.mute;
      ctx.globalAlpha = alpha * 0.35;
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    H.text(ctx, label, 0, 0, {
      size: seal ? 150 : 66,
      weight: seal ? 600 : 500,
      color: seal ? V.dark.bg : V.dark.text,
      align: 'center',
      baseline: 'middle',
    });
    ctx.restore();
  }

  function draw(ctx, t) {
    if (t < START || t >= END) return;

    // 10.0 interrupt: the whole frame turns amber on this frame.
    if (t < 10.25) {
      ctx.fillStyle = V.accent;
      ctx.fillRect(0, 0, H.W, H.H);
      return;
    }
    ctx.fillStyle = V.dark.bg;
    ctx.fillRect(0, 0, H.W, H.H);

    // Amber wipe: the amber edge runs from the right edge to the left edge.
    const wipe = H.ramp(t, 10.25, 10.75);
    if (wipe < 1) {
      ctx.fillStyle = V.accent;
      ctx.fillRect(0, 0, H.W * (1 - H.easeInOutCubic(wipe)), H.H);
    }

    const fade = 1 - H.ramp(t, 14.8, 15.0);      // content dissolves into the next scene
    const dolly = keyed(t, DOLLY), camX = keyed(t, SWAY);
    const roll = keyed(t, SEAL_ROLL);
    const flipK = H.ramp(t, 13.0, 13.25);        // alternate label flips in on 13.0
    const flipX = Math.abs(Math.cos(Math.PI * flipK));

    for (let i = 0; i < N; i++) {
      const c = CELLS[i];
      const base = 1000 + 260 * (Math.abs(c[0]) + Math.abs(c[1])) / 2;  // centre nearest, corners farthest
      const e = H.easeOutCubic(H.ramp(t, c[3], c[3] + 0.5));          // fly in from far
      zs[i] = H.lerp(3200, base, e) - dolly;
    }
    order.sort((a, b) => zs[b] - zs[a]);         // far to near

    for (let k = 0; k < N; k++) {
      const i = order[k], c = CELLS[i];
      const z = zs[i], s = F / z;
      const alpha = H.ramp(t, c[3], c[3] + 0.2) * fade;
      const isSeal = i === 0;
      const alt = c[4] !== null && flipK >= 0.5;
      const label = alt ? c[4] : c[2];
      const sx = CX + (c[0] * (GW + GAP) - camX) * s;
      const sy = CY + c[1] * (GH + GAP) * s;
      const rr = isSeal ? roll : 0;
      const fx = c[4] !== null ? flipX : 1;
      card(ctx, sx, sy, s, rr, fx, alpha, isSeal, label);
    }
  }

  H.scene({ id: 'v5_s3_break', start: START, end: END, draw });
})();
