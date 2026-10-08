// s05_code: a code window types a short snippet, then an output bubble answers it.
// Everything sits in an IIFE so the helpers stay out of the shared global scope.
(function () {
  const { COLOR: C, FONT: F } = H;

  // Timeline (absolute seconds), from DESIGN.md.
  const SCENE_T0 = 15.0, SCENE_T1 = 19.0;
  const WIN_IN_B = 15.6;               // window entrance ends
  const CODE_T0 = 15.4, CODE_T1 = 17.6; // CODE_TYPE
  const OUT_IN = 17.8;                 // OUTPUT_IN
  const FADE_A = 18.75, FADE_B = 19.0; // exit fade (at least 0.25 s)

  // Window: 1200 x 620, centred, lifted 40 px.
  const WIN_W = 1200, WIN_H = 620, WIN_R = 24, BAR_H = 64;
  const WIN_X = (H.W - WIN_W) / 2, WIN_Y = (H.H - WIN_H) / 2 - 40;

  // Code: Geist Mono 500, 30 px, 46 px line height, 56 px left padding.
  const MONO = { size: 30, weight: 500, family: F.mono };
  const LH = 46, PAD_X = 56, BASE = 34; // BASE: baseline offset inside a row

  // Code, exactly as briefed (blank lines and punctuation included).
  const CODE = [
    'import Anthropic from "@anthropic-ai/sdk";',
    '',
    'const client = new Anthropic();',
    '',
    'const reply = await client.messages.create({',
    '  model: "claude-haiku-5-5",',
    '  max_tokens: 512,',
    '  messages: [{ role: "user", content: "Summarize this release note." }],',
    '});',
  ];
  const FLAT = CODE.join('\n');
  const LINE_START = [];
  { let p = 0; CODE.forEach(s => { LINE_START.push(p); p += s.length + 1; }); }

  // Visual rows. Line 7 is 72 chars (1296 px), wider than the 1088 px text area, so it is
  // soft-wrapped after "content: " with a 4-char hanging indent. No characters are added.
  const WRAP_LINE = 7, WRAP_COL = 38, WRAP_INDENT = 72;
  const ROWS = [];
  CODE.forEach((s, li) => {
    if (li === WRAP_LINE) {
      ROWS.push({ li, s: 0, e: WRAP_COL, ix: 0 });
      ROWS.push({ li, s: WRAP_COL, e: s.length, ix: WRAP_INDENT });
    } else {
      ROWS.push({ li, s: 0, e: s.length, ix: 0 });
    }
  });

  // The only seal-coloured run: the model string, quotes included.
  const MODEL = { li: 5, s: 9, e: 27 };
  const isSeal = (li, col) => li === MODEL.li && col >= MODEL.s && col < MODEL.e;

  // Typing schedule. Each character gets a seeded, jittered slot, with a longer beat at line
  // ends. DONE[i] is the progress (0 to 1) at which character i is complete.
  const rnd = H.prng(0x5c0de);
  const DONE = [];
  {
    const wts = [];
    let total = 0;
    for (let i = 0; i < FLAT.length; i++) {
      const c = FLAT[i];
      let w = 0.8 + rnd() * 0.5;
      if (c === '\n') w = 2.2;
      else if (c === ' ') w = 0.7;
      else if (c === ';' || c === ',') w += 0.6;
      wts.push(w);
      total += w;
    }
    let acc = 0;
    for (const w of wts) { acc += w; DONE.push(acc / total); }
    DONE[DONE.length - 1] = 1;
  }

  const OUT_TEXT = 'Summary ready in one pass.';
  const OUT_SIZE = 40, OUT_PAD = 48, OUT_H = 80;

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // Number of characters typed by time t.
  function revealed(t) {
    const p = H.clamp((t - CODE_T0) / (CODE_T1 - CODE_T0));
    let lo = 0, hi = DONE.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (DONE[mid] <= p) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // Logical position (index into FLAT) to { line, column }.
  function locate(n) {
    for (let li = 0; li < CODE.length; li++) {
      if (n <= LINE_START[li] + CODE[li].length) return { li, col: n - LINE_START[li] };
    }
    const last = CODE.length - 1;
    return { li: last, col: CODE[last].length };
  }

  // Visual row that holds a logical column. The first match wins, so a wrap point belongs to the row before it.
  function rowAt(li, col) {
    for (let r = 0; r < ROWS.length; r++) {
      const R = ROWS[r];
      if (R.li === li && col >= R.s && col <= R.e) return r;
    }
    return ROWS.length - 1;
  }

  H.scene({ id: "s05_code", start: 15.0, end: 19.0, draw(ctx, t, local, dur) {
    if (t < SCENE_T0 || t > SCENE_T1) return;
    const fade = 1 - H.ramp(t, FADE_A, FADE_B);
    if (fade <= 0) return;
    const inE = H.easeOutExpo(H.ramp(t, SCENE_T0, WIN_IN_B));
    if (inE <= 0) return;

    // Window entrance: rises 36 px and fades in.
    const wy = WIN_Y + (1 - inE) * 36;
    const codeTop = wy + BAR_H + (WIN_H - BAR_H - ROWS.length * LH) / 2;
    const left = WIN_X + PAD_X;

    ctx.save();
    ctx.globalAlpha *= inE * fade;

    // Window body, with the one soft shadow allowed in the film.
    ctx.save();
    ctx.shadowColor = rgba(C.ink, 0.18);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = C.ink;
    H.rrect(ctx, WIN_X, wy, WIN_W, WIN_H, WIN_R);
    ctx.fill();
    ctx.restore();

    // Window contents, clipped to the rounded window.
    ctx.save();
    H.rrect(ctx, WIN_X, wy, WIN_W, WIN_H, WIN_R);
    ctx.clip();

    // Title bar: a raised ink2 strip with three mute dots and the file name.
    ctx.fillStyle = C.ink2;
    ctx.fillRect(WIN_X, wy, WIN_W, BAR_H);
    ctx.fillStyle = C.mute;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(WIN_X + 40 + i * 26, wy + BAR_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    H.text(ctx, 'haiku.ts', WIN_X + WIN_W / 2, wy + BAR_H / 2 + 9, {
      size: 26, weight: 500, family: F.mono, color: C.mute, align: 'center',
    });

    // Typed code. Text is paper on the ink window; only the model string is seal.
    const n = revealed(t);
    ROWS.forEach((R, r) => {
      const s = CODE[R.li];
      const vis = H.clamp(n - (LINE_START[R.li] + R.s), 0, R.e - R.s);
      if (vis <= 0) return;
      const base = codeTop + r * LH + BASE;
      let i = 0;
      while (i < vis) {
        const seal = isSeal(R.li, R.s + i);
        let j = i + 1;
        while (j < vis && isSeal(R.li, R.s + j) === seal) j++;
        const x = left + R.ix + H.measure(ctx, s.slice(R.s, R.s + i), MONO.size, MONO.weight, MONO.family);
        H.text(ctx, s.slice(R.s + i, R.s + j), x, base, { ...MONO, color: seal ? C.seal : C.paper });
        i = j;
      }
    });

    // Caret: 500 ms on, 500 ms off, counted from the scene's start.
    if ((t - SCENE_T0) % 1 < 0.5) {
      const { li, col } = locate(n);
      const r = rowAt(li, col);
      const R = ROWS[r];
      const x = Math.round(left + R.ix + H.measure(ctx, CODE[li].slice(R.s, col), MONO.size, MONO.weight, MONO.family));
      const base = codeTop + r * LH + BASE;
      ctx.fillStyle = C.paper;
      ctx.fillRect(x, base - 24, 3, 32);
    }
    ctx.restore(); // clip
    ctx.restore(); // window alpha

    // Output bubble, below the window.
    const bIn = H.easeOutExpo(H.ramp(t, OUT_IN, OUT_IN + 0.35));
    if (bIn > 0) {
      ctx.save();
      ctx.globalAlpha *= bIn * fade;
      const tw = H.measure(ctx, OUT_TEXT, OUT_SIZE, 500, F.sans);
      const bw = tw + OUT_PAD * 2;
      const bx = H.W / 2 - bw / 2;
      const by = WIN_Y + WIN_H + 28 + (1 - bIn) * 14;
      ctx.fillStyle = C.paper2;
      H.rrect(ctx, bx, by, bw, OUT_H, OUT_H / 2);
      ctx.fill();

      // Words mask-rise in a 0.06 s stagger, each clipped to its own box.
      const base = by + OUT_H / 2 + 14;
      const words = OUT_TEXT.split(' ');
      let idx = 0;
      words.forEach((w, i) => {
        const x = bx + OUT_PAD + H.measure(ctx, OUT_TEXT.slice(0, idx), OUT_SIZE, 500, F.sans);
        const ww = H.measure(ctx, w, OUT_SIZE, 500, F.sans);
        idx += w.length + 1;
        const p = H.easeOutExpo(H.ramp(t, OUT_IN + i * 0.06, OUT_IN + i * 0.06 + 0.35));
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 4, base - 44, ww + 8, 62);
        ctx.clip();
        H.text(ctx, w, x, base + (1 - p) * 52, { size: OUT_SIZE, weight: 500, family: F.sans, color: C.ink });
        ctx.restore();
      });
      ctx.restore();
    }
  } });
})();
