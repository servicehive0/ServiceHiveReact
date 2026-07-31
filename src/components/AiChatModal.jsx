import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader, Cpu } from 'lucide-react';

const PRIMARY = '#6366f1';
const STORAGE_KEY = 'ai_chat_v1';

const SYSTEM_PROMPT = `You are ServiceHive's AI home-services assistant. Help users with home repair/service problems (electrical, plumbing, AC, cleaning, carpentry, painting, etc).
- If the problem sounds urgent/dangerous (water leak flooding, electrical spark, gas smell), give immediate safety steps FIRST.
- Explain briefly what a professional would do.
- Give 1-2 practical DIY tips if safe to do so.
- Give a rough PKR cost range if relevant.
Keep responses concise and practical. You may respond in Urdu or English depending on what the user writes in.`;

// Free-form conversational assistant, mirroring Flutter's ai_chat_screen.dart
// (text-only here — Flutter also supports image uploads via a vision model).
const AiChatModal = ({ onClose }) => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = ['My AC is not cooling', 'Water leaking under sink', 'Need help hanging a chandelier', 'Kitchen deep cleaning cost?'];

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...next],
        }),
      });
      const json = await resp.json();
      const reply = json.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 520, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1rem' }}>AI Assistant</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <div>
              <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem 0', fontSize: '0.85rem' }}>Ask me anything about a home service problem.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} style={{ padding: '0.5rem 0.9rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer' }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', padding: '0.7rem 1rem', borderRadius: 16, background: m.role === 'user' ? `linear-gradient(135deg,${PRIMARY},#4f46e5)` : '#1a1a1a', color: 'white', fontSize: '0.87rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.7rem 1rem', borderRadius: 16, background: '#1a1a1a' }}><Loader size={16} color={PRIMARY} style={{ animation: 'spin 1s linear infinite' }} /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Describe your problem..."
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 100, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.88rem', outline: 'none' }}
          />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => send()} disabled={loading}
            style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${PRIMARY},#4f46e5)`, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default AiChatModal;
