'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { DisplaySettings, Asset, Playlist, Announcement, StatsWidget } from '@/lib/types';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const COLOR_SCHEMES: Record<string, string[]> = {
  blue: ['#3b82f6', '#1d4ed8', '#93c5fd'],
  purple: ['#8b5cf6', '#6d28d9', '#c4b5fd'],
  green: ['#10b981', '#059669', '#6ee7b7'],
  orange: ['#f59e0b', '#d97706', '#fde68a'],
  red: ['#ef4444', '#dc2626', '#fca5a5'],
  cyan: ['#06b6d4', '#0891b2', '#a5f3fc'],
  multi: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
};

/* ─── Clock overlay ─── */
function ClockOverlay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'absolute', top: 24, right: 28, zIndex: 50,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      borderRadius: 12, padding: '10px 18px', border: '1px solid rgba(255,255,255,0.1)',
      textAlign: 'right',
    }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: 'white', fontFamily: 'monospace', lineHeight: 1 }}>
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
        {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

/* ─── Announcement ticker ─── */
function AnnouncementTicker({ announcements, speed }: { announcements: Announcement[]; speed: number }) {
  const active = announcements.filter(a => {
    if (!a.active) return false;
    const now = Date.now();
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
    if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
    return true;
  });
  if (active.length === 0) return null;

  const text = active.map(a => a.text).join('   ◆   ');
  const style = (active[0].style ?? {}) as Record<string, string>;
  const bgColor = style.bg_color ?? '#1d4ed8';
  const textColor = style.text_color ?? '#ffffff';
  const fontSize = { small: 16, medium: 20, large: 26, xlarge: 36 }[style.font_size ?? 'large'] ?? 26;
  const bold = style.bold === 'true';
  const duration = Math.max(10, (text.length * 10) / speed * 1000);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: bgColor, overflow: 'hidden', height: fontSize + 24,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        whiteSpace: 'nowrap',
        animation: `ticker ${duration}ms linear infinite`,
        fontSize, fontWeight: bold ? 700 : 400, color: textColor,
        paddingLeft: '100vw',
      }}>
        {text}
      </div>
    </div>
  );
}

/* ─── Stats widget renderer ─── */
function StatsDisplay({ widget }: { widget: StatsWidget }) {
  const colors = COLOR_SCHEMES[widget.color_scheme] ?? COLOR_SCHEMES.blue;
  const data = widget.data;
  const cfg = widget.config as Record<string, unknown>;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (widget.type !== 'countdown') return;
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [widget.type]);

  const bg = 'rgba(0,0,0,0.7)';

  if (widget.type === 'number') {
    const latest = data[data.length - 1];
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, borderRadius: 16 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>{widget.name}</div>
        <div style={{ fontSize: 80, fontWeight: 800, color: colors[0], lineHeight: 1 }}>{latest?.value ?? '—'}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{latest?.label ?? ''}</div>
      </div>
    );
  }

  if (widget.type === 'countdown') {
    const targetDate = cfg.target_date as string | undefined;
    if (!targetDate) return <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>No target date set</div>;
    const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const units = [{ v: days, l: 'DAYS' }, { v: hrs, l: 'HRS' }, { v: mins, l: 'MIN' }, { v: secs, l: 'SEC' }];
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, borderRadius: 16, gap: 12 }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{widget.name}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {units.map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: colors[0], lineHeight: 1, fontFamily: 'monospace' }}>{String(v).padStart(2, '0')}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{new Date(targetDate).toLocaleDateString()}</div>
      </div>
    );
  }

  if (widget.type === 'gauge') {
    const max = (cfg.max as number) ?? 100;
    const latest = data[data.length - 1]?.value ?? 0;
    const pct = Math.min(100, (latest / max) * 100);
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, borderRadius: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{widget.name}</div>
        <svg viewBox="0 0 200 120" style={{ width: '60%' }}>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={colors[0]} strokeWidth="14"
            strokeDasharray={`${(pct / 100) * 251} 251`} strokeLinecap="round" />
          <text x="100" y="110" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">{latest}</text>
          <text x="100" y="85" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">{pct.toFixed(0)}%</text>
        </svg>
      </div>
    );
  }

  if (widget.type === 'table') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: bg, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{widget.name}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>LABEL</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>VALUE</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 14px', fontSize: 14, color: 'white' }}>{row.label}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: colors[0] }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const chartProps = { data, margin: { top: 10, right: 10, bottom: 0, left: -10 } };
  const axisStyle = { fontSize: 12, fill: 'rgba(255,255,255,0.4)' };
  const tooltipStyle = { background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 13, color: 'white' };
  const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.08)' };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: bg, borderRadius: 16, padding: '12px 16px', gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{widget.name}</div>
      <div style={{ flex: 1 }}>
        {widget.type === 'chart_bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {widget.type === 'chart_line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...chartProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={3} dot={{ fill: colors[0], r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {widget.type === 'chart_area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...chartProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke={colors[0]} fill={`${colors[0]}40`} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {widget.type === 'chart_pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="70%">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ─── Webpage display — screenshot only, polls until ready ─── */
function WebpageDisplay({ url, style }: { url: string; style: React.CSSProperties }) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setScreenshotUrl(null);
    setFailed(false);
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/screenshot?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.status === 'ready' && data.url) {
          setScreenshotUrl(data.url + '?t=' + Date.now());
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'error') {
          setFailed(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        setFailed(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [url]);

  if (failed) {
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🌐</div>
        <div style={{ fontSize: 'clamp(16px, 3vw, 36px)', fontWeight: 700, color: 'white', textAlign: 'center' }}>{url}</div>
        <div style={{ fontSize: 'clamp(12px, 1.5vw, 18px)', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 600 }}>Could not capture screenshot of this page.</div>
      </div>
    );
  }

  if (!screenshotUrl) {
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid rgba(59,130,246,0.2)', borderTop: '4px solid #3b82f6', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 'clamp(14px, 2vw, 22px)', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Capturing screenshot…</div>
        <div style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: 500 }}>{url}</div>
      </div>
    );
  }

  return (
    <div style={{ ...style, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={screenshotUrl} alt={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

/* ─── Asset renderer ─── */
function AssetDisplay({ asset, transition, onEnded }: {
  asset: Asset;
  transition: string;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (asset.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [asset]);

  useEffect(() => {
    if (asset.type !== 'video') {
      const t = setTimeout(onEnded ?? (() => {}), (asset.duration ?? 10) * 1000);
      return () => clearTimeout(t);
    }
  }, [asset, onEnded]);

  const style: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    animation: transition !== 'none' ? 'fadeIn 0.8s ease' : undefined,
  };

  if (asset.type === 'image') {
    const fit = (asset.metadata as Record<string, string>)?.fit ?? 'contain';
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <img
          src={asset.url}
          alt={asset.name}
          style={{ maxWidth: '100%', maxHeight: '100%', width: fit === 'fill' ? '100%' : undefined, height: fit === 'fill' ? '100%' : undefined, objectFit: fit as React.CSSProperties['objectFit'] }}
        />
      </div>
    );
  }

  if (asset.type === 'video') {
    return (
      <video
        ref={videoRef}
        src={asset.url}
        style={{ ...style, objectFit: 'cover' }}
        autoPlay
        muted
        onEnded={onEnded}
        playsInline
      />
    );
  }

  if (asset.type === 'webpage') {
    return <WebpageDisplay url={asset.url ?? ''} style={style} />;
  }

  if (asset.type === 'text' || asset.type === 'announcement') {
    return (
      <div style={{
        ...style,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '60px',
      }}>
        <div style={{
          fontSize: 'clamp(24px, 4vw, 72px)',
          fontWeight: 700, color: 'white', textAlign: 'center',
          lineHeight: 1.4, maxWidth: '85%',
        }}>
          {asset.content}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Idle screen ─── */
function IdleScreen({ theme }: { theme: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const isDark = theme !== 'light';
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
    }}>
      <div style={{
        fontSize: 'clamp(48px, 12vw, 180px)', fontWeight: 800,
        color: isDark ? 'white' : '#0f172a', fontFamily: 'monospace', lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{
        fontSize: 'clamp(16px, 2.5vw, 36px)', fontWeight: 400,
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        marginTop: 12,
      }}>
        {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div style={{
        marginTop: 32, fontSize: 14,
        color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        PiSign
      </div>
    </div>
  );
}

/* ─── Main display ─── */
export default function DisplayPage() {
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [widgets, setWidgets] = useState<StatsWidget[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [, setTick] = useState(0);

  const precaptureWebpages = useCallback((assetList: Asset[], playlistData: Playlist | null) => {
    const webpageUrls: string[] = [];
    if (playlistData) {
      for (const item of playlistData.items) {
        const a = assetList.find(x => x.id === item.asset_id);
        if (a?.type === 'webpage' && a.url) webpageUrls.push(a.url);
      }
    }
    for (const url of webpageUrls) {
      fetch(`/api/screenshot?url=${encodeURIComponent(url)}`).catch(() => {});
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [s, a, ann, w] = await Promise.all([
        fetch('/api/display').then(r => r.json()),
        fetch('/api/assets').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ]);
      setSettings(s);
      setAssets(a);
      setAnnouncements(ann);
      setWidgets(w);

      let loadedPlaylist: Playlist | null = null;
      if (s.active_playlist_id) {
        const p = await fetch(`/api/playlists/${s.active_playlist_id}`).then(r => r.json());
        if (p && !p.error) { setPlaylist(p); loadedPlaylist = p; }
        else setPlaylist(null);
      } else {
        setPlaylist(null);
      }

      precaptureWebpages(a, loadedPlaylist);

      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'display_viewed' }),
      }).catch(() => {});
    } catch (err) {
      console.error('[display] loadAll error:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const refreshInterval = setInterval(loadAll, 30000);
    return () => clearInterval(refreshInterval);
  }, [loadAll]);

  const checkSchedule = useCallback(async () => {
    try {
      const schedule = await fetch('/api/schedule').then(r => r.json());
      const now = new Date();
      const active = schedule.find((entry: { start_time: string; end_time: string; active: boolean; playlist_id?: string; asset_id?: string }) => {
        if (!entry.active) return false;
        const s = new Date(entry.start_time);
        const e = new Date(entry.end_time);
        const nowHM = now.getHours() * 60 + now.getMinutes();
        const sHM = s.getHours() * 60 + s.getMinutes();
        const eHM = e.getHours() * 60 + e.getMinutes();

        if (entry.start_time.split('T')[0] === now.toISOString().split('T')[0]) {
          return nowHM >= sHM && nowHM <= eHM;
        }
        return false;
      });

      if (active) {
        if (active.playlist_id) {
          setSettings(s => s ? { ...s, active_playlist_id: active.playlist_id, mode: 'playlist' } : s);
          const p = await fetch(`/api/playlists/${active.playlist_id}`).then(r => r.json());
          if (p && !p.error) setPlaylist(p);
        } else if (active.asset_id) {
          setSettings(s => s ? { ...s, active_asset_id: active.asset_id, mode: 'asset' } : s);
        }
      }
    } catch (err) {
      console.error('[display] checkSchedule error:', err);
    }
  }, []);

  useEffect(() => {
    checkSchedule();
    const t = setInterval(checkSchedule, 60000);
    return () => clearInterval(t);
  }, [checkSchedule]);

  const handleNext = useCallback(() => {
    if (!playlist) return;
    const items = playlist.items;
    if (!items.length) return;
    const nextIdx = (currentIdx + 1) % items.length;
    setCurrentIdx(nextIdx);
    const item = items[nextIdx];
    const asset = assets.find(a => a.id === item.asset_id);
    if (asset) {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'asset_played', asset_id: asset.id, playlist_id: playlist.id }),
      }).catch(() => {});
    }
    setTick(t => t + 1);
  }, [playlist, currentIdx, assets]);

  if (!settings) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>Loading display...</div>
      </div>
    );
  }

  const isDark = settings.theme !== 'light';
  const brightness = settings.brightness / 100;

  /* Determine what content to show */
  let currentAsset: Asset | null = null;
  let statsWidget: StatsWidget | null = null;

  if (settings.mode === 'playlist' && playlist) {
    const items = playlist.items;
    if (items.length > 0) {
      // Find a valid asset starting from currentIdx, skipping items with missing assets
      let searchIdx = Math.min(currentIdx, items.length - 1);
      for (let i = 0; i < items.length; i++) {
        const candidate = assets.find(a => a.id === items[searchIdx].asset_id) ?? null;
        if (candidate) { currentAsset = candidate; break; }
        searchIdx = (searchIdx + 1) % items.length;
      }
      if (currentAsset?.type === 'stats') {
        statsWidget = widgets.find(w => w.id === (currentAsset?.metadata as Record<string, string>)?.widget_id) ?? null;
      }
    }
  } else if (settings.mode === 'asset' && settings.active_asset_id) {
    currentAsset = assets.find(a => a.id === settings.active_asset_id) ?? null;
    if (currentAsset?.type === 'stats') {
      statsWidget = widgets.find(w => w.id === (currentAsset?.metadata as Record<string, string>)?.widget_id) ?? null;
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      position: 'relative', cursor: 'none',
      background: isDark ? '#000' : '#fff',
      filter: `brightness(${brightness})`,
    }}>
      {/* Main content */}
      {settings.mode === 'idle' || !currentAsset ? (
        <IdleScreen theme={settings.theme} />
      ) : statsWidget ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: isDark ? '#0f172a' : '#f8fafc' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: 1400 }}>
            <StatsDisplay widget={statsWidget} />
          </div>
        </div>
      ) : (
        <AssetDisplay
          key={`${currentAsset.id}-${currentIdx}`}
          asset={currentAsset}
          transition={settings.transition}
          onEnded={handleNext}
        />
      )}

      {/* Clock overlay */}
      {settings.show_clock && <ClockOverlay />}

      {/* Announcement ticker */}
      {settings.show_ticker && announcements.length > 0 && (
        <AnnouncementTicker announcements={announcements} speed={settings.ticker_speed} />
      )}

      {/* Admin hint (bottom-left, very subtle) */}
      <div style={{
        position: 'absolute', bottom: settings.show_ticker && announcements.some(a => a.active) ? 50 : 10,
        left: 16, zIndex: 40, opacity: 0.15,
      }}>
        <a href="/admin" style={{ fontSize: 10, color: 'white', textDecoration: 'none', letterSpacing: '0.08em' }}>
          ADMIN
        </a>
      </div>
    </div>
  );
}
