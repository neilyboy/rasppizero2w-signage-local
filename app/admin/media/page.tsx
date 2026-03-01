'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Trash2, Edit2, Plus, Search, Image, Film, Globe, Type,
  Tag, Clock, Check, X, ExternalLink, RefreshCw, BarChart3
} from 'lucide-react';
import { Asset, AssetType } from '@/lib/types';

const TYPE_COLORS: Record<AssetType, string> = {
  image: '#3b82f6',
  video: '#8b5cf6',
  webpage: '#10b981',
  text: '#f59e0b',
  stats: '#06b6d4',
  announcement: '#ef4444',
};

const TYPE_ICONS: Record<AssetType, React.ElementType> = {
  image: Image,
  video: Film,
  webpage: Globe,
  text: Type,
  stats: BarChart3,
  announcement: Type,
};

function AssetTypeLabel({ type }: { type: AssetType }) {
  const color = TYPE_COLORS[type] ?? '#64748b';
  const Icon = TYPE_ICONS[type] ?? Image;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4,
      background: `${color}20`, color, fontSize: 11, fontWeight: 600
    }}>
      <Icon size={11} />
      {type.toUpperCase()}
    </span>
  );
}

interface FormData {
  name: string;
  type: AssetType;
  url: string;
  content: string;
  duration: number;
  tags: string;
  fit: string;
}

const defaultForm: FormData = {
  name: '', type: 'image', url: '', content: '', duration: 10, tags: '', fit: 'contain'
};

export default function MediaPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const load = useCallback(() => {
    fetch('/api/assets').then(r => r.json()).then(setAssets).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      setUploading(false);
      if (data.url) {
        const assetType: AssetType = data.assetType === 'video' ? 'video' : 'image';
        await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.[^.]+$/, ''),
            type: assetType,
            url: data.url,
            duration: assetType === 'video' ? 30 : 10,
          }),
        });
        load();
      }
    }
  }, [load]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
  });

  const openAdd = () => {
    setEditingAsset(null);
    setForm(defaultForm);
    setUploadedUrl('');
    setShowModal(true);
  };

  const openEdit = (a: Asset) => {
    setEditingAsset(a);
    setForm({
      name: a.name, type: a.type, url: a.url ?? '',
      content: a.content ?? '', duration: a.duration,
      tags: a.tags.join(', '),
      fit: (a.metadata as Record<string, string>)?.fit ?? 'contain',
    });
    setUploadedUrl(a.url ?? '');
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.url) {
      setUploadedUrl(data.url);
      setForm(f => ({ ...f, url: data.url, type: data.assetType as AssetType }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let resolvedUrl = form.url || uploadedUrl || undefined;
    if (resolvedUrl && form.type === 'webpage' && !resolvedUrl.startsWith('http')) {
      resolvedUrl = `https://${resolvedUrl}`;
    }
    const payload = {
      name: form.name,
      type: form.type,
      url: resolvedUrl,
      content: form.content || undefined,
      duration: form.duration,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      metadata: form.type === 'image' ? { fit: form.fit } : {},
    };
    if (editingAsset) {
      await fetch(`/api/assets/${editingAsset.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/assets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = assets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === 'all' || a.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Media Library</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>{assets.length} assets stored</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#3b82f6' : '#334155'}`,
          borderRadius: 12, padding: '24px', marginBottom: 24, textAlign: 'center',
          background: isDragActive ? 'rgba(59,130,246,0.05)' : '#1e293b',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <input {...getInputProps()} />
        <Upload size={28} color={isDragActive ? '#3b82f6' : '#475569'} style={{ marginBottom: 8 }} />
        <div style={{ color: isDragActive ? '#3b82f6' : '#64748b', fontSize: 14, fontWeight: 500 }}>
          {isDragActive ? 'Drop files here!' : 'Drag & drop images or videos, or click to browse'}
        </div>
        <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>PNG, JPG, GIF, WebP, MP4, WebM</div>
        {uploading && <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 8 }}>Uploading...</div>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'image', 'video', 'webpage', 'text', 'stats'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid',
                borderColor: filterType === t ? '#3b82f6' : '#334155',
                background: filterType === t ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: filterType === t ? '#3b82f6' : '#64748b',
                cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
          <Image size={48} color="#334155" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, color: '#64748b' }}>No assets found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Upload files or add web URLs to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map(asset => {
            const Icon = TYPE_ICONS[asset.type] ?? Image;
            return (
              <div
                key={asset.id}
                style={{
                  background: '#1e293b', borderRadius: 12, border: '1px solid #334155',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                }}
              >
                {/* Preview */}
                <div style={{ height: 140, background: '#0f172a', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {asset.type === 'image' && asset.url ? (
                    <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : asset.type === 'video' && asset.url ? (
                    <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Icon size={36} color={TYPE_COLORS[asset.type] ?? '#64748b'} />
                      {asset.type === 'webpage' && asset.url && (
                        <div style={{ fontSize: 10, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{asset.url}</div>
                      )}
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <AssetTypeLabel type={asset.type} />
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {asset.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                      <Clock size={11} /> {asset.duration}s
                    </span>
                    {asset.tags.length > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                        <Tag size={11} /> {asset.tags.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(asset)} style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12 }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    {asset.url && (
                      <a
                        href={asset.type === 'webpage'
                          ? (asset.url.startsWith('http') ? asset.url : `https://${asset.url}`)
                          : asset.url}
                        target="_blank" rel="noreferrer"
                        style={{ padding: '6px 8px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(asset.id)} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 500, maxWidth: '95vw', border: '1px solid #334155', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AssetType }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="webpage">Web Page / URL</option>
                  <option value="text">Text / Message</option>
                  <option value="stats">Stats Widget</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              {(form.type === 'image' || form.type === 'video') && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Upload File</label>
                  <input type="file" accept={form.type === 'image' ? 'image/*' : 'video/*'} onChange={handleFileUpload}
                    style={{ color: '#94a3b8', fontSize: 13, cursor: 'pointer' }} />
                  {uploading && <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 4 }}>Uploading...</div>}
                  {(uploadedUrl || form.url) && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#10b981' }}>
                      <Check size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {uploadedUrl || form.url}
                    </div>
                  )}
                </div>
              )}

              {(form.type === 'webpage' || form.type === 'image' || form.type === 'video') && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    {form.type === 'webpage' ? 'URL *' : 'URL (or upload above)'}
                  </label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder={form.type === 'webpage' ? 'https://example.com' : 'https://...'}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
                  {form.type === 'webpage' && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                      ⚠️ Sites like Google, YouTube, Facebook block iframe embedding.
                    </div>
                  )}
                </div>
              )}

              {form.type === 'image' && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Image Fit</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ v: 'contain', l: 'Contain', d: 'Fit whole image, keep ratio' }, { v: 'cover', l: 'Cover', d: 'Fill screen, may crop' }, { v: 'fill', l: 'Stretch', d: 'Fill screen, may distort' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, fit: opt.v }))}
                        title={opt.d}
                        style={{ flex: 1, padding: '7px 4px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer',
                          borderColor: form.fit === opt.v ? '#3b82f6' : '#334155',
                          background: form.fit === opt.v ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: form.fit === opt.v ? '#3b82f6' : '#64748b',
                        }}>{opt.l}</button>
                    ))}
                  </div>
                </div>
              )}

              {(form.type === 'text' || form.type === 'announcement') && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Content *</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={4} placeholder="Enter text content..."
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'vertical' }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Display Duration (seconds)</label>
                <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 10 }))}
                  min={1} max={3600}
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="office, important, morning"
                  style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || !form.name}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.name ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : editingAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
