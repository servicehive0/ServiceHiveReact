import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, LogOut, ArrowRight, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { iconMap } from '../utils/iconMap';

const SearchPage = () => {
  const { user, logout, getServices } = useAuth();
  const [query, setQuery] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchServices = useCallback(async (q = '') => {
    setLoading(true);
    const data = await getServices(q);
    setServices(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchServices(); }, []);

  useEffect(() => {
    const delay = setTimeout(() => fetchServices(query), 350);
    return () => clearTimeout(delay);
  }, [query]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <button onClick={() => navigate('/customer-dashboard')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield color="var(--primary)" size={18} strokeWidth={3} />
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span>
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          style={{ padding: '0.6rem 1.4rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          Logout <LogOut size={16} />
        </motion.button>
      </header>

      <div style={{ padding: '2rem 5%', maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px' }}>Find Services</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Browse our verified professional network.</p>
        </div>

        <div style={{ position: 'relative', marginBottom: '3rem' }}>
          <Search style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} size={22} />
          <input
            className="input-minimal"
            placeholder="Search electrician, plumber, AC repair..."
            style={{ padding: '1.2rem 1.25rem 1.2rem 4rem', borderRadius: '100px', fontSize: '1rem' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
            <Loader size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>No services found{query ? ` for "${query}"` : ''}.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {services.map(s => {
              const Icon = iconMap[s.icon] || iconMap['Zap'];
              return (
                <motion.div
                  key={s._id}
                  whileHover={{ y: -5 }}
                  className="card"
                  style={{ cursor: 'pointer', borderRadius: '24px' }}
                  onClick={() => navigate('/customer-dashboard', { state: { initialService: s.name } })}
                >
                  <div style={{ background: `${s.color}18`, padding: '14px', borderRadius: '16px', width: 'fit-content', marginBottom: '1.5rem', color: s.color }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.4rem' }}>{s.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>{s.description}</p>
                  <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1.5rem' }}>RS {s.startingPrice}+</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', color: 'var(--primary)' }}>
                    REQUEST QUOTE <ArrowRight size={16} />
                  </div>
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

export default SearchPage;
