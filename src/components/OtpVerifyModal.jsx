import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { notify } from '../lib/notify';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';

// Customer enters the 6-digit OTP the provider shows them in person, to
// confirm the provider actually arrived before the job starts — mirrors
// Flutter's otp_verify_screen.dart / RequestProvider.verifyOtp().
const OtpVerifyModal = ({ requestId, onClose, onVerified }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const verify = async () => {
    if (code.length < 6) { setError('Enter the 6-digit code.'); return; }
    setVerifying(true); setError('');

    const { data } = await supabase.from('service_requests').select('otp_code, accepted_provider_id, service_name').eq('id', requestId).single();
    if (!data || data.otp_code !== code.trim()) {
      setVerifying(false);
      setError('Incorrect code. Ask your provider for the OTP shown on their app.');
      return;
    }

    await supabase.from('service_requests').update({ status: 'in_progress', otp_verified: true }).eq('id', requestId);
    notify(data.accepted_provider_id, 'OTP verified', `Customer confirmed you've arrived for the ${data.service_name} job. You can start work now.`, 'booking', { requestId });
    setVerifying(false);
    setSuccess(true);
    setTimeout(() => { onVerified?.(); onClose(); }, 1500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 420, padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {success ? (
          <>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: `${SUCCESS}18`, border: `2px solid ${SUCCESS}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem' }}>
              <CheckCircle size={34} color={SUCCESS} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', marginBottom: 6 }}>Verified!</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Job started. The provider has been confirmed.</div>
          </>
        ) : (
          <>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: `${PRIMARY}18`, border: `2px solid ${PRIMARY}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem' }}>
              <Shield size={30} color={PRIMARY} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', marginBottom: 6 }}>Verify Provider</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>Ask your provider for the 6-digit code shown on their app to confirm they've arrived.</div>

            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: PRIMARY, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '8px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }}
            />

            {error && <div style={{ padding: '0.6rem', borderRadius: 10, background: `${ERROR}15`, color: ERROR, fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

            <motion.button whileTap={{ scale: 0.97 }} onClick={verify} disabled={verifying}
              style={{ width: '100%', padding: '0.9rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
              {verifying ? 'Verifying...' : 'Verify & Start Job'}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default OtpVerifyModal;
