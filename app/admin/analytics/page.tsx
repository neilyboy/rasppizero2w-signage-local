'use client';
import { useEffect, useState, useCallback } from 'react';
import { Zap, RefreshCw, TrendingUp, BarChart3, PlaySquare, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AnalyticsData {
  summary: { event: string; count: number; avg_value: number }[];
  byDay: { day: string; event: string; count: number }[];
  topAssets: { asset_id: string; plays: number }[];
}

const EVENT_COLORS: Record<string, string> = {
  asset_played: '#3b82f6',
  playlist_started: '#8b5cf6',
  display_viewed: '#10b981',
  asset_skipped: '#f59e0b',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const chartData = (() => {
    if (!data) return [];
    const byDayMap: Record<string, Record<string, number>> = {};
    for (const d of data.byDay) {
      if (!byDayMap[d.day]) byDayMap[d.day] = {};
      byDayMap[d.day][d.event] = (byDayMap[d.day][d.event] ?? 0) + d.count;
    }
    return Object.entries(byDayMap).map(([day, events]) => ({ day, ...events }));
  })();

  const totalEvents = data?.summary.reduce((s, e) => s + e.count, 0) ?? 0;
  const uniqueEvents = data?.summary.length ?? 0;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Analytics</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Display usage and content performance</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid',
                  borderColor: days === d ? '#3b82f6' : '#334155',
                  background: days === d ? 'rgba(59,130,246,0.15)' : '#1e293b',
                  color: days === d ? '#3b82f6' : '#64748b',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Events', value: totalEvents, icon: Zap, color: '#3b82f6' },
          { label: 'Event Types', value: uniqueEvents, icon: Activity, color: '#8b5cf6' },
          { label: 'Assets Played', value: data?.topAssets.length ?? 0, icon: PlaySquare, color: '#10b981' },
          { label: 'Days Tracked', value: days, icon: TrendingUp, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Events over time */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={16} color="#3b82f6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Events Over Time</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                {['asset_played', 'playlist_started', 'display_viewed'].map(event => (
                  <Line key={event} type="monotone" dataKey={event} name={event.replace(/_/g, ' ')}
                    stroke={EVENT_COLORS[event] ?? '#64748b'} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <div style={{ textAlign: 'center' }}>
                <BarChart3 size={36} color="#334155" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>No events recorded yet</div>
                <div style={{ fontSize: 12, marginTop: 4, color: '#334155' }}>Events are tracked as the display runs</div>
              </div>
            </div>
          )}
        </div>

        {/* Event breakdown */}
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart3 size={16} color="#8b5cf6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Event Breakdown</span>
          </div>
          {data && data.summary.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.summary} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis type="category" dataKey="event" tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={v => v.replace(/_/g, ' ')} width={60} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.summary.map((entry, i) => (
                    <Cell key={i} fill={EVENT_COLORS[entry.event] ?? '#334155'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
              No data
            </div>
          )}
        </div>
      </div>

      {/* Top assets */}
      {data && data.topAssets.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 24, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <PlaySquare size={16} color="#10b981" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Top Assets by Plays</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topAssets.map((asset, i) => (
              <div key={asset.asset_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b', width: 20 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{asset.asset_id.slice(0, 8)}...</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{asset.plays} plays</span>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 3, height: 4 }}>
                    <div style={{
                      width: `${(asset.plays / (data.topAssets[0]?.plays ?? 1)) * 100}%`,
                      height: '100%', background: '#10b981', borderRadius: 3,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event summary table */}
      {data && data.summary.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginTop: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Event Summary (Last {days} days)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Event', 'Count', 'Avg Value'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.06em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.summary.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a2540' }}>
                  <td style={{ padding: '10px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f1f5f9' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[row.event] ?? '#64748b', display: 'inline-block' }} />
                      {row.event.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{row.count}</td>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: '#64748b' }}>
                    {row.avg_value != null ? row.avg_value.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
