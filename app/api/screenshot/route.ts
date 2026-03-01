import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
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

function urlToFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  return `_screenshot_${hash}.png`;
}

// Fire-and-forget background capture — does not block the HTTP response
function captureInBackground(url: string, filename: string, filepath: string) {
  const chromium = findChromium();
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    '--ignore-certificate-errors',
    '--ignore-ssl-errors',
    '--ignore-certificate-errors-spki-list',
    '--allow-insecure-localhost',
    '--disable-web-security',
    '--user-agent=Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--window-size=1920,1080',
    `--screenshot=${filepath}`,
    url,
  ];

  const child = execFile(chromium, args, { timeout: 45000 }, (err) => {
    if (err || !fs.existsSync(filepath)) {
      console.error('[screenshot] capture failed for', url, err?.message ?? 'no file');
      // Delete from cache so next request retries rather than staying stuck
      screenshotCache.delete(url);
    } else {
      const imageUrl = `/api/uploads/${filename}`;
      screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
      console.log('[screenshot] captured', url, '->', imageUrl);
    }
  });
  child.unref();
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
