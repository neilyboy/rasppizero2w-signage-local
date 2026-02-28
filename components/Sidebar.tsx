'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Image, PlaySquare, CalendarDays, BarChart3,
  Megaphone, Settings, Monitor, Tv2, ChevronRight, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/media', label: 'Media Library', icon: Image },
  { href: '/admin/playlists', label: 'Playlists', icon: PlaySquare },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/stats', label: 'Stats & Charts', icon: BarChart3 },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/display', label: 'Display Control', icon: Monitor },
  { href: '/admin/analytics', label: 'Analytics', icon: Zap },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Tv2 size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>PiSign</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.05em' }}>SIGNAGE CONTROL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#f1f5f9' : '#64748b',
                background: active ? '#1e293b' : 'transparent',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, background: '#3b82f6', borderRadius: '0 2px 2px 0'
                }} />
              )}
              <Icon size={16} color={active ? '#3b82f6' : '#64748b'} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && <ChevronRight size={14} color="#3b82f6" />}
            </Link>
          );
        })}
      </nav>

      {/* Display link */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #1e293b' }}>
        <a
          href="/display"
          target="_blank"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(59,130,246,0.3)',
            textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#93c5fd'
          }}
        >
          <Tv2 size={16} color="#93c5fd" />
          Open Display View
        </a>
      </div>
    </aside>
  );
}
