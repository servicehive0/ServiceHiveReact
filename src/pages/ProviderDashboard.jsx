import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  Home, ClipboardList, Briefcase, Wallet, User,
  LogOut, MapPin, Wifi, WifiOff, Loader, RefreshCw,
  ChevronRight, Clock, CheckCircle, XCircle, AlertCircle,
  Star, Phone, MessageSquare, Send, Zap, X, Plus,
  TrendingUp, Award, DollarSign, Sparkles, Navigation, MessageCircle,
  Bell, Shield, HelpCircle, Lock
} from 'lucide-react';
import ChatModal from '../components/ChatModal';
import ChatsListTab from '../components/ChatsListTab';
import CustomerProfileModal from '../components/CustomerProfileModal';
import LiveTrackingModal from '../components/LiveTrackingModal';
import NotificationsModal from '../components/NotificationsModal';
import ContactUsModal from '../components/ContactUsModal';
import HelpSupportModal from '../components/HelpSupportModal';
import { colors } from '../theme/tokens';
import { GradientHeader } from '../components/ui/GradientHeader';
import { StatsStrip } from '../components/ui/StatsStrip';
import { StatusChip, requestStatusMeta } from '../components/ui/StatusChip';
import { DashboardBottomNav } from '../components/ui/DashboardBottomNav';
import { DashboardSidebar } from '../components/ui/DashboardSidebar';
import { assessCancellationRiskML } from '../lib/aiInsights';
import { notify } from '../lib/notify';

const PRIMARY = colors.primary;
const SUCCESS = colors.success;
const ERROR = colors.error;
const AMBER = colors.warning;

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const statusMeta = (s) => requestStatusMeta(s, { Clock, CheckCircle, Zap, XCircle, AlertCircle });

const chip = (label, color) => <StatusChip label={label} color={color} />;

// ── Bid Submit Modal ──────────────────────────────────────────────────────────
const BidModal = ({ request, providerId, providerName, providerPhone, onClose, onSubmitted }) => {
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const getAISuggestion = async () => {
    setAiLoading(true);
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a bid assistant. Respond ONLY with valid JSON.' },
            { role: 'user', content: `Service: "${request.service_name}". Description: "${request.description}". City: "${request.city}". Suggest a competitive bid. Return: {"price":5000,"message":"Professional service...","time_estimate":"e.g. 1-2 hours"}` }
          ]
        })
      });
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || '';
      const s = content.indexOf('{'), e = content.lastIndexOf('}');
      if (s !== -1) {
        const data = JSON.parse(content.slice(s, e + 1));
        if (data.price) setPrice(String(data.price));
        if (data.message) setMessage(data.message);
        if (data.time_estimate) setTimeEstimate(data.time_estimate);
      }
    } catch { }
    setAiLoading(false);
  };

  const submit = async () => {
    if (!price) { setError('Please enter a price.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.from('bids').insert({
      request_id: request.id,
      provider_id: providerId,
      provider_name: providerName,
      provider_phone: providerPhone,
      price: parseFloat(price),
      message,
      status: 'pending',
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    notify(request.customer_id, 'New bid received', `${providerName} bid Rs ${price} on your ${request.service_name} request`, 'booking', { requestId: request.id });
    onSubmitted();
  };

  const inp = { width: '100%', padding: '0.85rem 1rem', borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Submit Bid</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '0.9rem', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{request.service_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{request.description}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}><MapPin size={11} color="#64748b" /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{request.area}, {request.city}</span></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Your Price (Rs) *</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 2500" style={inp} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Message</label>
              <motion.button whileTap={{ scale: 0.95 }} onClick={getAISuggestion} disabled={aiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', borderRadius: 100, background: `${AMBER}15`, border: `1px solid ${AMBER}30`, color: AMBER, fontWeight: 800, cursor: 'pointer', fontSize: '0.72rem' }}>
                {aiLoading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />} AI Assist
              </motion.button>
            </div>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your experience and why you're the best choice..." style={{ ...inp, resize: 'vertical' }} />
          </div>
          {timeEstimate && (
            <div style={{ padding: '0.6rem 0.9rem', borderRadius: 10, background: `${AMBER}10`, border: `1px solid ${AMBER}30`, color: AMBER, fontSize: '0.8rem', fontWeight: 700 }}>
              AI estimated job duration: {timeEstimate}
            </div>
          )}
          {error && <div style={{ padding: '0.7rem', borderRadius: 10, background: `${ERROR}15`, border: `1px solid ${ERROR}33`, color: ERROR, fontSize: '0.85rem' }}>{error}</div>}
          <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '0.9rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={16} /> Submit Bid</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Tab: Home ─────────────────────────────────────────────────────────────────
const HomeTab = ({ user, profile, isOnline, onToggleOnline, activeJobs, onTabChange, unreadCount, onOpenNotifications, isMobile }) => {
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [viewingRatings, setViewingRatings] = useState(false);
  const [viewingJobs, setViewingJobs] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let q = supabase.from('service_requests').select('*').eq('status', 'open').order('created_at', { ascending: false });
    if (user?.city) q = q.eq('city', user.city);
    if (profile?.service_type) q = q.ilike('service_name', `%${profile.service_type}%`);
    q.limit(4).then(({ data }) => setNearbyRequests(data || []));
  }, [user?.id, user?.city, profile?.service_type]);

  // Backs the Rating/Jobs Done/Total Earned stat cards — same completed-jobs
  // shape the Earnings tab uses (bids.price joined onto completed requests),
  // kept here too so those stats stay accurate instead of relying on the
  // legacy provider_profiles.rating/total_jobs columns that bidding never updates.
  const loadCompletedJobs = useCallback(async () => {
    if (!user?.id) return;
    setJobsLoading(true);
    const { data: bids } = await supabase.from('bids').select('request_id, price').eq('provider_id', user.id).eq('status', 'accepted');
    if (!bids || bids.length === 0) { setCompletedJobs([]); setJobsLoading(false); return; }
    const ids = bids.map(b => b.request_id);
    const priceMap = {};
    bids.forEach(b => { priceMap[b.request_id] = b.price; });
    const { data: reqs } = await supabase.from('service_requests').select('*').in('id', ids).eq('status', 'completed').order('created_at', { ascending: false });
    setCompletedJobs((reqs || []).map(r => ({ ...r, agreedPrice: priceMap[r.id] })));
    setJobsLoading(false);
  }, [user?.id]);

  useEffect(() => { loadCompletedJobs(); }, [loadCompletedJobs]);

  // Live-updates ratings/completed-jobs stats when a request is marked
  // completed or rated elsewhere, instead of only refreshing on next mount.
  // Filtered to this provider's own requests — previously had no filter at
  // all, so every provider's client re-ran this query on any request update
  // system-wide.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`provider_home_jobs_${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `accepted_provider_id=eq.${user.id}` }, () => loadCompletedJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadCompletedJobs]);

  const ratedJobs = completedJobs.filter(j => j.rating != null);
  const avgRating = ratedJobs.length ? ratedJobs.reduce((s, j) => s + j.rating, 0) / ratedJobs.length : 0;
  const totalEarned = completedJobs.reduce((s, j) => s + (j.agreedPrice || 0), 0);

  const stats = [
    { label: 'Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—', color: AMBER, Icon: Star, onClick: () => setViewingRatings(true) },
    { label: 'Jobs Done', value: completedJobs.length, color: PRIMARY, Icon: Briefcase, onClick: () => setViewingJobs(true) },
    { label: 'Total Earned', value: totalEarned > 0 ? `Rs ${totalEarned.toLocaleString()}` : '—', color: SUCCESS, Icon: DollarSign, onClick: () => onTabChange('earnings') },
  ];

  const onlineToggle = (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onToggleOnline}
      style={{ padding: '1.1rem 1.3rem', borderRadius: 18, background: isOnline ? 'linear-gradient(135deg,#064e3b,#065f46)' : colors.surface, border: `1px solid ${isOnline ? `${SUCCESS}44` : colors.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${isOnline ? SUCCESS : '#64748b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOnline ? SUCCESS : '#64748b', flexShrink: 0 }}>
        {isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isOnline ? SUCCESS : '#94a3b8' }}>{isOnline ? 'You are Online' : 'You are Offline'}</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{isOnline ? 'Customers can find & request you' : 'Tap to go online & receive requests'}</div>
      </div>
      <div style={{ width: 40, height: 22, borderRadius: 100, background: isOnline ? SUCCESS : '#333', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
        <motion.div animate={{ x: isOnline ? 18 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: 'white' }} />
      </div>
    </motion.div>
  );

  const quickNav = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      {[
        { label: 'New Requests', color: PRIMARY, icon: <ClipboardList size={18} />, tab: 'requests' },
        { label: 'Active Jobs', color: SUCCESS, icon: <Briefcase size={18} />, tab: 'jobs' },
        { label: 'Earnings', color: AMBER, icon: <Wallet size={18} />, tab: 'earnings' },
        { label: 'My Profile', color: '#8b5cf6', icon: <User size={18} />, tab: 'profile' },
      ].map(a => (
        <motion.button key={a.label} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => onTabChange(a.tab)}
          style={{ padding: '1rem', borderRadius: 16, background: `${a.color}0d`, border: `1px solid ${a.color}25`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>{a.icon}</div>
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'white', textAlign: 'left' }}>{a.label}</span>
        </motion.button>
      ))}
    </div>
  );

  const nearbyRequestsBlock = nearbyRequests.length > 0 && (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Nearby Requests</span>
        <span style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }} onClick={() => onTabChange('requests')}>View All</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {nearbyRequests.map(r => (
          <div key={r.id} onClick={() => onTabChange('requests')}
            style={{ padding: '0.9rem', borderRadius: 14, background: colors.surface, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.service_name}</div>
              <span style={{ fontSize: '0.7rem', color: colors.textDim, flexShrink: 0 }}>{timeAgo(r.created_at)}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer_name} • {r.area}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const activeJobsBlock = activeJobs.length > 0 && (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Active Jobs</span>
        <span style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }} onClick={() => onTabChange('jobs')}>View All</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {activeJobs.map(job => {
          const { label, color } = statusMeta(job.status);
          return (
            <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem', borderRadius: 14, background: `${color}10`, border: `1px solid ${color}25`, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.service_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer_name} • {job.area}</div>
              </div>
              <div style={{ flexShrink: 0 }}>{chip(label, color)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <GradientHeader
        avatarUrl={user?.avatarUrl}
        name={user?.name}
        greeting="Provider Dashboard"
        title={user?.name?.split(' ')[0] || 'Provider'}
        unreadCount={unreadCount}
        onBellClick={onOpenNotifications}
      />
      {profile?.service_type && <div style={{ fontSize: '0.85rem', color: PRIMARY, fontWeight: 600, marginTop: -12 }}>{profile.service_type}</div>}

      {isMobile ? (
        <>
          {onlineToggle}
          <StatsStrip items={stats} />
          {quickNav}
          {activeJobsBlock}
          {nearbyRequestsBlock}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {onlineToggle}
            {quickNav}
            {activeJobsBlock}
            {nearbyRequestsBlock}
          </div>
          <StatsStrip items={stats} />
        </div>
      )}

      <AnimatePresence>
        {viewingRatings && <RatingHistoryModal jobs={ratedJobs} avgRating={avgRating} loading={jobsLoading} onRefresh={loadCompletedJobs} onClose={() => setViewingRatings(false)} />}
        {viewingJobs && <JobsHistoryModal jobs={completedJobs} onClose={() => setViewingJobs(false)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Rating History Modal ───────────────────────────────────────────────────────
const RatingHistoryModal = ({ jobs, avgRating, loading, onRefresh, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
    <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
      style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Ratings</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onRefresh} disabled={loading} style={{ background: 'none', border: 'none', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', padding: 6 }}>
            <RefreshCw size={18} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6 }}><X size={20} /></button>
        </div>
      </div>

      <div style={{ padding: '1.25rem', borderRadius: 18, background: 'linear-gradient(135deg,#78350f,#92400e)', border: `1px solid ${AMBER}4d`, marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: 700, marginBottom: 6 }}>Overall Rating</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
          <Star size={22} color={AMBER} fill={AMBER} style={{ marginBottom: 4 }} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>
            ({jobs.length} {jobs.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      </div>

      <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Job Reviews</div>
      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <Star size={32} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: '0.85rem' }}>No ratings yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {jobs.map(j => (
            <div key={j.id} style={{ padding: 14, borderRadius: 14, background: colors.surface, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.service_name}</div>
                  <div style={{ fontSize: '0.72rem', color: colors.textMuted }}>{j.customer_name}</div>
                </div>
                <div style={{ display: 'flex', flexShrink: 0 }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <Star key={i} size={14} color={AMBER} fill={i < Math.round(j.rating) ? AMBER : 'none'} />
                  ))}
                </div>
              </div>
              {j.review && (
                <div style={{ fontSize: '0.78rem', color: colors.textMuted, marginTop: 8, fontStyle: 'italic' }}>"{j.review}"</div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  </div>
);

// ── Jobs History Modal ──────────────────────────────────────────────────────────
const JobsHistoryModal = ({ jobs, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
    <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
      style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Jobs Done</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      <div style={{ padding: '1.25rem', borderRadius: 18, background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', border: `1px solid ${PRIMARY}4d`, marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700, marginBottom: 6 }}>Total Jobs Completed</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{jobs.length}</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem' }}>All Completed Jobs</div>
      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <Briefcase size={32} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: '0.85rem' }}>No completed jobs yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {jobs.map(j => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: colors.surface, border: `1px solid ${colors.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${PRIMARY}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={20} color={PRIMARY} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.service_name}</div>
                <div style={{ fontSize: '0.72rem', color: colors.textMuted }}>{j.customer_name}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, color: SUCCESS, fontSize: '0.85rem' }}>Rs {(j.agreedPrice || 0).toLocaleString()}</div>
                <div style={{ fontSize: '0.68rem', color: colors.textDim }}>{new Date(j.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  </div>
);

// ── Tab: Requests ─────────────────────────────────────────────────────────────
const RequestsTab = ({ user, profile, isOnline }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myBids, setMyBids] = useState({});
  const [biddingOn, setBiddingOn] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    let query = supabase.from('service_requests').select('*').eq('status', 'open').order('created_at', { ascending: false });
    if (user?.city) query = query.eq('city', user.city);
    if (user?.area) query = query.eq('area', user.area);
    // Case-insensitive partial match, same semantics as the Flutter app's
    // ilike('service_name', '%$serviceType%') so both apps surface the
    // same requests to a provider with a given service_type.
    if (profile?.service_type) query = query.ilike('service_name', `%${profile.service_type}%`);
    const { data } = await query.limit(30);
    const reqs = data || [];
    setRequests(reqs);

    if (reqs.length > 0) {
      const ids = reqs.map(r => r.id);
      const { data: bids } = await supabase.from('bids').select('request_id,status').eq('provider_id', user.id).in('request_id', ids);
      const bidMap = {};
      (bids || []).forEach(b => { bidMap[b.request_id] = b.status; });
      setMyBids(bidMap);
    }
    setLoading(false);
  }, [user?.id, user?.city, user?.area, profile?.service_type]);

  useEffect(() => { load(); }, [load]);

  // Realtime: new matching requests appear live, and a request leaving
  // 'open' (accepted by another provider, cancelled) disappears live too —
  // event: '*' instead of just INSERT, mirroring Flutter's
  // request_provider.dart avail_req_* channel fix.
  useEffect(() => {
    if (!user?.city) return;
    const channel = supabase.channel(`provider_requests_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `city=eq.${user.city}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.city, user?.id, load]);

  if (!isOnline) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center', color: '#64748b' }}>
      <WifiOff size={48} style={{ marginBottom: 16 }} />
      <div style={{ fontWeight: 800, fontSize: '1rem' }}>You are Offline</div>
      <div style={{ fontSize: '0.85rem', marginTop: 8, lineHeight: 1.6 }}>Go online from the Home tab to start receiving service requests.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div>
          <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>New Requests</span>
          {user?.city && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{user.area ? `${user.area}, ` : ''}{user.city}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {profile?.service_type && <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 800, background: `${SUCCESS}15`, color: SUCCESS, border: `1px solid ${SUCCESS}30` }}>{profile.service_type}</span>}
          <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={15} /></motion.button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <ClipboardList size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No requests right now</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6, lineHeight: 1.6 }}>Customers in {user?.city || 'your area'} will post {profile?.service_type || ''} requests here.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.9rem', alignItems: 'start' }}>
          {requests.map(r => {
            const alreadyBid = myBids[r.id];
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '1rem', borderRadius: 18, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div onClick={() => setViewingCustomer(r)} style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: PRIMARY, flexShrink: 0 }}>
                      {r.customer_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={11} color="#64748b" /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.area}, {r.city}</span></div>
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 800, background: `${PRIMARY}15`, color: PRIMARY, border: `1px solid ${PRIMARY}25`, flexShrink: 0, marginLeft: 8 }}>{r.service_name}</span>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: 10, background: '#141414', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{timeAgo(r.created_at)}</span>
                  {alreadyBid ? (
                    <span style={{ fontSize: '0.78rem', color: alreadyBid === 'accepted' ? SUCCESS : '#94a3b8', fontWeight: 700 }}>
                      {alreadyBid === 'accepted' ? '✓ Accepted' : '✓ Bid Placed'}
                    </span>
                  ) : (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBiddingOn(r)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 1rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <Send size={12} /> Bid
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {biddingOn && (
          <BidModal
            request={biddingOn}
            providerId={user.id}
            providerName={user.name}
            providerPhone={user.phone || ''}
            onClose={() => setBiddingOn(null)}
            onSubmitted={() => { setBiddingOn(null); load(); }}
          />
        )}
        {viewingCustomer && (
          <CustomerProfileModal customerId={viewingCustomer.customer_id} onClose={() => setViewingCustomer(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: Jobs ─────────────────────────────────────────────────────────────────
const JobsTab = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [chatting, setChatting] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [riskById, setRiskById] = useState({});

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: bids } = await supabase.from('bids').select('id, request_id, price').eq('provider_id', user.id).eq('status', 'accepted');
    if (!bids || bids.length === 0) { setJobs([]); setLoading(false); return; }
    const ids = bids.map(b => b.request_id);
    const priceMap = {}, bidIdMap = {};
    bids.forEach(b => { priceMap[b.request_id] = b.price; bidIdMap[b.request_id] = b.id; });
    const { data: reqs } = await supabase.from('service_requests').select('*').in('id', ids).order('created_at', { ascending: false });
    setJobs((reqs || []).map(r => ({ ...r, agreedPrice: priceMap[r.id], bidId: bidIdMap[r.id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Live-updates this list the instant a bid of theirs changes status, or a
  // job they're working on gets updated (e.g. customer verifies OTP, marks
  // complete) — before this it only refreshed on mount or the manual
  // refresh button.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`provider_jobs_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `provider_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `accepted_provider_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Cancellation-risk badges are advisory only — computed after the active
  // job list is on screen so a slow/failed Groq call never delays or blocks
  // the real job-management actions (call, chat, mark complete).
  useEffect(() => {
    const active = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status));
    if (active.length === 0) return;
    let cancelled = false;
    assessCancellationRiskML(active.map(j => ({
      id: j.id,
      status: j.status,
      hoursSinceAccepted: (Date.now() - new Date(j.created_at)) / 3600000,
      agreedPrice: j.agreedPrice,
      otp_verified: j.otp_verified,
    }))).then(result => { if (!cancelled && result) setRiskById(result); });
    return () => { cancelled = true; };
  }, [jobs.map(j => j.id).join(',')]);

  const markComplete = async (id) => {
    setCompleting(id);
    await supabase.from('service_requests').update({ status: 'completed' }).eq('id', id).eq('otp_verified', true);
    try {
      await supabase.from('bookings').update({ status: 'completed' }).eq('request_id', id).in('status', ['confirmed', 'in_progress']);
    } catch (_) { /* non-critical */ }
    const job = jobs.find(j => j.id === id);
    if (job) notify(job.customer_id, 'Job completed', `Your ${job.service_name} request has been marked complete. Rate your experience!`, 'booking', { requestId: job.id });
    setCompleting(null);
    load();
  };

  const active = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status));
  const history = jobs.filter(j => ['completed', 'cancelled'].includes(j.status));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>My Jobs</span>
        <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Briefcase size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No active jobs</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Your accepted bids will appear here.</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Active</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '0.9rem', marginBottom: '1.5rem', alignItems: 'start' }}>
                {active.map(job => {
                  const { label, color } = statusMeta(job.status);
                  return (
                    <div key={job.id} style={{ padding: '1rem', borderRadius: 18, background: `${color}0d`, border: `1px solid ${color}30` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.service_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer_name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, minWidth: 0 }}><MapPin size={11} color="#64748b" style={{ flexShrink: 0 }} /><span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.area}, {job.city}</span></div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {chip(label, color)}
                          {job.agreedPrice && <div style={{ fontWeight: 900, color: SUCCESS, fontSize: '0.95rem', marginTop: 6 }}>Rs {job.agreedPrice}</div>}
                        </div>
                      </div>
                      {!job.otp_verified && job.otp_code && (
                        <div style={{ marginTop: 10, padding: '0.9rem', borderRadius: 14, background: `${PRIMARY}0d`, border: `1px solid ${PRIMARY}30`, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Show this code to the customer</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '6px', color: PRIMARY }}>{job.otp_code}</div>
                        </div>
                      )}
                      {riskById[job.id]?.risk && riskById[job.id].risk !== 'low' && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.7rem', borderRadius: 10, background: riskById[job.id].risk === 'high' ? `${ERROR}12` : `${AMBER}12`, border: `1px solid ${riskById[job.id].risk === 'high' ? ERROR : AMBER}33` }}>
                          <AlertCircle size={13} color={riskById[job.id].risk === 'high' ? ERROR : AMBER} />
                          <span style={{ fontSize: '0.75rem', color: riskById[job.id].risk === 'high' ? ERROR : AMBER, fontWeight: 800 }}>
                            {riskById[job.id].risk === 'high' ? 'High' : 'Medium'} cancellation risk
                          </span>
                          {riskById[job.id].reason && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>· {riskById[job.id].reason}</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {job.customer_phone && (
                          <a href={`tel:${job.customer_phone}`} style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
                            <Phone size={13} /> Call
                          </a>
                        )}
                        {job.bidId && (
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setChatting(job)}
                            style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                            <MessageSquare size={13} /> Chat
                          </motion.button>
                        )}
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTracking(job)}
                          style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderRadius: 100, background: `${AMBER}10`, border: `1px solid ${AMBER}30`, color: AMBER, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                          <Navigation size={13} /> Share Location
                        </motion.button>
                        {job.otp_verified ? (
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => markComplete(job.id)} disabled={completing === job.id}
                            style={{ flex: '1 1 100%', padding: '0.6rem', borderRadius: 100, background: `linear-gradient(90deg,${SUCCESS},#059669)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {completing === job.id ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={13} /> Mark Complete</>}
                          </motion.button>
                        ) : (
                          <div style={{ flex: '1 1 100%', padding: '0.6rem', borderRadius: 100, background: `${AMBER}10`, border: `1px solid ${AMBER}30`, color: AMBER, fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' }}>
                            Waiting for customer OTP verification
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {history.length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>History</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem', alignItems: 'start' }}>
                {history.map(job => {
                  const { label, color } = statusMeta(job.status);
                  return (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.service_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer_name}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {chip(label, color)}
                        {job.agreedPrice && <div style={{ fontWeight: 800, color: SUCCESS, fontSize: '0.85rem', marginTop: 4 }}>Rs {job.agreedPrice}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {chatting && (
          <ChatModal
            bidId={chatting.bidId}
            requestId={chatting.id}
            otherName={chatting.customer_name}
            otherUserId={chatting.customer_id}
            currentUserId={user.id}
            currentUserName={user.name}
            onClose={() => setChatting(null)}
          />
        )}
        {tracking && <LiveTrackingModal requestId={tracking.id} isProvider={true} onClose={() => setTracking(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: Earnings ─────────────────────────────────────────────────────────────
const EarningsTab = ({ user }) => {
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: bids } = await supabase.from('bids').select('request_id, price').eq('provider_id', user.id).eq('status', 'accepted');
    if (!bids || bids.length === 0) { setCompleted([]); setLoading(false); return; }
    const ids = bids.map(b => b.request_id);
    const priceMap = {};
    bids.forEach(b => { priceMap[b.request_id] = b.price; });
    const { data: reqs } = await supabase.from('service_requests').select('*').in('id', ids).eq('status', 'completed').order('created_at', { ascending: false });
    setCompleted((reqs || []).map(r => ({ ...r, agreedPrice: priceMap[r.id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Live-updates earnings the instant a job of theirs is marked complete —
  // before this it only refreshed on mount or the manual refresh button.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`provider_earnings_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `accepted_provider_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const total = completed.reduce((s, j) => s + (j.agreedPrice || 0), 0);
  const thisMonth = completed.filter(j => new Date(j.created_at).getMonth() === new Date().getMonth()).reduce((s, j) => s + (j.agreedPrice || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Earnings</span>
        <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </motion.button>
      </div>

      <div style={{ padding: '1.5rem', borderRadius: 20, background: 'linear-gradient(135deg,#064e3b,#065f46)', border: `1px solid ${SUCCESS}33`, marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.78rem', color: `${SUCCESS}cc`, fontWeight: 700, marginBottom: 4 }}>Total Lifetime Earnings</div>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>Rs {total.toLocaleString()}</div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>Rs {thisMonth.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: `${SUCCESS}99` }}>This Month</div>
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>{completed.length}</div>
            <div style={{ fontSize: '0.72rem', color: `${SUCCESS}99` }}>Jobs Done</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : completed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
          <Wallet size={36} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700 }}>No transactions yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Completed jobs will appear here.</div>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Transaction History</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem', alignItems: 'start' }}>
            {completed.map(job => (
              <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${SUCCESS}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DollarSign size={18} color={SUCCESS} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.service_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{job.customer_name}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, color: SUCCESS, fontSize: '0.95rem' }}>+ Rs {(job.agreedPrice || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>{new Date(job.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Tab: Profile ──────────────────────────────────────────────────────────────
const ProfileTab = ({ user, profile, onLogout, onProfileUpdate }) => {
  const navigate = useNavigate();
  const { getServices } = useAuth();
  const [modal, setModal] = useState(null);
  const [services, setServices] = useState([]);
  const [savingSpec, setSavingSpec] = useState(false);
  const initials = user?.name?.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  useEffect(() => { getServices().then(setServices); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fixes providers stuck on "Profile Incomplete" in the Requests tab with no
  // self-service way to set service_type after signup — previously this field
  // was display-only everywhere in the app.
  const handleSpecializationChange = async (serviceType) => {
    if (!user?.id || !serviceType) return;
    setSavingSpec(true);
    const { error } = await supabase.from('provider_profiles').upsert({ id: user.id, service_type: serviceType }, { onConflict: 'id' });
    setSavingSpec(false);
    if (!error) onProfileUpdate?.({ ...profile, service_type: serviceType });
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0 2rem', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : `linear-gradient(135deg,${PRIMARY},#4f46e5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900, marginBottom: 12 }}>{!user?.avatarUrl && initials}</div>
        <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{user?.name}</div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>{user?.email}</div>
        {profile?.service_type && <div style={{ fontSize: '0.85rem', color: PRIMARY, fontWeight: 600, marginTop: 4 }}>{profile.service_type}</div>}
        {(user?.area || user?.city) && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}><MapPin size={12} color="#64748b" /><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.area}{user.city ? `, ${user.city}` : ''}</span></div>}
        <span style={{ marginTop: 10, padding: '3px 12px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 800, background: `${SUCCESS}18`, color: SUCCESS, border: `1px solid ${SUCCESS}30` }}>Provider</span>
      </div>

      {profile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Rating', value: profile.rating ? `${parseFloat(profile.rating).toFixed(1)} ★` : '—', color: AMBER },
            { label: 'Jobs', value: profile.total_jobs || 0, color: PRIMARY },
            { label: 'Rate/hr', value: profile.rate_per_hour ? `${profile.rate_per_hour}` : '—', color: SUCCESS },
          ].map(s => (
            <div key={s.label} style={{ padding: '0.9rem', borderRadius: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, color: s.color, fontSize: '1rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Specialization</label>
        {profile?.service_type ? (
          // Locked once set — a provider randomly switching their trade would
          // invalidate their KYC/experience, mirrors Flutter's
          // edit_profile_screen.dart read-only-after-set behavior.
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, background: '#141414', border: `1px solid ${PRIMARY}50`, color: 'white', fontSize: '0.88rem', fontWeight: 600 }}>
            <span>{profile.service_type}</span>
            <Lock size={14} color="#64748b" />
          </div>
        ) : (
          <select
            value=""
            onChange={(e) => handleSpecializationChange(e.target.value)}
            disabled={savingSpec}
            style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, background: '#141414', border: `1px solid ${ERROR}50`, color: 'white', fontSize: '0.88rem', fontWeight: 600 }}
          >
            <option value="" disabled>Select your specialization</option>
            {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        )}
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>
          {savingSpec ? 'Saving...' : profile?.service_type ? 'Contact support to change your specialization.' : 'Required to receive matching service requests.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Edit Profile', icon: <User size={16} />, action: () => navigate('/profile') },
          { label: 'Notifications', icon: <Bell size={16} />, action: () => setModal('notifications') },
          { label: 'Security', icon: <Shield size={16} />, action: () => navigate('/profile') },
          { label: 'Help & Support', icon: <HelpCircle size={16} />, action: () => setModal('help') },
          { label: 'Contact Us', icon: <MessageSquare size={16} />, action: () => setModal('contact') },
        ].map(item => (
          <motion.button key={item.label} whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }} onClick={item.action}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.2rem', borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'white' }}>
            <span style={{ color: '#64748b' }}>{item.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1, textAlign: 'left' }}>{item.label}</span>
            <ChevronRight size={16} color="#64748b" />
          </motion.button>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.9rem', borderRadius: 100, background: `${ERROR}12`, border: `1px solid ${ERROR}30`, color: ERROR, fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
        <LogOut size={16} /> Logout
      </motion.button>

      <AnimatePresence>
        {modal === 'notifications' && <NotificationsModal userId={user.id} onClose={() => setModal(null)} />}
        {modal === 'help' && <HelpSupportModal role="provider" onClose={() => setModal(null)} onOpenContact={() => setModal('contact')} />}
        {modal === 'contact' && <ContactUsModal user={user} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const ProviderDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeJobs, setActiveJobs] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Lets navigate('/provider-dashboard', { state: { tab: '...' } }) jump
  // straight to a tab — used by tapped notifications, mirrors CustomerDashboard.
  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, [location.state]);

  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const refreshCount = () => {
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
        .then(({ count }) => setUnreadCount(count || 0));
    };
    refreshCount();
    const channel = supabase.channel(`notif_badge_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, refreshCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, showNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('provider_profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data) { setProfile(data); setIsOnline(!!data.is_online); } });
    loadActiveJobs();
  }, [user?.id]);

  const loadActiveJobs = async () => {
    if (!user?.id) return;
    const { data: bids } = await supabase.from('bids').select('request_id').eq('provider_id', user.id).eq('status', 'accepted');
    if (!bids?.length) return;
    const { data: reqs } = await supabase.from('service_requests').select('*').in('id', bids.map(b => b.request_id)).in('status', ['accepted', 'in_progress']);
    setActiveJobs(reqs || []);
  };

  const handleToggleOnline = async () => {
    if (!user?.id) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    const { error } = await supabase.from('provider_profiles').update({ is_online: newStatus }).eq('id', user.id);
    if (error) setIsOnline(!newStatus);
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isMobile = windowWidth < 768;

  // Mirrors Flutter's provider_main_screen.dart: flat 5-tab bar (Dashboard,
  // Requests, Jobs, Chats, Profile), no center-floating button — unlike the
  // customer nav. Earnings has no bottom-tab in Flutter either (reached from
  // Home's quick-nav grid); kept on the desktop sidebar only, same idea.
  const tabs = [
    { id: 'home',     label: 'Home',     Icon: Home },
    { id: 'requests', label: 'Requests', Icon: ClipboardList },
    { id: 'jobs',     label: 'Jobs',     Icon: Briefcase, badge: activeJobs.length },
    { id: 'chats',    label: 'Chats',    Icon: MessageCircle },
    { id: 'profile',  label: 'Profile',  Icon: User },
  ];
  const sidebarTabs = [
    { id: 'home',     label: 'Home',     Icon: Home },
    { id: 'requests', label: 'Requests', Icon: ClipboardList },
    { id: 'jobs',     label: 'Jobs',     Icon: Briefcase, badge: activeJobs.length },
    { id: 'chats',    label: 'Chats',    Icon: MessageCircle },
    { id: 'earnings', label: 'Earnings', Icon: Wallet },
    { id: 'profile',  label: 'Profile',  Icon: User },
  ];

  const tabContent = {
    home:     <HomeTab user={user} profile={profile} isOnline={isOnline} onToggleOnline={handleToggleOnline} activeJobs={activeJobs} onTabChange={setActiveTab} unreadCount={unreadCount} onOpenNotifications={() => setShowNotifications(true)} isMobile={isMobile} />,
    requests: <RequestsTab user={user} profile={profile} isOnline={isOnline} />,
    jobs:     <JobsTab user={user} />,
    chats:    <ChatsListTab user={user} role="provider" />,
    earnings: <EarningsTab user={user} />,
    profile:  <ProfileTab user={user} profile={profile} onLogout={handleLogout} onProfileUpdate={setProfile} />,
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" }}>

      {!isMobile && (
        <DashboardSidebar tabs={sidebarTabs} activeTab={activeTab} onChange={setActiveTab} onLogout={handleLogout} />
      )}

      {/* Content */}
      <div style={{ marginLeft: isMobile ? 0 : 240, paddingBottom: isMobile ? 80 : 0, minHeight: '100vh' }}>
        <div style={{ maxWidth: isMobile ? 640 : 1400, margin: '0 auto', padding: isMobile ? '0 1rem 1.25rem' : '2.5rem 3rem' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {isMobile && (
        <DashboardBottomNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      )}

      <AnimatePresence>
        {showNotifications && (
          <NotificationsModal userId={user.id} onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } *{box-sizing:border-box}`}</style>
    </div>
  );
};

export default ProviderDashboard;
