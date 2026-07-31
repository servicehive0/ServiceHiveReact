import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ChatModal from './ChatModal';

const PRIMARY = '#6366f1';

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Mirrors Flutter's notifications_screen.dart. Reads from a `notifications`
// table (user_id, title, body, is_read, created_at) if present; degrades to
// an empty state if the table doesn't exist yet rather than erroring.
const NotificationsModal = ({ userId, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`notifications_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems(prev => prev.some(n => n.id === payload.new.id) ? prev : [payload.new, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (n) => {
    if (n.is_read) return;
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    try { await supabase.from('notifications').update({ is_read: true }).eq('id', n.id); } catch { /* non-critical */ }
  };

  // Deep-links a tapped notification to the exact chat/request it's about,
  // instead of it just sitting there as a static list.
  const handleTap = async (n) => {
    markRead(n);
    if (n.type === 'chat' && n.bid_id && n.request_id) {
      const [{ data: bid }, { data: req }] = await Promise.all([
        supabase.from('bids').select('provider_id, provider_name').eq('id', n.bid_id).maybeSingle(),
        supabase.from('service_requests').select('customer_id, customer_name').eq('id', n.request_id).maybeSingle(),
      ]);
      const isProvider = bid?.provider_id === userId;
      const otherUserId = isProvider ? req?.customer_id : bid?.provider_id;
      const otherName = isProvider ? req?.customer_name : bid?.provider_name;
      if (otherUserId) {
        setOpenChat({ bidId: n.bid_id, requestId: n.request_id, otherUserId, otherName });
      }
      return;
    }
    if (n.request_id) {
      onClose();
      navigate(user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard', { state: { tab: 'requests' } });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1rem' }}>Notifications</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {items.some(n => !n.is_read) && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: PRIMARY, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button onClick={load} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
              <Bell size={32} style={{ marginBottom: 10 }} />
              <div>No notifications yet</div>
            </div>
          ) : items.map(n => (
            <div key={n.id} onClick={() => handleTap(n)} style={{ padding: '0.9rem', borderRadius: 14, background: n.is_read ? '#0d0d0d' : `${PRIMARY}0a`, border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.06)' : `${PRIMARY}30`}`, marginBottom: 8, cursor: (n.bid_id || n.request_id) ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{n.title}</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{n.body}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {openChat && (
          <ChatModal
            bidId={openChat.bidId}
            requestId={openChat.requestId}
            otherName={openChat.otherName}
            otherUserId={openChat.otherUserId}
            currentUserId={userId}
            currentUserName={user?.name}
            onClose={() => { setOpenChat(null); onClose(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsModal;
