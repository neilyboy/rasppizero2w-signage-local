import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'signage.db');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image','video','webpage','text','stats','announcement')),
      url TEXT,
      content TEXT,
      thumbnail TEXT,
      duration INTEGER DEFAULT 10,
      tags TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      items TEXT DEFAULT '[]',
      loop INTEGER DEFAULT 1,
      shuffle INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      playlist_id TEXT,
      asset_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      recurrence TEXT DEFAULT 'none',
      recurrence_days TEXT DEFAULT '[]',
      color TEXT DEFAULT '#3b82f6',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE SET NULL,
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS stats_widgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('number','chart_line','chart_bar','chart_pie','chart_area','gauge','table','countdown','weather','clock')),
      config TEXT DEFAULT '{}',
      data_source TEXT DEFAULT 'manual',
      data TEXT DEFAULT '[]',
      refresh_interval INTEGER DEFAULT 3600,
      color_scheme TEXT DEFAULT 'blue',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      style TEXT DEFAULT '{}',
      priority INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS display_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      active_playlist_id TEXT,
      active_asset_id TEXT,
      mode TEXT DEFAULT 'playlist',
      brightness INTEGER DEFAULT 100,
      show_clock INTEGER DEFAULT 1,
      show_ticker INTEGER DEFAULT 1,
      ticker_speed INTEGER DEFAULT 50,
      transition TEXT DEFAULT 'fade',
      transition_duration INTEGER DEFAULT 800,
      theme TEXT DEFAULT 'dark',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO display_settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      asset_id TEXT,
      playlist_id TEXT,
      value REAL,
      recorded_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
