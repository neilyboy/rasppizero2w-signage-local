'use client';
import { useEffect, useState } from 'react';
import {
  Image, PlaySquare, CalendarDays, BarChart3, Tv2,
  Cpu, HardDrive, MemoryStick, Clock, TrendingUp, Activity, Zap
} from 'lucide-react';
import Link from 'next/link';

interface SystemStats {
  assets: number;
  playlists: number;
  schedules: number;
  widgets: number;
  cpuTemp: number | null;
  memUsed: number | null;
  memTotal: number | null;
  diskUsed: number | null;
  diskTotal: number | null;
  storageUsed: number | null;
  uptime: number | null;
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(1)} GB`;
}

function StatCard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; href?: string;
}) {
  const card = (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: '20px',
      border: '1px solid #334155', display: 'flex', alignItems: 'flex-start',
      gap: 14, transition: 'border-color 0.15s',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link>;
  return card;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: '#0f172a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const load = () => fetch('/api/system').then(r => r.json()).then(setStats).catch(() => {});
    load();
    const si = setInterval(load, 10000);
    const ti = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(si); clearInterval(ti); };
  }, []);

  const quickActions = [
    { label: 'Upload Media', href: '/admin/media', color: '#3b82f6', icon: Image },
    { label: 'New Playlist', href: '/admin/playlists', color: '#8b5cf6', icon: PlaySquare },
    { label: 'Add Schedule', href: '/admin/schedule', color: '#10b981', icon: CalendarDays },
    { label: 'New Widget', href: '/admin/stats', color: '#f59e0b', icon: BarChart3 },
    { label: 'Display Control', href: '/admin/display', color: '#ef4444', icon: Tv2 },
    { label: 'Analytics', href: '/admin/analytics', color: '#06b6d4', icon: Zap },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>
            {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{
          background: '#1e293b', borderRadius: 10, padding: '10px 18px',
          border: '1px solid #334155', textAlign: 'right'
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>LOCAL TIME</div>
        </div>
      </div>

      {/* Content stats */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', marginBottom: 12 }}>CONTENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Media Assets" value={stats?.assets ?? '—'} icon={Image} color="#3b82f6" href="/admin/media" />
          <StatCard label="Playlists" value={stats?.playlists ?? '—'} icon={PlaySquare} color="#8b5cf6" href="/admin/playlists" />
          <StatCard label="Scheduled Items" value={stats?.schedules ?? '—'} icon={CalendarDays} color="#10b981" href="/admin/schedule" />
          <StatCard label="Stat Widgets" value={stats?.widgets ?? '—'} icon={BarChart3} color="#f59e0b" href="/admin/stats" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {/* Pi Hardware Stats */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Cpu size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Pi Zero 2W Hardware</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* CPU Temp */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>CPU Temperature</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: stats?.cpuTemp != null ? (stats.cpuTemp > 70 ? '#ef4444' : stats.cpuTemp > 55 ? '#f59e0b' : '#10b981') : '#64748b' }}>
                  {stats?.cpuTemp != null ? `${stats.cpuTemp.toFixed(1)}°C` : 'N/A'}
                </span>
              </div>
              <ProgressBar value={stats?.cpuTemp ?? 0} max={85} color={stats?.cpuTemp != null && stats.cpuTemp > 70 ? '#ef4444' : '#10b981'} />
            </div>
            {/* Memory */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Memory</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                  {stats?.memUsed != null && stats?.memTotal != null
                    ? `${formatBytes(stats.memUsed)} / ${formatBytes(stats.memTotal)}`
                    : 'N/A'}
                </span>
              </div>
              <ProgressBar value={stats?.memUsed ?? 0} max={stats?.memTotal ?? 1} color="#8b5cf6" />
            </div>
            {/* Disk */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Disk Usage</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                  {stats?.diskUsed != null && stats?.diskTotal != null
                    ? `${formatBytes(stats.diskUsed)} / ${formatBytes(stats.diskTotal)}`
                    : 'N/A'}
                </span>
              </div>
              <ProgressBar value={stats?.diskUsed ?? 0} max={stats?.diskTotal ?? 1} color="#f59e0b" />
            </div>
            {/* Uptime */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#64748b" />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Uptime</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                {stats?.uptime != null ? formatUptime(stats.uptime) : 'N/A'}
              </span>
            </div>
            {/* Storage used by uploads */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={14} color="#64748b" />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Media Storage</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                {stats?.storageUsed != null ? formatBytes(stats.storageUsed) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map(({ label, href, color, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 8,
                  background: `${color}12`, border: `1px solid ${color}30`,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <Icon size={16} color={color} />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{label}</span>
              </Link>
            ))}
          </div>

          {/* Live display link */}
          <a
            href="/display"
            target="_blank"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px', borderRadius: 8, marginTop: 14,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              textDecoration: 'none', fontSize: 13, fontWeight: 700, color: 'white',
            }}
          >
            <Tv2 size={18} />
            Preview Display View
          </a>
        </div>
      </div>

      {/* System Status Banner */}
      <div style={{
        marginTop: 24, background: '#1e293b', borderRadius: 12, padding: '16px 20px',
        border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          <span style={{ color: '#10b981', fontWeight: 600 }}>System online</span> — Pi Zero 2W running PiSign
          {stats?.uptime != null && ` · Uptime: ${formatUptime(stats.uptime)}`}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} color="#64748b" />
          <span style={{ fontSize: 11, color: '#64748b' }}>Auto-refreshes every 10s</span>
        </div>
      </div>
    </div>
  );
}
