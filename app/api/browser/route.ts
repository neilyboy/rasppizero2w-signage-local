import { NextRequest, NextResponse } from 'next/server';
import { execFile, ChildProcess } from 'child_process';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function findXauthority(): string | undefined {
  // Scan running Chromium process for its XAUTHORITY env var
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
        if (cmdline.includes('chromium')) {
          const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
          const match = environ.split('\0').find(e => e.startsWith('XAUTHORITY='));
          if (match) {
            const xauthPath = match.slice('XAUTHORITY='.length);
            if (fs.existsSync(xauthPath)) return xauthPath;
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // Fallback: known locations
  const candidates = [
    '/tmp/.Xauthority-pisign',
    process.env.XAUTHORITY,
    `/home/${process.env.USER}/.Xauthority`,
    `${process.env.HOME}/.Xauthority`,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

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

    const xauth = findXauthority();
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      DISPLAY: process.env.DISPLAY ?? ':0',
    };
    if (xauth) childEnv.XAUTHORITY = xauth;

    const child = execFile(chromium, args, { env: childEnv });

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

  if (action === 'restart-kiosk') {
    // Kill ALL running Chromium processes, then relaunch kiosk with remote debugging
    try {
      require('child_process').execSync('pkill -f chromium 2>/dev/null || true');
    } catch {}
    await new Promise(r => setTimeout(r, 1500));

    const xauth = findXauthority();
    const childEnv: NodeJS.ProcessEnv = { ...process.env, DISPLAY: ':0' };
    if (xauth) childEnv.XAUTHORITY = xauth;

    const kioskArgs = [
      '--remote-debugging-port=9222',
      '--kiosk',
      '--noerrdialogs',
      '--disable-infobars',
      '--no-first-run',
      '--autoplay-policy=no-user-gesture-required',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      'http://localhost:3000/display',
    ];

    const kiosk = execFile(chromium, kioskArgs, { env: childEnv });
    kiosk.unref();

    let kioskExited = false;
    kiosk.on('exit', () => { kioskExited = true; });
    await new Promise(r => setTimeout(r, 2000));

    if (kioskExited) {
      return NextResponse.json({ success: false, reason: 'kiosk chromium exited immediately — Xauth issue?' });
    }
    console.log(`[browser] kiosk relaunched with remote-debugging-port=9222 pid=${kiosk.pid}`);
    return NextResponse.json({ success: true, action: 'restart-kiosk', pid: kiosk.pid });
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
