'use client';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Edit2, CalendarDays, X, RefreshCw, Clock, Repeat } from 'lucide-react';
import { ScheduleEntry, Playlist, Asset, RecurrenceType } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const Calendar = dynamic(() => import('react-big-calendar').then(m => m.Calendar), { ssr: false });

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toCalEvent(entry: ScheduleEntry) {
  return {
    id: entry.id,
    title: entry.title,
    start: new Date(entry.start_time),
    end: new Date(entry.end_time),
    resource: entry,
  };
}

interface FormState {
  title: string;
  playlist_id: string;
  asset_id: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  recurrence: RecurrenceType;
  recurrence_days: number[];
  color: string;
  active: boolean;
}

const defaultForm = (): FormState => {
  const now = new Date();
  const later = new Date(now.getTime() + 3600000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    title: '', playlist_id: '', asset_id: '',
    start_date: dateStr, start_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    end_date: dateStr, end_time: `${pad(later.getHours())}:${pad(later.getMinutes())}`,
    recurrence: 'none', recurrence_days: [],
    color: '#3b82f6', active: true,
  };
};

export default function SchedulePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [calView, setCalView] = useState<'month' | 'week' | 'day' | 'agenda'>('week');
  const [calDate, setCalDate] = useState(new Date());
  const [localizer, setLocalizer] = useState<unknown>(null);

  useEffect(() => {
    import('react-big-calendar').then(m => {
      import('date-fns').then(dateFns => {
        const loc = m.dateFnsLocalizer({
          format: dateFns.format,
          parse: dateFns.parse,
          startOfWeek: () => new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
          getDay: dateFns.getDay,
          locales: {},
        });
        setLocalizer(loc);
      });
    });
  }, []);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/schedule').then(r => r.json()),
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]).then(([s, p, a]) => { setEntries(s); setPlaylists(p); setAssets(a); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = (slotInfo?: { start: Date; end: Date }) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const f = defaultForm();
    if (slotInfo) {
      const s = slotInfo.start;
      const e = slotInfo.end;
      f.start_date = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
      f.start_time = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
      f.end_date = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;
      f.end_time = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
    }
    setEditingEntry(null);
    setForm(f);
    setShowModal(true);
  };

  const openEdit = (entry: ScheduleEntry) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const s = new Date(entry.start_time);
    const e = new Date(entry.end_time);
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      playlist_id: entry.playlist_id ?? '',
      asset_id: entry.asset_id ?? '',
      start_date: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`,
      start_time: `${pad(s.getHours())}:${pad(s.getMinutes())}`,
      end_date: `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`,
      end_time: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
      recurrence: entry.recurrence,
      recurrence_days: entry.recurrence_days,
      color: entry.color,
      active: entry.active,
    });
    setShowModal(true);
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      recurrence_days: f.recurrence_days.includes(day)
        ? f.recurrence_days.filter(d => d !== day)
        : [...f.recurrence_days, day],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      playlist_id: form.playlist_id || null,
      asset_id: form.asset_id || null,
      start_time: `${form.start_date}T${form.start_time}:00`,
      end_time: `${form.end_date}T${form.end_time}:00`,
      recurrence: form.recurrence,
      recurrence_days: form.recurrence_days,
      color: form.color,
      active: form.active,
    };
    if (editingEntry) {
      await fetch(`/api/schedule/${editingEntry.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule entry?')) return;
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
    load();
  };

  const calEvents = entries.map(toCalEvent);

  const eventStyleGetter = (event: { resource: ScheduleEntry }) => ({
    style: {
      backgroundColor: event.resource.color,
      border: 'none',
      borderRadius: '4px',
      opacity: event.resource.active ? 1 : 0.4,
    },
  });

  return (
    <div style={{ padding: 32, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Schedule</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{entries.length} scheduled entries</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => openAdd()} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20, marginBottom: 24 }}>
        {localizer ? (
          // @ts-expect-error dynamic import
          <Calendar
            localizer={localizer}
            events={calEvents}
            view={calView}
            onView={(v: 'month' | 'week' | 'day' | 'agenda') => setCalView(v)}
            date={calDate}
            onNavigate={setCalDate}
            style={{ height: 500 }}
            eventPropGetter={eventStyleGetter}
            onSelectSlot={openAdd}
            onSelectEvent={(e: { resource: ScheduleEntry }) => openEdit(e.resource)}
            selectable
            views={['month', 'week', 'day', 'agenda']}
          />
        ) : (
          <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Loading calendar...
          </div>
        )}
      </div>

      {/* List view */}
      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>All Schedule Entries</span>
        </div>
        {entries.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
            <CalendarDays size={36} color="#334155" style={{ marginBottom: 8 }} />
            <div>No entries yet — click &ldquo;Add Entry&rdquo; or click on the calendar</div>
          </div>
        ) : (
          <div>
            {entries.map(entry => {
              const playlist = playlists.find(p => p.id === entry.playlist_id);
              const asset = assets.find(a => a.id === entry.asset_id);
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #1a2540' }}>
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: entry.active ? '#f1f5f9' : '#475569', marginBottom: 3 }}>
                      {entry.title}
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {format(parseISO(entry.start_time), 'MMM d, h:mm a')} – {format(parseISO(entry.end_time), 'h:mm a')}
                      </span>
                      {entry.recurrence !== 'none' && (
                        <span style={{ fontSize: 11, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Repeat size={11} /> {entry.recurrence}
                        </span>
                      )}
                      {playlist && <span style={{ fontSize: 11, color: '#3b82f6' }}>▶ {playlist.name}</span>}
                      {asset && <span style={{ fontSize: 11, color: '#10b981' }}>◆ {asset.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: entry.active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: entry.active ? '#10b981' : '#64748b' }}>
                      {entry.active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => openEdit(entry)} style={{ padding: '5px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 540, maxWidth: '95vw', border: '1px solid #334155', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editingEntry ? 'Edit Schedule' : 'New Schedule Entry'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>End Time</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Playlist</label>
                <select value={form.playlist_id} onChange={e => setForm(f => ({ ...f, playlist_id: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="">— None —</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Or specific Asset</label>
                <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="">— None —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Recurrence</label>
                <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as RecurrenceType }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="none">No recurrence (one-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays (Mon–Fri)</option>
                  <option value="weekends">Weekends (Sat–Sun)</option>
                  <option value="weekly">Weekly (same day)</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>

              {form.recurrence === 'custom' && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Custom Days</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {DAY_LABELS.map((d, i) => (
                      <button key={i} onClick={() => toggleDay(i)}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid',
                          borderColor: form.recurrence_days.includes(i) ? '#3b82f6' : '#334155',
                          background: form.recurrence_days.includes(i) ? 'rgba(59,130,246,0.2)' : 'transparent',
                          color: form.recurrence_days.includes(i) ? '#3b82f6' : '#64748b',
                          cursor: 'pointer', fontSize: 11, fontWeight: 500
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                Active (will show in display)
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.title}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.title ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : editingEntry ? 'Update Entry' : 'Create Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
