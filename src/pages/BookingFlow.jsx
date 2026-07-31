import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Zap, ChevronLeft, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BookingFlow = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, getService, createBooking } = useAuth();

  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [loadingService, setLoadingService] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [address, setAddress] = useState(
    user?.area ? `${user.area}${user.city ? ', ' + user.city : ''}` : ''
  );
  const [scheduledType, setScheduledType] = useState('asap');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await getService(serviceId);
      setService(data);
      setLoadingService(false);
    };
    load();
  }, [serviceId]);

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError('Please enter your address');
      return;
    }
    if (scheduledType === 'scheduled' && !scheduledDate) {
      setError('Please select a date');
      return;
    }
    setError('');
    setSubmitting(true);

    const result = await createBooking({
      service: service?.name || serviceId,
      serviceSlug: serviceId,
      address: address.trim(),
      scheduledType,
      scheduledDate: scheduledType === 'scheduled' ? scheduledDate : '',
      scheduledTime: scheduledType === 'scheduled' ? scheduledTime : '',
      notes,
    });

    setSubmitting(false);
    if (result.success) {
      setCreatedBooking(result.data);
      setStep(3);
    } else {
      setError(result.message || 'Something went wrong');
    }
  };

  if (loadingService) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Loader size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!service) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Service not found</h2>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 5%', maxWidth: '800px', margin: '0 auto', minHeight: '80vh' }}>

      <button
        onClick={() => step === 1 ? navigate(-1) : setStep(step - 1)}
        style={{ background: 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', cursor: 'pointer' }}
      >
        <ChevronLeft size={20} /> Back
      </button>

      {/* Step Indicator */}
      {step < 3 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[1, 2].map(n => (
            <div key={n} style={{ flex: 1, height: '4px', borderRadius: '100px', background: step >= n ? 'var(--primary)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="1">
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Confirm Location</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Service: <strong style={{ color: 'white' }}>{service.name}</strong> — Starting at RS {service.startingPrice}+</p>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1.2rem 1.5rem', borderRadius: '16px' }}>
              <MapPin size={22} color="var(--primary)" />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enter the address where the service should be performed</p>
            </div>

            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Service Address</label>
            <input
              className="input-minimal"
              placeholder="e.g. House 12, Block A, Gulshan, Karachi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />

            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Additional Notes (Optional)</label>
            <textarea
              className="input-minimal"
              placeholder="Any special instructions for the service provider..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical', marginBottom: '2rem' }}
            />

            <button className="btn btn-primary" onClick={() => setStep(2)} style={{ width: '100%', borderRadius: '100px', padding: '1.2rem' }}>
              Set Location
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="2">
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem' }}>Schedule Appointment</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div
                className="card"
                style={{ padding: '1.5rem', cursor: 'pointer', border: scheduledType === 'asap' ? '2px solid var(--primary)' : '1px solid var(--border)' }}
                onClick={() => setScheduledType('asap')}
              >
                <Zap size={24} color={scheduledType === 'asap' ? 'var(--primary)' : 'var(--text-dim)'} style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: '700' }}>ASAP</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Arrive in 30–60 mins</p>
              </div>
              <div
                className="card"
                style={{ padding: '1.5rem', cursor: 'pointer', border: scheduledType === 'scheduled' ? '2px solid var(--primary)' : '1px solid var(--border)' }}
                onClick={() => setScheduledType('scheduled')}
              >
                <Calendar size={24} color={scheduledType === 'scheduled' ? 'var(--primary)' : 'var(--text-dim)'} style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: '700' }}>Schedule</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pick a date & time</p>
              </div>
            </div>

            {scheduledType === 'scheduled' && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input type="date" className="input-minimal" style={{ flex: 1 }} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                <input type="time" className="input-minimal" style={{ flex: 1 }} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.8rem 1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: '100%', borderRadius: '100px', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {submitting ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Confirming...</> : 'Confirm Booking'}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="3" style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '2rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 2rem' }}>
              <CheckCircle size={60} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>Booking Confirmed!</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
              We are notifying nearby professionals{user?.area ? ` in ${user.area}` : ''}. You will receive updates soon.
            </p>

            <div className="card" style={{ textAlign: 'left', marginBottom: '3rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>BOOKING SUMMARY</p>
              <div className="flex-between" style={{ marginBottom: '0.8rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Service</span>
                <span style={{ fontWeight: '800' }}>{service.name}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.8rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Address</span>
                <span style={{ maxWidth: '60%', textAlign: 'right' }}>{address}</span>
              </div>
              <div className="flex-between" style={{ marginBottom: '0.8rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Type</span>
                <span style={{ textTransform: 'capitalize' }}>{scheduledType}</span>
              </div>
              <div className="flex-between">
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Starting Price</span>
                <span style={{ color: 'var(--primary)', fontWeight: '800' }}>RS {service.startingPrice}+</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/bookings')} style={{ width: '100%', borderRadius: '100px', padding: '1.2rem' }}>
              View My Bookings
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BookingFlow;
