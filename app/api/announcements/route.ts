import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM announcements ORDER BY priority DESC, created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    style: safeJson(r.style as string, {}),
    active: Boolean(r.active),
  })));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO announcements (id, text, style, priority, active, starts_at, ends_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.text,
    JSON.stringify(body.style ?? {}),
    body.priority ?? 0,
    body.active !== false ? 1 : 0,
    body.starts_at ?? null,
    body.ends_at ?? null,
    now
  );
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ ...row, style: safeJson(row.style as string, {}), active: Boolean(row.active) }, { status: 201 });
}
