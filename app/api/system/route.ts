import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const db = getDb();

  const assetCount = (db.prepare('SELECT COUNT(*) as c FROM assets').get() as { c: number }).c;
  const playlistCount = (db.prepare('SELECT COUNT(*) as c FROM playlists').get() as { c: number }).c;
  const scheduleCount = (db.prepare('SELECT COUNT(*) as c FROM schedule_entries').get() as { c: number }).c;
  const widgetCount = (db.prepare('SELECT COUNT(*) as c FROM stats_widgets').get() as { c: number }).c;

  let cpuTemp = null;
  let memUsed = null;
  let memTotal = null;
  let diskUsed = null;
  let diskTotal = null;
  let uptime = null;

  try {
    const tempFile = '/sys/class/thermal/thermal_zone0/temp';
    if (fs.existsSync(tempFile)) {
      cpuTemp = parseInt(fs.readFileSync(tempFile, 'utf8').trim()) / 1000;
    }
  } catch {}

  try {
    const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
    const memTotalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
    const memAvailMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
    if (memTotalMatch && memAvailMatch) {
      memTotal = parseInt(memTotalMatch[1]) * 1024;
      memUsed = memTotal - parseInt(memAvailMatch[1]) * 1024;
    }
  } catch {}

  try {
    const uptimeStr = fs.readFileSync('/proc/uptime', 'utf8').trim().split(' ')[0];
    uptime = Math.floor(parseFloat(uptimeStr));
  } catch {}

  try {
    const dfOut = execSync('df / -B1 --output=size,used 2>/dev/null | tail -1').toString().trim().split(/\s+/);
    diskTotal = parseInt(dfOut[0]);
    diskUsed = parseInt(dfOut[1]);
  } catch {}

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  let storageUsed = 0;
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      const stat = fs.statSync(path.join(uploadsDir, f));
      storageUsed += stat.size;
    }
  } catch {}

  return NextResponse.json({
    assets: assetCount,
    playlists: playlistCount,
    schedules: scheduleCount,
    widgets: widgetCount,
    cpuTemp,
    memUsed,
    memTotal,
    diskUsed,
    diskTotal,
    storageUsed,
    uptime,
  });
}
