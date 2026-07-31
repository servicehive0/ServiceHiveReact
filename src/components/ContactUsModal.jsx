import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, HelpCircle, CheckCircle, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';

const TYPES = ['Complaint', 'General Inquiry', 'Technical Issue', 'Billing', 'Other'];

// Support/complaint form, mirrors Flutter's contact_us_screen.dart, writes
// to the same contact_messages table via AuthContext.submitContact().
const ContactUsModal = ({ user, onClose }) => {
  const { submitContact } = useAuth();
  const [type, setType] = useState(TYPES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [supportInfo, setSupportInfo] = useState(null);

  // Admin-editable in Admin Dashboard → Global Settings, so support contact
  // info can be updated without a code change.
  useEffect(() => {
    supabase.from('platform_settings').select('support_phone, support_email').eq('id', 1).single()
      .then(({ data }) => { if (data && (data.support_phone || data.support_email)) setSupportInfo(data); });
  }, []);

  const submit = async () => {
    if (message.trim().length < 20) { setError('Please write at least 20 characters describing your issue.'); return; }
    setSubmitting(true); setError('');
    const res = await submitContact({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      subject: subject.trim() || type,
      message: `[${type}] ${message.trim()}`,
    });
    setSubmitting(false);
    if (!res.success) { setError(res.message); return; }
    setSuccess(true);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 460, padding: '1.6rem', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Contact Us</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${SUCCESS}18`, border: `2px solid ${SUCCESS}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CheckCircle size={28} color={SUCCESS} />
            </div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Message Sent!</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>We'll get back to you soon.</div>
          </div>
        ) : (
          <>
            {supportInfo && (supportInfo.support_phone || supportInfo.support_email) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0.85rem 1rem', borderRadius: 14, background: `${PRIMARY}0d`, border: `1px solid ${PRIMARY}25`, marginBottom: '1.1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Need urgent help?</div>
                {supportInfo.support_phone && (
                  <a href={`tel:${supportInfo.support_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Phone size={14} color={PRIMARY} /> {supportInfo.support_phone}
                  </a>
                )}
                {supportInfo.support_email && (
                  <a href={`mailto:${supportInfo.support_email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Mail size={14} color={PRIMARY} /> {supportInfo.support_email}
                  </a>
                )}
              </div>
            )}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', boxSizing: 'border-box' }}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief subject"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>Message (min 20 characters)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Describe your issue in detail..."
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
            </div>

            {error && <div style={{ padding: '0.6rem', borderRadius: 10, background: `${ERROR}15`, color: ERROR, fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

            <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={submitting}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
              {submitting ? 'Sending...' : 'Send Message'}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ContactUsModal;
