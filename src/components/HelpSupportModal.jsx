import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, ChevronDown, Headphones } from 'lucide-react';

const PRIMARY = '#6366f1';

// Distinct from ContactUsModal (a complaint/message form) — this is a
// self-serve FAQ so users can answer their own question about how the
// actual bidding/OTP/rating flow works before needing to contact support.
const CUSTOMER_FAQS = [
  { q: 'How do I book a service?', a: "Post a request describing what you need — nearby providers will send you bids with their price and a message. Compare bids and accept the one you like best." },
  { q: 'How does payment work?', a: "You agree on a price directly with the provider through their bid. Pay them in person once the job is done — ServiceHive doesn't process payments." },
  { q: 'What is the OTP for?', a: "When your provider arrives, they'll show you a 6-digit code on their app. Enter it in your Requests tab to confirm they've arrived and start the job — this protects both of you." },
  { q: 'How do I rate a provider?', a: 'After a job is marked complete, open it from your Bookings tab and leave a star rating with an optional review.' },
  { q: 'Can I cancel a request?', a: 'You can delete an open request (before any bid is accepted) from your Requests tab. Once a bid is accepted, contact the provider directly via chat.' },
  { q: 'How do I message my provider?', a: "Once you've accepted a bid, a Chat option appears on that request — messages are delivered in real time." },
];

const PROVIDER_FAQS = [
  { q: 'How do I get requests?', a: 'Go online from your Dashboard and set your specialization in your Profile. You\'ll then see matching open requests in your area on the Requests tab.' },
  { q: 'How do I bid on a request?', a: 'Open a request from your Requests tab, enter your price and a short message, then submit. The customer will review all bids and pick one.' },
  { q: 'What happens after my bid is accepted?', a: 'The job appears in your Jobs tab. Show the customer the OTP code displayed there when you arrive — once they verify it, the job moves to in-progress.' },
  { q: 'How do I mark a job complete?', a: 'After the customer verifies your OTP, a Mark Complete button appears on the job. Tap it once you\'ve finished the work.' },
  { q: 'How are my earnings tracked?', a: "Every completed job's price is added to your Earnings tab automatically, with a full transaction history." },
  { q: "Why can't I see any requests?", a: 'Make sure you\'re online and have set a specialization in your Profile — requests are matched by service type and city.' },
];

const HelpSupportModal = ({ role, onClose, onOpenContact }) => {
  const [expanded, setExpanded] = useState(null);
  const faqs = role === 'provider' ? PROVIDER_FAQS : CUSTOMER_FAQS;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Help & Support</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>FREQUENTLY ASKED QUESTIONS</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => {
            const isOpen = expanded === i;
            return (
              <div key={faq.q} style={{ borderRadius: 14, background: '#141414', border: `1px solid ${isOpen ? `${PRIMARY}55` : 'rgba(255,255,255,0.08)'}` }}>
                <button onClick={() => setExpanded(isOpen ? null : i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.9rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>{faq.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} color="#94a3b8" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 1rem 0.9rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem', borderRadius: 14, background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}30`, marginTop: '1.2rem' }}>
          <Headphones size={20} color={PRIMARY} />
          <span style={{ flex: 1, fontSize: '0.82rem', color: '#94a3b8' }}>Still stuck? Reach our support team directly.</span>
          <button onClick={onOpenContact} style={{ background: 'none', border: 'none', color: PRIMARY, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
            Contact Us
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default HelpSupportModal;
