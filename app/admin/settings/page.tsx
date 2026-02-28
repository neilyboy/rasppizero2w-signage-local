'use client';
import { useState } from 'react';
import { Settings, Tv2, Wifi, Info, Terminal, Download, AlertTriangle, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [copied, setCopied] = useState('');

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="#3b82f6" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );

  const CodeBlock = ({ code, copyKey }: { code: string; copyKey: string }) => (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <pre style={{
        background: '#0f172a', borderRadius: 8, padding: '12px 16px', margin: 0,
        fontSize: 12, color: '#a5f3fc', fontFamily: 'monospace', overflow: 'auto',
        border: '1px solid #334155', lineHeight: 1.6,
      }}>{code}</pre>
      <button
        onClick={() => copy(code, copyKey)}
        style={{
          position: 'absolute', top: 8, right: 8, padding: '3px 8px',
          borderRadius: 4, background: copied === copyKey ? '#10b981' : '#334155',
          border: 'none', color: 'white', fontSize: 10, cursor: 'pointer',
          fontWeight: 500,
        }}>
        {copied === copyKey ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Settings & Setup</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>Pi Zero 2W configuration and deployment instructions</p>
      </div>

      {/* Pi setup */}
      <Section title="Raspberry Pi Zero 2W Setup" icon={Terminal}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 10 }}>
            <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#93c5fd' }}>
              Run these commands on your Pi Zero 2W after flashing Raspberry Pi OS Lite (64-bit recommended).
            </span>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>1. Update system &amp; install Node.js</div>
            <CodeBlock copyKey="node" code={`sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>2. Clone / copy this project to the Pi</div>
            <CodeBlock copyKey="git" code={`git clone https://github.com/yourusername/rasppizero2w-signage-local.git
cd rasppizero2w-signage-local
npm install`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>3. Build and start the app</div>
            <CodeBlock copyKey="build" code={`npm run build
npm run start -- -p 3000`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>4. Auto-start on boot with PM2</div>
            <CodeBlock copyKey="pm2" code={`sudo npm install -g pm2
pm2 start npm --name pisign -- start -- -p 3000
pm2 startup
pm2 save`} />
          </div>
        </div>
      </Section>

      {/* Kiosk mode */}
      <Section title="TV / Kiosk Mode (Chromium)" icon={Tv2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Set up Chromium to auto-launch in kiosk mode pointing to the display URL when the Pi boots.
          </p>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Install Chromium &amp; x11 (if using desktop)</div>
            <CodeBlock copyKey="chromium" code={`sudo apt install -y chromium-browser xdotool unclutter`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Create autostart file</div>
            <CodeBlock copyKey="autostart" code={`mkdir -p ~/.config/autostart
cat > ~/.config/autostart/pisign-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=PiSign Kiosk
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --autoplay-policy=no-user-gesture-required http://localhost:3000/display
X-GNOME-Autostart-enabled=true
EOF`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Hide mouse cursor (add to ~/.bashrc or autostart)</div>
            <CodeBlock copyKey="cursor" code={`unclutter -idle 0 &`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Disable screen blanking</div>
            <CodeBlock copyKey="blank" code={`sudo sed -i 's/#xserver-command=X/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf`} />
          </div>
        </div>
      </Section>

      {/* Networking */}
      <Section title="Network Access" icon={Wifi}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Connect to the admin panel from any device on the same network.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '14px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>ADMIN PANEL</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>http://[pi-ip]:3000/admin</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Manage content from any device</div>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '14px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>DISPLAY VIEW</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>http://[pi-ip]:3000/display</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Full-screen TV output</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Find Pi IP address</div>
            <CodeBlock copyKey="ip" code={`hostname -I | awk '{print $1}'`} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Set static IP (optional)</div>
            <CodeBlock copyKey="staticip" code={`# Edit /etc/dhcpcd.conf and add:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8`} />
          </div>
        </div>
      </Section>

      {/* App info */}
      <Section title="App Information" icon={Info}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Framework', value: 'Next.js 14 (App Router)' },
            { label: 'Database', value: 'SQLite (better-sqlite3)' },
            { label: 'Storage', value: 'Local filesystem (/public/uploads)' },
            { label: 'Charts', value: 'Recharts' },
            { label: 'Calendar', value: 'react-big-calendar' },
            { label: 'Target Hardware', value: 'Raspberry Pi Zero 2W' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone" icon={AlertTriangle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Destructive actions — use with caution.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                if (!confirm('Delete ALL media assets? This cannot be undone.')) return;
                const res = await fetch('/api/assets').then(r => r.json());
                for (const a of res) await fetch(`/api/assets/${a.id}`, { method: 'DELETE' });
                alert('All assets deleted.');
              }}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
              Delete All Assets
            </button>
            <button
              onClick={async () => {
                if (!confirm('Delete ALL playlists? This cannot be undone.')) return;
                const res = await fetch('/api/playlists').then(r => r.json());
                for (const p of res) await fetch(`/api/playlists/${p.id}`, { method: 'DELETE' });
                alert('All playlists deleted.');
              }}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
              Delete All Playlists
            </button>
            <button
              onClick={async () => {
                if (!confirm('Clear all schedule entries? This cannot be undone.')) return;
                const res = await fetch('/api/schedule').then(r => r.json());
                for (const s of res) await fetch(`/api/schedule/${s.id}`, { method: 'DELETE' });
                alert('Schedule cleared.');
              }}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
              Clear Schedule
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = '/api/system';
                a.download = 'pisign-diagnostics.json';
                a.click();
              }}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export Diagnostics
            </button>
            <a href="https://github.com" target="_blank" rel="noreferrer"
              style={{ padding: '8px 16px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <ExternalLink size={14} /> View on GitHub
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
