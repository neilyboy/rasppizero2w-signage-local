import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const DISPLAY_VAL = ':0';
const CDP_PORT = 9222;

function findXauthority(): string | undefined {
  // First: try to read XAUTHORITY from the running kiosk Chromium process
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const environ = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
        if (environ.includes('chromium') || fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('chromium')) {
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
    '/run/user/1000/gdm/Xauthority',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

// Simple HTTP GET helper for CDP JSON endpoints
function httpGet(url: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// WebSocket send/receive for CDP commands
function cdpCommand(wsUrl: string, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({ id, method, params });

    // Use Node's built-in net to do a raw WebSocket upgrade
    const net = require('net');
    const socket = net.createConnection({ host: url.hostname, port: parseInt(url.port || '9222') }, () => {
      const key = Buffer.from(crypto.randomBytes(16)).toString('base64');
      const handshake = [
        `GET ${url.pathname} HTTP/1.1`,
        `Host: ${url.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '', '',
      ].join('\r\n');
      socket.write(handshake);
    });

    let upgraded = false;
    let buf = Buffer.alloc(0);

    socket.setTimeout(10000);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('ws timeout')); });
    socket.on('error', reject);

    socket.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      if (!upgraded) {
        const head = buf.toString();
        if (head.includes('\r\n\r\n')) {
          upgraded = true;
          // Send the CDP command as a WebSocket text frame
          const payload = Buffer.from(msg);
          const frame = Buffer.alloc(2 + payload.length);
          frame[0] = 0x81; // FIN + text opcode
          frame[1] = payload.length;
          payload.copy(frame, 2);
          socket.write(frame);
          buf = Buffer.alloc(0);
        }
        return;
      }
      // Parse WebSocket frame
      if (buf.length < 2) return;
      const payloadLen = buf[1] & 0x7f;
      const headerLen = 2 + (payloadLen === 126 ? 2 : payloadLen === 127 ? 8 : 0);
      if (buf.length < headerLen + payloadLen) return;
      const payload = buf.slice(headerLen, headerLen + payloadLen).toString();
      try {
        const parsed = JSON.parse(payload);
        if (parsed.id === id) {
          socket.destroy();
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed.result);
        }
      } catch { /* partial frame, wait for more */ }
    });
  });
}

// Strategy A: CDP via existing kiosk Chromium on port 9222
async function tryCDPScreenshot(url: string, filepath: string): Promise<boolean> {
  try {
    // Check if CDP is available
    const listJson = await httpGet(`http://localhost:${CDP_PORT}/json/list`, 3000);
    const targets = JSON.parse(listJson) as Array<{ id: string; type: string; webSocketDebuggerUrl: string }>;

    // Create a new target (tab) for our screenshot
    const newTarget = await httpGet(`http://localhost:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, 5000);
    const target = JSON.parse(newTarget) as { id: string; webSocketDebuggerUrl: string };
    const wsUrl = target.webSocketDebuggerUrl;

    if (!wsUrl) throw new Error('no webSocketDebuggerUrl');
    console.log(`[screenshot] CDP: opened tab ${target.id} for ${url}`);

    // Wait for page to load
    await new Promise(r => setTimeout(r, 5000));

    // Capture screenshot
    const result = await cdpCommand(wsUrl, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }) as { data: string };

    // Close the tab
    await httpGet(`http://localhost:${CDP_PORT}/json/close/${target.id}`, 3000).catch(() => {});

    if (result?.data) {
      fs.writeFileSync(filepath, Buffer.from(result.data, 'base64'));
      console.log(`[screenshot] CDP screenshot saved to ${filepath}`);
      return true;
    }
  } catch (e) {
    console.log(`[screenshot] CDP not available: ${(e as Error).message}`);
  }
  return false;
}

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
  const xauth = findXauthority();
  const childEnv: NodeJS.ProcessEnv = { ...process.env, DISPLAY: DISPLAY_VAL };
  if (xauth) childEnv.XAUTHORITY = xauth;
  // Ensure X access is open for local connections (no-op if already open)
  try { require('child_process').execSync(`DISPLAY=${DISPLAY_VAL} xhost +local: 2>/dev/null`, { env: childEnv }); } catch {}
  console.log(`[screenshot] env DISPLAY=${DISPLAY_VAL} XAUTHORITY=${xauth ?? 'none (no-auth X server)'}`);

  (async () => {
    const success = (method: string) => {
      const imageUrl = `/api/uploads/${filename}`;
      screenshotCache.set(url, { status: 'ready', imageUrl, capturedAt: Date.now() });
      console.log(`[screenshot] captured ${url} via ${method}`);
    };

    // Strategy A: CDP via kiosk Chromium on port 9222 (no X auth needed)
    if (await tryCDPScreenshot(url, filepath)) { success('CDP'); return; }

    // Strategy B: scrot + xdotool
    if (await tryScrotStrategy(url, filepath, childEnv)) { success('scrot+xdotool'); return; }

    // Strategy C: Chromium headless
    if (chromium && await tryChromiumHeadless(chromium, url, filepath, childEnv)) { success('chromium-headless'); return; }

    console.error(`[screenshot] all capture methods failed for ${url}`);
    screenshotCache.delete(url);
  })();
}

export async function POST(req: NextRequest) {
  // Debug endpoint: POST /api/screenshot returns env info
  return NextResponse.json({
    DISPLAY: process.env.DISPLAY,
    XAUTHORITY: process.env.XAUTHORITY,
    HOME: process.env.HOME,
    xauthFile: findXauthority(),
    cdpPort: CDP_PORT,
    cdpAvailable: await httpGet(`http://localhost:${CDP_PORT}/json/version`, 1000).then(() => true).catch(() => false),
    scrot: findBin('/usr/bin/scrot'),
    xdotool: findBin('/usr/bin/xdotool'),
    chromium: findChromium(),
    fb0: fs.existsSync('/dev/fb0'),
    fb0readable: (() => { try { fs.accessSync('/dev/fb0', fs.constants.R_OK); return true; } catch { return false; } })(),
  });
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
