export type AssetType = 'image' | 'video' | 'webpage' | 'text' | 'stats' | 'announcement';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url?: string;
  content?: string;
  thumbnail?: string;
  duration: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  asset_id: string;
  duration?: number;
  transition?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  items: PlaylistItem[];
  loop: boolean;
  shuffle: boolean;
  created_at: string;
  updated_at: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom';

export interface ScheduleEntry {
  id: string;
  title: string;
  playlist_id?: string;
  asset_id?: string;
  start_time: string;
  end_time: string;
  recurrence: RecurrenceType;
  recurrence_days: number[];
  color: string;
  active: boolean;
  created_at: string;
}

export type WidgetType = 'number' | 'chart_line' | 'chart_bar' | 'chart_pie' | 'chart_area' | 'gauge' | 'table' | 'countdown' | 'weather' | 'clock';

export interface DataPoint {
  label: string;
  value: number;
  category?: string;
  date?: string;
}

export interface StatsWidget {
  id: string;
  name: string;
  type: WidgetType;
  config: Record<string, unknown>;
  data_source: string;
  data: DataPoint[];
  refresh_interval: number;
  color_scheme: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  text: string;
  style: Record<string, unknown>;
  priority: number;
  active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
}

export interface DisplaySettings {
  id: number;
  active_playlist_id?: string;
  active_asset_id?: string;
  mode: 'playlist' | 'asset' | 'idle';
  brightness: number;
  show_clock: boolean;
  show_ticker: boolean;
  ticker_speed: number;
  transition: string;
  transition_duration: number;
  theme: 'dark' | 'light';
  updated_at: string;
}

export interface AnalyticsEvent {
  id: number;
  event: string;
  asset_id?: string;
  playlist_id?: string;
  value?: number;
  recorded_at: string;
}
