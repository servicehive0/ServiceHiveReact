import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, Phone, MapPin, Shield, LogOut, Edit3, X, Check, Loader, Lock, KeyRound, Crosshair, Camera, ArrowLeft, Star, Info, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';

const ProfilePage = () => {
  const { user, logout, updateProfile, uploadAvatar, forgotPassword, verifyResetOtp, resetPassword, getLocations } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [specialization, setSpecialization] = useState(null);

  useEffect(() => {
    if (user?.role !== 'provider') return;
    supabase.from('provider_profiles').select('service_type').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.service_type) setSpecialization(data.service_type); });
  }, [user?.id, user?.role]);

  // ─── Skills & Experience (providers only) — mirrors Flutter's
  // edit_profile_screen.dart. Saves independently of the rest of the form,
  // straight to provider_profiles (not the users table).
  const [skillsForm, setSkillsForm] = useState({ skills: [], experience: '', about: '', ratePerHour: '' });
  const [skillInput, setSkillInput] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsSuccess, setSkillsSuccess] = useState('');

  useEffect(() => {
    if (user?.role !== 'provider') return;
    supabase.from('provider_profiles').select('skills, experience, about, rate_per_hour').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setSkillsForm({
          skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
          experience: data.experience || '',
          about: data.about || '',
          ratePerHour: data.rate_per_hour ? String(data.rate_per_hour) : '',
        });
      });
  }, [user?.id, user?.role]);

  // Comma or Enter commits whatever's typed as a new skill chip — lets
  // someone type "Wiring, Solar panels" in one go or add them one at a
  // time, mirroring Flutter's edit_profile_screen.dart chip input.
  const commitSkillInput = () => {
    const parts = skillInput.split(',').map(s => s.trim()).filter(Boolean);
    const added = parts.filter(s => !skillsForm.skills.includes(s));
    setSkillInput('');
    if (added.length) setSkillsForm(prev => ({ ...prev, skills: [...prev.skills, ...added] }));
  };

  const removeSkill = (skill) => {
    setSkillsForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    const finalSkills = skillInput.trim()
      ? [...skillsForm.skills, ...skillInput.split(',').map(s => s.trim()).filter(s => s && !skillsForm.skills.includes(s))]
      : skillsForm.skills;
    setSkillInput('');
    const { error: err } = await supabase.from('provider_profiles').upsert({
      id: user.id,
      skills: finalSkills,
      experience: skillsForm.experience.trim(),
      about: skillsForm.about.trim(),
      rate_per_hour: Number(skillsForm.ratePerHour) || 0,
    }, { onConflict: 'id' });
    setSavingSkills(false);
    if (!err) {
      setSkillsForm(prev => ({ ...prev, skills: finalSkills }));
      setSkillsSuccess('Saved!');
      setTimeout(() => setSkillsSuccess(''), 2500);
    }
  };

  const handleAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    setUploadingAvatar(true);
    const res = await uploadAvatar(file);
    setUploadingAvatar(false);
    if (!res.success) alert('Failed to upload photo: ' + (res.message || 'Unknown error'));
  };

  // ─── Edit Profile state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    area: user?.area || '',
    city: user?.city || '',
    address: user?.address || '',
    latitude: user?.latitude ?? null,
    longitude: user?.longitude ?? null,
  });
  const [locations, setLocations] = useState([]);
  const [locatingGps, setLocatingGps] = useState(false);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  const locationMap = locations.reduce((acc, loc) => { acc[loc.city] = loc.areas; return acc; }, {});

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocatingGps(false);
      },
      () => setLocatingGps(false),
      { enableHighAccuracy: true }
    );
  };

  // ─── Change Password state ────────────────────────────────────────────────────
  const [cpStep, setCpStep] = useState(0); // 0:closed 1:sending 2:otp 3:newpass 4:done
  const [cpOtp, setCpOtp] = useState('');
  const [cpNewPass, setCpNewPass] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openEdit = () => {
    setForm({
      name: user?.name || '', phone: user?.phone || '', area: user?.area || '', city: user?.city || '', address: user?.address || '',
      latitude: user?.latitude ?? null, longitude: user?.longitude ?? null,
    });
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setError('');
    const result = await updateProfile(form);
    setSaving(false);
    if (result?.success) {
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result?.message || 'Failed to update profile');
    }
  };

  // ─── Change Password handlers ─────────────────────────────────────────────────
  const openChangePassword = async () => {
    setCpOtp(''); setCpNewPass(''); setCpConfirm(''); setCpError('');
    setCpStep(1);
    setCpLoading(true);
    const res = await forgotPassword(user?.email);
    setCpLoading(false);
    if (res.success) {
      setCpStep(2);
    } else {
      setCpError(res.message || 'Failed to send OTP.');
      setCpStep(1);
    }
  };

  const handleCpVerify = async (e) => {
    e.preventDefault();
    if (cpOtp.length !== 6) { setCpError('Enter the 6-digit OTP.'); return; }
    setCpError('');
    setCpLoading(true);
    const res = await verifyResetOtp(user?.email, cpOtp);
    setCpLoading(false);
    if (res.success) {
      setCpStep(3);
    } else {
      setCpError(res.message || 'Invalid or expired OTP.');
    }
  };

  const handleCpReset = async (e) => {
    e.preventDefault();
    if (cpNewPass.length < 6) { setCpError('Password must be at least 6 characters.'); return; }
    if (cpNewPass !== cpConfirm) { setCpError('Passwords do not match.'); return; }
    setCpError('');
    setCpLoading(true);
    const res = await resetPassword(user?.email, cpOtp, cpNewPass);
    setCpLoading(false);
    if (res.success) {
      setCpStep(4);
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2500);
    } else {
      setCpError(res.message || 'Failed to update password.');
    }
  };

  const closeChangePassword = () => {
    setCpStep(0); setCpOtp(''); setCpNewPass(''); setCpConfirm(''); setCpError('');
  };

  // ─── Privacy toggles ──────────────────────────────────────────────────────────
  // Independent of the rest of the profile form — flips immediately on tap
  // rather than needing "Save Changes", same UX as Flutter's edit_profile_screen.dart.
  const [savingVisibility, setSavingVisibility] = useState(null); // which key is mid-save, or null
  const toggleVisibility = async (key, value) => {
    setSavingVisibility(key);
    await updateProfile({ [key]: value });
    setSavingVisibility(null);
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
          <button onClick={() => navigate(user?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
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

      <div style={{ padding: 'clamp(1.2rem, 4vw, 2rem) 5%', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box', width: '100%' }}>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} /> {success}
          </motion.div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ position: 'relative', width: '120px', margin: '0 auto 1.5rem' }}>
            <div style={{
              width: '120px', height: '120px',
              background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
              border: '4px solid var(--bg)'
            }}>
              {!user?.avatarUrl && <User size={60} color="white" />}
              {uploadingAvatar && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelected} style={{ display: 'none' }} />
            <button
              onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                position: 'absolute', bottom: '8px', right: '4px',
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'var(--primary)', border: '3px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
              }}
            >
              <Camera size={16} color="white" />
            </button>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px' }}>{user?.name || 'User Profile'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}>
            {user?.role === 'provider' ? 'Service Provider' : (user?.role || 'Customer')}
            {specialization && <span style={{ color: 'var(--success, #22c55e)' }}> · {specialization}</span>}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>

          <div className="card" style={{ borderRadius: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Personal Info</h3>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={openEdit}
                style={{ background: 'rgba(59,130,246,0.1)', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
              >
                <Edit3 size={18} />
              </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { icon: <Mail size={20} color="var(--text-dim)" />, label: 'Email', value: user?.email || 'N/A' },
                { icon: <Phone size={20} color="var(--text-dim)" />, label: 'Phone', value: user?.phone || 'Not set' },
                { icon: <MapPin size={20} color="var(--text-dim)" />, label: 'Area', value: user?.area ? `${user.area}${user.city ? ', ' + user.city : ''}, Pakistan` : 'Not set' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px' }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>{label}</p>
                    <p style={{ fontSize: '1rem', fontWeight: '600' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy — lets a user hide phone/email/location from OTHER
              users viewing their profile (CustomerProfileModal.jsx /
              ProviderProfileModal.jsx), independent of what admins or the
              app itself can see. */}
          <div className="card" style={{ borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>Privacy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { key: 'showPhone', icon: <Phone size={18} color="var(--text-dim)" />, title: 'Show Phone Number', subtitle: 'Let others see your phone on your profile' },
                { key: 'showEmail', icon: <Mail size={18} color="var(--text-dim)" />, title: 'Show Email', subtitle: 'Let others see your email on your profile' },
              ].map(({ key, icon, title, subtitle }) => {
                const value = user?.[key] !== false;
                const saving = savingVisibility === key;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.85rem 1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '10px', display: 'flex' }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', fontWeight: '700' }}>{title}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{subtitle}</p>
                    </div>
                    {saving ? (
                      <Loader size={18} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    ) : (
                      <button
                        onClick={() => toggleVisibility(key, !value)}
                        style={{
                          flexShrink: 0, width: 44, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative',
                          background: value ? 'var(--primary)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
                        }}
                      >
                        <motion.div
                          animate={{ x: value ? 20 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ position: 'absolute', top: 2, width: 22, height: 22, borderRadius: '50%', background: 'white' }}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {user?.role === 'provider' && (
            <div className="card" style={{ borderRadius: '24px' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Skills & Experience</h3>
                {skillsSuccess && <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> {skillsSuccess}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '6px' }}><Star size={13} /> Skills</label>
                  <div style={{ padding: '0.7rem 0.9rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    {skillsForm.skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {skillsForm.skills.map(s => (
                          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 6px 6px 12px', borderRadius: 100, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>
                            {s}
                            <button type="button" onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', padding: 0, opacity: 0.8 }}>
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      className="input-minimal"
                      style={{ padding: 0, border: 'none', background: 'none' }}
                      placeholder={skillsForm.skills.length === 0 ? 'e.g. Wiring, Solar panels' : 'Add another skill…'}
                      value={skillInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.endsWith(',')) {
                          const skill = v.slice(0, -1).trim();
                          if (skill && !skillsForm.skills.includes(skill)) {
                            setSkillsForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
                          }
                          setSkillInput('');
                        } else {
                          setSkillInput(v);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitSkillInput(); }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Experience</label>
                  <input
                    type="text"
                    className="input-minimal"
                    placeholder="5y / 3m / 2w / 10d"
                    value={skillsForm.experience}
                    onChange={(e) => setSkillsForm(prev => ({ ...prev, experience: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '6px' }}><Info size={13} /> About</label>
                  <textarea
                    className="input-minimal"
                    placeholder="Tell customers a bit about yourself and your work"
                    rows={4}
                    value={skillsForm.about}
                    onChange={(e) => setSkillsForm(prev => ({ ...prev, about: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '6px' }}><DollarSign size={13} /> Rate (Rs / hour)</label>
                  <input
                    type="number"
                    className="input-minimal"
                    placeholder="e.g. 500"
                    value={skillsForm.ratePerHour}
                    onChange={(e) => setSkillsForm(prev => ({ ...prev, ratePerHour: e.target.value }))}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSaveSkills}
                  disabled={savingSkills}
                  className="btn btn-primary"
                  style={{ borderRadius: '100px', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {savingSkills ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <motion.div whileHover={{ scale: 1.02 }} className="card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
              onClick={() => navigate('/customer-dashboard', { state: { tab: 'bookings' } })}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
                <Shield size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '800', fontSize: '1rem' }}>My Bookings</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>View your booking history</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} className="card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
              onClick={() => navigate('/customer-dashboard')}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                <MapPin size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '800', fontSize: '1rem' }}>Browse Services</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Find a service near you</p>
              </div>
            </motion.div>

            {/* Change Password Card */}
            <motion.div whileHover={{ scale: 1.02 }} className="card"
              style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(99,102,241,0.2)' }}
              onClick={openChangePassword}>
              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '10px', borderRadius: '12px', color: '#6366f1' }}>
                <Lock size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '800', fontSize: '1rem' }}>Change Password</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Update your account password via OTP</p>
              </div>
            </motion.div>

            <motion.button
              whileHover={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              onClick={handleLogout}
              style={{ marginTop: 'auto', padding: '1.2rem', borderRadius: '100px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'rgba(239, 68, 68, 0.8)', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              LOGOUT
            </motion.button>
          </div>
        </div>
      </div>

      {/* ─── Edit Profile Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editing && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditing(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }}
              style={{ position: 'relative', width: '100%', maxWidth: '480px', background: '#0a0a0a', borderRadius: '32px', border: '1px solid var(--border)', padding: '2.5rem', zIndex: 3001 }}
            >
              <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Edit Profile</h2>
                <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  <X size={22} />
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {[
                  { label: 'Full Name', key: 'name', placeholder: 'Your full name' },
                  { label: 'Phone Number', key: 'phone', placeholder: '03XXXXXXXXX' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{label}</label>
                    <input
                      type="text"
                      className="input-minimal"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>City</label>
                  <select className="input-minimal" value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value, area: '' }))}
                    style={{ cursor: 'pointer' }}>
                    <option value="">Select City</option>
                    {Object.keys(locationMap).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Area</label>
                  <select className="input-minimal" value={form.area} disabled={!form.city} onChange={(e) => setForm(prev => ({ ...prev, area: e.target.value }))}
                    style={{ cursor: form.city ? 'pointer' : 'not-allowed', opacity: form.city ? 1 : 0.6 }}>
                    <option value="">Select Area</option>
                    {(locationMap[form.city] || []).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Address</label>
                  <input type="text" className="input-minimal" placeholder="Full address" value={form.address}
                    onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} />
                </div>

                <motion.button
                  type="button" whileTap={{ scale: 0.97 }} onClick={useMyLocation} disabled={locatingGps}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem', borderRadius: 100, background: form.latitude ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${form.latitude ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`, color: form.latitude ? '#22c55e' : '#6366f1', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {locatingGps ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Crosshair size={16} />}
                  {form.latitude ? 'Location Captured — Tap to Update' : 'Use My Current Location'}
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '2rem', borderRadius: '100px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {saving ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Changes'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Change Password Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cpStep > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeChangePassword}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }}
              style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#0a0a0a', borderRadius: '32px', border: '1px solid var(--border)', padding: '2.5rem', zIndex: 3001 }}
            >
              {/* Header */}
              <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <div style={{ background: 'rgba(99,102,241,0.1)', padding: '8px', borderRadius: '10px', color: '#6366f1', display: 'flex' }}>
                    <KeyRound size={18} />
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Change Password</h2>
                </div>
                {cpStep !== 4 && (
                  <button onClick={closeChangePassword} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={22} />
                  </button>
                )}
              </div>

              {/* Error */}
              {cpError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
                  {cpError}
                </div>
              )}

              {/* Step 1: Sending OTP */}
              {cpStep === 1 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <Loader size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Sending OTP to<br />
                    <strong style={{ color: 'white' }}>{user?.email}</strong>
                  </p>
                </div>
              )}

              {/* Step 2: Enter OTP */}
              {cpStep === 2 && (
                <form onSubmit={handleCpVerify}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    A 6-digit OTP has been sent to <strong style={{ color: 'white' }}>{user?.email}</strong>. Enter it below.
                  </p>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>6-Digit OTP</label>
                    <input
                      className="input-minimal"
                      placeholder="______"
                      maxLength={6}
                      value={cpOtp}
                      onChange={(e) => setCpOtp(e.target.value.replace(/\D/g, ''))}
                      style={{ letterSpacing: '0.4em', fontSize: '1.4rem', textAlign: 'center', fontWeight: '800' }}
                      autoFocus
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={cpLoading || cpOtp.length !== 6}
                    className="btn btn-primary"
                    style={{ width: '100%', borderRadius: '100px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: cpOtp.length !== 6 ? 0.5 : 1 }}
                  >
                    {cpLoading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : 'Verify OTP'}
                  </motion.button>
                  <button
                    type="button"
                    onClick={openChangePassword}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '1rem', width: '100%', textAlign: 'center' }}
                  >
                    Resend OTP
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {cpStep === 3 && (
                <form onSubmit={handleCpReset}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    OTP verified. Set your new password below.
                  </p>
                  <div style={{ marginBottom: '1.2rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>New Password</label>
                    <PasswordInput
                      placeholder="Min. 6 characters"
                      value={cpNewPass}
                      onChange={(e) => setCpNewPass(e.target.value)}
                    />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Confirm Password</label>
                    <PasswordInput
                      placeholder="Repeat password"
                      value={cpConfirm}
                      onChange={(e) => setCpConfirm(e.target.value)}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={cpLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', borderRadius: '100px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {cpLoading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</> : 'Update Password'}
                  </motion.button>
                </form>
              )}

              {/* Step 4: Success */}
              {cpStep === 4 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}
                  >
                    <Check size={36} color="#22c55e" />
                  </motion.div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.5rem' }}>Password Updated!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Your password has been changed. Redirecting to login...
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ProfilePage;
