import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Instagram, Twitter, Facebook, CheckCircle, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ContactPage = () => {
  const { submitContact, getSiteSettings } = useAuth();
  const [showThanks, setShowThanks] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [contactData, setContactData] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Other',
    message: ''
  });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
  const validatePhone = (phone) => /^(03)[0-9]{9}$/.test(phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.name.trim().length < 3) return setError("Please enter your full name.");
    if (!validateEmail(formData.email)) return setError("Please enter a valid email address.");
    if (formData.phone && !validatePhone(formData.phone)) return setError("Invalid phone (must be 03XXXXXXXXX).");
    if (formData.message.trim().length < 10) return setError("Message must be at least 10 characters long.");

    setSubmitting(true);
    const result = await submitContact(formData);
    setSubmitting(false);

    if (result.success) {
      setShowThanks(true);
      setFormData({ name: '', email: '', phone: '', subject: formSubjects[0] || 'Other', message: '' });
    } else {
      setError(result.message || 'Could not send your message. Please try again.');
    }
  };

  const fetchContactData = () => {
    getSiteSettings().then(data => {
      if (data?.contactUsCMS) setContactData(data.contactUsCMS);
    });
  };

  // Support email/phone shown here always come from Global Settings
  // (platform_settings), same as the in-app Contact Us forms, so admins
  // only ever update contact info in one place.
  const fetchPlatformSettings = () => {
    supabase.from('platform_settings').select('support_phone, support_email').eq('id', 1).single()
      .then(({ data }) => { if (data) setPlatformSettings(data); });
  };

  useEffect(() => {
    fetchContactData();
    fetchPlatformSettings();

    const channel = supabase
      .channel('contact_cms_watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, () => {
        fetchContactData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, () => {
        fetchPlatformSettings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const title = contactData?.title || 'Get in Touch.';
  const highlight = contactData?.highlightedTitleWord || 'Touch.';
  const desc = contactData?.description || "We're here to help you. Reach out to us for any questions, support, or feedback on our services.";

  const emailLabel = contactData?.emailLabel || 'Support Email';
  const emailVal = platformSettings?.support_email || 'service.hive0@gmail.com';
  const phoneLabel = contactData?.phoneLabel || 'Business Helpdesk';
  const phoneVal = platformSettings?.support_phone || '+92 (300) 123-4567';
  const addressLabel = contactData?.addressLabel || 'Physical HQ';
  const addressVal = contactData?.address || 'Karachi, Pakistan';
  
  const formatLink = (link) => {
    if (!link || link === '#') return '#';
    if (!/^https?:\/\//i.test(link)) return `https://${link}`;
    return link;
  };

  const igLink = formatLink(contactData?.instagramLink);
  const twLink = formatLink(contactData?.twitterLink);
  const fbLink = formatLink(contactData?.facebookLink);
  const rawFormSubjects = contactData?.formSubjects && contactData.formSubjects.length > 0 
    ? contactData.formSubjects 
    : ['Other', 'General Support', 'Billing Question', 'Worker Partnership'];

  const formSubjects = rawFormSubjects
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(s => s !== '');

  useEffect(() => {
    if (formSubjects.length > 0 && !formSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: formSubjects[0] }));
    }
  }, [formSubjects, formData.subject]);

  const renderTitle = () => {
    if (!title.includes(highlight) || !highlight) return title;
    const parts = title.split(highlight);
    return (
      <>{parts[0]}<span className="text-gradient">{highlight}</span>{parts.slice(1).join(highlight)}</>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 1.5rem' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(2rem, 6vw, 6rem)', alignItems: 'start' }}>
         <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '2rem', letterSpacing: '-2.5px' }}>{renderTitle()}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '4rem', maxWidth: '500px', lineHeight: '1.7' }}>
               {desc}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
               <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '16px' }}>
                     <Mail size={24} />
                  </div>
                  <div>
                     <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '4px' }}>{emailLabel}</p>
                     <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{emailVal}</p>
                  </div>
               </div>
               
               <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '16px' }}>
                     <Phone size={24} />
                  </div>
                  <div>
                     <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '4px' }}>{phoneLabel}</p>
                     <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{phoneVal}</p>
                  </div>
               </div>

               <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '1rem', borderRadius: '16px' }}>
                     <MapPin size={24} />
                  </div>
                  <div>
                     <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '4px' }}>{addressLabel}</p>
                     <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{addressVal}</p>
                  </div>
               </div>
            </div>

            <div style={{ marginTop: '5rem', display: 'flex', gap: '2rem' }}>
               <motion.a 
                 href={igLink} target="_blank" rel="noopener noreferrer"
                 whileHover={{ scale: 1.2, color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
                 style={{ color: 'var(--text-muted)', transition: 'all 0.3s ease' }}
               >
                 <Instagram size={28} />
               </motion.a>
               <motion.a 
                 href={twLink} target="_blank" rel="noopener noreferrer"
                 whileHover={{ scale: 1.2, color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
                 style={{ color: 'var(--text-muted)', transition: 'all 0.3s ease' }}
               >
                 <Twitter size={28} />
               </motion.a>
               <motion.a 
                 href={fbLink} target="_blank" rel="noopener noreferrer"
                 whileHover={{ scale: 1.2, color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' }}
                 style={{ color: 'var(--text-muted)', transition: 'all 0.3s ease' }}
               >
                 <Facebook size={28} />
               </motion.a>
            </div>
         </motion.div>

         <motion.div 
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(20,20,20, 0.4)', padding: 'clamp(1.5rem, 5vw, 3.5rem)', borderRadius: '32px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
         >
            <div style={{ position: 'absolute', top: -100, right: -100, width: '200px', height: '200px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, pointerEvents: 'none' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '2rem' }}>Send us a Message</h2>
            
            {error && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</motion.div>}

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleSubmit}>
               <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1' }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                     <input type="text" placeholder="Your Name" className="input-minimal" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div style={{ flex: '1' }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                     <input type="email" placeholder="example@email.pk" className="input-minimal" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})} required />
                  </div>
               </div>

               <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1' }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Phone (Optional)</label>
                     <input type="text" placeholder="03XXXXXXXXX" className="input-minimal" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div style={{ flex: '1', position: 'relative' }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Subject</label>
                     
                     {/* Custom Dropdown Toggle */}
                     <div 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="input-minimal"
                        style={{ 
                           cursor: 'pointer', 
                           display: 'flex', 
                           justifyContent: 'space-between', 
                           alignItems: 'center',
                           background: 'rgba(255, 255, 255, 0.03)',
                           borderColor: dropdownOpen ? 'var(--primary)' : 'var(--border)',
                           boxShadow: dropdownOpen ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
                           userSelect: 'none',
                           height: '52px'
                        }}
                     >
                        <span style={{ color: formData.subject ? 'var(--text)' : 'var(--text-muted)' }}>
                           {formData.subject || 'Select Subject'}
                        </span>
                        <motion.div
                           animate={{ rotate: dropdownOpen ? 180 : 0 }}
                           transition={{ duration: 0.2 }}
                           style={{ display: 'flex', alignItems: 'center' }}
                        >
                           <ChevronDown size={18} color="var(--primary)" />
                        </motion.div>
                     </div>

                     {/* Custom Dropdown Options */}
                     <AnimatePresence>
                        {dropdownOpen && (
                           <>
                              <div 
                                 onClick={() => setDropdownOpen(false)}
                                 style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                              />
                              <motion.div
                                 initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                 transition={{ duration: 0.15, ease: 'easeOut' }}
                                 style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: 0,
                                    right: 0,
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                    padding: '6px'
                                 }}
                              >
                                 {formSubjects.map((sub, idx) => (
                                    <div
                                       key={idx}
                                       onClick={() => {
                                          setFormData({ ...formData, subject: sub });
                                          setDropdownOpen(false);
                                       }}
                                       style={{
                                          padding: '10px 16px',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          background: formData.subject === sub ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                          color: formData.subject === sub ? 'var(--primary)' : 'var(--text)',
                                          fontWeight: formData.subject === sub ? '700' : '500',
                                          fontSize: '0.95rem'
                                       }}
                                       onMouseEnter={(e) => {
                                          if (formData.subject !== sub) {
                                             e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                          }
                                       }}
                                       onMouseLeave={(e) => {
                                          if (formData.subject !== sub) {
                                             e.currentTarget.style.background = 'transparent';
                                          }
                                       }}
                                    >
                                       {sub}
                                    </div>
                                 ))}
                              </motion.div>
                           </>
                        )}
                     </AnimatePresence>
                  </div>
               </div>

               <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Detailed Message</label>
                  <textarea placeholder="How can we help you?" className="input-minimal" style={{ minHeight: '120px', resize: 'vertical' }} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required />
               </div>

               <motion.button 
                  whileHover={{ scale: 1.02, boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" className="btn btn-primary"
                  disabled={submitting}
                  style={{ height: '55px', borderRadius: '100px', fontSize: '1rem', marginTop: '0.5rem', display: 'flex', gap: '10px', width: '100%', fontWeight: '800', justifyContent: 'center', alignItems: 'center', opacity: submitting ? 0.7 : 1 }}
               >
                  {submitting ? 'SENDING...' : <> SEND ENQUIRY <Send size={18} /></>}
               </motion.button>
            </form>
         </motion.div>
      </div>

      {/* Thank You Modal */}
      <AnimatePresence>
        {showThanks && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowThanks(false)}
               style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)' }}
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }}
               style={{ 
                 position: 'relative', width: '100%', maxWidth: '450px', 
                 background: '#0a0a0a', zIndex: 3002, 
                 padding: '4rem 2.5rem', borderRadius: '48px', border: '1px solid var(--border)',
                 textAlign: 'center', boxShadow: '0 50px 150px rgba(0,0,0,1)',
                 display: 'flex', flexDirection: 'column', alignItems: 'center'
               }}
            >
               <div style={{ 
                 background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', 
                 width: '90px', height: '90px', borderRadius: '50%', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem',
                 boxShadow: '0 0 40px rgba(59, 130, 246, 0.2)'
               }}>
                  <CheckCircle size={48} />
               </div>

               <h2 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '1.2rem', letterSpacing: '-2px' }}>Sent!</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '3rem' }}>
                  Your message has been received. Our team will get back to you within 24 hours.
               </p>

               <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.7)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowThanks(false)}
                  className="btn btn-primary" 
                  style={{ width: '100%', borderRadius: '100px', padding: '1.3rem', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.5px' }}
               >
                  Back
               </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ContactPage;
