import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Clock, Heart, Zap, Droplet, Wind, Paintbrush, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import ParticleField from '../components/ParticleField';
import SliderButton from '../components/SliderButton';

const SERVICES = [
  { name: 'Electrical', desc: 'Complete home wiring, appliance repair, and maintenance.', color: '#fbbf24', img: 'https://images.unsplash.com/photo-16219051918-48416bd8575a?auto=format&fit=crop&q=80&w=800' },
  { name: 'Plumbing', desc: 'Fixing leaks, installation of fixtures, and pump repairs.', color: '#3b82f6', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800' },
  { name: 'AC Services', desc: 'Periodic servicing, gas refilling, and installation.', color: '#06b6d4', img: 'https://images.unsplash.com/photo-1599933596356-857c37256562?auto=format&fit=crop&q=80&w=800' },
  { name: 'Home Painting', desc: 'Premium wall finish, texture painting, and wood polish.', color: '#10b981', img: 'https://images.unsplash.com/photo-1589939705384-5185138a04b9?auto=format&fit=crop&q=80&w=800' },
  { name: 'Cleaning', desc: 'Deep home cleaning, sofa, and carpet disinfection.', color: '#ec4899', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6954?auto=format&fit=crop&q=80&w=800' },
  { name: 'General Repair', desc: 'Handyman services for those little home tasks.', color: '#f97316', img: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&q=80&w=800' },
  { name: 'Carpentry', desc: 'New furniture creation and old furniture repairs.', color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gardening', desc: 'Lawn maintenance, landscape design, and planting.', color: '#22c55e', img: 'https://images.unsplash.com/photo-1558905611-37d898687794?auto=format&fit=crop&q=80&w=800' },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, getSiteSettings } = useAuth();
  const [settings, setSettings] = React.useState({
    topBadgeCountry: 'Pakistan',
    mainHeading: 'Your Home, Simplified.',
    subTitle: 'Expert help for all your home needs. Premium quality, transparent pricing, and trusted professionals.',
    usersServedCount: '15k+',
    averageRating: '4.8★',
    serviceTypesCount: '20+', appStoreLink: '#', playStoreLink: '#'
  });
  const [displayServices, setDisplayServices] = React.useState(null);

  const fetchSettings = async () => {
    const data = await getSiteSettings();
    if (data?.homeCMS && Object.keys(data.homeCMS).length > 0) {
      setSettings({
        topBadgeCountry: data.homeCMS.topBadgeCountry || 'Pakistan',
        mainHeading: data.homeCMS.mainHeading || 'Your Home, Simplified.',
        subTitle: data.homeCMS.subTitle || 'Expert help for all your home needs.',
        usersServedCount: data.homeCMS.usersServedCount || '15k+',
        averageRating: data.homeCMS.averageRating || '4.8★',
        serviceTypesCount: data.homeCMS.serviceTypesCount || '20+',
        appStoreLink: data.homeCMS.appStoreLink || '#',
        playStoreLink: data.homeCMS.playStoreLink || '#'
      });
    }
    if (data?.servicesCMS?.servicesList?.length > 0) {
      setDisplayServices(data.servicesCMS.servicesList.map(s => ({
        name: s.name,
        desc: s.desc || s.description || '',
        color: s.color || '#3b82f6',
        img: s.img || s.imgUrl || ''
      })));
    } else {
      setDisplayServices(SERVICES);
    }
  };

  React.useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('landing_cms_watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div style={{ padding: '0', overflow: 'hidden' }}>
      
      {/* Interactive Background */}
      <ParticleField />
      
      {/* Hero */}
      <section 
        className="section-padding"
        style={{ 
          minHeight: '80vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          textAlign: 'center',
          background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.05) 0%, transparent 70%)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            color: '#3b82f6', 
            padding: '10px 20px', 
            borderRadius: '100px', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            marginBottom: '2rem',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}
        >
          Trusted Services in {settings.topBadgeCountry}
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem', letterSpacing: 'clamp(-1px, -0.5vw, -2px)' }}
        >
          {settings.mainHeading.includes(',') ? (
            <>
              {settings.mainHeading.split(',')[0]},
              <br />
              <span className="text-gradient">
                {settings.mainHeading.split(',').slice(1).join(',').trim()}
              </span>
            </>
          ) : settings.mainHeading}
        </motion.h1>
        <motion.p 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '4rem' }}
        >
          {settings.subTitle}
        </motion.p>
        
        {/* Restored Slider Button - Now the primary action */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           style={{ marginTop: '3rem', width: '100%', display: 'flex', justifyContent: 'center' }}
        >
           <SliderButton 
              onComplete={() => navigate('/login')} 
              text="Slide to Explore ServiceHive"
              maxWidth="450px"
              height="75px"
           />
        </motion.div>
      </section>

      {/* Basic Metrics */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '1.5rem 0'
        }}
      >
        <div style={{ textAlign: 'center', padding: 'clamp(1rem, 3vw, 1.5rem)', borderRight: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '800' }}>{settings.usersServedCount}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>Users Served</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'clamp(1rem, 3vw, 1.5rem)', borderRight: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '800' }}>{settings.averageRating}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>Avg Rating</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'clamp(1rem, 3vw, 1.5rem)' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '800' }}>{settings.serviceTypesCount}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>Services</p>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="section-padding" style={{ paddingRight: 0, paddingLeft: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', padding: '0 1.5rem' }}>
           <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>Expert Services for Every Need</h2>
           <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>From emergency repairs to periodic maintenance, our verified professionals are just a slide away.</p>
        </div>

        <div
          className="services-slider"
          style={{
            display: 'flex',
            overflow: 'hidden',
            paddingBottom: '2rem',
            position: 'relative',
            minHeight: '340px'
          }}
        >
           {displayServices === null ? (
             <div style={{ display: 'flex', gap: '1.5rem', paddingLeft: '1.5rem' }}>
               {[...Array(5)].map((_, i) => (
                 <div key={i} style={{ width: '320px', height: '300px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
               ))}
             </div>
           ) : (() => {
              const CARD_W = 344;
              const singleW = displayServices.length * CARD_W;
              const copies = Math.max(4, Math.ceil(2600 / singleW) + 2);
              const loopItems = Array.from({ length: copies }, () => displayServices).flat();
              const scrollDist = singleW;
              return (
           <motion.div
             key={displayServices.length}
             animate={{ x: [0, -scrollDist] }}
             transition={{ repeat: Infinity, duration: Math.max(20, displayServices.length * 5), ease: "linear" }}
             style={{ display: 'flex', gap: '1.5rem' }}
           >
              {loopItems.map((s, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10, scale: 1.02 }}
                  onClick={() => navigate('/register')}
                  className="card service-card"
                  style={{ 
                    position: 'relative', 
                    padding: '0', 
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '320px',
                    width: '320px',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                >
                    {/* Service Image */}
                    <div style={{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative' }}>
                      <img src={s.img} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--surface))' }}></div>
                    </div>
                    
                    <div style={{ padding: '1.5rem', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ whiteSpace: 'normal' }}>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.6rem' }}>{s.name}</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>{s.desc}</p>
                      </div>

                      <div 
                        style={{ 
                          marginTop: '1.5rem', 
                          fontSize: '0.8rem', 
                          fontWeight: '700', 
                          color: '#3b82f6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                          Get Started <ArrowRight size={14} />
                      </div>
                    </div>
                </motion.div>
              ))}
           </motion.div>
              );
           })()}
        </div>
      </section>

      {/* CTA section (Mobile app focus) */}
      <section className="section-padding mobile-stack" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
         <div className="card" style={{ flex: 1, padding: '2rem', background: 'var(--surface-2)' }}>
            <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>Coming Soon</span>
            <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>The ultimate app for home services.</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Track your bookings, pay securely, and chat with your professional — all from one app.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
               <motion.a 
                 href={settings.appStoreLink}
                 whileHover={{ scale: 1.05, borderColor: 'var(--primary)' }}
                 style={{ background: 'black', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '170px', textDecoration: 'none', color: 'white' }}
               >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71,19.5C17.88,20.74,17,21.95,15.66,21.97c-1.23,0.02-1.62-0.73-3.04-0.73c-1.42,0-1.85,0.71-3.04,0.75 c-1.38,0.04-2.33-1.31-3.17-2.55C4.7,16.98,3.4,12.38,5.17,9.3c0.88-1.52,2.44-2.48,4.14-2.5c1.29-0.02,2.5,0.87,3.29,0.87 c0.8,0,2.26-1.07,3.81-0.91c0.65,0.03,2.47,0.26,3.64,1.98c-0.09,0.06-2.17,1.26-2.15,3.81c0.02,3.15,2.73,4.24,2.76,4.25 C20.64,16.89,20.2,18.06,18.71,19.5z M14,5.43c0.69-0.83,1.15-1.99,1.02-3.15c-1.06,0.04-2.34,0.71-3.1,1.59 c-0.68,0.78-1.27,1.97-1.11,3.1C11.95,7.03,13.2,6.38,14,5.43z" />
                  </svg>
                  <span style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>Download on <br /><b style={{ fontSize: '1rem' }}>App Store</b></span>
               </motion.a>
               <motion.a 
                 href={settings.playStoreLink}
                 whileHover={{ scale: 1.05, borderColor: 'var(--primary)' }}
                 style={{ background: 'black', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: '170px', textDecoration: 'none', color: 'white' }}
               >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.61,3,21.09,3,20.5Z M16.81,15.12L4.94,22L14.77,12.18 L16.81,15.12Z M14.77,11.82L4.94,2L16.81,8.88L14.77,11.82Z M17.43,14.28L20.66,12.42C21.11,12.16,21.11,11.84,20.66,11.58 L17.43,9.72L15.34,12L17.43,14.28Z" />
                  </svg>
                  <span style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>Get it on <br /><b style={{ fontSize: '1rem' }}>Google Play</b></span>
               </motion.a>
            </div>
         </div>
      </section>

    </div>
  );
};

export default Landing;
