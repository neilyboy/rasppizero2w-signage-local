import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM display_settings WHERE id = 1').get() as Record<string, unknown>;
  return NextResponse.json({
    ...row,
    show_clock: Boolean(row.show_clock),
    show_ticker: Boolean(row.show_ticker),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE display_settings SET
      active_playlist_id=?, active_asset_id=?, mode=?, brightness=?,
      show_clock=?, show_ticker=?, ticker_speed=?, transition=?,
      transition_duration=?, theme=?, updated_at=?
    WHERE id=1
  `).run(
    body.active_playlist_id ?? null,
    body.active_asset_id ?? null,
    body.mode ?? 'playlist',
    body.brightness ?? 100,
    body.show_clock !== false ? 1 : 0,
    body.show_ticker !== false ? 1 : 0,
    body.ticker_speed ?? 50,
    body.transition ?? 'fade',
    body.transition_duration ?? 800,
    body.theme ?? 'dark',
    now
  );
  const row = db.prepare('SELECT * FROM display_settings WHERE id = 1').get() as Record<string, unknown>;
  return NextResponse.json({ ...row, show_clock: Boolean(row.show_clock), show_ticker: Boolean(row.show_ticker) });
}
