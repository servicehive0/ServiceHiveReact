import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Briefcase, DollarSign, Wifi, WifiOff, MapPin, Phone, Mail, MoreVertical, Ban } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';
const AMBER = '#f59e0b';

// Public provider profile view — view-only, reached from search/Top
// Providers: bio, stats, skills, contact info if the provider has it
// visible. No messaging or request/bid entry point here by design — this
// is purely a "look someone up" screen. Still carries a Block/Unblock menu
// since that's a safety feature independent of messaging.
const ProviderProfileModal = ({ provider, onClose }) => {
  const { user } = useAuth();
  // provider_profiles.rating/total_jobs are legacy columns the bidding
  // system never writes to (see ProviderDashboard.jsx's own comment on
  // this) — service_type/is_online/about/experience/rate_per_hour still
  // come from provider_profiles, but rating/jobs-done are computed live
  // from completed service_requests, same as the provider's own dashboard
  // and Flutter's provider_profile_screen.dart, kept live via realtime so
  // a job completing or a new review updates this modal without reopening.
  const [liveProfile, setLiveProfile] = useState(provider.provider_profiles || {});
  const [jobStats, setJobStats] = useState({ rating: 0, totalJobs: 0, reviewCount: 0 });

  const loadJobStats = React.useCallback(async () => {
    const { data } = await supabase.from('service_requests').select('rating, status')
      .eq('accepted_provider_id', provider.id).eq('status', 'completed');
    const completed = data || [];
    const rated = completed.filter(r => r.rating != null);
    const avgRating = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    setJobStats({ rating: avgRating, totalJobs: completed.length, reviewCount: rated.length });
  }, [provider.id]);

  useEffect(() => {
    setLiveProfile(provider.provider_profiles || {});
    let active = true;
    supabase.from('provider_profiles').select('*').eq('id', provider.id).maybeSingle()
      .then(({ data }) => { if (active && data) setLiveProfile(data); });
    loadJobStats();

    const profileChannel = supabase.channel(`provider_profile_modal_${provider.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'provider_profiles', filter: `id=eq.${provider.id}` },
        (payload) => { if (active) setLiveProfile(payload.new); })
      .subscribe();
    const jobsChannel = supabase.channel(`provider_profile_modal_jobs_${provider.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `accepted_provider_id=eq.${provider.id}` },
        () => { if (active) loadJobStats(); })
      .subscribe();

    return () => { active = false; supabase.removeChannel(profileChannel); supabase.removeChannel(jobsChannel); };
  }, [provider.id, loadJobStats]);

  const profile = { ...liveProfile, rating: jobStats.rating, total_jobs: jobStats.totalJobs, review_count: jobStats.reviewCount };
  const initials = (provider.name || '?')[0]?.toUpperCase();
  const skills = Array.isArray(profile.skills) ? profile.skills : (typeof profile.skills === 'string' && profile.skills ? profile.skills.split(',').map(s => s.trim()) : []);

  const [blocked, setBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('is_blocked', { blocker: user.id, blocked: provider.id })
      .then(({ data }) => setBlocked(data === true));
  }, [user?.id, provider.id]);

  const toggleBlock = async () => {
    setMenuOpen(false);
    if (!user?.id) return;
    if (blocked) {
      if (!window.confirm(`Unblock ${provider.name}?`)) return;
      const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', provider.id);
      if (!error) setBlocked(false);
    } else {
      if (!window.confirm(`Block ${provider.name}?`)) return;
      const { error } = await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: provider.id });
      if (!error) setBlocked(true);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => setMenuOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><MoreVertical size={20} /></button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 10, minWidth: 160 }}>
                <button onClick={toggleBlock} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', color: blocked ? PRIMARY : '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                  <Ban size={14} /> {blocked ? `Unblock ${provider.name}` : `Block ${provider.name}`}
                </button>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${PRIMARY},#4f46e5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, margin: '0 auto 1rem' }}>{initials}</div>
            <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>{provider.name}</div>
            <div style={{ fontSize: '0.9rem', color: PRIMARY, fontWeight: 700, marginTop: 4 }}>{profile.service_type}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {profile.is_online ? <Wifi size={14} color={SUCCESS} /> : <WifiOff size={14} color="#64748b" />}
              <span style={{ fontSize: '0.78rem', color: profile.is_online ? SUCCESS : '#64748b', fontWeight: 700 }}>{profile.is_online ? 'Online now' : 'Offline'}</span>
            </div>
            {(provider.area || provider.city) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
                <MapPin size={12} color="#64748b" /><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{provider.area}{provider.city ? `, ${provider.city}` : ''}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.9rem', borderRadius: 14, background: '#141414', textAlign: 'center' }}>
              <Star size={16} color={AMBER} style={{ marginBottom: 4 }} />
              <div style={{ fontWeight: 900 }}>{profile.rating ? Number(profile.rating).toFixed(1) : '—'}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Rating</div>
            </div>
            <div style={{ padding: '0.9rem', borderRadius: 14, background: '#141414', textAlign: 'center' }}>
              <Briefcase size={16} color={PRIMARY} style={{ marginBottom: 4 }} />
              <div style={{ fontWeight: 900 }}>{profile.total_jobs || 0}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Jobs Done</div>
            </div>
            <div style={{ padding: '0.9rem', borderRadius: 14, background: '#141414', textAlign: 'center' }}>
              <DollarSign size={16} color={SUCCESS} style={{ marginBottom: 4 }} />
              <div style={{ fontWeight: 900 }}>{profile.rate_per_hour ? `Rs ${profile.rate_per_hour}` : '—'}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Per Hour</div>
            </div>
          </div>

          {profile.about && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>About</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{profile.about}</div>
            </div>
          )}

          {profile.experience && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>Experience</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{profile.experience}</span>
            </div>
          )}

          {provider.show_phone !== false && provider.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> Phone</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{provider.phone}</span>
            </div>
          )}

          {provider.show_email !== false && provider.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> Email</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{provider.email}</span>
            </div>
          )}

          {skills.length > 0 && (
            <div style={{ marginTop: '1.2rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map(s => <span key={s} style={{ padding: '4px 12px', borderRadius: 100, background: `${PRIMARY}15`, color: PRIMARY, border: `1px solid ${PRIMARY}30`, fontSize: '0.78rem', fontWeight: 700 }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProviderProfileModal;
