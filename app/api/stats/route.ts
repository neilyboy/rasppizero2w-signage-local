import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM stats_widgets ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    config: safeJson(r.config as string, {}),
    data: safeJson(r.data as string, []),
  })));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO stats_widgets (id, name, type, config, data_source, data, refresh_interval, color_scheme, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.name, body.type,
    JSON.stringify(body.config ?? {}),
    body.data_source ?? 'manual',
    JSON.stringify(body.data ?? []),
    body.refresh_interval ?? 3600,
    body.color_scheme ?? 'blue',
    now, now
  );
  const row = db.prepare('SELECT * FROM stats_widgets WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({ ...row, config: safeJson(row.config as string, {}), data: safeJson(row.data as string, []) }, { status: 201 });
}
