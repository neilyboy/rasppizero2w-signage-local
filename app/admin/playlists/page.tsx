'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, PlaySquare, GripVertical, X, Check, Shuffle, RefreshCw, Clock, Image } from 'lucide-react';
import { Playlist, Asset, PlaylistItem } from '@/lib/types';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [form, setForm] = useState({ name: '', description: '', loop: true, shuffle: false });
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]).then(([p, a]) => { setPlaylists(p); setAssets(a); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingPlaylist(null);
    setForm({ name: '', description: '', loop: true, shuffle: false });
    setItems([]);
    setShowModal(true);
  };

  const openEdit = (p: Playlist) => {
    setEditingPlaylist(p);
    setForm({ name: p.name, description: p.description, loop: p.loop, shuffle: p.shuffle });
    setItems(p.items);
    setShowModal(true);
  };

  const addItem = (assetId: string) => {
    if (items.some(i => i.asset_id === assetId)) return;
    const asset = assets.find(a => a.id === assetId);
    setItems(prev => [...prev, { asset_id: assetId, duration: asset?.duration ?? 10 }]);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItemDuration = (idx: number, dur: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, duration: dur } : item));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx, 1);
    newItems.splice(idx, 0, moved);
    setItems(newItems);
    setDragIdx(idx);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, items };
    if (editingPlaylist) {
      await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/playlists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this playlist?')) return;
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    load();
  };

  const totalDuration = (p: Playlist) => p.items.reduce((s, i) => s + (i.duration ?? 10), 0);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Playlists</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{playlists.length} playlists</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> New Playlist
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>
          <PlaySquare size={48} color="#334155" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#64748b' }}>No playlists yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create a playlist to sequence your media content</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {playlists.map(playlist => {
            const dur = totalDuration(playlist);
            const mins = Math.floor(dur / 60);
            const secs = dur % 60;
            return (
              <div key={playlist.id} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                {/* Thumbnail strip */}
                <div style={{ height: 60, background: '#0f172a', display: 'flex', overflow: 'hidden' }}>
                  {playlist.items.slice(0, 6).map((item, i) => {
                    const asset = assets.find(a => a.id === item.asset_id);
                    return (
                      <div key={i} style={{ flex: 1, background: '#1e293b', overflow: 'hidden', borderRight: '1px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {asset?.type === 'image' && asset.url ? (
                          <img src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <Image size={16} color="#334155" />
                        )}
                      </div>
                    );
                  })}
                  {playlist.items.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlaySquare size={24} color="#334155" />
                    </div>
                  )}
                </div>

                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{playlist.name}</div>
                      {playlist.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{playlist.description}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Image size={12} /> {playlist.items.length} items
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {mins}m {secs}s
                    </span>
                    {playlist.loop && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>LOOP</span>
                    )}
                    {playlist.shuffle && (
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Shuffle size={10} /> SHUFFLE
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(playlist)} style={{ flex: 1, padding: '7px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12 }}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(playlist.id)} style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={13} />
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
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 700, maxWidth: '95vw', border: '1px solid #334155', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editingPlaylist ? 'Edit Playlist' : 'New Playlist'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Playlist Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                    <input type="checkbox" checked={form.loop} onChange={e => setForm(f => ({ ...f, loop: e.target.checked }))} />
                    Loop playlist
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                    <input type="checkbox" checked={form.shuffle} onChange={e => setForm(f => ({ ...f, shuffle: e.target.checked }))} />
                    Shuffle
                  </label>
                </div>

                {/* Add assets */}
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Add from Library</label>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {assets.map(a => {
                      const already = items.some(i => i.asset_id === a.id);
                      return (
                        <button key={a.id} onClick={() => addItem(a.id)} disabled={already}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                            borderRadius: 6, border: '1px solid',
                            borderColor: already ? '#334155' : '#475569',
                            background: already ? '#0f172a' : 'transparent',
                            color: already ? '#475569' : '#94a3b8',
                            cursor: already ? 'not-allowed' : 'pointer', fontSize: 12, textAlign: 'left',
                          }}>
                          {already && <Check size={12} color="#10b981" />}
                          <span style={{ flex: 1 }}>{a.name}</span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{a.type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Playlist order */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                  Playlist Order ({items.length} items)
                </label>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#475569', border: '1px dashed #334155', borderRadius: 8, fontSize: 13 }}>
                    Add assets from the left
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                    {items.map((item, idx) => {
                      const asset = assets.find(a => a.id === item.asset_id);
                      return (
                        <div
                          key={idx}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={e => handleDragOver(e, idx)}
                          onDragEnd={() => setDragIdx(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 10px', borderRadius: 6,
                            background: '#0f172a', border: '1px solid #334155', cursor: 'grab',
                          }}
                        >
                          <GripVertical size={14} color="#475569" />
                          <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {asset?.name ?? 'Unknown'}
                          </span>
                          <input
                            type="number"
                            value={item.duration ?? 10}
                            onChange={e => updateItemDuration(idx, parseInt(e.target.value) || 10)}
                            style={{ width: 52, padding: '3px 6px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#f1f5f9', fontSize: 11, outline: 'none' }}
                            min={1}
                          />
                          <span style={{ fontSize: 10, color: '#64748b' }}>s</span>
                          <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name}
                style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editingPlaylist ? 'Update Playlist' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
