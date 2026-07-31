import React from 'react';
import { colors } from '../../theme/tokens';

export const StatusChip = ({ label, color, Icon, size = 'md' }) => {
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: isSm ? '3px 9px' : '4px 10px',
      borderRadius: 100,
      fontSize: isSm ? '0.68rem' : '0.72rem',
      fontWeight: 800,
      background: `${color}18`,
      color,
      border: `1px solid ${color}33`,
      whiteSpace: 'nowrap',
    }}>
      {Icon && <Icon size={isSm ? 10 : 12} color={color} />}
      {label}
    </span>
  );
};

export const requestStatusMeta = (status, icons) => {
  const { Clock, CheckCircle, Zap, XCircle, AlertCircle } = icons;
  return ({
    open:        { label: 'Open',        color: colors.warning, Icon: Clock },
    pending:     { label: 'Open',        color: colors.warning, Icon: Clock },
    accepted:    { label: 'Accepted',    color: colors.primary, Icon: CheckCircle },
    in_progress: { label: 'In Progress', color: '#3b82f6',      Icon: Zap },
    completed:   { label: 'Completed',   color: colors.success, Icon: CheckCircle },
    cancelled:   { label: 'Cancelled',   color: colors.error,   Icon: XCircle },
  }[status] || { label: status, color: '#64748b', Icon: AlertCircle });
};
