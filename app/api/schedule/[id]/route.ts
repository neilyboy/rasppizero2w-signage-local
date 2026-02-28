import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  db.prepare(`
    UPDATE schedule_entries SET title=?, playlist_id=?, asset_id=?, start_time=?, end_time=?, recurrence=?, recurrence_days=?, color=?, active=?
    WHERE id=?
  `).run(
    body.title, body.playlist_id ?? null, body.asset_id ?? null,
    body.start_time, body.end_time,
    body.recurrence ?? 'none',
    JSON.stringify(body.recurrence_days ?? []),
    body.color ?? '#3b82f6',
    body.active !== false ? 1 : 0,
    params.id
  );
  const row = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, recurrence_days: safeJson(row.recurrence_days as string, []), active: Boolean(row.active) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM schedule_entries WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
