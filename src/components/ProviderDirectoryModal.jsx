import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, MapPin, Loader, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { predictProviderRatingML } from '../lib/aiInsights';
import ProviderProfileModal from './ProviderProfileModal';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

// Directory of real providers with live search/filter, mirroring Flutter's
// search_screen.dart (this is distinct from React's existing /search route,
// which browses the SERVICE catalog rather than PROVIDERS).
const ProviderDirectoryModal = ({ user, initialService, onClose, onBookNow }) => {
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState(initialService || '');
  const [viewingProvider, setViewingProvider] = useState(null);
  // ML-predicted rating (Service-Hive-ML/train_rating.py, a real trained
  // regression model — not an LLM) for providers who don't have a real
  // rating yet, so new providers show an estimated score instead of
  // nothing at all.
  const [predictedRatingById, setPredictedRatingById] = useState({});

  const load = async () => {
    setLoading(true);
    // No is_verified filter — matches CustomerDashboard.jsx's Top Providers
    // fetch and Flutter's ProviderListProvider.fetch(), neither of which
    // filter by approval status either. A provider who's a real row in the
    // database (even before admin approval) should still be findable here;
    // otherwise they're invisible to search until an admin approves them,
    // with no error or explanation shown to the customer searching.
    let q = supabase.from('users').select('*, provider_profiles!inner(*)').eq('role', 'provider');
    if (user?.city) q = q.eq('city', user.city);
    const { data } = await q;
    setProviders(data || []);
    setLoading(false);

    const unrated = (data || []).filter(p => !(p.provider_profiles?.rating > 0));
    if (unrated.length) {
      const result = await predictProviderRatingML(unrated.map(p => ({
        provider_id: p.id,
        total_jobs: p.provider_profiles?.total_jobs ?? 0,
        experience_years: p.provider_profiles?.experience ?? 0,
      })));
      if (result) setPredictedRatingById(result);
    }
  };

  useEffect(() => {
    supabase.from('services').select('name').eq('is_active', true).order('name')
      .then(({ data }) => setServices((data || []).map(s => s.name)));
    load();
  }, [user?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  // A typed query like "AC" should find the "AC Technician" service category
  // and show that category's providers, not just literally substring-match
  // a provider's own name/skills — mirrors Flutter's search_screen.dart fix.
  const q = query.toLowerCase();
  const matchedServiceNames = q ? services.filter(s => s.toLowerCase().includes(q)) : [];

  const filtered = providers.filter(p => {
    const profile = p.provider_profiles;
    if (q) {
      const matchesCategory = matchedServiceNames.length > 0 &&
        matchedServiceNames.some(s => profile?.service_type?.toLowerCase() === s.toLowerCase());
      const matchesFieldDirectly = p.name?.toLowerCase().includes(q) ||
        (Array.isArray(profile?.skills) && profile.skills.some(s => s.toLowerCase().includes(q)));
      if (!matchesCategory && !matchesFieldDirectly) return false;
    }
    const matchesService = !serviceFilter || profile?.service_type?.toLowerCase() === serviceFilter.toLowerCase();
    return matchesService;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Find Providers</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={load} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6, display: 'flex' }}>
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ padding: '1rem 1.2rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={16} color="#64748b" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or skill..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <button onClick={() => setServiceFilter('')}
              style={{ flexShrink: 0, padding: '0.4rem 0.9rem', borderRadius: 100, background: !serviceFilter ? PRIMARY : '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>All</button>
            {services.map(s => (
              <button key={s} onClick={() => setServiceFilter(s)}
                style={{ flexShrink: 0, padding: '0.4rem 0.9rem', borderRadius: 100, background: serviceFilter === s ? PRIMARY : '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader size={24} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.85rem' }}>No providers found matching your search.</div>
          ) : filtered.map(p => {
            const profile = p.provider_profiles;
            return (
              <motion.div key={p.id} whileTap={{ scale: 0.98 }} onClick={() => setViewingProvider(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem', borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${PRIMARY}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: PRIMARY, flexShrink: 0, position: 'relative' }}>
                  {(p.name || '?')[0]?.toUpperCase()}
                  {profile?.is_online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: SUCCESS, border: '2px solid #0d0d0d' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '0.78rem', color: PRIMARY, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.service_type}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    {profile?.rating > 0 ? (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><Star size={11} color="#f59e0b" fill="#f59e0b" /> {Number(profile.rating).toFixed(1)}</span>
                    ) : predictedRatingById[p.id] != null && (
                      <span title="Estimated by our ML model from job history — no reviews yet" style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={11} color="#64748b" /> ~{predictedRatingById[p.id].toFixed(1)} <span style={{ fontSize: '0.62rem', color: '#64748b' }}>(est.)</span>
                      </span>
                    )}
                    {profile?.total_jobs > 0 && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{profile.total_jobs} jobs</span>}
                    {profile?.rate_per_hour && <span style={{ fontSize: '0.72rem', color: SUCCESS, fontWeight: 700 }}>Rs {profile.rate_per_hour}/hr</span>}
                  </div>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {viewingProvider && (
          <ProviderProfileModal
            provider={viewingProvider}
            onClose={() => setViewingProvider(null)}
            onBookNow={(service, provider) => { onClose(); onBookNow?.(service, provider); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProviderDirectoryModal;
