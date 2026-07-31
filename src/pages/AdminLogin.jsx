import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, ArrowLeft, Lock, Mail, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import ParticleField from '../components/ParticleField';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, logout, forgotPassword, verifyResetOtp, resetPassword: resetPassAPI, user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const [step, setStep] = useState('login'); // login | forgot | verify | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Responsiveness
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isExtraSmall = windowWidth < 410;

  const authButtonStyle = {
    width: '100%',
    borderRadius: '100px',
    padding: '1.1rem 2rem',
    fontSize: '0.95rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.8rem',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase'
  };

  const authButtonHover = {
    scale: 1.05,
    boxShadow: '0 0 25px rgba(59, 130, 246, 0.6), 0 0 45px rgba(59, 130, 246, 0.2)',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.user.role === 'admin') {
          navigate('/admin');
        } else {
          setError('Access Denied: This portal is for Administrators only.');
          logout();
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if(!resetEmail) return setError('Please enter your admin email.');
    setError('');
    setIsLoading(true);
    
    const res = await forgotPassword(resetEmail);
    if (res.success) {
      setStep('verify');
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if(otpCode.length < 6) return setError('Please enter the 6-digit code.');
    setError('');
    setIsLoading(true);
    
    const res = await verifyResetOtp(resetEmail, otpCode);
    if (res.success) {
      setStep('reset');
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if(newPassword.length < 6) return setError('Password must be at least 6 characters.');
    setError('');
    setIsLoading(true);
    
    const res = await resetPassAPI(resetEmail, otpCode, newPassword);
    if (res.success) {
      setStep('success');
      setTimeout(() => {
        setStep('login');
      }, 3000);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)', perspective: '1000px', overflowX: 'hidden' }}>

      {/* Animated Particle Background */}
      <ParticleField />

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isExtraSmall ? '1rem 12px' : '1.5rem 4%',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(15px)'
      }}>
        <motion.div
          whileHover={{ scale: 1.1, x: -5, background: 'var(--surface-2)', borderColor: 'var(--primary)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if(step === 'login') {
                logout();
                navigate('/');
            }
            else setStep('login');
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)',
            padding: isExtraSmall ? '0.6rem' : (isMobile ? '0.8rem' : '1rem'),
            borderRadius: '14px', cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', flexShrink: 0
          }}
        >
          <ArrowLeft size={isExtraSmall ? 18 : (isMobile ? 20 : 24)} />
        </motion.div>
      </header>

      <div style={{ padding: isMobile ? '90px 15px 40px' : '110px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ 
            width: '100%', 
            maxWidth: '500px', 
            background: 'var(--surface)', 
            padding: isMobile ? '1.5rem' : '2.5rem', 
            borderRadius: isMobile ? '24px' : '32px', 
            border: '1px solid var(--border)', 
            boxShadow: '0 30px 60px rgba(0,0,0,0.4)', 
            position: 'relative' 
          }}
        >
          {/* Logo & Heading */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <Shield color="var(--primary)" size={isMobile ? 24 : 28} strokeWidth={3} />
              <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.7rem', fontWeight: '900', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: 0, color: 'white' }}>
                Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span>
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
              {step === 'login' && 'Admin Portal Access'}
              {step === 'forgot' && 'Reset Admin Password'}
              {step === 'verify' && 'Verify Admin Identity'}
              {step === 'reset' && 'Create New Password'}
              {step === 'success' && 'Password Updated!'}
            </p>
          </div>

          {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</motion.div>}

          {/* Form Container with Overflow visible to prevent layout shift during animation */}
          <div style={{ overflow: 'visible', position: 'relative', margin: '0 -2rem', padding: '0 2rem' }}>
            <AnimatePresence mode="wait">
              {step === 'login' && (
                <motion.div key="login" initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Admin Email</label>
                      <input 
                        className="input-minimal" 
                        placeholder="admin@servicehive.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value.toLowerCase())} 
                        required 
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Master Password</label>
                      <PasswordInput 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    
                    <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                      <span 
                        onClick={() => { setStep('forgot'); setError(''); }}
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                      >
                        Forgot Password?
                      </span>
                    </div>

                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button
                        type="submit"
                        whileHover={authButtonHover}
                        whileTap={{ scale: 0.98 }}
                        style={authButtonStyle}
                        disabled={isLoading}
                      >
                        {isLoading ? 'VERIFYING...' : 'ACCESS DASHBOARD'} <Lock size={20} />
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'forgot' && (
                <motion.div key="forgot" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleForgot}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      Enter your admin email address to receive a 6-digit verification code.
                    </p>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Email Address</label>
                      <input 
                        className="input-minimal" 
                        type="email"
                        placeholder="admin@servicehive.com" 
                        value={resetEmail} 
                        onChange={(e) => setResetEmail(e.target.value.toLowerCase())} 
                        required 
                      />
                    </div>
                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button type="submit" whileHover={authButtonHover} whileTap={{ scale: 0.98 }} style={authButtonStyle} disabled={isLoading}>
                        {isLoading ? 'SENDING...' : 'SEND CODE'} <Mail size={20} />
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'verify' && (
                <motion.div key="verify" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleVerify}>
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' }}>
                        <Shield size={32} />
                      </div>
                      
                      <div style={{ marginBottom: '2.5rem' }}>
                          <input 
                            className="input-minimal" 
                            placeholder="0 0 0 0 0 0"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0,6))}
                            style={{ 
                              textAlign: 'center', 
                              fontSize: isExtraSmall ? '2rem' : '3rem', 
                              letterSpacing: isExtraSmall ? '12px' : '20px',
                              fontWeight: '900', color: 'var(--primary)', maxWidth: '100%',
                              padding: '10px', background: 'transparent', border: 'none', outline: 'none'
                            }}
                          />
                          <div style={{ width: '220px', height: '2px', background: 'var(--border)', margin: '0 auto', opacity: 0.5 }} />
                      </div>

                      <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                        <motion.button type="submit" whileHover={authButtonHover} whileTap={{ scale: 0.98 }} style={authButtonStyle} disabled={isLoading}>
                          {isLoading ? 'VERIFYING...' : 'VERIFY CODE'} <ArrowRight size={20} />
                        </motion.button>
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                          Didn't receive code? <span style={{ color: 'var(--primary)' }}>Resend</span>
                        </span>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'reset' && (
                <motion.div key="reset" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleReset}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>New Master Password</label>
                      <PasswordInput 
                        placeholder="••••••••" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button type="submit" whileHover={authButtonHover} whileTap={{ scale: 0.98 }} style={authButtonStyle} disabled={isLoading}>
                        {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'} <CheckCircle size={20} />
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <CheckCircle size={40} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>Password Reset Successful</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>You can now use your new master password to access the portal.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700' }}>
                      <Clock size={16} /> Redirecting to login...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
