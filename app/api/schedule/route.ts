import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM schedule_entries ORDER BY start_time ASC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    recurrence_days: safeJson(r.recurrence_days as string, []),
    active: Boolean(r.active),
  })));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO schedule_entries (id, title, playlist_id, asset_id, start_time, end_time, recurrence, recurrence_days, color, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.title,
    body.playlist_id ?? null, body.asset_id ?? null,
    body.start_time, body.end_time,
    body.recurrence ?? 'none',
    JSON.stringify(body.recurrence_days ?? []),
    body.color ?? '#3b82f6',
    body.active !== false ? 1 : 0,
    now
  );
  const row = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ ...row, recurrence_days: safeJson(row.recurrence_days as string, []), active: Boolean(row.active) }, { status: 201 });
}
