import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const MotionLink = motion(Link);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const primaryBtnStyle = {
    padding: '0.7rem 1.8rem', 
    fontSize: '0.9rem', 
    borderRadius: '100px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontWeight: '700',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const navLinkHover = {
    scale: 1.05,
    color: 'var(--primary)',
    textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 25px rgba(59, 130, 246, 0.4), 0 0 35px rgba(59, 130, 246, 0.2)'
  };

  return (
    <>
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.2rem 5%',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(30px)',
      borderBottom: '1px solid var(--border)'
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Shield color="var(--primary)" size={20} strokeWidth={3} />
        <span style={{ 
          fontSize: '1.25rem', 
          fontWeight: '900', 
          color: 'white', 
          letterSpacing: '-1px',
          textTransform: 'uppercase'
        }}>
          Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span>
        </span>
      </Link>

      {/* Desktop Links */}
      <div className="desktop-only-flex" style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        {navLinks.map(link => (
          <MotionLink 
            key={link.name}
            to={link.path} 
            whileHover={navLinkHover}
            style={{ 
              color: pathname === link.path ? 'var(--primary)' : 'var(--text-muted)', 
              textDecoration: 'none', 
              fontWeight: pathname === link.path ? '700' : '500', 
              fontSize: '0.9rem',
              transition: 'color 0.2s ease, border-bottom 0.2s ease',
              borderBottom: pathname === link.path ? '2px solid var(--primary)' : '2px solid transparent',
              paddingBottom: '4px',
              display: 'block',
              textShadow: pathname === link.path ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            {link.name}
          </MotionLink>
        ))}
        {user && (user.role !== 'admin' || pathname !== '/') ? (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <MotionLink 
              to={user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard'} 
              whileHover={navLinkHover}
              style={{ color: 'white', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s ease' }}
            >
              Dashboard
            </MotionLink>
            <motion.button 
              whileHover={{ scale: 1.05, color: '#ff4444', textShadow: '0 0 12px rgba(239, 68, 68, 0.8), 0 0 25px rgba(239, 68, 68, 0.4)' }}
              onClick={logout} 
              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}
            >
              Logout
            </motion.button>
          </div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            style={{ borderRadius: '100px' }}
          >
            <Link to="/register" style={primaryBtnStyle}>Join Now</Link>
          </motion.div>
        )}
      </div>

      {/* Mobile Toggle Button */}
      <div className="mobile-only" onClick={() => setIsOpen(true)}>
        <Menu color="white" size={28} style={{ cursor: 'pointer' }} />
      </div>

      <style>{`
        @media (min-width: 769px) {
           .mobile-only { display: none !important; }
        }
        @media (max-width: 768px) {
           .desktop-only-flex { display: none !important; }
        }
      `}</style>
    </nav>

    {/* Mobile Drawer */}
    <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsOpen(false)}
               style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2001, backdropFilter: 'blur(8px)' }}
            />
            <motion.div 
               initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 30, stiffness: 300 }}
               style={{ 
                 position: 'fixed', top: 0, right: 0, bottom: 0, width: '85%', maxWidth: '340px', 
                 background: '#0a0a0a', zIndex: 2002, padding: '2.5rem',
                 display: 'flex', flexDirection: 'column', gap: '2.5rem',
                 borderLeft: '1px solid rgba(255,255,255,0.1)',
                 boxShadow: '-10px 0 60px rgba(0,0,0,0.9)',
                 overflowY: 'auto', // Enable Scrolling
                 height: '100vh'   // Full height
               }}
            >
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <X color="white" size={32} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {navLinks.map(link => (
                    <MotionLink 
                      key={link.name}
                      to={link.path} 
                      onClick={() => setIsOpen(false)}
                      whileHover={{ 
                        x: 10,
                        color: 'var(--primary)',
                        textShadow: '0 0 15px rgba(59, 130, 246, 0.9), 0 0 30px rgba(59, 130, 246, 0.4)'
                      }}
                      style={{ 
                        color: pathname === link.path ? 'var(--primary)' : 'white', 
                        textDecoration: 'none', fontSize: '1.5rem', fontWeight: '800',
                        display: 'flex', alignItems: 'center', gap: '15px',
                        transition: 'all 0.3s ease',
                        textShadow: pathname === link.path ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
                      }}
                    >
                      {pathname === link.path && (
                        <motion.div 
                          layoutId="activeDot"
                          style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary)' }} 
                        />
                      )}
                      {link.name}
                    </MotionLink>
                  ))}
                  <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    {user && (user.role !== 'admin' || pathname !== '/') ? (
                       <button onClick={logout} className="btn-secondary" style={{ width: '100%', padding: '1.2rem', borderRadius: '16px' }}>Logout Account</button>
                    ) : (
                       <motion.div
                         whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(59, 130, 246, 0.6)' }}
                         whileTap={{ scale: 0.95 }}
                         style={{ borderRadius: '16px' }}
                       >
                         <Link to="/register" onClick={() => setIsOpen(false)} style={{ ...primaryBtnStyle, height: '60px', width: '100%', borderRadius: '16px' }}>Join Now</Link>
                       </motion.div>
                    )}
                  </div>
               </div>
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  );
};

export default Navbar;

