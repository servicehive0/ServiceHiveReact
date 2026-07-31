import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { colors } from '../../theme/tokens';

// Mirrors Flutter's bottom nav. `centerAiId` marks one tab (customer's "ai")
// to render as the raised gradient floating button — Flutter's provider nav
// passes no centerAiId and gets a plain flat 5-tab bar instead.
export const DashboardBottomNav = ({ tabs, activeTab, onChange, centerAiId }) => (
  <nav style={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
    background: colors.surface, borderTop: `1px solid ${colors.border}`,
    backdropFilter: 'blur(20px)',
    display: 'flex', alignItems: 'center', padding: '8px 2px',
  }}>
    {tabs.map((t) => {
      const active = activeTab === t.id;

      if (t.id === centerAiId) {
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px',
          }}>
            <motion.div animate={{ y: active ? -2 : 0 }} style={{
              width: 52, height: 52, borderRadius: '50%',
              background: active
                ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)'
                : 'linear-gradient(135deg, #4C1D95, #1E3A5F)',
              boxShadow: active ? '0 4px 18px 2px rgba(139,92,246,0.55)' : '0 0 10px 1px rgba(139,92,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color="white" />
            </motion.div>
            <span style={{ fontSize: '0.6rem', fontWeight: active ? 800 : 500, color: active ? '#8B5CF6' : colors.textDim }}>
              {t.label}
            </span>
          </button>
        );
      }

      return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 2px',
        }}>
          <motion.div animate={{ y: active ? -1 : 0 }} style={{
            padding: '6px 14px', borderRadius: 100,
            background: active ? `${colors.primary}1f` : 'transparent',
          }}>
            <t.Icon size={20} color={active ? colors.primary : colors.textDim} />
          </motion.div>
          <span style={{ fontSize: '0.58rem', fontWeight: active ? 700 : 500, color: active ? colors.primary : colors.textDim, whiteSpace: 'nowrap' }}>
            {t.label}
          </span>
          {t.badge > 0 && (
            <span style={{ position: 'absolute', top: 4, right: '28%', width: 8, height: 8, borderRadius: '50%', background: colors.success }} />
          )}
        </button>
      );
    })}
  </nav>
);
