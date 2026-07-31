import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Instagram, Twitter, Facebook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const Footer = () => {
  const { pathname } = useLocation();
  const { getSiteSettings } = useAuth();
  const MotionLink = motion(Link);
  const [footerData, setFooterData] = useState(null);

  const fetchFooter = () => {
    getSiteSettings().then(data => {
      if (data?.footerCMS) setFooterData(data.footerCMS);
    });
  };

  useEffect(() => {
    fetchFooter();

    const channel = supabase
      .channel('footer_cms_watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, () => {
        fetchFooter();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const footerLinkHover = {
    scale: 1.05,
    color: 'var(--primary)',
    textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 25px rgba(59, 130, 246, 0.4)'
  };

  const socialIconHover = {
    scale: 1.2,
    color: 'var(--primary)',
    filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))'
  };

  const desc = footerData?.shortDescription || "Pakistan's most trusted platform for home services. Quality, transparency, and speed at your doorstep.";
  const formatLink = (link) => {
    if (!link || link === '#') return '#';
    if (!/^https?:\/\//i.test(link)) return `https://${link}`;
    return link;
  };

  const fbLink = formatLink(footerData?.facebookLink);
  const twLink = formatLink(footerData?.twitterLink);
  const igLink = formatLink(footerData?.instagramLink);
  const copyText = footerData?.copyrightText || "© 2026 ServiceHive Pakistan. All rights reserved.";
  const privacyLink = footerData?.privacyPolicyLink || "/privacy-policy";
  const termsLink = footerData?.termsOfServiceLink || "/terms-of-service";

  return (
    <footer style={{
      padding: '4rem 5% 2rem',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
      width: '100%',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'clamp(1.5rem, 4vw, 3rem)' }}>
          <div style={{ flex: '1', minWidth: 'min(100%, 240px)' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', textDecoration: 'none', color: 'inherit' }}>
              <Shield size={24} color="var(--primary)" />
              <span style={{ fontWeight: '900', letterSpacing: '-1.5px', fontSize: '1.4rem', textTransform: 'uppercase' }}>
                Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span>
              </span>
            </Link>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '350px', lineHeight: '1.6' }}>
              {desc}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(2rem, 5vw, 4rem)', flexWrap: 'wrap', minWidth: 'min(100%, 240px)' }}>
            <div style={{ flex: '1' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.2rem', color: 'white' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <li>
                  <MotionLink 
                    to="/about" whileHover={footerLinkHover}
                    style={{ 
                      color: pathname === '/about' ? 'var(--primary)' : 'var(--text-muted)', 
                      textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block',
                      textShadow: pathname === '/about' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    About Us
                  </MotionLink>
                </li>
                <li>
                  <MotionLink 
                    to="/services" whileHover={footerLinkHover}
                    style={{ 
                      color: pathname === '/services' ? 'var(--primary)' : 'var(--text-muted)', 
                      textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block',
                      textShadow: pathname === '/services' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    Services
                  </MotionLink>
                </li>
                <li>
                  <MotionLink 
                    to="/contact" whileHover={footerLinkHover}
                    style={{ 
                      color: pathname === '/contact' ? 'var(--primary)' : 'var(--text-muted)', 
                      textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block',
                      textShadow: pathname === '/contact' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    Contact Us
                  </MotionLink>
                </li>
              </ul>
            </div>
            <div style={{ flex: '1' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.2rem', color: 'white' }}>Connect With Us</h4>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <motion.a href={igLink} target="_blank" rel="noopener noreferrer" whileHover={socialIconHover} style={{ color: 'var(--text-muted)', display: 'block' }}><Instagram size={22} /></motion.a>
                <motion.a href={twLink} target="_blank" rel="noopener noreferrer" whileHover={socialIconHover} style={{ color: 'var(--text-muted)', display: 'block' }}><Twitter size={22} /></motion.a>
                <motion.a href={fbLink} target="_blank" rel="noopener noreferrer" whileHover={socialIconHover} style={{ color: 'var(--text-muted)', display: 'block' }}><Facebook size={22} /></motion.a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{copyText}</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <MotionLink to={privacyLink} whileHover={footerLinkHover} style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.8rem' }}>Privacy Policy</MotionLink>
            <MotionLink to={termsLink} whileHover={footerLinkHover} style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.8rem' }}>Terms of Service</MotionLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

