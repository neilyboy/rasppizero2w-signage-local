import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const DISPLAY = process.env.DISPLAY ?? ':0';

// Server-side cache: url -> { status, imageUrl, capturedAt }
type CacheEntry = { status: 'pending' | 'ready' | 'error'; imageUrl?: string; capturedAt?: number };
const screenshotCache = new Map<string, CacheEntry>();

function findBin(...candidates: string[]): string | null {
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return null;
}

function findChromium(): string | null {
  return findBin(
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  );
}

function urlToFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  return `_screenshot_${hash}.png`;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(bin: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs = 30000): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const outLines: string[] = [];
    const errLines: string[] = [];
    const child = spawn(bin, args, { env, timeout: timeoutMs });
    child.stdout.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) outLines.push(l); });
    child.stderr.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) errLines.push(l); });
    child.on('close', (code) => resolve({ ok: code === 0, stdout: outLines.join('\n'), stderr: errLines.slice(-4).join(' | ') }));
    child.on('error', (err) => resolve({ ok: false, stdout: '', stderr: err.message }));
  });
}

// Strategy A: use scrot/import to screenshot screen after navigating kiosk Chromium via xdotool
async function tryScrotStrategy(url: string, filepath: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const scrot = findBin('/usr/bin/scrot', '/usr/bin/import');
  const xdotool = findBin('/usr/bin/xdotool');
  if (!scrot || !xdotool) {
    console.log('[screenshot] scrot/xdotool not found, skipping screen-capture strategy');
    return false;
  }

  try {
    // Find existing Chromium window ID via xdotool stdout
    const searchResult = await runCmd(xdotool, ['search', '--onlyvisible', '--class', 'Chromium'], env, 5000);
    const winId = searchResult.stdout.trim().split('\n')[0];
    if (!winId) {
      console.log('[screenshot] no visible Chromium window found for scrot strategy');
      return false;
    }
    console.log(`[screenshot] found Chromium window ${winId}, navigating to ${url}`);

    // Navigate to URL: focus window, open omnibox, type URL, press Enter
    await runCmd(xdotool, ['windowactivate', '--sync', winId], env, 3000);
    await runCmd(xdotool, ['key', '--window', winId, 'ctrl+l'], env, 2000);
    await sleep(400);
    await runCmd(xdotool, ['type', '--window', winId, '--clearmodifiers', '--delay', '20', url], env, 10000);
    await runCmd(xdotool, ['key', '--window', winId, 'Return'], env, 2000);

    // Wait for page to render
    await sleep(5000);

    // Take screenshot of the full screen
    const tmpFile = filepath + '.tmp.png';
    let captured = false;
    if (scrot.includes('scrot')) {
      const r = await runCmd(scrot, [tmpFile], { ...env, DISPLAY: env.DISPLAY ?? ':0' }, 10000);
      captured = r.ok && fs.existsSync(tmpFile);
      if (!captured) console.error('[screenshot] scrot failed:', r.stderr);
    } else {
      // ImageMagick import
      const r = await runCmd(scrot, ['-window', 'root', tmpFile], { ...env, DISPLAY: env.DISPLAY ?? ':0' }, 10000);
      captured = r.ok && fs.existsSync(tmpFile);
      if (!captured) console.error('[screenshot] import failed:', r.stderr);
    }

    if (captured) {
      fs.renameSync(tmpFile, filepath);
      return true;
    }
  } catch (e) {
    console.error('[screenshot] scrot strategy error:', e);
  }
  return false;
}

// Strategy B: Chromium headless — tries multiple flag combinations
async function tryChromiumHeadless(chromium: string, url: string, filepath: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const BASE = [
    '--no-sandbox', '--no-zygote', '--single-process',
    '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer',
    '--ignore-certificate-errors', '--ignore-ssl-errors',
    '--ignore-certificate-errors-spki-list', '--allow-insecure-localhost',
    '--disable-web-security',
    '--user-agent=Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--window-size=1920,1080',
  ];
  const strategies = [
    ['--headless=new'],
    ['--headless=chrome'],
    ['--headless'],
    ['--headless', '--ozone-platform=headless'],
    ['--headless', '--enable-features=UseOzonePlatform', '--ozone-platform=headless'],
  ];
  for (const s of strategies) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    const args = [...s, ...BASE, `--screenshot=${filepath}`, url];
    console.log(`[screenshot] trying chromium ${s.join(' ')}`)
    const r = await runCmd(chromium, args, env, 60000);
    if (fs.existsSync(filepath)) return true;
    const errSnip = r.stderr.split('|').filter((l: string) => !l.includes('WARNING') && !l.includes('Fontconfig') && !l.includes('Gtk')).slice(-2).join('|');
    if (errSnip) console.error(`[screenshot] chromium ${s[0]} failed: ${errSnip}`);
  }
  return false;
}

// Fire-and-forget background capture — does not block the HTTP response
function captureInBackground(url: string, filename: string, filepath: string) {
  const chromium = findChromium();
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const childEnv = { ...process.env, DISPLAY: process.env.DISPLAY ?? ':0' };

  (async () => {
    const success = (method: string) => {
      const imageUrl = `/api/uploads/${filename}`;
      screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
      console.log(`[screenshot] captured ${url} via ${method}`);
    };

    // Strategy A: scrot + xdotool (uses existing kiosk Chromium, no headless needed)
    if (await tryScrotStrategy(url, filepath, childEnv)) { success('scrot+xdotool'); return; }

    // Strategy B: Chromium headless
    if (chromium && await tryChromiumHeadless(chromium, url, filepath, childEnv)) { success('chromium-headless'); return; }

    console.error(`[screenshot] all capture methods failed for ${url}`);
    screenshotCache.delete(url);
  })();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const refresh = searchParams.get('refresh') === '1';

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const filename = urlToFilename(url);
  const filepath = path.join(UPLOADS_DIR, filename);

  const cached = screenshotCache.get(url);

  // Return cached ready result (unless refresh forced)
  if (cached?.status === 'ready' && cached.imageUrl && !refresh && fs.existsSync(filepath)) {
    return NextResponse.json({ status: 'ready', url: cached.imageUrl });
  }

  // Already capturing — return pending status immediately
  if (cached?.status === 'pending') {
    return NextResponse.json({ status: 'pending' });
  }

  // Start a new capture in background, return pending immediately
  screenshotCache.set(url, { status: 'pending' });
  captureInBackground(url, filename, filepath);
  return NextResponse.json({ status: 'pending' });
}
