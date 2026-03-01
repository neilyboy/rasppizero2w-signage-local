import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    items: safeJson(r.items as string, []),
    loop: Boolean(r.loop),
    shuffle: Boolean(r.shuffle),
  })));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO playlists (id, name, description, items, loop, shuffle, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, body.name, body.description ?? '', JSON.stringify(body.items ?? []), body.loop ? 1 : 0, body.shuffle ? 1 : 0, now, now);
  const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ ...row, items: safeJson(row.items as string, []), loop: Boolean(row.loop), shuffle: Boolean(row.shuffle) }, { status: 201 });
}
