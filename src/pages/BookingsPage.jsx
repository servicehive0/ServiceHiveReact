import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Shield, LogOut, Loader, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  pending:     { bg: 'rgba(234, 179, 8, 0.1)',   color: '#eab308', label: 'Pending' },
  confirmed:   { bg: 'rgba(59, 130, 246, 0.1)',  color: '#3b82f6', label: 'Confirmed' },
  in_progress: { bg: 'rgba(168, 85, 247, 0.1)',  color: '#a855f7', label: 'In Progress' },
  completed:   { bg: 'rgba(34, 197, 94, 0.1)',   color: '#22c55e', label: 'Completed' },
  cancelled:   { bg: 'rgba(239, 68, 68, 0.1)',   color: '#ef4444', label: 'Cancelled' },
};

const BookingsPage = () => {
  const { user, logout, getMyBookings, cancelBooking } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    const data = await getMyBookings();
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(id);
    const result = await cancelBooking(id);
    if (result.success) {
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
    }
    setCancelling(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      <header style={{
        padding: '1rem 5%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield color="var(--primary)" size={18} strokeWidth={3} />
          <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchBookings}
            style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            style={{ padding: '0.6rem 1.4rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            Logout <LogOut size={16} />
          </motion.button>
        </div>
      </header>

      <div style={{ padding: '2rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px' }}>Booking Activity</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Track your active services and history.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
            <Loader size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <Clock size={48} color="var(--text-dim)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>No bookings yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Book a service to get started.</p>
            <button className="btn btn-primary" style={{ borderRadius: '100px', padding: '0.8rem 2rem' }} onClick={() => navigate('/customer-dashboard')}>
              Browse Services
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {bookings.map((b) => {
              const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
              return (
                <motion.div
                  key={b._id}
                  whileHover={{ scale: 1.005 }}
                  className="card"
                  style={{ borderRadius: '24px', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.2rem' }}>{b.service}</h3>
                      {b.providerName && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>with {b.providerName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <Calendar size={14} /> {formatDate(b.createdAt)}
                      </div>
                    </div>
                    <div style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', background: s.bg, color: s.color, alignSelf: 'flex-start' }}>
                      {s.label}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>ADDRESS</span>
                      <span style={{ color: 'white', fontWeight: '600' }}>{b.address}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>TYPE</span>
                      <span style={{ color: 'white', fontWeight: '600', textTransform: 'capitalize' }}>
                        {b.scheduledType === 'asap' ? 'ASAP' : `Scheduled${b.scheduledDate ? ' — ' + b.scheduledDate : ''}`}
                      </span>
                    </div>
                    {b.price && (
                      <div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>AMOUNT</span>
                        <span style={{ color: 'white', fontWeight: '800' }}>RS {b.price}</span>
                      </div>
                    )}
                  </div>

                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ borderRadius: '100px', fontSize: '0.85rem', padding: '0.6rem 1.5rem', opacity: cancelling === b._id ? 0.6 : 1 }}
                        onClick={() => handleCancel(b._id)}
                        disabled={cancelling === b._id}
                      >
                        {cancelling === b._id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BookingsPage;
