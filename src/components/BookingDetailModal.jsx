import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Clock, DollarSign, Star, MessageSquare, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ReviewModal from './ReviewModal';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
const AMBER = '#f59e0b';

const STATUS_META = {
  pending:   { label: 'Pending',   color: AMBER },
  confirmed: { label: 'Confirmed', color: PRIMARY },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  completed: { label: 'Completed', color: SUCCESS },
  cancelled: { label: 'Cancelled', color: ERROR },
  rejected:  { label: 'Rejected',  color: ERROR },
};

// Full detail drill-down for a single booking, mirrors Flutter's
// booking_detail_screen.dart: status hero, details, and a Review action
// once completed.
const BookingDetailModal = ({ booking, onClose, onUpdated }) => {
  const { cancelBooking } = useAuth();
  const [showReview, setShowReview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const meta = STATUS_META[booking.status] || { label: booking.status, color: '#64748b' };

  const doCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(true);
    await cancelBooking(booking.id);
    setCancelling(false);
    onUpdated?.();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto', padding: '1.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: 8 }}>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{booking.service}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', flexShrink: 0 }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1rem', borderRadius: 16, background: `${meta.color}10`, border: `1px solid ${meta.color}30`, marginBottom: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontWeight: 900, color: meta.color, fontSize: '1rem' }}>{meta.label}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={15} color="#64748b" />
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{booking.address}</span>
          </div>
          {booking.scheduled_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={15} color="#64748b" />
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{booking.scheduled_date} {booking.scheduled_time ? `at ${booking.scheduled_time}` : ''}</span>
            </div>
          )}
          {(booking.agreed_price || booking.price) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DollarSign size={15} color={SUCCESS} />
              <span style={{ fontSize: '0.85rem', color: SUCCESS, fontWeight: 700 }}>Rs {booking.agreed_price || booking.price}</span>
            </div>
          )}
        </div>

        {booking.notes && (
          <div style={{ padding: '0.9rem', borderRadius: 12, background: '#141414', marginBottom: '1.3rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{booking.notes}</div>
          </div>
        )}

        {booking.rating && (
          <div style={{ padding: '0.9rem', borderRadius: 12, background: `${AMBER}0a`, border: `1px solid ${AMBER}25`, marginBottom: '1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} color={AMBER} fill={n <= booking.rating ? AMBER : 'none'} />)}
            </div>
            {booking.review && <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>{booking.review}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={doCancel} disabled={cancelling}
              style={{ width: '100%', padding: '0.8rem', borderRadius: 100, background: `${ERROR}12`, border: `1px solid ${ERROR}30`, color: ERROR, fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <XCircle size={15} /> {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </motion.button>
          )}
          {booking.status === 'completed' && !booking.rating && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowReview(true)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: 100, background: `linear-gradient(90deg,${AMBER},#d97706)`, color: '#0a0a0a', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Star size={15} /> Rate this Service
            </motion.button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showReview && <ReviewModal booking={booking} onClose={() => setShowReview(false)} onSubmitted={onUpdated} />}
      </AnimatePresence>
    </div>
  );
};

export default BookingDetailModal;
