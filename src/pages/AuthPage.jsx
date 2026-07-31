import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowRight, ArrowLeft, User,
  Lock, ChevronDown, CheckCircle,
  Clock, Fingerprint, Camera, ImageIcon,
  FileText, Upload, Loader2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleToggle from '../components/RoleToggle';
import AuthToggle from '../components/AuthToggle';
import PasswordInput from '../components/PasswordInput';
import ParticleField from '../components/ParticleField';

// Uploads the file to Cloudinary as soon as it's picked (instead of holding
// the raw File in form state until final submit) so the resulting URL —
// a plain string — is what needs to survive the signUp -> OTP-verify gap.
// File objects can't be persisted to localStorage; URL strings can, which is
// what makes registration data recoverable across a tab refresh/close.
const FileUpload = ({ label, icon, fileName, uploading, error, onFileSelected }) => {
  const inputId = `file-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const uploaded = !!fileName && !uploading;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>{label}</label>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0] || null; if (f) onFileSelected(f); }}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      <label
        htmlFor={inputId}
        style={{
          border: `1px dashed ${error ? 'var(--error, #ef4444)' : uploaded ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: uploading ? 'wait' : 'pointer',
          background: 'rgba(255,255,255,0.02)',
          transition: 'all 0.3s ease',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? (
          <Loader2 size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
        ) : uploaded ? (
          <CheckCircle size={24} color="var(--primary)" />
        ) : (
          React.cloneElement(icon, { size: 24, color: error ? 'var(--error, #ef4444)' : 'var(--text-dim)' })
        )}
        <span style={{ fontSize: '0.75rem', color: error ? 'var(--error, #ef4444)' : 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-all', padding: '0 0.5rem' }}>
          {uploading ? 'Uploading...' : error ? `Upload failed — tap to retry` : uploaded ? fileName : 'Click to Upload'}
        </span>
      </label>
    </div>
  );
};


const CustomSelect = ({ label, value, options, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="input-minimal"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          paddingRight: '1rem',
          minHeight: '48px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)'
        }}
      >
        <span style={{ color: value ? 'white' : '#64748b', fontSize: '0.9rem' }}>
          {value || placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={18} color="var(--primary)" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                background: '#0a0a0a',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                zIndex: 999,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {options.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.8rem 1.25rem',
                    cursor: 'pointer',
                    color: value === opt ? 'var(--primary)' : 'white',
                    background: value === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.target.style.background = value === opt ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                >
                  {opt}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRole = queryParams.get('role') === 'worker' ? 'worker' : 'customer';

  const [mode, setMode] = useState(location.hash === '#signup' ? 'register' : 'login');
  const [role, setRole] = useState(initialRole);
  const { login, register, verifyOtp, resendOtp, logout, user, getLocations, getServices, forgotPassword, verifyResetOtp, resetPassword, setPendingProviderRegistration, uploadKycFileNow } = useAuth();
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);

  React.useEffect(() => {
    const fetchLocs = async () => {
      const data = await getLocations();
      setAvailableLocations(data);
    };
    const fetchSvcs = async () => {
      const data = await getServices();
      setAvailableServices(data.map(s => s.name));
    };
    fetchLocs();
    fetchSvcs();
  }, []);

  const locationMap = availableLocations.reduce((acc, loc) => {
    acc[loc.city] = loc.areas;
    return acc;
  }, {});
  


  
  // States
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [custStep, setCustStep] = useState(1);

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState(0); // 0: none, 1: req, 2: verify, 3: reset, 4: success
  const [resetContact, setResetContact] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [loginId, setLoginId] = useState(''); // Email or Phone
  const [loginPass, setLoginPass] = useState('');
  
  const [workerStep, setWorkerStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [custData, setCustData] = useState({ 
    name: '', email: '', phone: '', city: '', area: '', address: '', 
    password: '', confirmPassword: ''
  });

  const [workData, setWorkData] = useState({
    name: '', email: '', phone: '', city: '', area: '', address: '',
    password: '', confirmPassword: '',
    bio: '', portfolio: '', charges: '', experience: '', timing: '',
    cnic: '', specialization: '', skills: '',
    // Each of these is now a Cloudinary URL string (uploaded immediately on
    // file selection), not a raw File — see FileUpload/handleKycFileSelected.
    cnicFrontUrl: null, cnicBackUrl: null, selfieUrl: null, workImagesUrl: null, certificateUrl: null,
  });
  const [kycFileNames, setKycFileNames] = useState({});
  const [kycUploading, setKycUploading] = useState({});
  const [kycErrors, setKycErrors] = useState({});

  const handleKycFileSelected = async (key, urlField, file) => {
    setKycUploading((p) => ({ ...p, [key]: true }));
    setKycErrors((p) => ({ ...p, [key]: false }));
    const result = await uploadKycFileNow(file, key);
    setKycUploading((p) => ({ ...p, [key]: false }));
    if (result.success) {
      setKycFileNames((p) => ({ ...p, [key]: file.name }));
      setWorkData((wd) => ({ ...wd, [urlField]: result.url }));
    } else {
      setKycErrors((p) => ({ ...p, [key]: true }));
    }
  };

  React.useEffect(() => {
    if (user && !isVerifying && forgotStep === 0) {
        const target = user.role === 'admin' ? '/admin' :
                       user.role === 'provider' ? '/provider-dashboard' :
                       '/customer-dashboard';
        navigate(target);
    }
  }, [user, navigate, isVerifying, forgotStep]);

  React.useEffect(() => {
    const newMode = location.pathname === '/register' ? 'register' : 'login';
    setMode(newMode);
    setIsVerifying(false);
    setError(null);
  }, [location.pathname]);

  const isMobile = windowWidth < 640;
  const isExtraSmall = windowWidth < 410;

  const validateEmail = (email, required = false) => {
    if (!email) return !required;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
  };
  const validatePhone = (phone) => /^(03)[0-9]{9}$/.test(phone);
  const validateName = (name) => name.trim().length >= 3;
  const validateCNIC = (cnic) => /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/.test(cnic);
  // Auto-inserts the two hyphens as digits are typed (42401-1234567-1) and
  // hard-caps at 13 digits, so a CNIC can never end up too short/long or
  // with hyphens in the wrong place — matches Pakistan's fixed CNIC format.
  const formatCNIC = (raw) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 13);
    const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)];
    return parts.filter(Boolean).join('-');
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!resetContact) return setError('Please enter your email or phone number.');
    setError(null);
    setIsLoading(true);
    
    // For now, we only support email reset
    const res = await forgotPassword(resetContact);
    if (res.success) {
      setForgotStep(2);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };
  
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (resetOtp.length < 6) return setError('Enter the 6-digit code.');
    setError(null);
    setIsLoading(true);
    
    const res = await verifyResetOtp(resetContact, resetOtp);
    if (res.success) {
      setForgotStep(3);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };
  
  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    setError(null);
    setIsLoading(true);
    
    const res = await resetPassword(resetContact, resetOtp, newPassword);
    if (res.success) {
      setForgotStep(4);
      setTimeout(() => setForgotStep(0), 3000);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const isEmail = validateEmail(loginId);
    const isPhone = validatePhone(loginId);

    if (!isEmail && !isPhone) {
      return setError("Please enter a valid Email or Phone Number (03XXXXXXXXX).");
    }
    if (loginPass.length < 6) {
      return setError("Invalid password length.");
    }

    const targetRole = role === 'worker' ? 'provider' : 'user';
    const res = await login(loginId, loginPass, targetRole);
    if (!res.success) {
      if (res.needsVerification) {
        // Redirect to OTP verification screen
        if (role === 'customer') setCustData(prev => ({ ...prev, email: res.email || loginId }));
        else setWorkData(prev => ({ ...prev, email: res.email || loginId }));
        setIsVerifying(true);
        setError('Your email is not verified. A new OTP has been sent — please check your inbox.');
      } else if (res.pending) {
        navigate('/pending-approval');
      } else {
        setError(res.message);
      }
    } else {
      if (res.user.role === 'admin') {
        setError('Administrators must use the Admin Portal.');
        logout();
      } else {
        navigate(res.user.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const userData = role === 'worker' ? { ...workData, role: 'provider' } : { ...custData, role: 'user' };

    if (role === 'worker') {
       if (workerStep === 1) {
          if (!validateName(workData.name)) return setError("Full name must be at least 3 characters.");
          if (!validateEmail(workData.email, true)) return setError("Valid email address is required.");
          if (!validatePhone(workData.phone)) return setError("Phone format: 03XXXXXXXXX.");
          if (workData.password.length < 6) return setError("Password min 6 chars.");
          if (workData.password !== workData.confirmPassword) return setError("Passwords mismatch.");
          setWorkerStep(2); return;
       }
       if (workerStep === 2) {
          if (!validateCNIC(workData.cnic)) return setError("CNIC must be 13 digits, format 42XXX-XXXXXXX-X.");
          if (kycUploading.cnicFront || kycUploading.cnicBack || kycUploading.selfie) return setError("Please wait for uploads to finish.");
          if (!workData.cnicFrontUrl || !workData.cnicBackUrl) return setError("Please upload both sides of your CNIC.");
          if (!workData.selfieUrl) return setError("Please upload a selfie holding your ID.");
          setWorkerStep(3); return;
       }
       if (workerStep === 3) {
          if (!workData.specialization) return setError("Please select your service specialization.");
          const exp = workData.experience.trim();
          if (!exp) return setError("Experience required (e.g. 5y, 3m, 2w, 10d).");
          if (!/^\d+[ymwd](\s+\d+[ymwd])*$/.test(exp)) return setError("Experience format: 5y / 3m / 2w / 10d (number + y/m/w/d).");
          setWorkerStep(4); return;
       }
    } else {
       if (custStep === 1) {
          if (!validateName(custData.name)) return setError("Name too short (min 3 characters).");
          if (!validatePhone(custData.phone)) return setError("Invalid phone. Format: 03XXXXXXXXX");
          if (!validateEmail(custData.email, true)) return setError("Valid email address is required.");
          if (custData.password.length < 6) return setError("Password must be at least 6 characters.");
          if (custData.password !== custData.confirmPassword) return setError("Passwords do not match.");
          setCustStep(2); return;
       }
    }

    if (role === 'worker') {
      if (kycUploading.workImages || kycUploading.certificate) return setError("Please wait for uploads to finish.");
      setPendingProviderRegistration(
        {
          specialization: workData.specialization,
          cnic: workData.cnic,
          skills: workData.skills,
          experience: workData.experience,
        },
        {
          cnicFront: workData.cnicFrontUrl,
          cnicBack: workData.cnicBackUrl,
          selfie: workData.selfieUrl,
          workImages: workData.workImagesUrl,
          certificate: workData.certificateUrl,
        }
      );
    }

    setIsSubmitting(true);
    const res = await register(userData);
    setIsSubmitting(false);

    if (res.success) {
      if (res.kycFailures?.length) {
        setError(`Account created, but these documents failed to upload: ${res.kycFailures.join(', ')}. You can re-upload them from your profile once approved, or contact support if this keeps happening.`);
      }
      if (res.skipOtp) {
        navigate(res.user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard');
      } else {
        setIsVerifying(true);
        if (!res.kycFailures?.length) setError(null);
      }
    } else {
       setError(res.message);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length < 6) return setError("Please enter the 6-digit code.");

    const email = role === 'worker' ? workData.email : custData.email;
    setIsSubmitting(true);
    const res = await verifyOtp(email, otpCode);
    setIsSubmitting(false);

    if (res.success) {
       setIsVerifying(false);
       setOtpCode('');
       if (res.kycFailures?.length) {
         setError(`Verified, but these documents failed to upload: ${res.kycFailures.join(', ')}. You can re-upload them from your profile once approved, or contact support if this keeps happening.`);
       }
       const target = res.user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard';
       navigate(target);
    } else {
       setError(res.message);
    }
  };

  const handleResendOTP = async () => {
    const email = role === 'worker' ? workData.email : custData.email;
    if (!email) return setError("Email missing.");
    
    const res = await resendOtp(email);
    if (res.success) {
       setError("New OTP sent to your email!");
    } else {
       setError(res.message);
    }
  };


  const authButtonStyle = {
    width: '100%',
    borderRadius: '100px', // Pill shape like Navbar
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

  const getSubText = () => {
    if (isSubmitted) return 'Thank you for joining our community.';
    if (forgotStep === 1) return 'Reset your account password.';
    if (forgotStep === 2) return 'Verify your identity.';
    if (forgotStep === 3) return 'Create a new secure password.';
    if (forgotStep === 4) return 'Password updated!';
    if (isVerifying) return `Enter 6-digit code sent to ${role === 'worker' ? workData.email : custData.email}`;
    if (mode === 'login') return role === 'customer' ? 'Welcome back! Get help in seconds.' : 'Welcome back, Professional!';
    return role === 'customer' ? `Step ${custStep} of 2: Join the hive.` : `Step ${workerStep} of 4: Setup your provider account.`;
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
          onClick={() => navigate('/')}
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

        <div style={{ transform: isExtraSmall ? 'scale(0.7)' : (isMobile ? 'scale(0.85)' : 'none'), transformOrigin: 'right center', flexShrink: 1, minWidth: 0 }}>
          <RoleToggle activeRole={role} onChange={setRole} />
        </div>
      </header>

      <div style={{ padding: isMobile ? '90px 15px 40px' : '110px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: '500px', background: 'var(--surface)', padding: isMobile ? '1.5rem' : '2.5rem', borderRadius: isMobile ? '24px' : '32px', border: '1px solid var(--border)', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', position: 'relative' }}
        >
          {/* Logo & Heading */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <Shield color="var(--primary)" size={isMobile ? 24 : 28} strokeWidth={3} />
              <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.7rem', fontWeight: '900', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: 0 }}>
                {isVerifying ? 'Verify Identity' : (
                   <>Service<span style={{ color: 'var(--primary)', opacity: 0.8 }}>Hive</span></>
                )}
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {getSubText()}
            </p>
          </div>

          {!isVerifying && forgotStep === 0 && <AuthToggle activeMode={mode} onChange={(m) => { setMode(m); setError(null); }} />}

          {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</motion.div>}

          <div style={{ overflow: 'visible', position: 'relative', margin: '0 -2rem', padding: '0 2rem' }}>
            <AnimatePresence mode="wait">
              {isSubmitted ? (
                 <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                       <CheckCircle size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>Application Submitted</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Our team is reviewing your profile. You will be notified via SMS once your verification is complete.</p>
                    <button onClick={() => navigate('/')} className="btn-primary" style={{ borderRadius: '100px', padding: '1rem 2rem' }}>Back to Home</button>
                    <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '700' }}>
                       <Clock size={16} /> Verification Pending
                    </div>
                 </motion.div>
              ) : forgotStep === 1 ? (
                <motion.div key="forgotReq" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleForgotRequest}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      Enter your registered email to receive a 6-digit verification code.
                    </p>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Email or Phone</label>
                      <input className="input-minimal" placeholder="Email or 0300XXXXXXX" value={resetContact} onChange={(e) => setResetContact(e.target.value.toLowerCase())} required />
                    </div>
                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button type="submit" whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)' }} whileTap={{ scale: 0.98 }} style={{ width: '100%', borderRadius: '100px', padding: '1.1rem 2rem', fontSize: '0.95rem', fontWeight: '800', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer' }} disabled={isLoading}>
                        {isLoading ? 'SENDING...' : 'SEND CODE'} <ArrowRight size={20} />
                      </motion.button>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <span onClick={() => { setForgotStep(0); setError(null); }} style={{ color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                        Back to Login
                      </span>
                    </div>
                  </form>
                </motion.div>
              ) : forgotStep === 2 ? (
                <motion.div key="forgotVerify" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleForgotVerify}>
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' }}>
                        <Shield size={32} />
                      </div>
                      <div style={{ marginBottom: '2.5rem' }}>
                          <input className="input-minimal" placeholder="0 0 0 0 0 0" value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0,6))} style={{ textAlign: 'center', fontSize: isExtraSmall ? '2rem' : '3rem', letterSpacing: isExtraSmall ? '12px' : '20px', fontWeight: '900', color: 'var(--primary)', maxWidth: '100%', padding: '10px', background: 'transparent', border: 'none', outline: 'none' }} />
                          <div style={{ width: '220px', height: '2px', background: 'var(--border)', margin: '0 auto', opacity: 0.5 }} />
                      </div>
                      <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                        <motion.button type="submit" whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)' }} whileTap={{ scale: 0.98 }} style={{ width: '100%', borderRadius: '100px', padding: '1.1rem 2rem', fontSize: '0.95rem', fontWeight: '800', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer' }} disabled={isLoading}>
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
              ) : forgotStep === 3 ? (
                <motion.div key="forgotReset" initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleForgotReset}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>New Password</label>
                      <PasswordInput placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button type="submit" whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)' }} whileTap={{ scale: 0.98 }} style={{ width: '100%', borderRadius: '100px', padding: '1.1rem 2rem', fontSize: '0.95rem', fontWeight: '800', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: 'pointer' }} disabled={isLoading}>
                        {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'} <CheckCircle size={20} />
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              ) : forgotStep === 4 ? (
                <motion.div key="forgotSuccess" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                      <CheckCircle size={40} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>Password Reset Successful</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>You can now use your new password to access your account.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700' }}>
                      <Clock size={16} /> Redirecting to login...
                  </div>
                </motion.div>
              ) : isVerifying ? (
                <motion.div key="verify" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.3 }}>
                 <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ 
                      width: '70px', height: '70px', borderRadius: '50%', 
                      background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                    }}>
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
                            letterSpacing: isExtraSmall ? '10px' : '15px', 
                            fontWeight: '900', 
                            color: 'var(--primary)', 
                            maxWidth: '100%',
                            padding: '10px',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none'
                          }}
                        />
                        <div style={{ width: '220px', height: '2px', background: 'var(--border)', margin: '0 auto', opacity: 0.5 }} />
                    </div>

                    <motion.button
                      whileHover={authButtonHover}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleVerifyOTP}
                      style={{ ...authButtonStyle, width: '100%', marginBottom: '1.5rem' }}
                    >
                      VERIFY & COMPLETE <ArrowRight size={20} />
                    </motion.button>

                      <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Code sent to your email: <b style={{ color: 'white' }}>{role === 'worker' ? workData.email : custData.email}</b>
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Didn't get the email? Check your Spam/Junk folder. &nbsp;
                          <span onClick={handleResendOTP} style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}>Resend Code</span>
                        </span>
                        <span
                          onClick={() => { setIsVerifying(false); setError(null); }}
                          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                          onMouseEnter={(e) => e.target.style.color = 'white'}
                          onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                          Email badlein?
                        </span>
                      </div>

                  </div>
                </motion.div>
              ) : mode === 'login' ? (
                <motion.div key="login" initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.2rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Email or Phone Number</label>
                      <input className="input-minimal" placeholder="Enter Email or Phone Number" value={loginId} onChange={(e) => setLoginId(e.target.value.toLowerCase())} required />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' }}>Password</label>
                      <PasswordInput 
                        placeholder="Enter Your Password" 
                        value={loginPass} 
                        onChange={(e) => setLoginPass(e.target.value)} 
                        required 
                      />
                    </div>
                    {/* Forgot Password Link */}
                    <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                      <motion.span 
                        whileHover={{ color: 'var(--primary)', scale: 1.05 }}
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', transition: 'color 0.2s' }}
                        onClick={() => { setError(null); setForgotStep(1); }}
                      >
                        Forgot Password?
                      </motion.span>
                    </div>
                    {/* Button Wrapper with Padding for Shadow */}
                    <div style={{ padding: '20px 0', margin: '0 -10px' }}>
                      <motion.button
                        whileHover={authButtonHover}
                        whileTap={{ scale: 0.98 }}
                        style={authButtonStyle}
                      >
                        LOGIN NOW <ArrowRight size={20} />
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key={`register-${role}-${workerStep}-${custStep}`} initial={{ x: 25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -25, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleRegister}>
                    <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isExtraSmall) ? '1fr' : '1fr 1fr', gap: '1.2rem 0.8rem', marginBottom: '1.5rem' }}>
                      
                      {/* CUSTOMER STEP 1: Basic Info */}
                      {(role === 'customer' && custStep === 1) && (
                        <>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Full Name</label>
                            <input className="input-minimal" placeholder="Enter Full Name" value={custData.name} onChange={(e) => setCustData({ ...custData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} maxLength={50} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Phone Number</label>
                            <input className="input-minimal" type="tel" placeholder="0300XXXXXXX" value={custData.phone} onChange={(e) => setCustData({ ...custData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} maxLength={11} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Email Address</label>
                            <input className="input-minimal" type="email" placeholder="mail@example.com" value={custData.email} onChange={(e) => setCustData({ ...custData, email: e.target.value.toLowerCase() })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Password</label>
                            <PasswordInput placeholder="••••••••" value={custData.password} onChange={(e) => setCustData({ ...custData, password: e.target.value })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Repeat Password</label>
                            <PasswordInput placeholder="••••••••" value={custData.confirmPassword} onChange={(e) => setCustData({ ...custData, confirmPassword: e.target.value })} required />
                          </div>
                        </>
                      )}

                      {/* CUSTOMER STEP 2: Location Details */}
                      {(role === 'customer' && custStep === 2) && (
                        <>
                          <div>
                            <CustomSelect label="City" value={custData.city} placeholder="Select City" options={Object.keys(locationMap)} onChange={(val) => setCustData({ ...custData, city: val, area: '' })} />
                          </div>
                          <div>
                            <CustomSelect label="Area" value={custData.area} placeholder="Select Area" disabled={!custData.city} options={custData.city ? locationMap[custData.city] : []} onChange={(val) => setCustData({ ...custData, area: val })} />
                          </div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Complete Address</label>
                            <input className="input-minimal" placeholder="House # / Street / Landmark" value={custData.address} onChange={(e) => setCustData({ ...custData, address: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2', display: 'flex', gap: '0.8rem', mt: '0.5rem', alignItems: 'flex-start' }}>
                             <input type="checkbox" required style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0 }} />
                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>I agree to the <b style={{ color: 'white' }}>Terms & Conditions</b> of ServiceHive.</span>
                          </div>
                        </>
                      )}

                      {/* WORKER STEP 1: Basic Info */}
                      {(role === 'worker' && workerStep === 1) && (
                        <>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Full Name (as per CNIC/NIC)</label>
                            <input className="input-minimal" placeholder="Full Name" value={workData.name} onChange={(e) => setWorkData({ ...workData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} maxLength={50} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Phone Number</label>
                            <input className="input-minimal" type="tel" placeholder="0300XXXXXXX" value={workData.phone} onChange={(e) => setWorkData({ ...workData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} maxLength={11} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Email Address</label>
                            <input className="input-minimal" type="email" placeholder="mail@pro.com" value={workData.email} onChange={(e) => setWorkData({ ...workData, email: e.target.value.toLowerCase() })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Password</label>
                            <PasswordInput placeholder="••••••••" value={workData.password} onChange={(e) => setWorkData({ ...workData, password: e.target.value })} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Repeat Password</label>
                            <PasswordInput placeholder="••••••••" value={workData.confirmPassword} onChange={(e) => setWorkData({ ...workData, confirmPassword: e.target.value })} required />
                          </div>
                        </>
                      )}

                      {/* WORKER STEP 2: Identity (KYC) */}
                      {(role === 'worker' && workerStep === 2) && (
                        <>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>CNIC (NIC) Number</label>
                            <input className="input-minimal" placeholder="42XXX-XXXXXXX-X" value={workData.cnic} onChange={(e) => setWorkData({ ...workData, cnic: formatCNIC(e.target.value) })} maxLength={15} required />
                          </div>
                          <div><FileUpload label="CNIC Front" icon={<Fingerprint />} fileName={kycFileNames.cnicFront} uploading={kycUploading.cnicFront} error={kycErrors.cnicFront} onFileSelected={(f) => handleKycFileSelected('cnicFront', 'cnicFrontUrl', f)} /></div>
                          <div><FileUpload label="CNIC Back" icon={<Fingerprint />} fileName={kycFileNames.cnicBack} uploading={kycUploading.cnicBack} error={kycErrors.cnicBack} onFileSelected={(f) => handleKycFileSelected('cnicBack', 'cnicBackUrl', f)} /></div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                             <FileUpload label="Selfie with ID" icon={<Camera />} fileName={kycFileNames.selfie} uploading={kycUploading.selfie} error={kycErrors.selfie} onFileSelected={(f) => handleKycFileSelected('selfie', 'selfieUrl', f)} />
                          </div>
                        </>
                      )}

                      {/* WORKER STEP 3: Professional Details */}
                      {(role === 'worker' && workerStep === 3) && (
                        <>
                          <div>
                            <CustomSelect label="Service Type" value={workData.specialization} options={availableServices.length > 0 ? availableServices : ['Electrician', 'Plumber', 'Cleaning', 'AC Repair', 'Carpenter']} onChange={(v) => setWorkData({...workData, specialization: v})} />
                          </div>
                          <div>
                           <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Experience (e.g. 5y / 3m / 2w / 10d)</label>
                           <input
                              className="input-minimal"
                              type="text"
                              placeholder="5y / 3m / 2w / 10d"
                              value={workData.experience}
                              onChange={(e) => {
                                 const val = e.target.value.toLowerCase().replace(/[^0-9ymwd\s]/g, '').slice(0, 10);
                                 setWorkData({ ...workData, experience: val });
                              }}
                              maxLength={10}
                              required
                           />
                          </div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Skills & Expertise</label>
                            <textarea className="input-minimal" placeholder="e.g. Wiring, Solar, Industrial Panels..." rows={2} style={{ resize: 'none' }} value={workData.skills} onChange={(e) => setWorkData({ ...workData, skills: e.target.value })} />
                          </div>
                          <div><FileUpload label="Work Portfolio" icon={<ImageIcon />} fileName={kycFileNames.workImages} uploading={kycUploading.workImages} error={kycErrors.workImages} onFileSelected={(f) => handleKycFileSelected('workImages', 'workImagesUrl', f)} /></div>
                          <div><FileUpload label="Certificates" icon={<FileText />} fileName={kycFileNames.certificate} uploading={kycUploading.certificate} error={kycErrors.certificate} onFileSelected={(f) => handleKycFileSelected('certificate', 'certificateUrl', f)} /></div>
                        </>
                      )}

                      {/* WORKER STEP 4: Location */}
                      {(role === 'worker' && workerStep === 4) && (
                        <>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <CustomSelect label="Your City" value={workData.city} placeholder="Select City" options={Object.keys(locationMap)} onChange={(val) => setWorkData({ ...workData, city: val })} />
                          </div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block', textTransform: 'uppercase' }}>Full Address</label>
                            <textarea className="input-minimal" placeholder="Complete address for service delivery" rows={3} style={{ resize: 'none' }} value={workData.address} onChange={(e) => setWorkData({ ...workData, address: e.target.value })} required />
                          </div>
                          <div style={{ gridColumn: (isMobile || isExtraSmall) ? 'auto' : 'span 2', display: 'flex', gap: '0.8rem', mt: '1rem', alignItems: 'flex-start' }}>
                             <input type="checkbox" required style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', flexShrink: 0 }} />
                             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>I agree to the <b style={{ color: 'white' }}>Terms & Conditions</b> and allow ServiceHive to verify my documents.</span>
                          </div>
                        </>
                      )}

                    </div>

                    {/* Navigation Buttons for Stepped Form */}
                    <div style={{ padding: '20px 0', margin: '0 -10px', display: 'flex', gap: '1rem' }}>
                      {((role === 'worker' && workerStep > 1) || (role === 'customer' && custStep > 1)) && (
                         <motion.button type="button" onClick={() => role === 'worker' ? setWorkerStep(workerStep - 1) : setCustStep(custStep - 1)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ ...authButtonStyle, background: 'var(--surface-2)', flex: 1 }}>
                            BACK
                         </motion.button>
                      )}
                      
                      <motion.button
                        whileHover={!isSubmitting ? authButtonHover : {}}
                        whileTap={{ scale: 0.99 }}
                        disabled={isSubmitting}
                        style={{ ...authButtonStyle, flex: 2, opacity: isSubmitting ? 0.7 : 1 }}
                      >
                        {isSubmitting ? (role === 'worker' && workerStep === 4 ? 'UPLOADING DOCUMENTS...' : 'PLEASE WAIT...') : (
                          role === 'worker'
                           ? (workerStep === 4 ? 'SUBMIT APPLICATION' : 'CONTINUE')
                           : (custStep === 2 ? 'REGISTER NOW' : 'NEXT STEP')
                        )}
                        {!isSubmitting && <ArrowRight size={20} />}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};




export default AuthPage;
