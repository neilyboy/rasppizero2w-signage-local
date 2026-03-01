import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Server-side cache: url -> { status, imageUrl, capturedAt }
type CacheEntry = { status: 'pending' | 'ready' | 'error'; imageUrl?: string; capturedAt?: number };
const screenshotCache = new Map<string, CacheEntry>();

function findChromium(): string {
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'chromium';
}

function findWkhtmltoimage(): string | null {
  const candidates = ['/usr/bin/wkhtmltoimage', '/usr/local/bin/wkhtmltoimage'];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return null;
}

function findCutycapt(): string | null {
  const candidates = ['/usr/bin/cutycapt', '/usr/local/bin/cutycapt'];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return null;
}

function tryWkhtmltoimage(bin: string, url: string, filepath: string, childEnv: NodeJS.ProcessEnv): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['--width', '1920', '--height', '1080', '--javascript-delay', '2000', url, filepath];
    const stderrLines: string[] = [];
    const child = spawn(bin, args, { env: childEnv, timeout: 60000 });
    child.stderr.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) stderrLines.push(l); });
    child.on('close', (code) => {
      const ok = fs.existsSync(filepath);
      if (!ok) console.error(`[screenshot] wkhtmltoimage failed (code=${code}): ${stderrLines.slice(-2).join(' | ')}`);
      resolve(ok);
    });
    child.on('error', (err) => { console.error('[screenshot] wkhtmltoimage error:', err.message); resolve(false); });
  });
}

function tryCutycapt(bin: string, url: string, filepath: string, childEnv: NodeJS.ProcessEnv): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [`--url=${url}`, `--out=${filepath}`, '--min-width=1920', '--delay=3000'];
    const stderrLines: string[] = [];
    const child = spawn(bin, args, { env: { ...childEnv, DISPLAY: ':0' }, timeout: 60000 });
    child.stderr.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) stderrLines.push(l); });
    child.on('close', (code) => {
      const ok = fs.existsSync(filepath);
      if (!ok) console.error(`[screenshot] cutycapt failed (code=${code}): ${stderrLines.slice(-2).join(' | ')}`);
      resolve(ok);
    });
    child.on('error', (err) => { console.error('[screenshot] cutycapt error:', err.message); resolve(false); });
  });
}

function urlToFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  return `_screenshot_${hash}.png`;
}

const BASE_ARGS = [
  '--no-sandbox',
  '--no-zygote',
  '--single-process',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer',
  '--ignore-certificate-errors',
  '--ignore-ssl-errors',
  '--ignore-certificate-errors-spki-list',
  '--allow-insecure-localhost',
  '--disable-web-security',
  '--user-agent=Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  '--window-size=1920,1080',
];

// Headless strategies to try in order — first one that produces a file wins
const HEADLESS_STRATEGIES = [
  ['--headless=new'],
  ['--headless=chrome'],
  ['--headless'],
  ['--headless', '--ozone-platform=headless'],
];

function tryCapture(
  chromium: string,
  strategyArgs: string[],
  filepath: string,
  url: string,
  childEnv: NodeJS.ProcessEnv,
): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [...strategyArgs, ...BASE_ARGS, `--screenshot=${filepath}`, url];
    const stderrLines: string[] = [];
    const child = spawn(chromium, args, { env: childEnv, timeout: 60000 });
    child.stderr.on('data', (d: Buffer) => {
      const line = d.toString().trim();
      if (line) stderrLines.push(line);
    });
    child.on('close', (code) => {
      const ok = code === 0 && fs.existsSync(filepath);
      if (!ok) {
        const detail = stderrLines.filter(l => !l.includes('WARNING') && !l.includes('Fontconfig')).slice(-3).join(' | ');
        console.error(`[screenshot] strategy ${strategyArgs.join(' ')} failed (code=${code}): ${detail}`);
      }
      resolve(ok);
    });
    child.on('error', (err) => {
      console.error('[screenshot] spawn error:', err.message);
      resolve(false);
    });
  });
}

// Fire-and-forget background capture — does not block the HTTP response
function captureInBackground(url: string, filename: string, filepath: string) {
  const chromium = findChromium();
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const childEnv = { ...process.env, DISPLAY: process.env.DISPLAY ?? ':0' };

  (async () => {
    // Try Chromium headless strategies first
    for (const strategy of HEADLESS_STRATEGIES) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      console.log(`[screenshot] trying: chromium ${strategy.join(' ')} for ${url}`);
      const ok = await tryCapture(chromium, strategy, filepath, url, childEnv);
      if (ok) {
        const imageUrl = `/api/uploads/${filename}`;
        screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
        console.log(`[screenshot] captured ${url} -> ${imageUrl} (chromium ${strategy.join(' ')})`);
        return;
      }
    }

    // Try wkhtmltoimage
    const wkbin = findWkhtmltoimage();
    if (wkbin) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      console.log(`[screenshot] trying wkhtmltoimage for ${url}`);
      const ok = await tryWkhtmltoimage(wkbin, url, filepath, childEnv);
      if (ok) {
        const imageUrl = `/api/uploads/${filename}`;
        screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
        console.log(`[screenshot] captured ${url} -> ${imageUrl} (wkhtmltoimage)`);
        return;
      }
    }

    // Try cutycapt
    const ccbin = findCutycapt();
    if (ccbin) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      console.log(`[screenshot] trying cutycapt for ${url}`);
      const ok = await tryCutycapt(ccbin, url, filepath, childEnv);
      if (ok) {
        const imageUrl = `/api/uploads/${filename}`;
        screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
        console.log(`[screenshot] captured ${url} -> ${imageUrl} (cutycapt)`);
        return;
      }
    }

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
