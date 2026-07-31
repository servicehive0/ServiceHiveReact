import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';
const AMBER = '#f59e0b';

const ADJECTIVES = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

// Star rating + text review for a completed booking, mirrors Flutter's
// review_screen.dart. Writes rating/review directly onto the bookings row.
const ReviewModal = ({ booking, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await supabase.from('bookings').update({ rating, review }).eq('id', booking.id);

    // Best-effort: refresh the provider's aggregate rating, mirrors Flutter's
    // review flow updating provider_profiles.rating.
    try {
      const { data: allRated } = await supabase.from('bookings').select('rating').eq('provider_id', booking.provider_id).not('rating', 'is', null);
      if (allRated && allRated.length > 0) {
        const avg = allRated.reduce((s, b) => s + b.rating, 0) / allRated.length;
        await supabase.from('provider_profiles').update({ rating: avg }).eq('id', booking.provider_id);
      }
    } catch (_) { /* non-critical */ }

    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => { onSubmitted?.(); onClose(); }, 1200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 440, padding: '1.8rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {success ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${SUCCESS}18`, border: `2px solid ${SUCCESS}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CheckCircle size={30} color={SUCCESS} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Thanks for your feedback!</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 900, fontSize: '1.15rem', marginBottom: 4 }}>Rate this service</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.3rem' }}>{booking.service}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Star size={34} color={AMBER} fill={(hover || rating) >= n ? AMBER : 'none'} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.85rem', color: AMBER, fontWeight: 700, marginBottom: '1.3rem', minHeight: 20 }}>
              {ADJECTIVES[(hover || rating) - 1] || ''}
            </div>

            <textarea value={review} onChange={e => setReview(e.target.value)} rows={3} placeholder="Share your experience (optional)..."
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '1.2rem' }} />

            <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={rating === 0 || submitting}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 100, background: rating === 0 ? '#333' : `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: rating === 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ReviewModal;
