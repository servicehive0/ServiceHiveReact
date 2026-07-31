import React from 'react';
import { colors } from '../../theme/tokens';

// Mirrors Flutter's trust-stats strip: icon+value+label items separated by vertical dividers.
export const StatsStrip = ({ items }) => (
  <div style={{
    display: 'flex', alignItems: 'center',
    padding: '1rem 0', borderRadius: 18,
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
  }}>
    {items.map((s, i) => (
      <React.Fragment key={s.label}>
        {i > 0 && <div style={{ width: 1, height: 32, background: colors.border, flexShrink: 0 }} />}
        <div onClick={s.onClick}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: s.onClick ? 'pointer' : 'default' }}>
          <s.Icon size={18} color={s.color} />
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white' }}>{s.value}</div>
          <div style={{ fontSize: '0.62rem', color: colors.textDim, fontWeight: 600 }}>{s.label}</div>
        </div>
      </React.Fragment>
    ))}
  </div>
);
