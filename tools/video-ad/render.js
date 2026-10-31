// node render.js <out.mp4> <fps> <png|jpeg> [audio.mp3] [cues.json]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
(async () => {
  const [out, fpsArg, fmt, audio, cuesFile] = process.argv.slice(2); const fps = Number(fpsArg || 60);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  if (cuesFile) { const cues = JSON.parse(fs.readFileSync(cuesFile, 'utf8')); await p.addInitScript((c) => { window.CUES = c; }, cues); }
  p.on('pageerror', e => console.log('err:', e.message));
  await p.goto('http://localhost:8800/webgraphs-ad/ad.html?capture=1'); await p.evaluate(() => window.__ready); await p.waitForTimeout(300);
  const dur = await p.evaluate(() => window.DURATION); const n = Math.round(dur * fps);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) args.push('-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps), '-movflags', '+faststart');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / fps);
    const buf = await p.screenshot(fmt === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close();
  console.log('done', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
