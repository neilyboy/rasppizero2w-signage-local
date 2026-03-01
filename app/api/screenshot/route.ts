import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Find the chromium binary — tries several common paths on Raspberry Pi OS / Debian
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Deterministic filename per URL — always overwritten
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
  const filename = `_screenshot_${hash}.png`;
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const chromium = findChromium();

  try {
    await execFileAsync(chromium, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--window-size=1920,1080',
      `--screenshot=${filepath}`,
      url,
    ], { timeout: 30000 });

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Screenshot failed — file not created' }, { status: 500 });
    }

    return NextResponse.json({ url: `/api/uploads/${filename}`, filename });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[screenshot] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
