import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  db.prepare(`
    UPDATE announcements SET text=?, style=?, priority=?, active=?, starts_at=?, ends_at=? WHERE id=?
  `).run(body.text, JSON.stringify(body.style ?? {}), body.priority ?? 0, body.active !== false ? 1 : 0, body.starts_at ?? null, body.ends_at ?? null, params.id);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(params.id) as Record<string, unknown>;
  return NextResponse.json({ ...row, style: safeJson(row.style as string, {}), active: Boolean(row.active) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM announcements WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
