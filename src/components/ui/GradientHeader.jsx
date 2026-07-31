import React from 'react';
import { Bell } from 'lucide-react';
import { colors } from '../../theme/tokens';

// Mirrors Flutter's customer_home_tab.dart header: gradient-to-transparent
// backdrop, circular avatar (image or initial), greeting text, bell w/ unread badge.
export const GradientHeader = ({ avatarUrl, name, greeting, title, unreadCount = 0, onBellClick }) => {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();

  return (
    <div style={{
      padding: '2.5rem 0 1.25rem',
      background: `linear-gradient(180deg, ${colors.primary}24, ${colors.bg}00)`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
        background: avatarUrl ? `url(${avatarUrl}) center/cover` : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 6px 16px ${colors.primary}59`,
        fontWeight: 800, fontSize: '1.1rem', color: 'white',
      }}>
        {!avatarUrl && initial}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', color: colors.textMuted, fontWeight: 600 }}>{greeting}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.3px', color: 'white', marginTop: 2 }}>{title}</div>
      </div>

      <button onClick={onBellClick} style={{
        position: 'relative', width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,0.06)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'white', transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, minWidth: 18, padding: '2px 5px',
            borderRadius: 100, background: colors.error, border: `2px solid ${colors.bg}`,
            fontSize: '0.6rem', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2,
          }}>
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
