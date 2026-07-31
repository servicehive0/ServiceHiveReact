import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

const PRIMARY = '#6366f1';

// App-wide "you're offline" cover, mirroring MaintenancePage's visual style
// so a dropped connection reads as a deliberate, on-brand state instead of a
// blank/broken page. Listens to the browser's own online/offline events
// (not a failed API call) so it appears/disappears the instant the network
// actually changes, and auto-dismisses itself the moment the browser
// reports the connection is back — no manual retry button needed.
const NoInternetOverlay = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 440 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', margin: '0 auto 1.75rem',
              background: `linear-gradient(135deg, ${PRIMARY}, #4f46e5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${PRIMARY}66`,
            }}>
              <WifiOff size={38} color="white" />
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              <span style={{ color: 'white' }}>SERVICE</span>
              <span style={{ color: PRIMARY }}>HIVE</span>
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem', color: 'white' }}>
              No Internet Connection
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Please check your Wi-Fi or network connection.<br />We'll reconnect automatically.
            </p>
            <div style={{ width: 140, height: 4, borderRadius: 10, background: 'rgba(255,255,255,0.08)', margin: '0 auto', overflow: 'hidden' }}>
              <motion.div
                style={{ width: '40%', height: '100%', borderRadius: 10, background: PRIMARY }}
                animate={{ x: ['-100%', '250%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div style={{ marginTop: '0.9rem', color: '#64748b', fontSize: '0.78rem', fontWeight: 500 }}>
              Waiting for connection…
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NoInternetOverlay;
