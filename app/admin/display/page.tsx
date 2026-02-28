'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Monitor, PlaySquare, Image, Sun, Clock, Tv2,
  Zap, RefreshCw, ChevronRight, ExternalLink
} from 'lucide-react';
import { DisplaySettings, Playlist, Asset } from '@/lib/types';

const TRANSITIONS = ['fade', 'slide-left', 'slide-right', 'slide-up', 'zoom', 'none'];

export default function DisplayPage() {
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/display').then(r => r.json()),
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]).then(([d, p, a]) => {
      setSettings(d);
      setPlaylists(p);
      setAssets(a);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (patch: Partial<DisplaySettings>) => {
    setSettings(s => s ? { ...s, ...patch } : s);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await fetch('/api/display', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) {
    return (
      <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="#3b82f6" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );

  const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0' }}>
      <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: checked ? '#3b82f6' : '#334155',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: 'white', transition: 'left 0.2s',
        }} />
      </div>
    </label>
  );

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Display Control</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Control what the TV shows in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/display" target="_blank"
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}>
            <ExternalLink size={14} /> Preview Display
          </a>
          <button onClick={load} style={{ padding: '8px 12px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', borderRadius: 8, background: saved ? '#10b981' : '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {saved ? <><Zap size={14} /> Saved!</> : saving ? 'Saving...' : <><Zap size={14} /> Save & Apply</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          {/* Content Mode */}
          <Section title="Content Source" icon={PlaySquare}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Display Mode</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['playlist', 'asset', 'idle'] as const).map(m => (
                    <button key={m} onClick={() => update({ mode: m })}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                        borderColor: settings.mode === m ? '#3b82f6' : '#334155',
                        background: settings.mode === m ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: settings.mode === m ? '#3b82f6' : '#64748b',
                        cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {settings.mode === 'playlist' && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Active Playlist</label>
                  <select
                    value={settings.active_playlist_id ?? ''}
                    onChange={e => update({ active_playlist_id: e.target.value || undefined })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                    <option value="">— Select playlist —</option>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({p.items.length} items)</option>)}
                  </select>
                </div>
              )}

              {settings.mode === 'asset' && (
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Active Asset</label>
                  <select
                    value={settings.active_asset_id ?? ''}
                    onChange={e => update({ active_asset_id: e.target.value || undefined })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                    <option value="">— Select asset —</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                  </select>
                </div>
              )}
            </div>
          </Section>

          {/* Overlays */}
          <Section title="Overlays" icon={Monitor}>
            <ToggleSwitch checked={settings.show_clock} onChange={v => update({ show_clock: v })} label="Show clock overlay" />
            <ToggleSwitch checked={settings.show_ticker} onChange={v => update({ show_ticker: v })} label="Show announcement ticker" />
            {settings.show_ticker && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Ticker Speed: {settings.ticker_speed}px/s
                </label>
                <input
                  type="range" min={10} max={200} value={settings.ticker_speed}
                  onChange={e => update({ ticker_speed: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  <span>Slow</span><span>Fast</span>
                </div>
              </div>
            )}
          </Section>
        </div>

        <div>
          {/* Appearance */}
          <Section title="Appearance" icon={Sun}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Brightness: {settings.brightness}%
                </label>
                <input
                  type="range" min={10} max={100} value={settings.brightness}
                  onChange={e => update({ brightness: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  <span>Dim</span><span>Full</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Display Theme</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['dark', 'light'] as const).map(t => (
                    <button key={t} onClick={() => update({ theme: t })}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                        borderColor: settings.theme === t ? '#3b82f6' : '#334155',
                        background: settings.theme === t ? 'rgba(59,130,246,0.15)' : t === 'dark' ? '#0f172a' : '#f8fafc',
                        color: settings.theme === t ? '#3b82f6' : t === 'dark' ? '#64748b' : '#334155',
                        cursor: 'pointer', fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Transitions */}
          <Section title="Transitions" icon={ChevronRight}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Transition Effect</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TRANSITIONS.map(t => (
                    <button key={t} onClick={() => update({ transition: t })}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: '1px solid',
                        borderColor: settings.transition === t ? '#3b82f6' : '#334155',
                        background: settings.transition === t ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: settings.transition === t ? '#3b82f6' : '#64748b',
                        cursor: 'pointer', fontSize: 11, fontWeight: 500,
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Duration: {settings.transition_duration}ms
                </label>
                <input
                  type="range" min={200} max={2000} step={100} value={settings.transition_duration}
                  onChange={e => update({ transition_duration: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  <span>Fast (200ms)</span><span>Slow (2s)</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section title="Live Status" icon={Tv2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Display is online</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Mode: <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{settings.mode}</span>
              </div>
              {settings.active_playlist_id && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Playlist: <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                    {playlists.find(p => p.id === settings.active_playlist_id)?.name ?? 'Unknown'}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Last updated: <span style={{ color: '#94a3b8' }}>{new Date(settings.updated_at).toLocaleString()}</span>
              </div>
              <a href="/display" target="_blank"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: 12, fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                <Tv2 size={14} /> Open Display View
                <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
              </a>
            </div>
          </Section>
        </div>
      </div>

      {/* Clock preview */}
      {settings.show_clock && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 20, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={16} color="#3b82f6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Clock Overlay Preview</span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'white', fontFamily: 'monospace', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: 8 }}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
