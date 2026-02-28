'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, Megaphone, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Announcement } from '@/lib/types';

const FONT_SIZES = ['small', 'medium', 'large', 'xlarge'];
const FONT_SIZE_MAP: Record<string, number> = { small: 18, medium: 24, large: 32, xlarge: 48 };
const BG_COLORS = ['#1e293b', '#1d4ed8', '#065f46', '#92400e', '#7f1d1d', '#1e1b4b', '#0c4a6e', '#000000'];
const TEXT_COLORS = ['#ffffff', '#f1f5f9', '#fef3c7', '#d1fae5', '#fee2e2', '#e0e7ff'];

interface FormState {
  text: string;
  priority: number;
  active: boolean;
  starts_at: string;
  ends_at: string;
  bg_color: string;
  text_color: string;
  font_size: string;
  bold: boolean;
}

const defaultForm = (): FormState => ({
  text: '', priority: 0, active: true,
  starts_at: '', ends_at: '',
  bg_color: '#1d4ed8', text_color: '#ffffff',
  font_size: 'large', bold: false,
});

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/announcements').then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(defaultForm()); setShowModal(true); };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    const style = a.style as Record<string, string>;
    setForm({
      text: a.text,
      priority: a.priority,
      active: a.active,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : '',
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : '',
      bg_color: style.bg_color ?? '#1d4ed8',
      text_color: style.text_color ?? '#ffffff',
      font_size: style.font_size ?? 'large',
      bold: style.bold === 'true',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      text: form.text,
      priority: form.priority,
      active: form.active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      style: {
        bg_color: form.bg_color,
        text_color: form.text_color,
        font_size: form.font_size,
        bold: String(form.bold),
      },
    };
    if (editing) {
      await fetch(`/api/announcements/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleActive = async (a: Announcement) => {
    const style = a.style as Record<string, string>;
    await fetch(`/api/announcements/${a.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...a, style, active: !a.active }),
    });
    load();
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Announcements</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Ticker-style text overlays for the display</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> New Announcement
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: '#93c5fd' }}>
          Active announcements appear as a scrolling ticker at the bottom of the display. Priority determines order (higher = first).
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>
          <Megaphone size={48} color="#334155" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#64748b' }}>No announcements yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create announcements to show a scrolling ticker on the display</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const style = item.style as Record<string, string>;
            const bgColor = style.bg_color ?? '#1d4ed8';
            const textColor = style.text_color ?? '#ffffff';
            const fontSize = style.font_size ?? 'large';
            const bold = style.bold === 'true';
            const now = new Date();
            const started = !item.starts_at || new Date(item.starts_at) <= now;
            const notExpired = !item.ends_at || new Date(item.ends_at) >= now;
            const isLive = item.active && started && notExpired;

            return (
              <div key={item.id} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                {/* Preview */}
                <div style={{
                  padding: '14px 20px', background: bgColor,
                  borderBottom: '1px solid #334155',
                }}>
                  <div style={{ fontSize: FONT_SIZE_MAP[fontSize] ?? 24, fontWeight: bold ? 700 : 400, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.text}
                  </div>
                </div>

                {/* Controls */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isLive ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        LIVE
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
                        {!item.active ? 'Inactive' : !started ? 'Scheduled' : 'Expired'}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: 12, color: '#64748b' }}>Priority: {item.priority}</span>

                  {item.starts_at && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      From: {new Date(item.starts_at).toLocaleDateString()}
                    </span>
                  )}
                  {item.ends_at && (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Until: {new Date(item.ends_at).toLocaleDateString()}
                    </span>
                  )}

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleActive(item)}
                      style={{
                        padding: '5px 10px', borderRadius: 6, border: '1px solid',
                        borderColor: item.active ? 'rgba(16,185,129,0.3)' : '#334155',
                        background: item.active ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: item.active ? '#10b981' : '#64748b', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                      }}
                    >
                      {item.active ? <><CheckCircle size={12} /> Active</> : <><X size={12} /> Inactive</>}
                    </button>
                    <button onClick={() => openEdit(item)} style={{ padding: '5px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 600, maxWidth: '95vw', border: '1px solid #334155', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Live preview */}
            <div style={{
              marginBottom: 20, padding: '14px 20px', borderRadius: 10,
              background: form.bg_color, border: '1px solid #334155',
            }}>
              <div style={{ fontSize: FONT_SIZE_MAP[form.font_size] ?? 24, fontWeight: form.bold ? 700 : 400, color: form.text_color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.text || 'Announcement preview...'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Announcement Text *</label>
                <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  rows={3} placeholder="Breaking: Office closed Friday for holiday"
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Background Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {BG_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, bg_color: c }))}
                        style={{ width: 28, height: 28, borderRadius: 6, background: c, border: form.bg_color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Text Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {TEXT_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, text_color: c }))}
                        style={{ width: 28, height: 28, borderRadius: 6, background: c, border: form.text_color === c ? '2px solid #3b82f6' : '2px solid #334155', cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Font Size</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {FONT_SIZES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, font_size: s }))}
                        style={{
                          flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid',
                          borderColor: form.font_size === s ? '#3b82f6' : '#334155',
                          background: form.font_size === s ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: form.font_size === s ? '#3b82f6' : '#64748b',
                          cursor: 'pointer', fontSize: 11, textTransform: 'capitalize',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Priority (higher = first)</label>
                  <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                    min={0} max={100}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Show From (optional)</label>
                  <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Hide After (optional)</label>
                  <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                  <input type="checkbox" checked={form.bold} onChange={e => setForm(f => ({ ...f, bold: e.target.checked }))} />
                  Bold text
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Active
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.text}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.text ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create Announcement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
