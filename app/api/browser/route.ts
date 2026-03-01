import { NextRequest, NextResponse } from 'next/server';
import { execFile, ChildProcess } from 'child_process';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// Module-level state — persists across requests in the same server process
let activeBrowser: ChildProcess | null = null;
let activePid: number | null = null;
let activeUrl: string | null = null;

function findChromium(): string | null {
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function killActive() {
  if (activeBrowser && activePid) {
    try {
      process.kill(activePid, 'SIGTERM');
    } catch {}
    try {
      activeBrowser.kill('SIGTERM');
    } catch {}
  }
  activeBrowser = null;
  activePid = null;
  activeUrl = null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, url } = body;

  const chromium = findChromium();

  if (!chromium) {
    // Not on Pi — return a flag so client falls back to screenshot mode
    return NextResponse.json({ success: false, fallback: true, reason: 'chromium not found' });
  }

  if (action === 'close') {
    killActive();
    return NextResponse.json({ success: true, action: 'closed' });
  }

  if (action === 'open') {
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    // Kill any existing browser window first
    killActive();

    const args = [
      '--kiosk',
      '--disable-infobars',
      '--noerrdialogs',
      '--disable-session-crashed-bubble',
      '--no-first-run',
      '--disable-translate',
      '--disable-features=TranslateUI',
      '--overscroll-history-navigation=0',
      '--disable-pinch',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--disable-web-security',
      '--allow-insecure-localhost',
      '--user-agent=Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url,
    ];

    const child = execFile(chromium, args, {
      env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ':0' },
    });

    activeBrowser = child;
    activePid = child.pid ?? null;
    activeUrl = url;

    let exited = false;
    let exitCode: number | null = null;
    child.on('exit', (code) => {
      exited = true;
      exitCode = code;
      if (activePid === child.pid) {
        activeBrowser = null;
        activePid = null;
        activeUrl = null;
      }
    });

    // Wait 1.5s to see if Chromium immediately crashes (e.g. DISPLAY not set)
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (exited) {
      console.error(`[browser] chromium exited immediately (code=${exitCode}) for ${url} — falling back to screenshot`);
      return NextResponse.json({ success: false, fallback: true, reason: `chromium exited with code ${exitCode}` });
    }

    child.unref();
    console.log(`[browser] opened pid=${activePid} url=${url}`);
    return NextResponse.json({ success: true, action: 'opened', pid: activePid });
  }

  if (action === 'status') {
    return NextResponse.json({
      active: activePid !== null,
      pid: activePid,
      url: activeUrl,
    });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
