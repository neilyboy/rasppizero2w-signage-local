'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, BarChart3, X, RefreshCw,
  TrendingUp, PieChart, Activity, Hash, Clock, Table2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { StatsWidget, WidgetType, DataPoint } from '@/lib/types';

const COLOR_SCHEMES: Record<string, string[]> = {
  blue: ['#3b82f6', '#1d4ed8', '#93c5fd'],
  purple: ['#8b5cf6', '#6d28d9', '#c4b5fd'],
  green: ['#10b981', '#059669', '#6ee7b7'],
  orange: ['#f59e0b', '#d97706', '#fde68a'],
  red: ['#ef4444', '#dc2626', '#fca5a5'],
  cyan: ['#06b6d4', '#0891b2', '#a5f3fc'],
  multi: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
};

const WIDGET_ICONS: Record<WidgetType, React.ElementType> = {
  number: Hash,
  chart_line: TrendingUp,
  chart_bar: BarChart3,
  chart_pie: PieChart,
  chart_area: Activity,
  gauge: Activity,
  table: Table2,
  countdown: Clock,
  weather: Activity,
  clock: Clock,
};

function MiniChart({ widget }: { widget: StatsWidget }) {
  const colors = COLOR_SCHEMES[widget.color_scheme] ?? COLOR_SCHEMES.blue;
  const data = widget.data;

  if (widget.type === 'chart_line' || widget.type === 'chart_area') {
    const Comp = widget.type === 'chart_area' ? AreaChart : LineChart;
    const DataComp = widget.type === 'chart_area' ? Area : Line;
    return (
      <ResponsiveContainer width="100%" height={120}>
        <Comp data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
          <DataComp type="monotone" dataKey="value" stroke={colors[0]} fill={`${colors[0]}40`} strokeWidth={2} dot={false} />
        </Comp>
      </ResponsiveContainer>
    );
  }

  if (widget.type === 'chart_bar') {
    return (
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (widget.type === 'chart_pie') {
    return (
      <ResponsiveContainer width="100%" height={120}>
        <RechartsPie>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={50}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
        </RechartsPie>
      </ResponsiveContainer>
    );
  }

  if (widget.type === 'number') {
    const latest = data[data.length - 1];
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: colors[0] }}>
          {latest?.value ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{latest?.label ?? ''}</div>
      </div>
    );
  }

  if (widget.type === 'gauge') {
    const max = (widget.config as { max?: number }).max ?? 100;
    const latest = data[data.length - 1]?.value ?? 0;
    const pct = Math.min(100, (latest / max) * 100);
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ position: 'relative', height: 80 }}>
          <svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" />
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={colors[0]} strokeWidth="16"
              strokeDasharray={`${(pct / 100) * 251} 251`} strokeLinecap="round" />
            <text x="100" y="115" textAnchor="middle" fill={colors[0]} fontSize="22" fontWeight="bold">{latest.toFixed(1)}</text>
          </svg>
        </div>
      </div>
    );
  }

  if (widget.type === 'countdown') {
    const targetDate = (widget.config as { target_date?: string }).target_date;
    if (!targetDate) return <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>Set a target date</div>;
    const diff = new Date(targetDate).getTime() - Date.now();
    const days = Math.max(0, Math.floor(diff / 86400000));
    const hrs = Math.max(0, Math.floor((diff % 86400000) / 3600000));
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          {[{ v: days, l: 'days' }, { v: hrs, l: 'hrs' }].map(({ v, l }) => (
            <div key={l}>
              <div style={{ fontSize: 32, fontWeight: 800, color: colors[0] }}>{v}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div style={{ padding: 20, color: '#64748b', fontSize: 13, textAlign: 'center' }}>Preview not available</div>;
}

interface FormState {
  name: string;
  type: WidgetType;
  color_scheme: string;
  refresh_interval: number;
  config_json: string;
  data_csv: string;
}

const defaultForm = (): FormState => ({
  name: '', type: 'chart_bar', color_scheme: 'blue',
  refresh_interval: 3600, config_json: '{}',
  data_csv: 'Mon,120\nTue,145\nWed,98\nThu,167\nFri,134\nSat,89\nSun,72',
});

function csvToData(csv: string): DataPoint[] {
  return csv.split('\n').filter(l => l.trim()).map(line => {
    const parts = line.split(',');
    return { label: parts[0]?.trim() ?? '', value: parseFloat(parts[1] ?? '0') || 0 };
  });
}

export default function StatsPage() {
  const [widgets, setWidgets] = useState<StatsWidget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<StatsWidget | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/stats').then(r => r.json()).then(setWidgets).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingWidget(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (w: StatsWidget) => {
    setEditingWidget(w);
    setForm({
      name: w.name, type: w.type, color_scheme: w.color_scheme,
      refresh_interval: w.refresh_interval,
      config_json: JSON.stringify(w.config, null, 2),
      data_csv: w.data.map(d => `${d.label},${d.value}`).join('\n'),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let config = {};
    try { config = JSON.parse(form.config_json); } catch {}
    const payload = {
      name: form.name, type: form.type,
      color_scheme: form.color_scheme,
      refresh_interval: form.refresh_interval,
      config, data: csvToData(form.data_csv),
      data_source: 'manual',
    };
    if (editingWidget) {
      await fetch(`/api/stats/${editingWidget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/stats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this widget?')) return;
    await fetch(`/api/stats/${id}`, { method: 'DELETE' });
    load();
  };

  const previewWidget: StatsWidget | null = form.name ? {
    id: 'preview', name: form.name, type: form.type as WidgetType,
    color_scheme: form.color_scheme,
    config: (() => { try { return JSON.parse(form.config_json); } catch { return {}; } })(),
    data: csvToData(form.data_csv),
    data_source: 'manual', refresh_interval: form.refresh_interval,
    created_at: '', updated_at: '',
  } : null;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Stats & Charts</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Create data visualizations for your signage</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> New Widget
          </button>
        </div>
      </div>

      {/* Widget types legend */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['number', 'chart_bar', 'chart_line', 'chart_area', 'chart_pie', 'gauge', 'countdown', 'table'] as WidgetType[]).map(t => {
          const Icon = WIDGET_ICONS[t];
          return (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#64748b', fontSize: 11 }}>
              <Icon size={12} /> {t.replace('chart_', '')}
            </span>
          );
        })}
      </div>

      {widgets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>
          <BarChart3 size={48} color="#334155" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#64748b' }}>No widgets yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create stat widgets to display charts, numbers, and countdowns on your signage</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {widgets.map(widget => {
            const Icon = WIDGET_ICONS[widget.type];
            const colors = COLOR_SCHEMES[widget.color_scheme] ?? COLOR_SCHEMES.blue;
            return (
              <div key={widget.id} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={16} color={colors[0]} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{widget.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${colors[0]}20`, color: colors[0] }}>
                      {widget.type.replace('chart_', '')}
                    </span>
                    <button onClick={() => openEdit(widget)} style={{ padding: '4px 6px', borderRadius: 5, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
                      <Edit2 size={11} />
                    </button>
                    <button onClick={() => handleDelete(widget.id)} style={{ padding: '4px 6px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <MiniChart widget={widget} />
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid #334155', display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{widget.data.length} data points</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>•</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{widget.color_scheme} scheme</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 760, maxWidth: '95vw', border: '1px solid #334155', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editingWidget ? 'Edit Widget' : 'New Widget'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Widget Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Chart Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as WidgetType }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                    <option value="number">Single Number / KPI</option>
                    <option value="chart_bar">Bar Chart</option>
                    <option value="chart_line">Line Chart</option>
                    <option value="chart_area">Area Chart</option>
                    <option value="chart_pie">Pie / Donut Chart</option>
                    <option value="gauge">Gauge / Progress</option>
                    <option value="countdown">Countdown Timer</option>
                    <option value="table">Data Table</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Color Scheme</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(COLOR_SCHEMES).map(([name, colors]) => (
                      <button key={name} onClick={() => setForm(f => ({ ...f, color_scheme: name }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                          border: `1px solid ${form.color_scheme === name ? colors[0] : '#334155'}`,
                          background: form.color_scheme === name ? `${colors[0]}20` : 'transparent',
                          cursor: 'pointer', fontSize: 11, color: form.color_scheme === name ? colors[0] : '#64748b',
                        }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {colors.slice(0, 3).map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
                        </div>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {form.type === 'countdown' && (
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Target Date/Time</label>
                    <input
                      type="datetime-local"
                      value={(() => { try { return JSON.parse(form.config_json).target_date ?? ''; } catch { return ''; } })()}
                      onChange={e => setForm(f => {
                        let cfg = {};
                        try { cfg = JSON.parse(f.config_json); } catch {}
                        return { ...f, config_json: JSON.stringify({ ...cfg, target_date: e.target.value }) };
                      })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                )}

                {form.type === 'gauge' && (
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Max Value</label>
                    <input
                      type="number"
                      value={(() => { try { return JSON.parse(form.config_json).max ?? 100; } catch { return 100; } })()}
                      onChange={e => setForm(f => {
                        let cfg = {};
                        try { cfg = JSON.parse(f.config_json); } catch {}
                        return { ...f, config_json: JSON.stringify({ ...cfg, max: parseInt(e.target.value) || 100 }) };
                      })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Data (CSV format: label,value per line)
                  </label>
                  <textarea value={form.data_csv} onChange={e => setForm(f => ({ ...f, data_csv: e.target.value }))}
                    rows={8} placeholder="Mon,120&#10;Tue,145&#10;Wed,98"
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'monospace' }} />
                </div>
              </div>

              {/* Right: Preview */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Live Preview</label>
                <div style={{ background: '#0f172a', borderRadius: 10, border: '1px solid #334155', padding: 16 }}>
                  {previewWidget ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>{previewWidget.name}</div>
                      <MiniChart widget={previewWidget} />
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 13 }}>Enter a name to see preview</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editingWidget ? 'Update Widget' : 'Create Widget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
