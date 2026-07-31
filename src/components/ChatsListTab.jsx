import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Loader, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ChatModal from './ChatModal';
import CustomerProfileModal from './CustomerProfileModal';
import ProviderProfileModal from './ProviderProfileModal';

const PRIMARY = '#6366f1';

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Unified inbox aggregating every bid-chat thread for the logged-in user,
// mirroring Flutter's chats_list_screen.dart. Works for both roles: a
// customer's threads are their own requests' accepted/active bids; a
// provider's threads are the bids they've placed.
const ChatsListTab = ({ user, role }) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState(null);
  const [viewingCustomerId, setViewingCustomerId] = useState(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const debounceRef = useRef(null);

  // Postgres Changes can't filter to "any message in one of my threads"
  // server-side (only single-column equality filters), so every message
  // insert from every user's chat reaches this client — guarded so a burst
  // of unrelated messages can't race overlapping reloads.
  const load = useCallback(async () => {
    if (!user?.id) return;
    if (inFlightRef.current) { queuedRef.current = true; return; }
    inFlightRef.current = true;
    setLoading(true);
    let bids = [];
    if (role === 'provider') {
      const { data } = await supabase.from('bids').select('*, service_requests!inner(*)').eq('provider_id', user.id).order('created_at', { ascending: false });
      bids = data || [];
    } else {
      const { data: myRequests } = await supabase.from('service_requests').select('id').eq('customer_id', user.id);
      const ids = (myRequests || []).map(r => r.id);
      if (ids.length > 0) {
        const { data } = await supabase.from('bids').select('*, service_requests!inner(*)').in('request_id', ids).order('created_at', { ascending: false });
        bids = data || [];
      }
    }

    const { data: hidden } = await supabase.from('hidden_chats').select('bid_id, hidden_at').eq('user_id', user.id);
    const hiddenMap = {};
    (hidden || []).forEach(h => { hiddenMap[h.bid_id] = h.hidden_at; });

    const withLastMessage = await Promise.all(bids.map(async (bid) => {
      const { data: lastMsg } = await supabase.from('bid_messages').select('message, created_at').eq('bid_id', bid.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return { bid, request: bid.service_requests, lastMessage: lastMsg };
    }));

    // A hidden thread stays hidden only while its last message predates
    // the hide — a newer reply un-hides it (WhatsApp-style "delete for me").
    const visible = withLastMessage.filter(t => {
      const hiddenAt = hiddenMap[t.bid.id];
      if (!hiddenAt) return true;
      if (t.lastMessage && new Date(t.lastMessage.created_at) > new Date(hiddenAt)) return true;
      return false;
    });

    setThreads(visible);
    setLoading(false);
    inFlightRef.current = false;
    if (queuedRef.current) { queuedRef.current = false; load(); }
  }, [user?.id, role]);

  useEffect(() => { load(); }, [load]);

  // Live-updates thread ordering/previews when a message arrives in any of
  // this user's threads, instead of only refreshing on next mount/reopen.
  // Debounced so a burst of messages collapses into a single reload.
  useEffect(() => {
    if (!user?.id) return;
    const scheduleReload = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(load, 350);
    };
    const channel = supabase.channel(`chats_list_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bid_messages' }, scheduleReload)
      .subscribe();
    return () => { supabase.removeChannel(channel); clearTimeout(debounceRef.current); };
  }, [user?.id, load]);

  const otherName = (t) => role === 'provider' ? t.request?.customer_name : t.bid?.provider_name;
  const otherId = (t) => role === 'provider' ? t.request?.customer_id : t.bid?.provider_id;

  const [viewingProvider, setViewingProvider] = useState(null);
  const openOtherProfile = async (t) => {
    const id = otherId(t);
    if (!id) return;
    if (role === 'provider') {
      setViewingCustomerId(id);
    } else {
      // users read goes through the RPC (RLS blocks a direct cross-user
      // .from('users') read for an arbitrary id) — provider_profiles has no
      // such restriction (providers are meant to be publicly browsable).
      const [{ data: userRows }, { data: profileRow }] = await Promise.all([
        supabase.rpc('get_public_user_profile', { user_id: id }),
        supabase.from('provider_profiles').select('*').eq('id', id).maybeSingle(),
      ]);
      const userRow = userRows?.[0];
      if (userRow) setViewingProvider({ ...userRow, provider_profiles: profileRow || {} });
    }
  };

  const deleteThread = async (e, t) => {
    e.stopPropagation();
    if (!window.confirm(`Delete conversation with ${otherName(t)}? They can still see it.`)) return;
    setThreads(prev => prev.filter(x => x.bid.id !== t.bid.id));
    try {
      await supabase.from('hidden_chats').upsert({ user_id: user.id, bid_id: t.bid.id });
    } catch { /* non-critical for this session */ }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Chats</span>
        <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <MessageSquare size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No conversations yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Chats from your bids will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {threads.map(t => (
            <motion.div key={t.bid.id} whileTap={{ scale: 0.98 }} onClick={() => setOpenChat(t)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem', borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
              <div onClick={(e) => { e.stopPropagation(); openOtherProfile(t); }} style={{ width: 44, height: 44, borderRadius: '50%', background: `${PRIMARY}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: PRIMARY, flexShrink: 0, cursor: 'pointer' }}>
                {(otherName(t) || '?')[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherName(t)}</span>
                  {t.lastMessage && <span style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0, marginLeft: 8 }}>{timeAgo(t.lastMessage.created_at)}</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.lastMessage?.message || `${t.request?.service_name} — no messages yet`}
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => deleteThread(e, t)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                <Trash2 size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openChat && (
          <ChatModal
            bidId={openChat.bid.id}
            requestId={openChat.request.id}
            otherName={otherName(openChat)}
            otherUserId={otherId(openChat)}
            currentUserId={user.id}
            currentUserName={user.name}
            onClose={() => setOpenChat(null)}
          />
        )}
        {viewingCustomerId && (
          <CustomerProfileModal customerId={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />
        )}
        {viewingProvider && (
          <ProviderProfileModal provider={viewingProvider} onClose={() => setViewingProvider(null)} onBookNow={() => setViewingProvider(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatsListTab;
