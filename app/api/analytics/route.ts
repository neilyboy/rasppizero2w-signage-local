import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') ?? '7');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const events = db.prepare(
    'SELECT * FROM analytics WHERE recorded_at >= ? ORDER BY recorded_at DESC LIMIT 500'
  ).all(since);

  const summary = db.prepare(`
    SELECT event, COUNT(*) as count, AVG(value) as avg_value
    FROM analytics WHERE recorded_at >= ?
    GROUP BY event ORDER BY count DESC
  `).all(since);

  const byDay = db.prepare(`
    SELECT DATE(recorded_at) as day, event, COUNT(*) as count
    FROM analytics WHERE recorded_at >= ?
    GROUP BY day, event ORDER BY day ASC
  `).all(since);

  const topAssets = db.prepare(`
    SELECT asset_id, COUNT(*) as plays
    FROM analytics WHERE event='asset_played' AND asset_id IS NOT NULL AND recorded_at >= ?
    GROUP BY asset_id ORDER BY plays DESC LIMIT 10
  `).all(since);

  return NextResponse.json({ events, summary, byDay, topAssets });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  db.prepare(`
    INSERT INTO analytics (event, asset_id, playlist_id, value) VALUES (?, ?, ?, ?)
  `).run(body.event, body.asset_id ?? null, body.playlist_id ?? null, body.value ?? null);
  return NextResponse.json({ success: true });
}
