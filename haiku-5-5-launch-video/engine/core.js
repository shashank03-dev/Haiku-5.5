/* Claude Haiku 5.5 launch film: engine.
 * Every frame is a pure function of time t (seconds). No wall clock, no Math.random,
 * so any frame can be re-rendered identically. Scenes register themselves with H.scene().
 */
(function () {
  const W = 1920, H = 1080, FPS = 60, DURATION = 30;
  const COLOR = {
    ink: '#0E0E10',    // near-black, dark background
    ink2: '#1C1C21',   // raised surface on ink
    paper: '#F2EFE7',  // warm paper, light background
    paper2: '#E4DED0', // hairlines and tiles on paper
    mute: '#8C8980',   // secondary text
    seal: '#E4572E',   // vermilion seal: the only accent colour
  };
  const FONT = { sans: 'Geist, sans-serif', mono: '"Geist Mono", monospace' };
  const SAFE = 150; // px kept clear of text on every edge

  // ---- easing and ramps (all inputs are seconds or 0..1) ----
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (t, a, b) => clamp((t - a) / (b - a)); // 0 at time a, 1 at time b
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInCubic = t => t * t * t;
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // Back-out with about 1.3% overshoot: the only "bounce" allowed in this film.
  const easeOutSoft = t => { const c1 = 0.6, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // ---- deterministic randomness ----
  function prng(seed) { // mulberry32: returns () => [0, 1)
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---- text ----
  const font = (size, weight = 500, family = FONT.sans) => `${weight} ${size}px ${family}`;
  function text(ctx, str, x, y, o = {}) {
    const { size = 64, weight = 500, family = FONT.sans, color = COLOR.ink, align = 'left', baseline = 'alphabetic', alpha = 1, tracking = 0 } = o;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = font(size, weight, family);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if ('letterSpacing' in ctx) ctx.letterSpacing = tracking + 'px';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(ctx, str, size, weight = 500, family = FONT.sans, tracking = 0) {
    ctx.save();
    ctx.font = font(size, weight, family);
    if ('letterSpacing' in ctx) ctx.letterSpacing = tracking + 'px';
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }

  // ---- shapes ----
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- scene registry: draw order = registration order ----
  const scenes = [];
  function scene(def) { scenes.push(Object.assign({}, def)); }

  // ---- frame renderer ----
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  function renderFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(0, 0, W, H);
    for (const s of scenes) {
      // Scenes are called up to 0.5 s outside their window so they can cross-fade; they fade themselves.
      if (t < s.start - 0.5 || t > s.end + 0.5) continue;
      ctx.save();
      s.draw(ctx, t, t - s.start, s.end - s.start);
      ctx.restore();
    }
  }

  window.H = {
    W, H, FPS, DURATION, COLOR, FONT, SAFE,
    clamp, lerp, ramp, easeOutCubic, easeOutQuart, easeOutExpo, easeInCubic, easeInOutCubic, easeOutSoft,
    prng, hash, font, text, measure, rrect, scene, scenes,
  };
  window.renderFrame = renderFrame;

  // Wait for the three font families before the renderer captures anything.
  Promise.all([
    document.fonts.load('400 64px Geist'),
    document.fonts.load('500 64px Geist'),
    document.fonts.load('600 64px Geist'),
    document.fonts.load('700 64px Geist'),
    document.fonts.load('400 64px "Geist Mono"'),
    document.fonts.load('500 64px "Geist Mono"'),
  ]).then(() => { renderFrame(0); window.__ready = true; });
})();
