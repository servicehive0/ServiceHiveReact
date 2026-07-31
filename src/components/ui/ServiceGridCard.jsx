import React from 'react';
import { Home as HomeIcon } from 'lucide-react';
import { iconMap } from '../../utils/iconMap';

// Mirrors Flutter's services grid: tinted gradient card, circular icon (or
// image) with a colored ring, 2-line label below. 3-per-row grid.
export const ServiceGridCard = ({ name, icon, imgUrl, color = '#3B82F6', onClick }) => {
  const Icon = iconMap[icon] || HomeIcon;

  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '8px 4px', borderRadius: 20, cursor: 'pointer',
      background: `linear-gradient(135deg, ${color}29, ${color}0a)`,
      border: `1px solid ${color}40`,
      textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
        background: `${color}29`, border: `1.5px solid ${color}4d`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {imgUrl
          ? <img src={imgUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          : <Icon size={24} color={color} />}
      </div>
      <span style={{
        fontSize: '0.7rem', fontWeight: 700, color: 'white', lineHeight: 1.3,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {name}
      </span>
    </button>
  );
};
