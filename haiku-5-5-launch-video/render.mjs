// Renders the launch film from engine/core.js + scenes/*.js, driven by Playwright (Chromium) and ffmpeg.
//
//   node render.mjs                         full film -> out/haiku-5-5-launch.mp4 (video + score.wav if present)
//   node render.mjs --times 1,4.5,9         PNG stills at those seconds -> out/stills/ (or --dir <path>)
//   node render.mjs --from 7 --to 11 --out clip.mp4   partial clip (video only) -> out/clip.mp4
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const FPS = 60, DURATION = 30, W = 1920, H = 1080;

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const timesArg = flag('--times', null);
const from = parseFloat(flag('--from', '0'));
const to = parseFloat(flag('--to', String(DURATION)));
const outArg = flag('--out', null);
const dirArg = flag('--dir', path.join(OUT, 'stills'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.wav': 'audio/wav' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(ROOT, p === '/' ? 'index.html' : p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
    await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const shot = async (t) => {
      await page.evaluate(tt => window.renderFrame(tt), t);
      return page.screenshot({ type: 'png' });
    };

    if (timesArg) {
      fs.mkdirSync(dirArg, { recursive: true });
      for (const s of timesArg.split(',')) {
        const t = parseFloat(s);
        const file = path.join(dirArg, `still_${t.toFixed(2)}s.png`);
        fs.writeFileSync(file, await shot(t));
        console.log(file);
      }
      return;
    }

    const isFull = !argv.includes('--from') && !argv.includes('--to');
    const videoOnly = path.join(OUT, isFull ? 'video_only.mp4' : (outArg || 'clip.mp4'));
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', videoOnly],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
    for (let f = f0; f < f1; f++) {
      const buf = await shot(f / FPS);
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
      if ((f - f0) % 300 === 0) console.log(`frame ${f}/${f1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    console.log(`video -> ${videoOnly}`);

    const score = path.join(OUT, 'score.wav');
    if (isFull && fs.existsSync(score)) {
      const final = path.join(OUT, 'haiku-5-5-launch.mp4');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOnly, '-i', score, '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final]);
      console.log(`final -> ${final}`);
    }
  } finally {
    await browser.close();
    srv.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
