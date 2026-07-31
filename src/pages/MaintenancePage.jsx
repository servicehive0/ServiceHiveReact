import React from 'react';
import { Wrench, RotateCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#6366f1';

// Shown instead of Login/Register, and in place of any logged-in customer/
// provider screen, while Admin Dashboard → Global Settings → "Enable
// maintenance mode" is on (see MaintenanceGate in App.jsx). Admin routes are
// exempt so an admin can always get in to toggle it back off.
const MaintenancePage = ({ message, onRecheck }) => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: 440 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 1.75rem',
          background: `linear-gradient(135deg, ${PRIMARY}, #4f46e5)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${PRIMARY}66`,
        }}>
          <Wrench size={38} color="white" />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.75rem' }}>Under Maintenance</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {message || 'ServiceHive is currently undergoing scheduled maintenance. Please check back shortly.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onRecheck} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0.7rem 1.4rem', borderRadius: 100,
            background: '#141414', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}>
            <RotateCw size={15} /> Check Again
          </button>
          {user && (
            <button onClick={logout} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.7rem 1.4rem', borderRadius: 100,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}>
              <LogOut size={15} /> Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
