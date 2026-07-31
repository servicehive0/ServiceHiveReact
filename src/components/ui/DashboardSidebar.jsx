import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { colors } from '../../theme/tokens';

// Desktop-only sidebar nav (Flutter has no desktop layout, so this is a
// React-only addition) re-skinned to the shared token palette.
export const DashboardSidebar = ({ tabs, activeTab, onChange, onLogout }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: 240, height: '100vh', zIndex: 100,
    background: '#050505', borderRight: `1px solid ${colors.border}`,
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ padding: '1.8rem 1.5rem', borderBottom: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield color={colors.primary} size={22} strokeWidth={3} />
        <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'white', textTransform: 'uppercase' }}>
          Service<span style={{ color: colors.primary, opacity: 0.8 }}>Hive</span>
        </span>
      </div>
    </div>

    <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
      {tabs.map((t) => {
        const active = activeTab === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.85rem 1rem', borderRadius: 12, border: 'none', cursor: 'pointer', marginBottom: 4,
            background: active ? `${colors.primary}18` : 'transparent',
            color: active ? 'white' : colors.textDim,
            fontWeight: active ? 800 : 600, fontSize: '0.88rem',
          }}>
            <t.Icon size={18} color={active ? colors.primary : colors.textDim} />
            {t.label}
            {t.badge > 0 && (
              <span style={{ marginLeft: 'auto', padding: '2px 7px', borderRadius: 100, background: colors.success, color: 'white', fontSize: '0.65rem', fontWeight: 900 }}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    <div style={{ padding: '1rem 0.75rem', borderTop: `1px solid ${colors.border}` }}>
      <button onClick={onLogout} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.85rem 1rem', borderRadius: 12, border: 'none', background: 'transparent',
        color: colors.error, fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem',
      }}>
        <LogOut size={16} /> Logout
      </button>
    </div>
  </div>
);
