// s06_promises (19.0 to 23.0, ink): "Three things, done well." over three coded icons.
// Icons are Path2D outlines in local coordinates (origin at the icon centre, 160 px box, 8 px paper
// strokes, round caps). Each is drawn on with stroke-dash: setLineDash([L, L]) and lineDashOffset = L * (1 - p).
const s06 = (function () {
  const TAU = Math.PI * 2;
  const STROKE = 8;
  const PAPER = H.COLOR.paper;
  const SEAL = H.COLOR.seal;

  // ---- outlines, built once at load (no fonts needed) ----
  function arc(cx, cy, r) { // full circle, starts at 12 o'clock and runs clockwise
    const p = new Path2D();
    p.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU);
    return { path: p, len: TAU * r };
  }
  function seg(x0, y0, x1, y1) {
    const p = new Path2D();
    p.moveTo(x0, y0);
    p.lineTo(x1, y1);
    return { path: p, len: Math.hypot(x1 - x0, y1 - y0) };
  }
  function poly(pts) { // closed polyline, length summed segment by segment
    const p = new Path2D();
    let len = 0;
    pts.forEach(([x, y], i) => {
      if (i === 0) p.moveTo(x, y);
      else { p.lineTo(x, y); len += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]); }
    });
    p.closePath();
    const last = pts[pts.length - 1];
    len += Math.hypot(pts[0][0] - last[0], pts[0][1] - last[1]);
    return { path: p, len };
  }

  // Stopwatch: ring centred 8 px low, crown tick on top, needle sweeps 0 to 280 deg.
  const SW_CY = 8, SW_R = 64, SW_NEEDLE = 44;
  const stopwatch = {
    ring: arc(0, SW_CY, SW_R),
    crown: seg(0, SW_CY - SW_R, 0, SW_CY - SW_R - 16),
  };
  // Target: two stroked rings and the innermost ring replaced by a seal-colour disc.
  const target = { outer: arc(0, 0, 68), middle: arc(0, 0, 40), disc: 16 };
  // Endless loop: lemniscate of Gerono, x = A cos t, y = (A/2) sin 2t (a figure eight, 2:1).
  const LOOP_A = 70, LOOP_N = 720;
  const loopPts = [];
  for (let i = 0; i < LOOP_N; i++) {
    const t = (i / LOOP_N) * TAU;
    loopPts.push([LOOP_A * Math.cos(t), (LOOP_A / 2) * Math.sin(2 * t)]);
  }
  const loop = poly(loopPts);

  // Stroke-dash draw-on: p in 0..1 is the visible share of the outline.
  function dashed(ctx, o, p) {
    if (p <= 0) return;
    if (p >= 1) ctx.setLineDash([]);
    else { ctx.setLineDash([o.len, o.len]); ctx.lineDashOffset = o.len * (1 - p); }
    ctx.stroke(o.path);
  }

  function drawStopwatch(ctx, lt) {
    dashed(ctx, stopwatch.ring, H.easeOutExpo(H.ramp(lt, 0, 0.6)));
    dashed(ctx, stopwatch.crown, H.easeOutExpo(H.ramp(lt, 0.5, 0.9)));
    const grow = H.easeOutExpo(H.ramp(lt, 0, 0.3));
    if (grow <= 0) return;
    const angle = H.easeInOutCubic(H.ramp(lt, 0.1, 1.4)) * 280 * Math.PI / 180;
    const len = SW_NEEDLE * grow;
    ctx.beginPath();
    ctx.moveTo(0, SW_CY);
    ctx.lineTo(len * Math.sin(angle), SW_CY - len * Math.cos(angle));
    ctx.stroke();
  }

  function drawTarget(ctx, lt) {
    dashed(ctx, target.outer, H.easeOutExpo(H.ramp(lt, 0, 0.7)));
    dashed(ctx, target.middle, H.easeOutExpo(H.ramp(lt, 0.2, 0.9)));
    const pop = H.easeOutSoft(H.ramp(lt, 0.7, 1.1));
    if (pop <= 0) return;
    ctx.fillStyle = SEAL;
    ctx.beginPath();
    ctx.arc(0, 0, target.disc * pop, 0, TAU);
    ctx.fill();
  }

  function drawLoop(ctx, lt) {
    dashed(ctx, loop, H.easeOutExpo(H.ramp(lt, 0, 0.9)));
  }

  // Mask-rise: the line slides up out of a clip box whose bottom sits just below the descenders.
  function maskText(ctx, str, x, y, size, weight, tracking, color, e) {
    if (e <= 0) return;
    const w = H.measure(ctx, str, size, weight, H.FONT.sans, tracking);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 12, y - size * 1.05, w + 24, size * 1.42);
    ctx.clip();
    ctx.font = H.font(size, weight, H.FONT.sans);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = tracking + 'px';
    ctx.fillText(str, x, y + (1 - e) * size * 1.25);
    ctx.restore();
  }

  // ---- layout (canvas px) ----
  const HEAD = ['Three', 'things,', 'done', 'well.'];
  const HEAD_SIZE = 104, HEAD_TRACK = -3.12, HEAD_Y = 340;
  const ICON_CY = 560;
  const LABEL_SIZE = 48, LABEL_Y = [738, 798];
  // Columns: 460 px wide, 120 px gutters, centred on 1920 (outer edges at the 150 px safe line).
  const COLS = [
    { cx: 380, cue: 0.2, icon: drawStopwatch, lines: ['Quick to', 'answer.'] },
    { cx: 960, cue: 0.7, icon: drawTarget, lines: ['Sharp in the', 'details.'] },
    { cx: 1540, cue: 1.2, icon: drawLoop, lines: ['Built for', 'everyday work.'] },
  ];

  function paint(ctx, local) {
    // Headline: per-word mask-rise from 19.0, stagger 0.06 s.
    const headW = H.measure(ctx, HEAD.join(' '), HEAD_SIZE, 600, H.FONT.sans, HEAD_TRACK);
    let hx = 960 - headW / 2;
    HEAD.forEach((word, i) => {
      const e = H.easeOutExpo(H.ramp(local, i * 0.06, i * 0.06 + 0.9));
      maskText(ctx, word, hx, HEAD_Y, HEAD_SIZE, 600, HEAD_TRACK, PAPER, e);
      hx += H.measure(ctx, word + ' ', HEAD_SIZE, 600, H.FONT.sans, HEAD_TRACK);
    });

    COLS.forEach(col => {
      // Icon: stroke-dash draw-on over 0.9 s at its ICON cue.
      ctx.save();
      ctx.translate(col.cx, ICON_CY);
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = STROKE;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      col.icon(ctx, local - col.cue);
      ctx.restore();

      // Label: mask-rise 0.7 s after its icon cue, lines staggered 0.08 s.
      const ll = local - (col.cue + 0.7);
      col.lines.forEach((line, k) => {
        const e = H.easeOutExpo(H.ramp(ll, k * 0.08, k * 0.08 + 0.7));
        const w = H.measure(ctx, line, LABEL_SIZE, 500, H.FONT.sans, 0);
        maskText(ctx, line, col.cx - w / 2, LABEL_Y[k], LABEL_SIZE, 500, 0, PAPER, e);
      });
    });
  }

  return { paint };
})();

H.scene({ id: "s06_promises", start: 19, end: 23, draw(ctx, t, local, dur) {
  // Exits: everything fades 22.5 to 23.0. The ink ground cross-fades in over s05 from 18.6 to 19.0.
  const fade = 1 - H.ramp(t, 22.5, 23.0);
  if (fade <= 0) return;
  const ground = H.ramp(t, 18.6, 19.0);
  ctx.save();
  if (ground > 0) {
    ctx.globalAlpha = ground * fade;
    ctx.fillStyle = H.COLOR.ink;
    ctx.fillRect(0, 0, H.W, H.H);
  }
  ctx.globalAlpha = fade;
  s06.paint(ctx, local);
  ctx.restore();
} });
