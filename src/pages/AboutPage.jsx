import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Target, CheckCircle } from 'lucide-react';
import SliderButton from '../components/SliderButton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const AboutPage = () => {
  const navigate = useNavigate();
  const { getSiteSettings } = useAuth();
  
  const [aboutData, setAboutData] = useState({
    title: 'We are ServiceHive',
    missionStatement: 'Our mission is simple: to make home life easier for everyone. We connect you with verified, professional service experts for all your home needs, delivering quality you can trust, every time.',
    card1Title: 'Trust',
    card1Desc: 'Every professional is background-checked and verified for your peace of mind.',
    card2Title: 'Community',
    card2Desc: 'Building a stronger Karachi by supporting local experts and small businesses.',
    card3Title: 'Excellence',
    card3Desc: 'A relentless commitment to quality and providing the best customer service.',
    storyHeading: 'Born in Karachi, Built for the Future.',
    storyText: 'ServiceHive started as a solution for a common problem: finding a reliable electrician or plumber in Karachi. Today, we are a growing community, driven by technology and dedicated to redefining industry standards.',
    statsUsers: '15k+',
    statsExperts: '200+',
    badgeText: 'Top Rated Startup 2026'
  });

  const fetchAboutData = async () => {
    try {
      const data = await getSiteSettings();
      if (data?.aboutUsCMS && Object.keys(data.aboutUsCMS).length > 0) {
        setAboutData({
          title: data.aboutUsCMS.title || 'We are ServiceHive',
          missionStatement: data.aboutUsCMS.missionStatement || 'Our mission is simple: to make home life easier for everyone.',
          card1Title: data.aboutUsCMS.card1Title || 'Trust',
          card1Desc: data.aboutUsCMS.card1Desc || 'Every professional is background-checked and verified for your peace of mind.',
          card2Title: data.aboutUsCMS.card2Title || 'Community',
          card2Desc: data.aboutUsCMS.card2Desc || 'Building a stronger Karachi by supporting local experts and small businesses.',
          card3Title: data.aboutUsCMS.card3Title || 'Excellence',
          card3Desc: data.aboutUsCMS.card3Desc || 'A relentless commitment to quality and providing the best customer service.',
          storyHeading: data.aboutUsCMS.storyHeading || 'Born in Karachi, Built for the Future.',
          storyText: data.aboutUsCMS.storyText || 'ServiceHive started as a solution for a common problem: finding a reliable electrician or plumber in Karachi.',
          statsUsers: data.aboutUsCMS.statsUsers || '15k+',
          statsExperts: data.aboutUsCMS.statsExperts || '200+',
          badgeText: data.aboutUsCMS.badgeText || 'Top Rated Startup 2026'
        });
      }
    } catch (err) {
      console.error("Error fetching About Us CMS:", err);
    }
  };

  useEffect(() => {
    fetchAboutData();

    const channel = supabase
      .channel('about_cms_watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, () => {
        fetchAboutData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 1.5rem)' }}>

      <div style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 8vw, 8rem)' }}>
         <motion.h1 
           initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
           style={{ fontSize: '4.5rem', fontWeight: '900', marginBottom: '1.5rem', letterSpacing: '-3px' }}
         >
           {aboutData.title.includes('ServiceHive') ? (
             <>
               {aboutData.title.split('ServiceHive')[0]}
               <span className="text-gradient">ServiceHive</span>
               {aboutData.title.split('ServiceHive').slice(1).join('ServiceHive')}
             </>
           ) : aboutData.title}
         </motion.h1>
         <motion.p 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
           style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.7' }}
         >
           {aboutData.missionStatement}
         </motion.p>
      </div>

      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'clamp(1.5rem, 4vw, 3rem)', marginBottom: 'clamp(4rem, 10vw, 10rem)' }}>
         {[
           { icon: <Shield size={40} color="var(--primary)" />, title: aboutData.card1Title, desc: aboutData.card1Desc },
           { icon: <Users size={40} color="#6366f1" />, title: aboutData.card2Title, desc: aboutData.card2Desc },
           { icon: <Target size={40} color="#10b981" />, title: aboutData.card3Title, desc: aboutData.card3Desc },
         ].map((item, i) => (
           <motion.div 
             key={i} 
             initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
             style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid var(--border)' }}
           >
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>{item.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>{item.desc}</p>
           </motion.div>
         ))}
      </div>

      <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(2rem, 5vw, 5rem)', marginBottom: 'clamp(3rem, 8vw, 8rem)', background: 'var(--surface-2)', padding: 'clamp(1.5rem, 5vw, 4rem)', borderRadius: 'clamp(24px, 4vw, 48px)', position: 'relative', overflow: 'hidden' }}>
         <div style={{ flex: '1', zIndex: 1 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '2rem' }}>
              {aboutData.storyHeading.includes(',') ? (
                <>
                  {aboutData.storyHeading.split(',')[0]},
                  <br />
                  <span className="text-gradient">
                    {aboutData.storyHeading.split(',').slice(1).join(',').trim()}
                  </span>
                </>
              ) : aboutData.storyHeading}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '3rem' }}>
              {aboutData.storyText}
            </p>
            <div style={{ display: 'flex', gap: '3rem' }}>
               <div>
                  <h4 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)' }}>{aboutData.statsUsers}</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Users Served</p>
               </div>
               <div>
                  <h4 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{aboutData.statsExperts}</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Experts Onboard</p>
               </div>
            </div>
         </div>
         <div style={{ flex: '1', position: 'relative' }}>
            <div style={{ width: '100%', height: '400px', background: 'linear-gradient(45deg, #3b82f633, #6366f111)', borderRadius: '32px', border: '1px solid #3b82f633', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Shield size={100} color="var(--primary)" style={{ opacity: 0.3 }} />
            </div>
            <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', padding: '1.5rem', background: 'white', color: 'black', borderRadius: '16px', fontWeight: '800', display: 'flex', gap: '10px' }}>
               <CheckCircle size={20} color="#10b981" /> {aboutData.badgeText}
            </div>
         </div>
      </div>

      <div style={{ textAlign: 'center' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem' }}>Ready to experience the Hive?</h2>
         <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <SliderButton 
              text="JOIN NOW & GET STARTED" 
              onComplete={() => navigate('/register')} 
            />
         </div>
      </div>

    </div>
  );
};

export default AboutPage;
