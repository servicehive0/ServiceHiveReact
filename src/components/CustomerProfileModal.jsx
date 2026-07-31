import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ClipboardList, CheckCircle2, MapPin, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

// Public customer profile view, mirroring Flutter's customer_profile_screen.dart
// and this app's own ProviderProfileModal.jsx. Customers aren't rated in this
// app, so the stats shown are activity counts derived from service_requests
// (requests posted / jobs completed) rather than a rating.
const CustomerProfileModal = ({ customerId, onClose }) => {
  const [customer, setCustomer] = useState(null);
  const [requestsPosted, setRequestsPosted] = useState(0);
  const [jobsCompleted, setJobsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      // RLS only allows a user to read their own `users` row directly — this
      // RPC (SECURITY DEFINER, same pattern as get_public_avatar/is_blocked
      // in the Flutter app) is what actually lets a provider view a
      // customer's basic profile.
      const { data: rows, error } = await supabase.rpc('get_public_user_profile', { user_id: customerId });
      const row = rows?.[0];
      if (!active) return;
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      setCustomer(row);

      const [{ count: posted }, { count: completed }] = await Promise.all([
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).eq('status', 'completed'),
      ]);
      if (!active) return;
      setRequestsPosted(posted || 0);
      setJobsCompleted(completed || 0);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [customerId]);

  const initials = (customer?.name || '?')[0]?.toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 420, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader size={24} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : notFound || !customer ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.85rem' }}>Customer not found.</div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${PRIMARY},#4f46e5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, margin: '0 auto 1rem' }}>{initials}</div>
                <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>{customer.name}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '3px 12px', borderRadius: 100, background: `${PRIMARY}18`, border: `1px solid ${PRIMARY}40` }}>
                  <span style={{ fontSize: '0.72rem', color: PRIMARY, fontWeight: 700 }}>Customer</span>
                </div>
                {(customer.area || customer.city) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
                    <MapPin size={12} color="#64748b" /><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{customer.area}{customer.city ? `, ${customer.city}` : ''}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.9rem', borderRadius: 14, background: '#141414', textAlign: 'center' }}>
                  <ClipboardList size={16} color={PRIMARY} style={{ marginBottom: 4 }} />
                  <div style={{ fontWeight: 900 }}>{requestsPosted}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Requests Posted</div>
                </div>
                <div style={{ padding: '0.9rem', borderRadius: 14, background: '#141414', textAlign: 'center' }}>
                  <CheckCircle2 size={16} color={SUCCESS} style={{ marginBottom: 4 }} />
                  <div style={{ fontWeight: 900 }}>{jobsCompleted}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Jobs Completed</div>
                </div>
              </div>

              {customer.show_phone !== false && customer.phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>Phone</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{customer.phone}</span>
                </div>
              )}

              {customer.show_email !== false && customer.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>Email</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>{customer.email}</span>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerProfileModal;
