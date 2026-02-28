import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE stats_widgets SET name=?, type=?, config=?, data_source=?, data=?, refresh_interval=?, color_scheme=?, updated_at=?
    WHERE id=?
  `).run(
    body.name, body.type,
    JSON.stringify(body.config ?? {}),
    body.data_source ?? 'manual',
    JSON.stringify(body.data ?? []),
    body.refresh_interval ?? 3600,
    body.color_scheme ?? 'blue',
    now, params.id
  );
  const row = db.prepare('SELECT * FROM stats_widgets WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, config: safeJson(row.config as string, {}), data: safeJson(row.data as string, []) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM stats_widgets WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
