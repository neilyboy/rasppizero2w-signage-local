import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');

  let query = 'SELECT * FROM assets';
  const params: string[] = [];
  const conditions: string[] = [];

  if (type) { conditions.push('type = ?'); params.push(type); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  const assets = rows.map(r => ({
    ...r,
    tags: safeJson(r.tags as string, []),
    metadata: safeJson(r.metadata as string, {}),
    duration: r.duration as number,
    loop: Boolean(r.loop),
  }));

  const filtered = tag ? assets.filter((a: Record<string, unknown>) => (a.tags as string[]).includes(tag)) : assets;
  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO assets (id, name, type, url, content, thumbnail, duration, tags, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, body.name, body.type,
    body.url ?? null, body.content ?? null, body.thumbnail ?? null,
    body.duration ?? 10,
    JSON.stringify(body.tags ?? []),
    JSON.stringify(body.metadata ?? {}),
    now, now
  );

  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({
    ...asset,
    tags: safeJson(asset.tags as string, []),
    metadata: safeJson(asset.metadata as string, {}),
  }, { status: 201 });
}
