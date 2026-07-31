import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader, Search } from 'lucide-react';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

// Classifies a freeform problem description into one of the app's real
// service categories, mirroring Flutter's ai_service_finder_screen.dart.
const AiServiceFinderModal = ({ services, onClose, onPickService }) => {
  const [desc, setDesc] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const serviceNames = (services || []).map(s => s.name);

  const find = async () => {
    if (!desc.trim()) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You classify home-service problems into ONE of these exact categories: ${serviceNames.join(', ')}. Respond ONLY with valid JSON.` },
            { role: 'user', content: `Problem: "${desc}". Return: {"service":"<one of the exact category names>","reason":"short reason why"}` },
          ],
        }),
      });
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || '';
      const s = content.indexOf('{'), e = content.lastIndexOf('}');
      if (s !== -1) setResult(JSON.parse(content.slice(s, e + 1)));
    } catch { setResult(null); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>Service Finder</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
          placeholder="Describe your problem in your own words..."
          style={{ width: '100%', padding: '0.9rem', borderRadius: 14, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.9rem' }} />

        <motion.button whileTap={{ scale: 0.97 }} onClick={find} disabled={loading}
          style={{ width: '100%', padding: '0.8rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '1rem' }}>
          {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />} Find My Service
        </motion.button>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '1.2rem', borderRadius: 16, background: `${SUCCESS}10`, border: `1px solid ${SUCCESS}30` }}>
            <div style={{ fontSize: '0.7rem', color: SUCCESS, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Recommended Service</div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: 8 }}>{result.service}</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1rem' }}>{result.reason}</div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPickService?.(result.service)}
              style={{ width: '100%', padding: '0.7rem', borderRadius: 100, background: SUCCESS, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
              Post a Request for This Service
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AiServiceFinderModal;
