import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { predictPriceML } from '../lib/aiInsights';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

const COMPLEXITY_LABELS = { 1: 'Very simple', 2: 'Simple', 3: 'Typical', 4: 'Involved', 5: 'Complex' };

// PKR price-range estimate for a job before requesting/bidding — powered by
// OUR OWN trained regression model (Service-Hive-ML/train_price.py: One-Hot
// Encoding + Random Forest over service_type/city/complexity), not an LLM
// call. Mirrors Flutter's ai_price_estimator_screen.dart.
const AiPriceEstimatorModal = ({ city, onClose }) => {
  const [services, setServices] = useState([]);
  const [serviceType, setServiceType] = useState('');
  const [complexity, setComplexity] = useState(3);
  const [desc, setDesc] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('services').select('name').eq('is_active', true).order('name')
      .then(({ data }) => setServices((data || []).map(s => s.name)));
  }, []);

  const estimate = async () => {
    if (!serviceType) return;
    setLoading(true); setResult(null);
    const r = await predictPriceML(serviceType, city, complexity);
    setResult(r);
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Price Estimator</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 0, marginBottom: '1rem' }}>
          Estimated by our own trained ML model from real service pricing — not an AI guess.
        </p>

        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 6, display: 'block' }}>Service Type</label>
        <select value={serviceType} onChange={e => setServiceType(e.target.value)}
          style={{ width: '100%', padding: '0.85rem', borderRadius: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.9rem' }}>
          <option value="">Select a service</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: 6, display: 'block' }}>
          Job Complexity — {COMPLEXITY_LABELS[complexity]}
        </label>
        <input type="range" min={1} max={5} value={complexity} onChange={e => setComplexity(Number(e.target.value))}
          style={{ width: '100%', marginBottom: '0.9rem', accentColor: PRIMARY }} />

        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="Optional — describe the job for your own notes (e.g. 'Fix a leaking kitchen tap')"
          style={{ width: '100%', padding: '0.9rem', borderRadius: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.9rem' }} />

        <motion.button whileTap={{ scale: 0.97 }} onClick={estimate} disabled={loading || !serviceType}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: (loading || !serviceType) ? 'not-allowed' : 'pointer', opacity: !serviceType ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '1rem' }}>
          {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />} Estimate Price
        </motion.button>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '1.3rem', borderRadius: 18, background: `linear-gradient(135deg,${SUCCESS}18,${SUCCESS}05)`, border: `1px solid ${SUCCESS}30`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: SUCCESS, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{serviceType}{city ? ` · ${city}` : ''}</div>
            <div style={{ fontWeight: 900, fontSize: '1.6rem' }}>Rs {result.min_price?.toLocaleString()} – {result.max_price?.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6 }}>Predicted by our trained pricing model</div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AiPriceEstimatorModal;
