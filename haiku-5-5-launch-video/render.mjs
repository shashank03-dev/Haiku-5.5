// Renders a film from engine/core.js + its scene files, driven by Playwright (Chromium) and ffmpeg.
//
//   node render.mjs                                  main film -> out/haiku-5-5-launch.mp4 (+ out/score.wav)
//   node render.mjs --page variations/v1/index.html --name v1 --audio out/variations/v1/score.wav --outdir out/variations/v1
//   node render.mjs --times 1,4.5,9 --dir out/stills/x          PNG stills at those seconds
//   node render.mjs --from 7 --to 11 --name clip                partial clip, video only
//
// Writes <outdir>/<name>_video.mp4, then <outdir>/<name>.mp4 with audio muxed in when the audio file exists.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const FPS = 60, DURATION = 30, W = 1920, H = 1080;

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const timesArg = flag('--times', null);
const isFull = !argv.includes('--from') && !argv.includes('--to');
const from = parseFloat(flag('--from', '0'));
const to = parseFloat(flag('--to', String(DURATION)));
const page = flag('--page', 'index.html');
const name = flag('--name', isFull ? 'haiku-5-5-launch' : 'clip');
const outDir = path.resolve(ROOT, flag('--outdir', 'out'));
const audioPath = path.resolve(ROOT, flag('--audio', path.join('out', 'score.wav')));
const dirArg = flag('--dir', path.join(outDir, 'stills'));

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
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none'] });
  try {
    const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    pg.on('pageerror', e => console.error('[pageerror]', e.message));
    pg.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
    await pg.goto(`http://127.0.0.1:${srv.address().port}/${page.replace(/^\/+/, '')}`, { waitUntil: 'load' });
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const shot = async (t) => {
      await pg.evaluate(tt => window.renderFrame(tt), t);
      return pg.screenshot({ type: 'png' });
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

    const videoOnly = path.join(outDir, `${name}_video.mp4`);
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

    if (isFull && fs.existsSync(audioPath)) {
      const final = path.join(outDir, `${name}.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOnly, '-i', audioPath, '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final]);
      console.log(`final -> ${final}`);
    }
  } finally {
    await browser.close();
    srv.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
