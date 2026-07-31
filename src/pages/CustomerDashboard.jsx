import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  Home, ClipboardList, Calendar, Cpu, User,
  LogOut, MapPin, Search, Plus, ChevronRight, ChevronDown,
  Clock, CheckCircle, XCircle, AlertCircle, Loader,
  Star, Phone, MessageSquare, Sparkles, CalendarClock,
  Users, Shield, RefreshCw, X, Send, Zap, TrendingUp, Bell,
  Navigation, DollarSign, HelpCircle, MessageCircle
} from 'lucide-react';
import LiveTrackingModal from '../components/LiveTrackingModal';
import ChatModal from '../components/ChatModal';
import ChatsListTab from '../components/ChatsListTab';
import OtpVerifyModal from '../components/OtpVerifyModal';
import AiChatModal from '../components/AiChatModal';
import AiServiceFinderModal from '../components/AiServiceFinderModal';
import AiPriceEstimatorModal from '../components/AiPriceEstimatorModal';
import NotificationsModal from '../components/NotificationsModal';
import ContactUsModal from '../components/ContactUsModal';
import HelpSupportModal from '../components/HelpSupportModal';
import ProviderDirectoryModal from '../components/ProviderDirectoryModal';
import ProviderProfileModal from '../components/ProviderProfileModal';
import BookingDetailModal from '../components/BookingDetailModal';
import LocationSelect from '../components/LocationSelect';
import { colors } from '../theme/tokens';
import { GradientHeader } from '../components/ui/GradientHeader';
import { StatsStrip } from '../components/ui/StatsStrip';
import { StatusChip, requestStatusMeta } from '../components/ui/StatusChip';
import { ServiceGridCard } from '../components/ui/ServiceGridCard';
import { rankAndScoreBidsML, distanceKm } from '../lib/aiInsights';
import { notify } from '../lib/notify';
import { PromoCarousel } from '../components/ui/PromoCarousel';
import { DashboardBottomNav } from '../components/ui/DashboardBottomNav';
import { DashboardSidebar } from '../components/ui/DashboardSidebar';

const PRIMARY = colors.primary;
const SUCCESS = colors.success;
const ERROR = colors.error;
const AMBER = colors.warning;

// ── helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const statusMeta = (s) => requestStatusMeta(s, { Clock, CheckCircle, Zap, XCircle, AlertCircle });

const chip = (label, color) => <StatusChip label={label} color={color} />;

// ── Post Request Modal ────────────────────────────────────────────────────────
const PostRequestModal = ({ user, onClose, onPosted, initialService, targetProvider }) => {
  const { getLocations } = useAuth();
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    service_name: targetProvider?.service_type || initialService || '', description: '', city: user?.city || '', area: user?.area || '', address: user?.address || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiWriting, setAiWriting] = useState(false);
  const [rawNote, setRawNote] = useState('');
  const [showAiWrite, setShowAiWrite] = useState(false);

  useEffect(() => {
    supabase.from('services').select('name').eq('is_active', true).order('name')
      .then(({ data }) => setServices((data || []).map(s => s.name)));
    getLocations().then(setLocations);
  }, []);

  const aiWrite = async () => {
    if (!rawNote.trim()) return;
    setAiWriting(true);
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Rewrite the user\'s casual note (which may be in Urdu, English, or mixed) into a clear, professional service-request description a provider can act on. Respond with ONLY the rewritten description text, no preamble.' },
            { role: 'user', content: rawNote },
          ],
        }),
      });
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content?.trim();
      if (content) { setForm(f => ({ ...f, description: content })); setShowAiWrite(false); setRawNote(''); }
    } catch { /* leave description as-is on failure */ }
    setAiWriting(false);
  };

  const submit = async () => {
    if (!form.service_name || !form.description || !form.city || !form.area) {
      setError('Please fill all required fields.'); return;
    }
    setLoading(true); setError('');
    const { data: created, error: err } = await supabase.from('service_requests').insert({
      customer_id: user.id,
      customer_name: user.name,
      customer_phone: user.phone || '',
      service_name: form.service_name,
      description: form.description,
      city: form.city,
      area: form.area,
      address: form.address,
      status: 'open',
    }).select('id').single();
    setLoading(false);
    if (err) { setError(err.message); return; }

    // Best-effort: notify the target provider directly ("Send Request" from
    // their profile), or otherwise every online provider of this service
    // type in the customer's city so they see the new request without
    // polling — the request row itself is identical either way; only who
    // gets notified differs.
    try {
      if (targetProvider) {
        await notify(targetProvider.id, 'New request just for you',
          `${user.name} wants to book you directly for ${form.service_name}`, 'booking', { requestId: created?.id });
      } else {
        const { data: providers } = await supabase.from('provider_profiles')
          .select('id').eq('service_type', form.service_name).eq('is_online', true);
        await Promise.all((providers || []).map(p =>
          notify(p.id, 'New service request nearby', `${form.service_name} needed in ${form.area}, ${form.city}`, 'booking', { requestId: created?.id })));
      }
    } catch { /* non-critical */ }

    onPosted();
  };

  const inp = { width: '100%', padding: '0.85rem 1rem', borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 300, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>Post a Request</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {targetProvider && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.9rem', borderRadius: 12, background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}4d`, marginBottom: '1.2rem' }}>
            <Users size={16} color={PRIMARY} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Sending this request directly to <b>{targetProvider.name}</b></span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Service Type *</label>
            <select value={form.service_name} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">Select a service</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Description *</label>
              <button type="button" onClick={() => setShowAiWrite(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.7rem', borderRadius: 100, background: `${AMBER}15`, border: `1px solid ${AMBER}30`, color: AMBER, fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }}>
                <Sparkles size={11} /> AI Write
              </button>
            </div>
            {showAiWrite && (
              <div style={{ padding: '0.8rem', borderRadius: 12, background: `${AMBER}0a`, border: `1px solid ${AMBER}25`, marginBottom: '0.7rem' }}>
                <textarea rows={2} value={rawNote} onChange={e => setRawNote(e.target.value)}
                  placeholder="Type casually, in Urdu or English — e.g. 'ac se pani tapak raha h'..."
                  style={{ ...inp, background: '#0a0a0a', marginBottom: 8, resize: 'vertical' }} />
                <motion.button whileTap={{ scale: 0.97 }} onClick={aiWrite} disabled={aiWriting || !rawNote.trim()}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 100, background: AMBER, color: '#0a0a0a', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {aiWriting ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />} Turn into professional description
                </motion.button>
              </div>
            )}
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you need..." style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <LocationSelect
              locations={locations}
              city={form.city}
              area={form.area}
              onCityChange={(val) => setForm(f => ({ ...f, city: val }))}
              onAreaChange={(val) => setForm(f => ({ ...f, area: val }))}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Full Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street / House number" style={inp} />
          </div>

          {error && <div style={{ padding: '0.7rem', borderRadius: 10, background: `${ERROR}15`, border: `1px solid ${ERROR}33`, color: ERROR, fontSize: '0.85rem' }}>{error}</div>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '0.9rem', borderRadius: 100, background: `linear-gradient(90deg, ${PRIMARY}, #4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={16} /> Post Request</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Bids Modal ────────────────────────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const BidsModal = ({ request, onClose, onAccepted }) => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  // AI ranking/success-score is advisory only — a failed or slow Groq call
  // must never block viewing or accepting bids, so it's fetched separately
  // and defaults to "no insight" (aiById stays {}) on any failure.
  const [aiById, setAiById] = useState({});
  const [viewingProvider, setViewingProvider] = useState(null);

  const viewProvider = async (bid) => {
    const [{ data: userRows }, { data: profileRow }] = await Promise.all([
      supabase.rpc('get_public_user_profile', { user_id: bid.provider_id }),
      supabase.from('provider_profiles').select('*').eq('id', bid.provider_id).maybeSingle(),
    ]);
    const userRow = userRows?.[0];
    if (userRow) setViewingProvider({ ...userRow, provider_profiles: profileRow || {} });
  };

  useEffect(() => {
    supabase.from('bids').select('*').eq('request_id', request.id).order('created_at')
      .then(({ data }) => { setBids(data || []); setLoading(false); });

    // Realtime: new/updated bids appear live, matching Flutter's bidding screen.
    const channel = supabase.channel(`bids_${request.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: `request_id=eq.${request.id}` },
        (payload) => setBids(prev => prev.some(b => b.id === payload.new.id) ? prev : [...prev, payload.new]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bids', filter: `request_id=eq.${request.id}` },
        (payload) => setBids(prev => prev.map(b => b.id === payload.new.id ? payload.new : b)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [request.id]);

  useEffect(() => {
    if (bids.length === 0) return;
    let cancelled = false;
    (async () => {
      const providerIds = bids.map(b => b.provider_id);
      const { data: profiles } = await supabase.from('provider_profiles').select('*').in('id', providerIds);
      const profileById = {};
      (profiles || []).forEach(p => { profileById[p.id] = p; });

      const enriched = bids.map(b => {
        const p = profileById[b.provider_id] || {};
        return {
          id: b.id,
          provider_name: b.provider_name,
          price: b.price,
          message: b.message,
          rating: p.rating ?? null,
          total_jobs: p.total_jobs ?? null,
          experience: p.experience ?? null,
          distanceKm: distanceKm(request.latitude, request.longitude, p.latitude, p.longitude),
        };
      });
      const result = await rankAndScoreBidsML(request, enriched);
      if (!cancelled && result) setAiById(result);
    })();
    return () => { cancelled = true; };
  }, [bids.length, request.id]);

  const acceptBid = async (bid) => {
    setAccepting(bid.id);
    const otp = generateOtp();

    await supabase.from('service_requests').update({
      status: 'accepted',
      accepted_bid_id: bid.id,
      accepted_provider_id: bid.provider_id,
      otp_code: otp,
    }).eq('id', request.id);

    await supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
    await supabase.from('bids').update({ status: 'rejected' }).eq('request_id', request.id).neq('id', bid.id);

    // Mirror Flutter's acceptBid(): also create a bookings row so this
    // shows up in the shared bookings list/history (non-critical, best-effort).
    try {
      let serviceIcon = 'Wrench';
      const { data: svc } = await supabase.from('services').select('icon').ilike('name', request.service_name || '').maybeSingle();
      if (svc?.icon) serviceIcon = svc.icon;

      await supabase.from('bookings').insert({
        request_id: request.id,
        user_id: request.customer_id,
        provider_id: bid.provider_id,
        service: request.service_name || '',
        service_icon: serviceIcon,
        address: request.address || '',
        city: request.city || '',
        notes: request.description || '',
        scheduled_type: 'flexible',
        price: bid.price || 0,
        agreed_price: bid.price || 0,
        status: 'confirmed',
      });
    } catch (_) { /* non-critical, matches Flutter's best-effort insert */ }

    notify(bid.provider_id, 'Your bid was accepted!', `${request.customer_name} accepted your bid for ${request.service_name}`, 'booking', { requestId: request.id, bidId: bid.id });

    setAccepting(null);
    onAccepted();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 300, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>Bids on Request</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{request.service_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : bids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
            <MessageSquare size={36} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700 }}>No bids yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Providers will place bids soon.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {bids.map(bid => {
              const isAccepted = bid.status === 'accepted';
              const ai = aiById[bid.id];
              return (
                <div key={bid.id} style={{ padding: '1rem', borderRadius: 16, background: '#141414', border: `1px solid ${isAccepted ? `${SUCCESS}44` : 'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => viewProvider(bid)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bid.provider_name}</div>
                        {ai?.rank === 1 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 100, background: `${AMBER}20`, border: `1px solid ${AMBER}44`, color: AMBER, fontSize: '0.62rem', fontWeight: 800 }}>
                            <Sparkles size={9} /> TOP MATCH
                          </span>
                        )}
                      </div>
                      {bid.provider_phone && <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={11} />{bid.provider_phone}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: PRIMARY, fontSize: '1rem' }}>Rs {bid.price}</div>
                      {isAccepted && chip('Accepted', SUCCESS)}
                    </div>
                  </div>
                  {ai?.success_score != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '0.5rem 0.7rem', borderRadius: 10, background: `${SUCCESS}10`, border: `1px solid ${SUCCESS}25` }}>
                      <Sparkles size={12} color={SUCCESS} />
                      <span style={{ fontSize: '0.75rem', color: SUCCESS, fontWeight: 800 }}>{ai.success_score}% job success likelihood</span>
                      {ai.reason && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>· {ai.reason}</span>}
                    </div>
                  )}
                  {bid.message && <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>{bid.message}</div>}
                  {request.status === 'open' && bid.status === 'pending' && (
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => acceptBid(bid)} disabled={accepting === bid.id}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: 100, background: `linear-gradient(90deg, ${SUCCESS}, #059669)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      {accepting === bid.id ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Accept Bid'}
                    </motion.button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
      {viewingProvider && (
        <ProviderProfileModal
          provider={viewingProvider}
          onClose={() => setViewingProvider(null)}
          onBookNow={() => setViewingProvider(null)}
        />
      )}
    </div>
  );
};

// ── AI Modal ──────────────────────────────────────────────────────────────────
const AIScheduleModal = ({ onClose }) => {
  const [svcName, setSvcName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!svcName.trim()) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a scheduling assistant. Respond ONLY with valid JSON, no extra text.' },
            { role: 'user', content: `Best time to schedule "${svcName}" service. Return: {"best_time":"...","best_days":["..."],"duration":"...","urgency":"Low|Medium|High|Emergency","prep_tips":["..."]}` }
          ]
        })
      });
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || '';
      const s = content.indexOf('{'), e = content.lastIndexOf('}');
      if (s !== -1) setResult(JSON.parse(content.slice(s, e + 1)));
    } catch { setResult(null); }
    setLoading(false);
  };

  const urgencyColor = (u) => ({ Emergency: ERROR, High: AMBER, Medium: PRIMARY, Low: SUCCESS }[u] || '#64748b');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Smart Scheduling</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Service name (e.g. AC Repair)"
            style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none' }} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={generate} disabled={loading}
            style={{ padding: '0.8rem 1.2rem', borderRadius: 100, background: `linear-gradient(90deg, ${PRIMARY}, #4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
          </motion.button>
        </div>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              {[{ label: 'Best Time', val: result.best_time, color: PRIMARY }, { label: 'Duration', val: result.duration, color: SUCCESS }, { label: 'Urgency', val: result.urgency, color: urgencyColor(result.urgency) }].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '0.9rem', borderRadius: 14, background: `${color}12`, border: `1px solid ${color}30`, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 900, color, fontSize: '0.85rem' }}>{val}</div>
                </div>
              ))}
            </div>
            {result.best_days && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>BEST DAYS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.best_days.map(d => <span key={d} style={{ padding: '4px 12px', borderRadius: 100, background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}33`, fontSize: '0.8rem', fontWeight: 700 }}>{d}</span>)}
                </div>
              </div>
            )}
            {result.prep_tips && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>PREPARATION TIPS</div>
                {result.prep_tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: PRIMARY, fontWeight: 900, minWidth: 16 }}>{i + 1}.</span>
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ── AI Provider Match Modal ────────────────────────────────────────────────────
const AIProviderMatchModal = ({ onClose }) => {
  const [svcName, setSvcName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!svcName.trim()) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a provider matching assistant. Respond ONLY with valid JSON.' },
            { role: 'user', content: `Guide to find the best "${svcName}" provider. Return: {"service_type":"...","required_skills":["..."],"experience_level":"...","questions_to_ask":["..."],"red_flags":["..."],"match_tip":"..."}` }
          ]
        })
      });
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || '';
      const s = content.indexOf('{'), e = content.lastIndexOf('}');
      if (s !== -1) setResult(JSON.parse(content.slice(s, e + 1)));
    } catch { setResult(null); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Provider Match AI</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <input value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Service name (e.g. Plumber)"
            style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none' }} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={generate} disabled={loading}
            style={{ padding: '0.8rem 1.2rem', borderRadius: 100, background: `linear-gradient(90deg, ${PRIMARY}, #4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
          </motion.button>
        </div>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: 14, background: 'linear-gradient(135deg,#1a1040,#0d1b3e)', border: `1px solid ${PRIMARY}33` }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 4 }}>{result.service_type}</div>
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 800, background: '#ec489930', color: '#ec4899' }}>{result.experience_level}</span>
            </div>
            {result.required_skills && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>REQUIRED SKILLS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.required_skills.map(s => <span key={s} style={{ padding: '4px 12px', borderRadius: 100, background: `${PRIMARY}15`, color: PRIMARY, border: `1px solid ${PRIMARY}30`, fontSize: '0.8rem', fontWeight: 700 }}>{s}</span>)}
                </div>
              </div>
            )}
            {result.questions_to_ask && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>QUESTIONS TO ASK</div>
                {result.questions_to_ask.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: SUCCESS, fontWeight: 900, minWidth: 16 }}>{i + 1}.</span>
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{q}</span>
                  </div>
                ))}
              </div>
            )}
            {result.red_flags && (
              <div>
                <div style={{ fontSize: '0.75rem', color: ERROR, fontWeight: 700, marginBottom: 8 }}>RED FLAGS TO AVOID</div>
                {result.red_flags.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <AlertCircle size={14} color={ERROR} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            )}
            {result.match_tip && (
              <div style={{ padding: '0.9rem', borderRadius: 12, background: `${SUCCESS}12`, border: `1px solid ${SUCCESS}30` }}>
                <div style={{ fontSize: '0.75rem', color: SUCCESS, fontWeight: 700, marginBottom: 4 }}>MATCH TIP</div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{result.match_tip}</div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ── Tab: Home ─────────────────────────────────────────────────────────────────
const HomeTab = ({ user, onPostRequest, onTabChange, onOpenDirectory, unreadCount, onOpenNotifications, isMobile }) => {
  const [recentRequests, setRecentRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  // 'Overall' (no filter), 'My Area', or a specific city name — mirrors
  // Flutter's customer_home_tab.dart Top Providers filter chips.
  const [topProvidersFilter, setTopProvidersFilter] = useState('Overall');
  const [cities, setCities] = useState([]);
  const [viewingProvider, setViewingProvider] = useState(null);
  const navigate = useNavigate();

  const viewProvider = async (p) => {
    const [{ data: userRows }, { data: profileRow }] = await Promise.all([
      supabase.rpc('get_public_user_profile', { user_id: p.id }),
      supabase.from('provider_profiles').select('*').eq('id', p.id).maybeSingle(),
    ]);
    const userRow = userRows?.[0];
    if (userRow) setViewingProvider({ ...userRow, provider_profiles: profileRow || {} });
  };

  const loadTopProviders = useCallback(async () => {
    let q = supabase.from('users').select('*, provider_profiles!inner(*)').eq('role', 'provider');
    if (topProvidersFilter === 'My Area') {
      if (user?.area) q = q.eq('area', user.area);
    } else if (topProvidersFilter !== 'Overall') {
      q = q.eq('city', topProvidersFilter);
    }
    // Rank by rating then total_jobs — not just whoever's online right now,
    // so this never goes blank just because nobody's currently toggled online.
    const { data } = await q
      .order('rating', { referencedTable: 'provider_profiles', ascending: false })
      .order('total_jobs', { referencedTable: 'provider_profiles', ascending: false })
      .limit(8);
    setProviders((data || []).map(u => ({ ...u.provider_profiles, id: u.id, name: u.name, avatarUrl: u.avatar_url })));
  }, [topProvidersFilter, user?.area]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('service_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setRecentRequests(data || []));
    supabase.from('services').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setServices(data || []));
    supabase.from('locations').select('city').order('city')
      .then(({ data }) => setCities((data || []).map(l => l.city)));
  }, [user?.id]);

  useEffect(() => { loadTopProviders(); }, [loadTopProviders]);

  const servicesBlock = services.length > 0 && (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'white' }}>Our Services</span>
        <span style={{ fontSize: '0.78rem', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/services')}>See all</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 3 : 4},1fr)`, gap: 12 }}>
        {services.map(s => (
          <ServiceGridCard key={s.id} name={s.name} icon={s.icon} imgUrl={s.img_url} color={s.color || PRIMARY}
            onClick={() => onPostRequest(s.name)} />
        ))}
      </div>
    </div>
  );

  const requestsBlock = (
    recentRequests.length > 0 ? (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>My Requests</span>
          <span style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }} onClick={() => onTabChange('requests')}>View All</span>
        </div>
        {recentRequests.map(r => {
          const { label, color, Icon } = statusMeta(r.status);
          return (
            <div key={r.id} onClick={() => onTabChange('requests')}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem', borderRadius: 16, background: `${color}0d`, border: `1px solid ${color}25`, marginBottom: 8, gap: 8, cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.service_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{timeAgo(r.created_at)}</div>
              </div>
              <div style={{ flexShrink: 0 }}><StatusChip label={label} color={color} Icon={Icon} /></div>
            </div>
          );
        })}
      </div>
    ) : (
      <motion.div whileHover={{ y: -2 }}
        style={{ padding: '1.5rem', borderRadius: 20, background: `linear-gradient(135deg, ${PRIMARY}15, ${colors.primaryDark}15)`, border: `1px solid ${PRIMARY}30`, cursor: 'pointer' }}
        onClick={() => onPostRequest()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: `${PRIMARY}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={22} color={PRIMARY} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Post Your First Request</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>Get bids from nearby providers</div>
          </div>
          <ChevronRight size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
        </div>
      </motion.div>
    )
  );

  const quickActionsBlock = (
    <div>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Post a Request', desc: 'Get bids from nearby providers', Icon: Plus, color: PRIMARY, action: () => onPostRequest() },
          { label: 'Browse Services', desc: 'Find and book services directly', Icon: Search, color: colors.success, action: () => navigate('/search') },
          { label: 'Find Providers', desc: 'Browse verified providers near you', Icon: Users, color: '#8b5cf6', action: onOpenDirectory },
        ].map(a => (
          <motion.div key={a.label} whileHover={{ y: -2 }}
            style={{ padding: '1.1rem', borderRadius: 18, background: colors.surface, border: `1px solid ${colors.border}`, cursor: 'pointer' }}
            onClick={a.action}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <a.Icon size={18} color={a.color} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{a.label}</div>
            <div style={{ fontSize: '0.74rem', color: colors.textMuted, marginTop: 3 }}>{a.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const topProvidersChips = ['Overall', ...(user?.area ? ['My Area'] : []), ...cities];

  const providersBlock = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Top Providers</span>
        <span style={{ fontSize: '0.8rem', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }} onClick={onOpenDirectory}>See all</span>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        {topProvidersChips.map(chip => (
          <button key={chip} onClick={() => setTopProvidersFilter(chip)}
            style={{ flexShrink: 0, padding: '0.4rem 0.9rem', borderRadius: 100, background: topProvidersFilter === chip ? PRIMARY : colors.surface, border: `1px solid ${topProvidersFilter === chip ? PRIMARY : colors.border}`, color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
            {chip}
          </button>
        ))}
      </div>
      {providers.length === 0 ? (
        <div style={{ padding: '1.2rem', borderRadius: 16, background: colors.surface, border: `1px solid ${colors.border}`, textAlign: 'center', color: colors.textMuted, fontSize: '0.8rem' }}>
          No providers yet in this filter
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 12, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: 4 }}>
        {providers.map(p => (
          <div key={p.id} onClick={() => viewProvider(p)} style={isMobile
            ? { minWidth: 150, padding: 14, borderRadius: 18, background: colors.surface, border: `1px solid ${colors.border}`, flexShrink: 0, cursor: 'pointer' }
            : { padding: 12, borderRadius: 16, background: colors.surface, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }
          }>
            {isMobile ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                    background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover` : `linear-gradient(135deg,${PRIMARY},${colors.primaryDark})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800,
                  }}>
                    {!p.avatarUrl && (p.name?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.success }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'Provider'}</div>
                <div style={{ fontSize: '0.72rem', color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.service_type}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{parseFloat(p.rating || 0).toFixed(1)}</span>
                  <span style={{ flex: 1, textAlign: 'right', fontSize: '0.68rem', color: PRIMARY, fontWeight: 600 }}>Rs {p.rate_per_hour}/hr</span>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover` : `linear-gradient(135deg,${PRIMARY},${colors.primaryDark})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem',
                }}>
                  {!p.avatarUrl && (p.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'Provider'}</div>
                  <div style={{ fontSize: '0.7rem', color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.service_type}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    <Star size={11} color="#FBBF24" fill="#FBBF24" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{parseFloat(p.rating || 0).toFixed(1)}</span>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: PRIMARY, fontWeight: 600, marginTop: 2 }}>Rs {p.rate_per_hour}/hr</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );

  const sideBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PromoCarousel onSlideClick={() => onTabChange('ai')} />
      <StatsStrip items={[
        { Icon: Shield, value: '100k+', label: 'Users Served', color: colors.primaryLight },
        { Icon: Star, value: '4.8★', label: 'Avg Rating', color: '#FBBF24' },
        { Icon: Zap, value: `${services.length || 20}+`, label: 'Services', color: colors.success },
      ]} />
      {providersBlock}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <GradientHeader
        avatarUrl={user?.avatarUrl}
        name={user?.name}
        greeting={`Hello, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        title="What service do you need?"
        unreadCount={unreadCount}
        onBellClick={onOpenNotifications}
      />

      {/* Search bar */}
      <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate('/search')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
        <Search size={20} color={colors.primaryLight} />
        <span style={{ flex: 1, color: colors.textDim, fontSize: '0.88rem' }}>Search services or providers...</span>
      </motion.div>

      {isMobile ? (
        <>
          <PromoCarousel onSlideClick={() => onTabChange('ai')} />
          <StatsStrip items={[
            { Icon: Shield, value: '100k+', label: 'Users Served', color: colors.primaryLight },
            { Icon: Star, value: '4.8★', label: 'Avg Rating', color: '#FBBF24' },
            { Icon: Zap, value: `${services.length || 20}+`, label: 'Services', color: colors.success },
          ]} />
          {servicesBlock}
          {requestsBlock}
          {providersBlock}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {servicesBlock}
            {requestsBlock}
            {quickActionsBlock}
          </div>
          {sideBlock}
        </div>
      )}
      <AnimatePresence>
        {viewingProvider && (
          <ProviderProfileModal
            provider={viewingProvider}
            onClose={() => setViewingProvider(null)}
            onBookNow={(service, provider) => { setViewingProvider(null); onPostRequest(service, provider); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: My Requests ──────────────────────────────────────────────────────────
const RequestsTab = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingBids, setViewingBids] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [verifyingOtp, setVerifyingOtp] = useState(null);
  const [chatting, setChatting] = useState(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('service_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Live-updates request status (accepted/rejected/completed etc.) as soon as
  // a provider acts, instead of only refreshing when the user taps refresh.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`my_requests_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `customer_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const openChatForRequest = async (request) => {
    const { data } = await supabase.from('bids').select('*').eq('request_id', request.id).eq('id', request.accepted_bid_id).maybeSingle();
    if (data) setChatting({ bid: data, request });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>My Requests</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
            <RefreshCw size={15} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowPost(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>
            <Plus size={14} /> New
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <ClipboardList size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No requests yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Post a request to get bids from providers.</div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowPost(true)}
            style={{ marginTop: '1rem', padding: '0.7rem 1.5rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.88rem' }}>
            Post First Request
          </motion.button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.9rem', alignItems: 'start' }}>
          {requests.map(r => {
            const { label, color, Icon } = statusMeta(r.status);
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '1rem', borderRadius: 18, background: `${color}0d`, border: `1px solid ${color}25` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.service_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <MapPin size={11} color="#64748b" />
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.area}, {r.city}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}><StatusChip label={label} color={color} Icon={Icon} /></div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{timeAgo(r.created_at)}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(r.status === 'open' || r.status === 'pending') && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setViewingBids(r)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}33`, color: PRIMARY, fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                        <MessageSquare size={12} /> View Bids
                      </motion.button>
                    )}
                    {r.status === 'accepted' && (
                      <>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => openChatForRequest(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                          <MessageSquare size={12} /> Chat
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setVerifyingOtp(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: `${SUCCESS}18`, border: `1px solid ${SUCCESS}33`, color: SUCCESS, fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                          <Shield size={12} /> Verify OTP
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTracking(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: `${AMBER}18`, border: `1px solid ${AMBER}33`, color: AMBER, fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                          <Navigation size={12} /> Track
                        </motion.button>
                      </>
                    )}
                    {r.status === 'in_progress' && (
                      <>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => openChatForRequest(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                          <MessageSquare size={12} /> Chat
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTracking(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem', borderRadius: 100, background: `${AMBER}18`, border: `1px solid ${AMBER}33`, color: AMBER, fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}>
                          <Navigation size={12} /> Track
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showPost && <PostRequestModal user={user} onClose={() => setShowPost(false)} onPosted={() => { setShowPost(false); load(); }} />}
        {viewingBids && <BidsModal request={viewingBids} onClose={() => setViewingBids(null)} onAccepted={() => { setViewingBids(null); load(); }} />}
        {tracking && <LiveTrackingModal requestId={tracking.id} isProvider={false} onClose={() => setTracking(null)} />}
        {verifyingOtp && <OtpVerifyModal requestId={verifyingOtp.id} onClose={() => setVerifyingOtp(null)} onVerified={load} />}
        {chatting && (
          <ChatModal
            bidId={chatting.bid.id}
            requestId={chatting.request.id}
            otherName={chatting.bid.provider_name}
            otherUserId={chatting.bid.provider_id}
            currentUserId={user.id}
            currentUserName={user.name}
            onClose={() => setChatting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: Bookings ─────────────────────────────────────────────────────────────
const BookingsTab = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingBooking, setViewingBooking] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`my_bookings_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const bookingStatus = (s) => ({
    pending:   { label: 'Pending',   color: AMBER },
    confirmed: { label: 'Confirmed', color: PRIMARY },
    in_progress: { label: 'In Progress', color: '#3b82f6' },
    completed: { label: 'Completed', color: SUCCESS },
    cancelled: { label: 'Cancelled', color: ERROR },
    rejected:  { label: 'Rejected',  color: ERROR },
  }[s] || { label: s, color: '#64748b' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>My Bookings</span>
        <motion.button whileTap={{ scale: 0.95 }} onClick={load} style={{ padding: '0.5rem', borderRadius: 10, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
          <RefreshCw size={15} />
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader size={28} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Calendar size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No bookings yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Your service bookings will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.9rem', alignItems: 'start' }}>
          {bookings.map(b => {
            const { label, color } = bookingStatus(b.status);
            return (
              <motion.div key={b.id} whileTap={{ scale: 0.98 }} onClick={() => setViewingBooking(b)}
                style={{ padding: '1rem', borderRadius: 18, background: `${color}0d`, border: `1px solid ${color}25`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{b.service}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{b.address}</div>
                  </div>
                  {chip(label, color)}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {b.scheduled_date && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>📅 {b.scheduled_date}</span>}
                  {b.price && <span style={{ fontSize: '0.78rem', color: SUCCESS, fontWeight: 700 }}>Rs {b.price}</span>}
                  {b.status === 'completed' && !b.rating && <span style={{ fontSize: '0.78rem', color: AMBER, fontWeight: 700 }}>⭐ Rate this service</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {viewingBooking && (
          <BookingDetailModal booking={viewingBooking} onClose={() => setViewingBooking(null)} onUpdated={load} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: AI Assistant ─────────────────────────────────────────────────────────
const AITab = ({ user, onTabChange }) => {
  const [modal, setModal] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true).order('name').then(({ data }) => setServices(data || []));
  }, []);

  const features = [
    { id: 'chat', icon: <Cpu size={22} />, title: 'AI Chat', desc: 'Ask anything about a home service problem', color: '#ec4899' },
    { id: 'finder', icon: <Search size={22} />, title: 'Service Finder', desc: 'Not sure what service you need? Describe it', color: '#8b5cf6' },
    { id: 'price', icon: <DollarSign size={22} />, title: 'Price Estimator', desc: 'Get a realistic PKR price range before requesting', color: SUCCESS },
    { id: 'schedule', icon: <CalendarClock size={22} />, title: 'Smart Scheduling', desc: 'AI suggests the best time and day for your service', color: PRIMARY },
    { id: 'match', icon: <Users size={22} />, title: 'Provider Match', desc: 'Find what skills and qualities to look for', color: AMBER },
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100,
          background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)', fontSize: '0.66rem', fontWeight: 800, color: 'white', letterSpacing: 0.4,
        }}>
          <Sparkles size={12} /> POWERED BY SERVICEHIVE AI
        </span>
        <div style={{ fontWeight: 900, fontSize: '1.15rem', marginTop: 10 }}>AI Assistant</div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, marginTop: 4 }}>AI-powered tools to help you get the best service experience.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.9rem' }}>
        {features.map(f => (
          <motion.div key={f.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
            onClick={() => setModal(f.id)}
            style={{ padding: '1.2rem', borderRadius: 18, background: `${f.color}0d`, border: `1px solid ${f.color}25`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 10 }}>{f.icon}</div>
              <StatusChip label="LIVE" color={SUCCESS} size="sm" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal === 'chat' && <AiChatModal onClose={() => setModal(null)} />}
        {modal === 'finder' && (
          <AiServiceFinderModal
            services={services}
            onClose={() => setModal(null)}
            onPickService={() => { setModal(null); onTabChange?.('requests'); }}
          />
        )}
        {modal === 'price' && <AiPriceEstimatorModal city={user?.city} onClose={() => setModal(null)} />}
        {modal === 'schedule' && <AIScheduleModal onClose={() => setModal(null)} />}
        {modal === 'match' && <AIProviderMatchModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Tab: Profile ──────────────────────────────────────────────────────────────
const ProfileTab = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const initials = user?.name?.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const items = [
    { label: 'Edit Profile', icon: <User size={16} />, action: () => navigate('/profile') },
    { label: 'My Bookings', icon: <Calendar size={16} />, action: () => navigate('/customer-dashboard', { state: { tab: 'bookings' } }) },
    { label: 'Browse Services', icon: <Search size={16} />, action: () => navigate('/search') },
    { label: 'Notifications', icon: <Bell size={16} />, action: () => setModal('notifications') },
    { label: 'Security', icon: <Shield size={16} />, action: () => navigate('/profile') },
    { label: 'Help & Support', icon: <HelpCircle size={16} />, action: () => setModal('help') },
    { label: 'Contact Us', icon: <MessageSquare size={16} />, action: () => setModal('contact') },
  ];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0 2rem', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : `linear-gradient(135deg,${PRIMARY},#4f46e5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 900, marginBottom: 12 }}>{!user?.avatarUrl && initials}</div>
        <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{user?.name}</div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>{user?.email}</div>
        {user?.area && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}><MapPin size={12} color="#64748b" /><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{user.area}, {user.city}</span></div>}
        <span style={{ marginTop: 10, padding: '3px 12px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 800, background: `${PRIMARY}18`, color: PRIMARY, border: `1px solid ${PRIMARY}30` }}>Customer</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {items.map(item => (
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
        {modal === 'help' && <HelpSupportModal role="customer" onClose={() => setModal(null)} onOpenContact={() => setModal('contact')} />}
        {modal === 'contact' && <ContactUsModal user={user} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalService, setPostModalService] = useState('');
  const [postModalTargetProvider, setPostModalTargetProvider] = useState(null);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const openPostModal = (service, targetProvider) => {
    setPostModalService(service || '');
    setPostModalTargetProvider(targetProvider || null);
    setShowPostModal(true);
  };

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

  // Landed here from a redirect/link (legacy /book/:id, /bookings,
  // BottomNav's Activity link, Profile's "My Bookings") that wants a
  // specific tab active or the post-request modal pre-opened.
  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
    if (location.state?.initialService) openPostModal(location.state.initialService);
  }, [location.state]);

  useEffect(() => {
    if (user && user.role === 'provider') navigate('/provider-dashboard');
    if (user && user.role === 'admin') navigate('/admin');
  }, [user]);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isMobile = windowWidth < 768;

  // Mirrors Flutter's customer_main_screen.dart 5-tab layout: Home, Chats,
  // AI (center floating button), Bookings, Profile. "Requests" has no
  // dedicated bottom-tab in Flutter either — it's reached from Home's
  // request list / quick actions, same as here.
  const tabs = [
    { id: 'home',     label: 'Home',     Icon: Home },
    { id: 'chats',    label: 'Chats',    Icon: MessageCircle },
    { id: 'ai',       label: 'AI',       Icon: Sparkles },
    { id: 'bookings', label: 'Bookings', Icon: Calendar },
    { id: 'profile',  label: 'Profile',  Icon: User },
  ];
  const sidebarTabs = [
    { id: 'home',     label: 'Home',     Icon: Home },
    { id: 'requests', label: 'Requests', Icon: ClipboardList },
    { id: 'chats',    label: 'Chats',    Icon: MessageCircle },
    { id: 'bookings', label: 'Bookings', Icon: Calendar },
    { id: 'ai',       label: 'AI',       Icon: Sparkles },
    { id: 'profile',  label: 'Profile',  Icon: User },
  ];

  const tabContent = {
    home:     <HomeTab user={user} onPostRequest={openPostModal} onTabChange={setActiveTab} onOpenDirectory={() => setShowDirectory(true)} unreadCount={unreadCount} onOpenNotifications={() => setShowNotifications(true)} isMobile={isMobile} />,
    requests: <RequestsTab user={user} />,
    chats:    <ChatsListTab user={user} role="user" />,
    bookings: <BookingsTab user={user} />,
    ai:       <AITab user={user} onTabChange={setActiveTab} />,
    profile:  <ProfileTab user={user} onLogout={handleLogout} />,
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
        <DashboardBottomNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} centerAiId="ai" />
      )}

      <AnimatePresence>
        {showPostModal && (
          <PostRequestModal
            user={user}
            initialService={postModalService}
            targetProvider={postModalTargetProvider}
            onClose={() => { setShowPostModal(false); setPostModalTargetProvider(null); }}
            onPosted={() => { setShowPostModal(false); setPostModalTargetProvider(null); setActiveTab('requests'); }}
          />
        )}
        {showDirectory && (
          <ProviderDirectoryModal
            user={user}
            onClose={() => setShowDirectory(false)}
            onBookNow={(service, provider) => { setShowDirectory(false); openPostModal(service, provider); }}
          />
        )}
        {showNotifications && (
          <NotificationsModal userId={user.id} onClose={() => setShowNotifications(false)} />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } *{box-sizing:border-box}`}</style>
    </div>
  );
};

export default CustomerDashboard;
