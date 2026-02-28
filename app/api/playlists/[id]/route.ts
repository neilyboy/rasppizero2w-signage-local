import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...row, items: safeJson(row.items as string, []), loop: Boolean(row.loop), shuffle: Boolean(row.shuffle) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE playlists SET name=?, description=?, items=?, loop=?, shuffle=?, updated_at=? WHERE id=?
  `).run(body.name, body.description ?? '', JSON.stringify(body.items ?? []), body.loop ? 1 : 0, body.shuffle ? 1 : 0, now, params.id);
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, items: safeJson(row.items as string, []), loop: Boolean(row.loop), shuffle: Boolean(row.shuffle) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM playlists WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
