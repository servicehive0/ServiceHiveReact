import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader, MoreVertical, Ban, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { notify } from '../lib/notify';

const PRIMARY = '#6366f1';

// Realtime 1:1 chat scoped to a single bid, mirroring Flutter's
// bid_chat_screen.dart: optimistic send + realtime subscription on
// bid_messages, PLUS a polling fallback (same 2s-interval safety net
// Flutter's request_provider.dart already uses) since Realtime replication
// isn't 100% reliable and this was previously the one side with no backup.
const ChatModal = ({ bidId, requestId, otherName, otherUserId, currentUserId, currentUserName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = async () => {
    const { data } = await supabase.from('bid_messages').select('*').eq('bid_id', bidId).order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const fetchNewer = async () => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      supabase.from('bid_messages').select('*').eq('bid_id', bidId).gt('created_at', last.created_at).order('created_at', { ascending: true })
        .then(({ data }) => {
          if (!data?.length) return;
          setMessages(cur => {
            const existing = new Set(cur.map(m => m.id));
            const fresh = data.filter(m => !existing.has(m.id));
            return fresh.length ? [...cur, ...fresh] : cur;
          });
        });
      return prev;
    });
  };

  useEffect(() => {
    let active = true;
    supabase.from('bid_messages').select('*').eq('bid_id', bidId).order('created_at', { ascending: true })
      .then(({ data }) => { if (active) { setMessages(data || []); setLoading(false); } });

    const channel = supabase.channel(`chat_${bidId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bid_messages', filter: `bid_id=eq.${bidId}` },
        (payload) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();

    const pollId = setInterval(fetchNewer, 2000);

    return () => { active = false; supabase.removeChannel(channel); clearInterval(pollId); };
  }, [bidId]);

  useEffect(() => {
    if (!otherUserId || !currentUserId) return;
    let active = true;
    Promise.all([
      supabase.rpc('is_blocked', { blocker: otherUserId, blocked: currentUserId }),
      supabase.rpc('is_blocked', { blocker: currentUserId, blocked: otherUserId }),
    ]).then(([theirs, mine]) => {
      if (!active) return;
      setTheyBlockedMe(theirs.data === true);
      setIBlockedThem(mine.data === true);
    });
    return () => { active = false; };
  }, [otherUserId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const blockUser = async () => {
    setShowMenu(false);
    if (!window.confirm(`Block ${otherName}? They won't be able to message you.`)) return;
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: currentUserId, blocked_id: otherUserId });
    if (!error) setIBlockedThem(true);
  };

  const unblockUser = async () => {
    setShowMenu(false);
    if (!window.confirm(`Unblock ${otherName}? They will be able to message you again.`)) return;
    const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', currentUserId).eq('blocked_id', otherUserId);
    if (!error) setIBlockedThem(false);
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || theyBlockedMe) return;
    setSending(true);
    setText('');

    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, bid_id: bidId, sender_id: currentUserId, sender_name: currentUserName, message: trimmed, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from('bid_messages').insert({
      request_id: requestId,
      bid_id: bidId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      message: trimmed,
    }).select().single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      notify(otherUserId, `New message from ${currentUserName}`, trimmed, 'chat', { bidId, requestId });
    }
    setSending(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 480, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem' }}>{otherName || 'Chat'}</div>
            {(iBlockedThem || theyBlockedMe) && (
              <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>
                {iBlockedThem ? 'You blocked this person' : 'This person has blocked you'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            <button onClick={refresh} disabled={refreshing} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6 }}>
              <RefreshCw size={16} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            </button>
            {otherUserId && (!theyBlockedMe || iBlockedThem) && (
              <>
                <button onClick={() => setShowMenu(v => !v)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6 }}>
                  <MoreVertical size={18} />
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', top: 32, right: 0, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 10, minWidth: 140 }}>
                    {iBlockedThem ? (
                      <button onClick={unblockUser} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', color: PRIMARY, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Ban size={14} /> Unblock {otherName}
                      </button>
                    ) : (
                      <button onClick={blockUser} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Ban size={14} /> Block {otherName}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6 }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader size={24} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.85rem' }}>No messages yet. Say hello!</div>
          ) : messages.map(m => {
            const isMe = m.sender_id === currentUserId;
            const time = new Date(m.created_at);
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%', padding: '0.6rem 0.9rem', borderRadius: 16, background: isMe ? `linear-gradient(135deg,${PRIMARY},#4f46e5)` : '#1a1a1a', color: 'white' }}>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{m.message}</div>
                  <div style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.7)' : '#64748b', marginTop: 4, textAlign: 'right' }}>
                    {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={theyBlockedMe ? 'This person has blocked you' : 'Type a message...'}
            disabled={theyBlockedMe}
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', outline: 'none', opacity: theyBlockedMe ? 0.5 : 1 }}
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={sending || theyBlockedMe}
            style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${PRIMARY},#4f46e5)`, border: 'none', color: 'white', cursor: theyBlockedMe ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: theyBlockedMe ? 0.5 : 1 }}>
            {sending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatModal;
