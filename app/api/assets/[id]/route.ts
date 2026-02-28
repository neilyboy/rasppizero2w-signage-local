import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...row, tags: safeJson(row.tags as string, []), metadata: safeJson(row.metadata as string, {}) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE assets SET name=?, type=?, url=?, content=?, thumbnail=?, duration=?, tags=?, metadata=?, updated_at=?
    WHERE id=?
  `).run(
    body.name, body.type, body.url ?? null, body.content ?? null,
    body.thumbnail ?? null, body.duration ?? 10,
    JSON.stringify(body.tags ?? []), JSON.stringify(body.metadata ?? {}),
    now, params.id
  );
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, tags: safeJson(row.tags as string, []), metadata: safeJson(row.metadata as string, {}) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM assets WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
