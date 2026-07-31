import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Droplet, Wind, Paintbrush, Sparkles, Heart, Search, CheckCircle,
  Hammer, Leaf, Shield, Scissors, Wrench, Home
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SliderButton from '../components/SliderButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const IconMap = {
  Zap: <Zap size={24} />,
  Droplet: <Droplet size={24} />,
  Wind: <Wind size={24} />,
  Paintbrush: <Paintbrush size={24} />,
  Sparkles: <Sparkles size={24} />,
  Heart: <Heart size={24} />,
  Hammer: <Hammer size={24} />,
  Leaf: <Leaf size={24} />,
  Shield: <Shield size={24} />,
  Scissors: <Scissors size={24} />,
  Wrench: <Wrench size={24} />,
  Home: <Home size={24} />
};

const ServicesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { getServices, getSiteSettings } = useAuth();

  const [pageTitle, setPageTitle] = useState('Our Premium Services');
  const [pageDescription, setPageDescription] = useState('Discover a wide range of professional services tailored to your needs.');

  const fetchServices = async () => {
    const data = await getServices();
    setServices(data);
    setLoading(false);
  };

  const fetchCMSTitles = async () => {
    try {
      const data = await getSiteSettings();
      if (data?.servicesCMS) {
        if (data.servicesCMS.pageTitle) setPageTitle(data.servicesCMS.pageTitle);
        if (data.servicesCMS.pageDescription) setPageDescription(data.servicesCMS.pageDescription);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchServices();
    fetchCMSTitles();

    // Realtime: re-fetch when services table changes
    const channel = supabase
      .channel('services_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="badge badge-blue" style={{ marginBottom: '1.5rem' }}>Our Professional Portfolio</motion.div>
         <motion.h1
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
           style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1.5rem' }}
         >
           {pageTitle.includes(',') ? (
             <>
               {pageTitle.split(',')[0]},
               {' '}
               <span className="text-gradient">
                 {pageTitle.split(',').slice(1).join(',').trim()}
               </span>
             </>
           ) : pageTitle}
         </motion.h1>
         <motion.p
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
           style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto' }}
         >
           {pageDescription}
         </motion.p>
      </div>

      <div style={{ position: 'relative', marginBottom: '4rem' }}>
         <Search style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} size={20} />
         <input
           type="text"
           placeholder="Search for a service (e.g., Plumber, AC Repair)"
           className="input-minimal"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           style={{ paddingLeft: '3.5rem', borderRadius: '100px', height: '60px' }}
         />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading services...</div>
      ) : (
      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
         {filteredServices.length > 0 ? (
           filteredServices.map((s, i) => (
             <motion.div
               key={s.id || i}
               layout
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.3 }}
               whileHover="hover"
               className="card"
               onClick={() => navigate('/customer-dashboard', { state: { initialService: s.name } })}
               style={{
                 display: 'flex',
                 flexDirection: 'column',
                 padding: 0,
                 background: 'rgba(10, 10, 10, 0.45)',
                 backdropFilter: 'blur(12px)',
                 borderRadius: '24px',
                 border: '1px solid var(--border)',
                 position: 'relative',
                 overflow: 'hidden',
                 cursor: 'pointer',
                 minHeight: '320px'
               }}
             >
               {/* Image banner or color gradient */}
               <div style={{
                 height: '160px',
                 width: '100%',
                 position: 'relative',
                 overflow: 'hidden',
                 borderBottom: '1px solid var(--border)',
                 background: s.imgUrl ? 'transparent' : `linear-gradient(135deg, ${s.color || '#3b82f6'}30, ${s.color || '#3b82f6'}08)`,
               }}>
                 {s.imgUrl
                   ? <motion.div
                       variants={{ hover: { scale: 1.06 } }}
                       transition={{ duration: 0.4, ease: 'easeOut' }}
                       style={{ width: '100%', height: '100%', backgroundImage: `url(${s.imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                     />
                   : <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', color: s.color || '#3b82f6', opacity: 0.12, transform: 'scale(4)' }}>
                       {IconMap[s.icon] || IconMap.Sparkles}
                     </div>
                 }
                 {s.imgUrl && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />}
               </div>

               {/* Floating Icon */}
               <motion.div
                  variants={{ hover: { scale: 1.1, y: -4 } }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    top: '130px',
                    left: '24px',
                    zIndex: 2,
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--surface)',
                    border: '2px solid var(--border)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color || '#3b82f6'
                  }}
               >
                  {IconMap[s.icon] || IconMap.Sparkles}
               </motion.div>

               {/* Card Content */}
               <div style={{
                  padding: '2rem 1.5rem 1.5rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '1rem',
                  position: 'relative'
               }}>
                  <div style={{ marginTop: '10px' }}>
                     <h3 style={{ fontSize: '1.35rem', fontWeight: '900', marginBottom: '0.6rem' }}>
                        {s.name}
                     </h3>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', minHeight: '40px' }}>
                        {s.description || 'Professional service by verified experts.'}
                     </p>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={14} color="#10b981" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '700' }}>Verified Experts</span>
                     </div>
                     {s.startingPrice > 0 && (
                       <span style={{ fontSize: '0.8rem', color: s.color || 'var(--primary)', fontWeight: '800', background: `${s.color || '#3b82f6'}15`, padding: '4px 10px', borderRadius: '100px' }}>
                         From RS {s.startingPrice}
                       </span>
                     )}
                  </div>
               </div>
             </motion.div>
           ))
         ) : (
           <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <h3>No services found{searchTerm ? ` for "${searchTerm}"` : ''}.</h3>
              <p>Try searching with different keywords.</p>
           </div>
         )}
      </div>
      )}

      <div style={{ marginTop: '6rem', background: 'var(--surface-2)', padding: '4rem 2rem', borderRadius: '24px', textAlign: 'center' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1.5rem' }}>Need a customized service?</h2>
         <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>If you can't find what you are looking for, contact our support team for a custom quote.</p>
         <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <SliderButton
              text="JOIN NOW & START BOOKING"
              onComplete={() => navigate('/register')}
            />
         </div>
      </div>
    </div>
  );
};

export default ServicesPage;
