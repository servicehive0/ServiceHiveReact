import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Reached right after login for a provider whose account is not yet
// `is_verified` — AuthContext.login() deliberately keeps the Supabase
// session alive (doesn't sign out) for that case so this page can read it
// directly and watch for the admin's decision, instead of the old behavior
// of just showing an inline login error with no way to check back.
const PendingApproval = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | pending | approved | rejected
  const [rejectionReason, setRejectionReason] = useState(null);
  const emailRef = useRef(null);
  const pollRef = useRef(null);

  const checkStatus = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) { navigate('/login'); return; }
    emailRef.current = session.user.email;

    const { data: profile } = await supabase
      .from('users')
      .select('is_verified')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile) {
      // Row is gone — admin_reject_provider deletes the account outright
      // after logging it, so an empty result here means "rejected", not
      // "still pending". Look up the reason from the audit log by email.
      const { data: reason } = await supabase.rpc('get_latest_rejection_reason', { lookup_email: emailRef.current });
      setRejectionReason(reason || null);
      setStatus('rejected');
      return;
    }

    setStatus(profile.is_verified ? 'approved' : 'pending');
  };

  useEffect(() => {
    checkStatus();

    let channel;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`pending_approval_${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, () => checkStatus())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, () => checkStatus())
        .subscribe();
    })();

    // Polling fallback in case realtime replication isn't enabled for this
    // table — keeps the page "live" without a manual refresh either way.
    pollRef.current = setInterval(checkStatus, 5000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(pollRef.current);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const card = {
    checking: {
      color: '#3b82f6',
      Icon: Shield,
      title: 'Checking Status...',
      body: 'Give us a moment while we check your application status.',
    },
    pending: {
      color: '#f59e0b',
      Icon: Clock,
      title: 'Verification Pending',
      body: 'Our team is reviewing your profile. This page will update automatically once an admin approves your account — no need to refresh.',
    },
    approved: {
      color: '#10b981',
      Icon: CheckCircle,
      title: 'Account Approved!',
      body: 'You\'re all set. Log back in to reach your provider dashboard.',
    },
    rejected: {
      color: '#ef4444',
      Icon: XCircle,
      title: 'Application Rejected',
      body: rejectionReason || 'Your application was not approved. You can register again with updated details.',
    },
  }[status];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--surface)',
          padding: '2.5rem',
          borderRadius: 32,
          border: '1px solid var(--border)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `${card.color}18`, color: card.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <card.Icon size={40} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.6rem', color: 'white' }}>{card.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>{card.body}</p>

        {status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <Clock size={16} /> Awaiting Admin Review
          </div>
        )}

        {status === 'approved' && (
          <button onClick={() => { supabase.auth.signOut(); navigate('/login'); }} className="btn-primary" style={{ borderRadius: 100, padding: '1rem 2rem', width: '100%', marginBottom: '1rem' }}>
            Back to Login
          </button>
        )}

        {status === 'rejected' && (
          <button onClick={() => { supabase.auth.signOut(); navigate('/register'); }} className="btn-primary" style={{ borderRadius: 100, padding: '1rem 2rem', width: '100%', marginBottom: '1rem' }}>
            Back to Register
          </button>
        )}

        {(status === 'pending' || status === 'checking') && (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '0.9rem', borderRadius: 100,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default PendingApproval;
