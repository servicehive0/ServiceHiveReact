import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Briefcase, Calendar, Layout,
  Settings, LogOut, Plus, Edit2, Trash2,
  Search, TrendingUp, DollarSign, CheckCircle,
  X, Image as ImageIcon, Save, Menu, Activity,
  Globe, Lock, Bell, CreditCard, ChevronRight,
  Filter, Download, MapPin,
  Zap, Droplet, Wind, Paintbrush, Sparkles, Heart,
  Hammer, Leaf, Scissors, Wrench, Home, ToggleLeft, ToggleRight,
  Headphones, Mail, Smile, Meh, Frown, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { analyzeSentimentML, predictDemandML } from '../lib/aiInsights';
import NotificationsModal from '../components/NotificationsModal';
import UserLocationModal from '../components/UserLocationModal';

const SERVICE_ICONS = {
  Zap: <Zap size={28} />, Droplet: <Droplet size={28} />, Wind: <Wind size={28} />,
  Paintbrush: <Paintbrush size={28} />, Sparkles: <Sparkles size={28} />, Heart: <Heart size={28} />,
  Hammer: <Hammer size={28} />, Leaf: <Leaf size={28} />, Scissors: <Scissors size={28} />,
  Wrench: <Wrench size={28} />, Home: <Home size={28} />, Shield: <Shield size={28} />,
};
const ICON_NAMES = Object.keys(SERVICE_ICONS);

const generateSlug = (name) =>
  name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [cmsTab, setCmsTab] = useState('home');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [userFilter, setUserFilter] = useState('Customers');
  const [userSearch, setUserSearch] = useState('');
  const [realUsers, setRealUsers] = useState([]);
  const [usersError, setUsersError] = useState(null);
  const [providerOnlineMap, setProviderOnlineMap] = useState({});
  const [providerServiceMap, setProviderServiceMap] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingLocationUser, setViewingLocationUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'user', isVerified: true });
  const [editSaving, setEditSaving] = useState(false);
  const [showRejectedLog, setShowRejectedLog] = useState(false);
  const [rejectedApplications, setRejectedApplications] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [viewingRejected, setViewingRejected] = useState(null);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [contactMessages, setContactMessages] = useState([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);
  const [contactFilter, setContactFilter] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [sentimentById, setSentimentById] = useState({});
  const [reviewedRequests, setReviewedRequests] = useState([]);
  const [demandInsights, setDemandInsights] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [platformSettingsLoading, setPlatformSettingsLoading] = useState(false);
  const [platformSettingsSaving, setPlatformSettingsSaving] = useState(false);
  const [platformSettingsError, setPlatformSettingsError] = useState(null);
  const [platformSettingsSaved, setPlatformSettingsSaved] = useState(false);
  const navigate = useNavigate();
  const { user, logout, getLocations, addCity, deleteCity, addArea, removeArea, getSiteSettings, updateSiteSettings, getPlatformSettings, updatePlatformSettings, getAllUsers, deleteUser, adminUpdateUser, getAllServices, createService, updateService, deleteService, uploadServiceImage } = useAuth();

  const [realServices, setRealServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', icon: 'Sparkles', color: '#3b82f6', description: '', isActive: true, imgUrl: '' });
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceImgFile, setServiceImgFile] = useState(null);
  const [serviceImgPreview, setServiceImgPreview] = useState(null);
  const [serviceImgUploading, setServiceImgUploading] = useState(false);
  const [serviceError, setServiceError] = useState(null);

  const [cmsData, setCmsData] = useState({
    homeCMS: {
      topBadgeCountry: 'Pakistan',
      mainHeading: 'Your Home, Simplified.',
      subTitle: 'Expert help for all your home needs. Premium quality, transparent pricing, and trusted professionals.',
      usersServedCount: '15k+',
      averageRating: '4.8★',
      serviceTypesCount: '20+',
      appStoreLink: '#',
      playStoreLink: '#'
    },
    servicesCMS: {
      pageTitle: 'Our Premium Services',
      pageDescription: 'Discover a wide range of professional services tailored to your needs.',
      servicesList: []
    },
    aboutUsCMS: {
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
    },
    contactUsCMS: {
      title: 'Get in Touch.',
      highlightedTitleWord: 'Touch.',
      description: "We're here to help you. Reach out to us for any questions, support, or feedback on our services.",
      emailLabel: 'Support Email',
      email: 'service.hive0@gmail.com',
      phoneLabel: 'Business Helpdesk',
      phone: '+92 (300) 123-4567',
      addressLabel: 'Physical HQ',
      address: 'Karachi, Pakistan',
      instagramLink: '#',
      twitterLink: '#',
      facebookLink: '#',
      formSubjects: ['Other', 'General Support', 'Billing Question', 'Worker Partnership']
    },
    footerCMS: {
      shortDescription: "Pakistan's most trusted platform for home services. Quality, transparency, and speed at your doorstep.",
      facebookLink: '#',
      twitterLink: '#',
      instagramLink: '#',
      copyrightText: '© 2026 ServiceHive Pakistan. All rights reserved.',
      privacyPolicyLink: '/privacy-policy',
      termsOfServiceLink: '/terms-of-service'
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  const [locations, setLocations] = useState([]);
  const [newCityName, setNewCityName] = useState('');
  const [newAreaNames, setNewAreaNames] = useState({}); // { cityId: 'areaName' }
  const [newSubject, setNewSubject] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceIcon, setNewServiceIcon] = useState('Sparkles');
  const [newServiceColor, setNewServiceColor] = useState('#3b82f6');
  const [newServiceImg, setNewServiceImg] = useState('');

  useEffect(() => {
    fetchLocations();
    fetchCMS();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'services') fetchServices();
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'overview') { fetchUsers(); fetchServices(); fetchBookings(); }
    if (activeTab === 'insights') fetchInsights();
    if (activeTab === 'settings' && !platformSettings) fetchPlatformSettings();
  }, [activeTab]);

  // Bell badge — same `notifications` table the customer/provider dashboards
  // already read via NotificationsModal, just scoped to the admin's own id.
  useEffect(() => {
    if (!user?.id) return;
    const loadUnread = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
      setUnreadCount(count || 0);
    };
    loadUnread();
    const channel = supabase.channel(`admin_notifications_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchPlatformSettings = async () => {
    setPlatformSettingsLoading(true);
    const data = await getPlatformSettings();
    setPlatformSettings(data || {
      platform_name: 'ServiceHive', commission_percent: 10, min_bid_amount: 100, max_bid_amount: 200000,
      maintenance_mode: false, maintenance_message: '', auto_approve_providers: false, support_phone: '', support_email: '',
    });
    setPlatformSettingsLoading(false);
  };

  const savePlatformSettings = async () => {
    if (!platformSettings) return;
    setPlatformSettingsSaving(true);
    setPlatformSettingsError(null);
    setPlatformSettingsSaved(false);
    const { id, updated_at, ...payload } = platformSettings;
    const res = await updatePlatformSettings(payload);
    setPlatformSettingsSaving(false);
    if (!res.success) { setPlatformSettingsError(res.message); return; }
    setPlatformSettingsSaved(true);
    setTimeout(() => setPlatformSettingsSaved(false), 3000);
  };

  // Sentiment: classify recent customer reviews via Groq (LLM-based, not a
  // trained classifier — see src/lib/aiInsights.js). Demand: group requests
  // by city/area/service and ask Groq to spot trending combos. Both are
  // advisory-only reads; a failed call just leaves the section empty.
  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data: reviewed } = await supabase.from('service_requests')
        .select('id, service_name, city, area, review, rating, created_at')
        .not('review', 'is', null).neq('review', '').order('created_at', { ascending: false }).limit(50);
      setReviewedRequests(reviewed || []);
      if (reviewed?.length) {
        const sentiment = await analyzeSentimentML(reviewed.map(r => ({ id: r.id, review: r.review })));
        if (sentiment) setSentimentById(sentiment);
      }

      const { data: allRequests } = await supabase.from('service_requests')
        .select('city, area, service_name, created_at').order('created_at', { ascending: false }).limit(500);
      if (allRequests?.length) {
        const now = Date.now();
        const grouped = {};
        allRequests.forEach(r => {
          const key = `${r.city}||${r.area}||${r.service_name}`;
          if (!grouped[key]) grouped[key] = { city: r.city, area: r.area, service: r.service_name, recent_count: 0, older_count: 0 };
          const ageDays = (now - new Date(r.created_at)) / 86400000;
          if (ageDays <= 14) grouped[key].recent_count++; else grouped[key].older_count++;
        });
        const demand = await predictDemandML(Object.values(grouped));
        if (demand) setDemandInsights(demand);
      }
    } catch (e) {
      console.error('fetchInsights error:', e);
    }
    setInsightsLoading(false);
  };

  // Poll provider online status every 5 seconds when on users tab
  useEffect(() => {
    if (activeTab !== 'users') return;
    let cancelled = false;
    const poll = async () => {
      const { data: profiles } = await supabase
        .from('provider_profiles')
        .select('id, is_online, service_type');
      if (!cancelled && profiles) {
        const onlineMap = {};
        const serviceMap = {};
        profiles.forEach(p => {
          onlineMap[p.id] = p.is_online;
          if (p.service_type) serviceMap[p.id] = p.service_type;
        });
        setProviderOnlineMap(onlineMap);
        setProviderServiceMap(serviceMap);
      }
    };
    poll(); // immediate first run
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'site' && cmsTab === 'services' && realServices.length === 0) {
      fetchServices();
    }
  }, [activeTab, cmsTab]);

  const fetchUsers = async (silent = false) => {
    if (!silent) setUsersLoading(true);
    const result = await getAllUsers();
    if (result.error) {
      console.error('Users fetch failed:', result.error);
      if (!silent) { setRealUsers([]); setUsersError(result.error); }
    } else {
      setRealUsers(result.data);
      setUsersError(null);
    }
    if (!silent) setUsersLoading(false);
  };

  // Live-refreshes the Users tab the instant a registration/approval/reject
  // happens anywhere else (admin panel elsewhere, the provider's own app,
  // etc.) — no manual reload needed to see it here, same as the mobile app.
  useEffect(() => {
    if (activeTab !== 'users' && activeTab !== 'overview') return;
    // provider_profiles.is_online flips constantly (every provider's
    // heartbeat poll), which was firing fetchUsers(true) — and the
    // recentActivity/stats re-render it causes — on every single row event.
    // That was rapid enough to trip up AnimatePresence's key bookkeeping
    // (spurious "duplicate key" warnings) and could snowball into a crash
    // during sustained realtime traffic. Debounce so bursts collapse into
    // one refetch instead of one per event.
    let debounceTimer = null;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchUsers(true), 800);
    };
    const channel = supabase
      .channel('admin_users_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_profiles' }, debouncedFetch)
      .subscribe();
    return () => { clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [activeTab]);

  const fetchServices = async () => {
    setServicesLoading(true);
    const data = await getAllServices();
    setRealServices(data);
    setServicesLoading(false);
  };

  const openServiceModal = (service = null) => {
    setServiceError(null);
    setServiceImgFile(null);
    if (service) {
      setEditingService(service);
      setServiceForm({ name: service.name, icon: service.icon || 'Sparkles', color: service.color || '#3b82f6', description: service.description || '', isActive: service.isActive, imgUrl: service.imgUrl || '' });
      setServiceImgPreview(service.imgUrl || null);
    } else {
      setEditingService(null);
      setServiceForm({ name: '', icon: 'Sparkles', color: '#3b82f6', description: '', isActive: true, imgUrl: '' });
      setServiceImgPreview(null);
    }
    setServiceImgFile(null);
    setShowServiceModal(true);
  };

  const handleServiceImgPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setServiceImgFile(file);
    setServiceImgPreview(URL.createObjectURL(file));
  };

  const handleServiceSave = async () => {
    if (!serviceForm.name.trim()) return;
    setServiceError(null);
    setServiceSaving(true);
    let finalImgUrl = null;
    if (serviceImgFile) {
      setServiceImgUploading(true);
      const upRes = await uploadServiceImage(serviceImgFile);
      setServiceImgUploading(false);
      if (upRes.success) { finalImgUrl = upRes.url; }
      else { setServiceError('Image upload failed: ' + upRes.message); setServiceSaving(false); return; }
    }
    const payload = {
      name: serviceForm.name.trim(),
      slug: generateSlug(serviceForm.name),
      icon: serviceForm.icon,
      color: serviceForm.color,
      description: serviceForm.description.trim(),
      isActive: serviceForm.isActive,
    };
    if (finalImgUrl) payload.imgUrl = finalImgUrl;
    const res = editingService ? await updateService(editingService.id, payload) : await createService(payload);
    setServiceSaving(false);
    if (res.success) {
      setShowServiceModal(false);
      setServiceImgFile(null);
      setServiceImgPreview(null);
      setServiceError(null);
      fetchServices();
    } else {
      console.error('Service save error:', res.message);
      setServiceError(res.message);
    }
  };

  const handleDeleteService = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const res = await deleteService(s.id);
    if (res.success) setRealServices(prev => prev.filter(x => x.id !== s.id));
  };

  const handleToggleActive = async (s) => {
    const res = await updateService(s.id, { isActive: !s.isActive });
    if (res.success) {
      setRealServices(prev => prev.map(x => x.id === s.id ? { ...x, isActive: !x.isActive } : x));
    }
  };

  const addToFeatured = (s) => {
    const already = (cmsData.servicesCMS.servicesList || []).some(x => x.id === s.id);
    if (already) return;
    const entry = {
      id: s.id,
      name: s.name,
      desc: s.description || '',
      iconName: s.icon || 'Sparkles',
      color: s.color || '#3b82f6',
      img: s.imgUrl || ''
    };
    setCmsData(prev => ({
      ...prev,
      servicesCMS: { ...prev.servicesCMS, servicesList: [...(prev.servicesCMS.servicesList || []), entry] }
    }));
  };

  const removeFromFeatured = (id) => {
    setCmsData(prev => ({
      ...prev,
      servicesCMS: { ...prev.servicesCMS, servicesList: (prev.servicesCMS.servicesList || []).filter(x => x.id !== id) }
    }));
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name || '', phone: u.phone || '', role: u.role || 'user', address: u.address || '', isVerified: u.isVerified });
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    const res = await adminUpdateUser(editingUser._id || editingUser.id, editForm);
    setEditSaving(false);
    if (res.success) {
      setRealUsers(prev => prev.map(u => (u._id || u.id) === (editingUser._id || editingUser.id) ? { ...u, ...editForm } : u));
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
    const res = await deleteUser(u._id || u.id);
    if (res.success) {
      setRealUsers(prev => prev.filter(x => (x._id || x.id) !== (u._id || u.id)));
    } else {
      alert(`Delete failed: ${res.message || 'Unknown error'}`);
    }
  };

  const openUserDetail = async (u) => {
    setProviderProfile(null);
    setViewingUser(u);
    if (u.role === 'provider') {
      setProviderLoading(true);
      const { data } = await supabase.from('provider_profiles').select('*').eq('id', u._id || u.id).maybeSingle();
      setProviderProfile(data || null);
      setProviderLoading(false);
    }
  };

  const handleApproveProvider = async (u) => {
    const uid = u._id || u.id;
    const { error } = await supabase.rpc('admin_approve_provider', { user_id: uid });
    if (error) {
      alert('Approval failed: ' + error.message);
      return;
    }
    setRealUsers(prev => prev.map(x => (x._id || x.id) === uid ? { ...x, isVerified: true } : x));
    if (viewingUser) setViewingUser(prev => ({ ...prev, isVerified: true }));
    alert('Provider approved! They can now login.');
  };

  // admin_reject_provider now logs the full application (name/CNIC/KYC docs/
  // reason) into rejected_applications, then deletes the account outright —
  // Supabase won't let the same email sign up again while the old auth.users
  // row still exists, so a "keep account, just flag it" reject can't support
  // re-registration. The provider's own app detects the deleted account and
  // sends them back to a blank registration form automatically.
  const handleRejectProvider = (u) => {
    setRejectingUser(u);
    setRejectReasonInput('');
  };

  const confirmRejectProvider = async () => {
    if (!rejectReasonInput.trim()) { alert('Please provide a reason.'); return; }
    const uid = rejectingUser._id || rejectingUser.id;
    setRejectSubmitting(true);
    const { error } = await supabase.rpc('admin_reject_provider', { user_id: uid, reason: rejectReasonInput.trim() });
    setRejectSubmitting(false);
    if (error) {
      alert('Rejection failed: ' + error.message);
      return;
    }
    setRealUsers(prev => prev.filter(x => (x._id || x.id) !== uid));
    setViewingUser(null);
    setRejectingUser(null);
    alert('Provider rejected. Account deleted and logged — they can register again with the same email.');
  };

  // Audit trail of deleted/rejected applications — the account itself is
  // gone (see admin_reject_provider), so this table is the only remaining
  // record of who applied, what they submitted, and why they were rejected.
  const fetchRejectedApplications = async () => {
    setRejectedLoading(true);
    const { data, error } = await supabase.from('rejected_applications').select('*').order('rejected_at', { ascending: false });
    if (!error) setRejectedApplications(data || []);
    setRejectedLoading(false);
  };

  const handleDeleteRejectedLog = async (id) => {
    if (!window.confirm('Permanently delete this log entry?')) return;
    const { error } = await supabase.from('rejected_applications').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setRejectedApplications(prev => prev.filter(r => r.id !== id));
    setViewingRejected(null);
  };

  // Contact & Support inbox — messages from the web Contact page and the
  // Flutter app's Contact Us screen both write into contact_messages.
  const fetchContactMessages = async () => {
    setContactLoading(true);
    const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (!error) setContactMessages(data || []);
    setContactLoading(false);
  };

  const handleMarkContactResolved = async (id, status) => {
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    if (viewingContact?.id === id) setViewingContact(prev => ({ ...prev, status }));
  };

  const handleDeleteContactMessage = async (id) => {
    if (!window.confirm('Permanently delete this message?')) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setContactMessages(prev => prev.filter(m => m.id !== id));
    setViewingContact(null);
  };

  useEffect(() => {
    if (activeTab !== 'contact') return;
    fetchContactMessages();
    const channel = supabase
      .channel('admin_contact_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => fetchContactMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  const fetchLocations = async () => {
    const data = await getLocations();
    setLocations(data);
  };

  const fetchCMS = async () => {
    try {
      const data = await getSiteSettings();
      console.log("Fetched CMS Data:", data);
      if (data) {
        setCmsData(prev => ({
          homeCMS: { ...prev.homeCMS, ...(data.homeCMS || {}) },
          servicesCMS: { ...prev.servicesCMS, ...(data.servicesCMS || {}) },
          aboutUsCMS: { ...prev.aboutUsCMS, ...(data.aboutUsCMS || {}) },
          contactUsCMS: { ...prev.contactUsCMS, ...(data.contactUsCMS || {}) },
          footerCMS: { ...prev.footerCMS, ...(data.footerCMS || {}) }
        }));
      }
    } catch (err) {
      console.error("Error in fetchCMS:", err);
    }
  };

  const handleCMSChange = (section, e) => {
    const { name, value } = e.target;
    setCmsData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value
      }
    }));
  };

  const handleSaveCMS = async () => {
    setIsSaving(true);
    const sanitizedData = {
      homeCMS:      { ...cmsData.homeCMS },
      servicesCMS:  { ...cmsData.servicesCMS, servicesList: [...(cmsData.servicesCMS.servicesList || [])] },
      aboutUsCMS:   { ...cmsData.aboutUsCMS },
      contactUsCMS: {
        ...cmsData.contactUsCMS,
        formSubjects: (cmsData.contactUsCMS.formSubjects || [])
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(s => s !== '')
      },
      footerCMS: { ...cmsData.footerCMS },
    };
    const res = await updateSiteSettings(sanitizedData);
    setIsSaving(false);
    if (res.success) {
      alert('✅ Changes published successfully! Frontend pages will update automatically.');
      fetchCMS();
    } else {
      console.error('CMS save error:', res.message);
      alert('❌ Save failed: ' + res.message);
    }
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    const res = await addCity(newCityName.trim());
    if (res.success) {
      setNewCityName('');
      fetchLocations();
    } else {
      alert(res.message);
    }
  };

  const handleDeleteCity = async (id) => {
    if (window.confirm("Are you sure you want to delete this city and all its areas?")) {
      const res = await deleteCity(id);
      if (res.success) fetchLocations();
    }
  };

  const handleAddArea = async (cityId) => {
    const area = newAreaNames[cityId];
    if (!area || !area.trim()) return;
    const res = await addArea(cityId, area.trim());
    if (res.success) {
      setNewAreaNames({ ...newAreaNames, [cityId]: '' });
      fetchLocations();
    } else {
      alert(res.message);
    }
  };

  const handleRemoveArea = async (cityId, areaName) => {
    if (window.confirm(`Remove area "${areaName}"?`)) {
      const res = await removeArea(cityId, areaName);
      if (res.success) fetchLocations();
    }
  };

  React.useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      if (w <= 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [realBookings, setRealBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [viewingBooking, setViewingBooking] = useState(null);

  const completedBookings = realBookings.filter(b => b.status === 'completed');
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const stats = useMemo(() => [
    { title: 'Total Revenue', value: `Rs ${totalRevenue.toLocaleString()}`, icon: <DollarSign />, color: '#10b981', trend: `${completedBookings.length} completed jobs` },
    { title: 'Active Services', value: realServices.filter(s => s.isActive).length || '—', icon: <Briefcase />, color: '#3b82f6', trend: `${realServices.length} total` },
    { title: 'Total Users', value: realUsers.length || '—', icon: <Users />, color: '#8b5cf6', trend: `${realUsers.filter(u => u.role === 'user').length} customers` },
    { title: 'Completed Bookings', value: completedBookings.length || '—', icon: <CheckCircle />, color: '#f59e0b', trend: `${realBookings.length} total requests` },
  ], [totalRevenue, completedBookings.length, realServices, realUsers, realBookings.length]);

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // Built from real rows across users/bookings/services instead of static
  // placeholder entries, so it reflects what's actually happened recently.
  const recentActivity = useMemo(() => [
    ...realUsers.filter(u => u.role === 'provider').map(u => ({
      id: `user-${u.id}`, action: 'New Provider Registered', detail: `${u.name}${providerServiceMap[u.id] ? ` (${providerServiceMap[u.id]})` : ''}`,
      time: u.createdAt, type: 'user',
    })),
    ...completedBookings.map(b => ({
      id: `booking-${b.id}`, action: 'Booking Completed', detail: `${b.service_name}${b.providerName ? ` by ${b.providerName}` : ''}`,
      time: b.created_at, type: 'booking',
    })),
    ...realServices.map(s => ({
      id: `service-${s.id}`, action: 'Service Added', detail: s.name, time: s.createdAt, type: 'service',
    })),
  ]
    .filter(item => item.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 4)
    .map(item => ({ ...item, time: timeAgo(item.time) })), [realUsers, providerServiceMap, completedBookings, realServices]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const { data: requests, error } = await supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !requests) { setRealBookings([]); setBookingsLoading(false); return; }

      const ids = requests.map(r => r.id);
      let bidMap = {};
      if (ids.length > 0) {
        const { data: bids } = await supabase
          .from('bids')
          .select('request_id, provider_name, price')
          .in('request_id', ids)
          .eq('status', 'accepted');
        (bids || []).forEach(b => { bidMap[b.request_id] = b; });
      }

      // provider_profiles has the provider's registered location — the
      // request row only ever carries provider_lat/provider_lng from LIVE
      // tracking during an active job (null otherwise), so the detail modal
      // needs this join to reliably show "where the provider is based".
      const providerIds = [...new Set(requests.map(r => r.accepted_provider_id).filter(Boolean))];
      let providerLocMap = {};
      if (providerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('provider_profiles')
          .select('id, latitude, longitude')
          .in('id', providerIds);
        (profiles || []).forEach(p => { providerLocMap[p.id] = p; });
      }

      setRealBookings(requests.map(r => ({
        ...r,
        providerName: bidMap[r.id]?.provider_name || null,
        amount: bidMap[r.id]?.price || null,
        providerLat: providerLocMap[r.accepted_provider_id]?.latitude ?? null,
        providerLng: providerLocMap[r.accepted_provider_id]?.longitude ?? null,
      })));
    } catch (e) {
      console.error('fetchBookings error:', e);
      setRealBookings([]);
    }
    setBookingsLoading(false);
  };

  const formatBookingStatus = (s) => {
    if (!s) return 'Pending';
    const map = { pending: 'Pending', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
    return map[s.toLowerCase()] || s;
  };


  // --- REUSABLE COMPONENTS ---
  const SidebarItem = ({ id, icon, label }) => (
    <motion.div
      whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)' }}
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.5rem',
        cursor: 'pointer',
        borderRadius: '12px',
        color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)',
        background: activeTab === id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        fontWeight: activeTab === id ? '800' : '600',
        transition: 'all 0.3s ease',
        marginBottom: '0.5rem',
        borderLeft: activeTab === id ? '3px solid var(--primary)' : '3px solid transparent'
      }}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span>{label}</span>
    </motion.div>
  );

  const StatusBadge = ({ status }) => {
    let color = '#3b82f6';
    let bg = 'rgba(59, 130, 246, 0.1)';
    if (status === 'Completed' || status === 'Verified') { color = '#10b981'; bg = 'rgba(16, 185, 129, 0.1)'; }
    if (status === 'Pending' || status === 'In Progress') { color = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.1)'; }
    if (status === 'Cancelled' || status === 'Banned' || status === 'Rejected') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }

    return (
      <span style={{ 
        padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', 
        fontWeight: '800', color, background: bg, display: 'inline-flex', alignItems: 'center', gap: '6px'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        {status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: 'white' }}>
      
      {/* SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? '280px' : '0px' }}
        style={{
          background: '#0a0a0a',
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1100,
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          boxShadow: isSidebarOpen ? '20px 0 60px rgba(0,0,0,0.8)' : 'none'
        }}
      >
        <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Shield size={24} color="var(--primary)" strokeWidth={3} />
          </div>
          <div>
             <h2 style={{ fontSize: '1.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.5px', margin: 0 }}>
               Service<span style={{ color: 'var(--primary)' }}>Hive</span>
             </h2>
             <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>Command Center</span>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Core Modules</p>
          <SidebarItem id="overview" icon={<Activity />} label="Dashboard" />
          <SidebarItem id="users" icon={<Users />} label="Users & Providers" />
          <SidebarItem id="services" icon={<Briefcase />} label="Services Hub" />
          <SidebarItem id="bookings" icon={<Calendar />} label="Booking Engine" />
          <SidebarItem id="locations" icon={<MapPin />} label="Cities & Areas" />
          <SidebarItem id="contact" icon={<Headphones />} label="Contact & Support" />
          <SidebarItem id="insights" icon={<Sparkles />} label="AI Insights" />

          <div style={{ margin: '2rem 0', height: '1px', background: 'var(--border)' }} />
          
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>System Config</p>
          <SidebarItem id="site" icon={<Globe />} label="Frontend CMS" />
          <SidebarItem id="settings" icon={<Settings />} label="Global Settings" />
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>AD</div>
             <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800' }}>Super Admin</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>admin@servicehive</p>
             </div>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/'); }}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
              marginBottom: '0.8rem'
            }}
          >
            <Globe size={16} /> RETURN TO SITE
          </button>
          <button
            onClick={async () => { await logout(); navigate('/admin-login'); }}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <LogOut size={16} /> SECURE LOGOUT
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div style={{
        marginLeft: (isSidebarOpen && windowWidth > 1024) ? '280px' : '0px',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          padding: windowWidth < 480 ? '1.2rem 1rem' : windowWidth < 640 ? '1.5rem 1.5rem' : '2rem 2.5rem',
          boxSizing: 'border-box',
        }}>
        {/* Mobile Overlay */}
        {isSidebarOpen && windowWidth <= 1024 && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1050, backdropFilter: 'blur(4px)' }} 
          />
        )}
        
        {/* TOP HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: windowWidth < 640 ? '1.5rem' : '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', cursor: 'pointer', display: windowWidth > 1024 ? 'none' : 'block' }}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={20} />
            </div>
            <div>
               <h1 style={{ fontSize: windowWidth < 480 ? '1.2rem' : windowWidth < 640 ? '1.5rem' : '2rem', fontWeight: '900', letterSpacing: '-0.5px', textTransform: 'capitalize', margin: 0 }}>
                 {activeTab === 'overview' ? 'Command Center' : activeTab.replace('-', ' ')}
               </h1>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                 Manage, analyze, and configure your entire platform.
               </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div className="desktop-only" style={{ background: 'var(--surface)', padding: '0.8rem 1.2rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.8rem', border: '1px solid var(--border)', width: 'clamp(200px, 25vw, 300px)' }}>
                <Search size={18} color="var(--text-muted)" />
                <input placeholder="Search users, bookings, services..." style={{ background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.9rem', width: '100%' }} />
             </div>
             <motion.div
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setShowNotifications(true)}
               style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
             >
                <Bell size={20} color="var(--text-muted)" />
                {unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: '10px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', border: '2px solid var(--surface)' }} />
                )}
             </motion.div>
          </div>
        </header>

        <AnimatePresence>
          {showNotifications && (
            <NotificationsModal userId={user?.id} onClose={() => setShowNotifications(false)} />
          )}
        </AnimatePresence>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          
          {/* ===================== OVERVIEW TAB ===================== */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : 'repeat(2, 1fr)', gap: windowWidth < 640 ? '1rem' : '1.5rem', marginBottom: '2.5rem' }}>
                {stats.map((s, i) => (
                  <div key={i} className="card" style={{ padding: '1.8rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.05, transform: 'scale(2.5)' }}>{s.icon}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: 8 }}>
                       <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {s.icon}
                       </div>
                       <span style={{ fontSize: '0.8rem', fontWeight: '800', color: s.color, background: `${s.color}15`, padding: '4px 10px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.trend}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '700' }}>{s.title}</p>
                    <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: '900', letterSpacing: '-1px', wordBreak: 'break-word' }}>{s.value}</h2>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 1200 ? '1fr' : '2fr 1fr', gap: '2rem' }}>
                 
                 {/* Main Chart Area (Mocked visually) */}
                 <div className="card" style={{ borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="flex-between" style={{ marginBottom: '2rem' }}>
                       <div>
                          <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>Revenue Analytics</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Monthly platform earnings breakdown</p>
                       </div>
                       <select className="input-minimal" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                          <option>Last 6 Months</option>
                          <option>This Year</option>
                       </select>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2%', minHeight: '250px', paddingTop: '2rem', borderBottom: '1px solid var(--border)' }}>
                       {/* Mock Bars */}
                       {[40, 65, 45, 80, 55, 95].map((height, i) => (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                             <motion.div 
                               initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                               style={{ width: '100%', maxWidth: '50px', background: i === 5 ? 'var(--primary)' : 'rgba(59, 130, 246, 0.2)', borderRadius: '8px 8px 0 0', position: 'relative' }}
                             >
                               {i === 5 && <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: 'white', color: 'black', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>RS 340k</div>}
                             </motion.div>
                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Activity Feed */}
                 <div className="card" style={{ borderRadius: '24px', padding: '2rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Live Activity</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Real-time platform events</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                       {recentActivity.map((item, i) => (
                          <div key={item.id} style={{ display: 'flex', gap: '1rem' }}>
                             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {item.type === 'user' && <Users size={16} color="#8b5cf6" />}
                                {item.type === 'booking' && <CheckCircle size={16} color="#10b981" />}
                                {item.type === 'system' && <Settings size={16} color="#f59e0b" />}
                                {item.type === 'service' && <Briefcase size={16} color="#3b82f6" />}
                             </div>
                             <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', margin: '0 0 0.2rem 0' }}>{item.action}</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, overflowWrap: 'break-word' }}>{item.detail}</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '700', marginTop: '0.3rem', display: 'block' }}>{item.time}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                    <button style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer' }}>View All Logs</button>
                 </div>

              </div>
            </motion.div>
          )}

          {/* ===================== USERS TAB ===================== */}
          {activeTab === 'users' && (
             <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                   <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '100px', flexWrap: 'wrap' }}>
                      {['Customers', 'Providers', 'Admins'].map(f => (
                         <button 
                           key={f}
                           onClick={() => setUserFilter(f)}
                           style={{ 
                             padding: '0.6rem 1.5rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', border: 'none',
                             background: userFilter === f ? 'var(--primary)' : 'transparent',
                             color: userFilter === f ? 'white' : 'var(--text-muted)',
                             transition: 'all 0.3s'
                           }}
                         >{f}</button>
                      ))}
                   </div>
                   {/* Search */}
                   <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.6rem 1rem', borderRadius: '100px', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', minWidth: '220px' }}>
                      <Search size={16} color="var(--text-muted)" />
                      <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '100%' }} />
                   </div>
                </div>

                {usersError && (
                  <div style={{ padding: '0.9rem 1.2rem', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1.2rem' }}>
                    Failed to load users: {usersError}
                  </div>
                )}

                {/* Users Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
                   <div style={{ overflowX: 'auto' }}>
                      {usersLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
                      ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                       <thead>
                          <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>User</th>
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</th>
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                             {userFilter === 'Providers' && (<>
                               <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Service</th>
                               <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Availability</th>
                             </>)}
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Location</th>
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Joined</th>
                             <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
                          </tr>
                       </thead>
                       <tbody>
                          {realUsers
                            .filter(u => {
                              const roleMatch =
                                (userFilter === 'Customers' && u.role === 'user') ||
                                (userFilter === 'Providers' && u.role === 'provider') ||
                                (userFilter === 'Admins' && u.role === 'admin');
                              const search = userSearch.toLowerCase();
                              const searchMatch = !search || u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search) || u.phone?.includes(search);
                              return roleMatch && searchMatch;
                            })
                            .map((u) => {
                             const isProviderOnline = providerOnlineMap[u.id] === true;
                             const providerService = providerServiceMap[u.id] || null;
                             return (
                             <tr key={u._id || u.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                      <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: u.avatarUrl ? `url(${u.avatarUrl}) center/cover` : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem' }}>
                                           {!u.avatarUrl && (u.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        {u.role === 'provider' && (
                                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '11px', height: '11px', borderRadius: '50%', background: isProviderOnline ? '#10b981' : '#6b7280', border: '2px solid #0a0a0a' }} />
                                        )}
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                         <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{u.name}</div>
                                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{u.email}</div>
                                         {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.phone}</div>}
                                      </div>
                                   </div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                   <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '100px', background: u.role === 'admin' ? 'rgba(245,158,11,0.1)' : u.role === 'provider' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)', fontWeight: '800', color: u.role === 'admin' ? '#f59e0b' : u.role === 'provider' ? '#3b82f6' : 'white', textTransform: 'capitalize' }}>
                                     {u.role === 'user' ? 'Customer' : u.role}
                                   </span>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                   <StatusBadge status={u.isVerified ? 'Verified' : 'Pending'} />
                                </td>
                                {userFilter === 'Providers' && (<>
                                  <td style={{ padding: '1.2rem 1.5rem' }}>
                                    {providerService
                                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', textTransform: 'capitalize' }}>
                                          <Wrench size={11} />
                                          {providerService}
                                        </span>
                                      : <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>
                                    }
                                  </td>
                                  <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', background: isProviderOnline ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: isProviderOnline ? '#10b981' : '#6b7280' }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isProviderOnline ? '#10b981' : '#6b7280' }} />
                                      {isProviderOnline ? 'Online' : 'Offline'}
                                    </span>
                                  </td>
                                </>)}
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                   {u.latitude && u.longitude ? (() => {
                                     const mins = u.locationUpdatedAt ? Math.floor((Date.now() - new Date(u.locationUpdatedAt)) / 60000) : null;
                                     const isLive = mins !== null && mins < 2;
                                     const label = mins === null ? 'Last known' : isLive ? 'Live' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                                     return (
                                       <motion.button whileHover={{ scale: 1.05 }} onClick={() => setViewingLocationUser(u)}
                                         style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '800', background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: isLive ? '#10b981' : '#6b7280', border: 'none', cursor: 'pointer' }}>
                                         <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#10b981' : '#6b7280', flexShrink: 0 }} />
                                         {label}
                                       </motion.button>
                                     );
                                   })() : <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>}
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                   {u.createdAt ? new Date(u.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <motion.button whileHover={{ scale: 1.1 }} onClick={() => openUserDetail(u)} style={{ background: 'rgba(59,130,246,0.1)', padding: '8px', borderRadius: '10px', cursor: 'pointer', border: 'none', color: '#3b82f6' }} title="View Details"><ChevronRight size={15} /></motion.button>
                                      {u.role === 'provider' && !u.isVerified && (
                                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleApproveProvider(u)} style={{ background: 'rgba(16,185,129,0.1)', padding: '8px', borderRadius: '10px', cursor: 'pointer', border: 'none', color: '#10b981' }} title="Approve Provider"><CheckCircle size={15} /></motion.button>
                                      )}
                                      <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDeleteUser(u)} style={{ background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '10px', cursor: 'pointer', border: 'none', color: '#ef4444' }} title="Delete"><Trash2 size={15} /></motion.button>
                                   </div>
                                </td>
                             </tr>
                             );
                            })}
                          {realUsers.length === 0 && !usersLoading && (
                            <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found in database.</td></tr>
                          )}
                       </tbody>
                    </table>
                    )}
                   </div>
                </div>

                {/* Total count + Rejected Applications entry point */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                  {userFilter === 'Providers' && (
                    <button
                      onClick={() => { setShowRejectedLog(true); fetchRejectedApplications(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', borderRadius: '100px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} /> Rejected Applications
                    </button>
                  )}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    {userFilter === 'Customers' && (
                      <span><span style={{ color: 'white', fontWeight: '900' }}>{realUsers.filter(u => u.role === 'user').length}</span> Total Customers</span>
                    )}
                    {userFilter === 'Providers' && (
                      <span><span style={{ color: '#3b82f6', fontWeight: '900' }}>{realUsers.filter(u => u.role === 'provider').length}</span> Total Providers</span>
                    )}
                    {userFilter === 'Admins' && (
                      <span><span style={{ color: '#f59e0b', fontWeight: '900' }}>{realUsers.filter(u => u.role === 'admin').length}</span> Total Admins</span>
                    )}
                  </div>
                </div>
             </motion.div>
          )}

          {/* ── EDIT USER MODAL ────────────────────────────────── */}
          <AnimatePresence>
            {editingUser && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingUser(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '440px', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
                    <div>
                      <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>Edit User</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{editingUser.email}</p>
                    </div>
                    <button onClick={() => setEditingUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Full Name</label>
                      <input className="input-minimal" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Phone</label>
                      <input className="input-minimal" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="03XXXXXXXXX" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Role</label>
                      <select className="input-minimal" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        <option value="user">Customer</option>
                        <option value="provider">Provider</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Address</label>
                      <input className="input-minimal" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" id="isVerified" checked={editForm.isVerified} onChange={e => setEditForm(f => ({ ...f, isVerified: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <label htmlFor="isVerified" style={{ fontWeight: '700', cursor: 'pointer' }}>Email Verified</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.8rem' }}>
                    <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '1rem', borderRadius: '100px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                    <motion.button whileHover={{ scale: 1.02 }} onClick={handleEditSave} disabled={editSaving} style={{ flex: 2, padding: '1rem', borderRadius: '100px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── VIEW USER MODAL ────────────────────────────────── */}
          <AnimatePresence>
            {viewingUser && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingUser(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '480px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>{viewingUser.role === 'provider' ? 'Provider Details' : 'User Details'}</h3>
                    <button onClick={() => setViewingUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                  </div>

                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.8rem', padding: '1.2rem', background: viewingUser.role === 'provider' ? 'rgba(16,185,129,0.06)' : 'rgba(59,130,246,0.06)', borderRadius: '16px', border: `1px solid ${viewingUser.role === 'provider' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)'}` }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: viewingUser.avatarUrl ? `url(${viewingUser.avatarUrl}) center/cover` : (viewingUser.role === 'provider' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.3rem', flexShrink: 0 }}>
                      {!viewingUser.avatarUrl && (viewingUser.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>{viewingUser.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{viewingUser.email}</div>
                      {viewingUser.role === 'provider' && providerProfile?.is_online !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: providerProfile.is_online ? '#10b981' : '#6b7280' }} />
                          <span style={{ fontSize: '0.72rem', color: providerProfile.is_online ? '#10b981' : 'var(--text-dim)', fontWeight: '700' }}>{providerProfile.is_online ? 'Online' : 'Offline'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Basic Info ── */}
                  {[
                    { label: 'Role', value: viewingUser.role === 'user' ? 'Customer' : viewingUser.role, cap: true },
                    { label: 'Email', value: viewingUser.email || 'Not set' },
                    { label: 'Phone', value: viewingUser.phone || 'Not set' },
                    { label: 'City', value: viewingUser.city || 'Not set' },
                    { label: 'Area', value: viewingUser.area || 'Not set' },
                    { label: 'Address', value: viewingUser.address || 'Not set' },
                    { label: 'Status', value: viewingUser.isVerified ? '✓ Verified' : '⏳ Pending Approval' },
                    { label: 'Joined', value: viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                  ].map(({ label, value, cap }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700' }}>{label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: cap ? 'capitalize' : 'none', color: label === 'Status' ? (viewingUser.isVerified ? '#10b981' : '#f59e0b') : 'inherit' }}>{value}</span>
                    </div>
                  ))}

                  {/* ── Provider Profile Section ── */}
                  {viewingUser.role === 'provider' && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '2px solid rgba(16,185,129,0.25)' }}>
                        <Briefcase size={16} color="#10b981" />
                        <span style={{ fontWeight: '900', fontSize: '0.9rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provider Profile</span>
                      </div>

                      {providerLoading ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading profile...</div>
                      ) : !providerProfile ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic' }}>No provider profile found.</div>
                      ) : (
                        <>
                          {/* Stats Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
                            {[
                              { label: 'Rating', value: providerProfile.rating != null ? `${Number(providerProfile.rating).toFixed(1)} ★` : '—', color: '#f59e0b' },
                              { label: 'Jobs Done', value: providerProfile.total_jobs ?? '0', color: '#3b82f6' },
                              { label: 'Rate/hr', value: providerProfile.rate_per_hour ? `Rs ${providerProfile.rate_per_hour}` : '—', color: '#8b5cf6' },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.8rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: '900', color }}>{value}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '700', marginTop: '2px' }}>{label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Field List */}
                          {[
                            { label: 'Service Type', value: providerProfile.service_type || '—', cap: true },
                            { label: 'CNIC', value: providerProfile.cnic || '—' },
                            { label: 'Experience', value: providerProfile.experience || '—' },
                            { label: 'Skills', value: Array.isArray(providerProfile.skills) && providerProfile.skills.length ? providerProfile.skills.join(', ') : (typeof providerProfile.skills === 'string' && providerProfile.skills ? providerProfile.skills : '—') },
                          ].map(({ label, value, cap }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', flexShrink: 0 }}>{label}</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: cap ? 'capitalize' : 'none', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                            </div>
                          ))}

                          {/* About */}
                          {providerProfile.about && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>About</div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0 }}>{providerProfile.about}</p>
                            </div>
                          )}

                          {/* KYC Documents — must be visible before approving, otherwise
                              approval happens blind without ever seeing the actual ID/selfie. */}
                          <div style={{ marginTop: '1.2rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>KYC Documents</div>
                            {[
                              { label: 'CNIC Front', url: providerProfile.cnic_front_url },
                              { label: 'CNIC Back', url: providerProfile.cnic_back_url },
                              { label: 'Selfie with ID', url: providerProfile.selfie_url },
                              { label: 'Work Portfolio', url: providerProfile.portfolio_url },
                              { label: 'Certificates', url: providerProfile.certificates_url },
                            ].every(d => !d.url) ? (
                              <div style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '700' }}>
                                No KYC documents were uploaded — do not approve without verifying identity another way.
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.7rem' }}>
                                {[
                                  { label: 'CNIC Front', url: providerProfile.cnic_front_url },
                                  { label: 'CNIC Back', url: providerProfile.cnic_back_url },
                                  { label: 'Selfie with ID', url: providerProfile.selfie_url },
                                  { label: 'Work Portfolio', url: providerProfile.portfolio_url },
                                  { label: 'Certificates', url: providerProfile.certificates_url },
                                ].map(({ label, url }) => (
                                  <a
                                    key={label}
                                    href={url || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex', flexDirection: 'column', gap: '0.4rem',
                                      borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)',
                                      background: 'rgba(255,255,255,0.02)', textDecoration: 'none',
                                      pointerEvents: url ? 'auto' : 'none', opacity: url ? 1 : 0.4,
                                    }}
                                  >
                                    {url ? (
                                      <img src={url} alt={label} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                      <div style={{ width: '100%', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.7rem' }}>Not uploaded</div>
                                    )}
                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', padding: '0 0.6rem 0.6rem' }}>{label}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Action Buttons ── */}
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {viewingUser.role === 'provider' && !viewingUser.isVerified && (<>
                      <button
                        onClick={() => handleApproveProvider(viewingUser)}
                        style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> APPROVE PROVIDER
                      </button>
                      <button
                        onClick={() => handleRejectProvider(viewingUser)}
                        style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <X size={16} /> REJECT (delete account, they re-register)
                      </button>
                    </>)}
                    <button onClick={() => { handleDeleteUser(viewingUser); setViewingUser(null); }} style={{ width: '100%', padding: '0.9rem', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}>Delete User</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {viewingLocationUser && (
              <UserLocationModal user={viewingLocationUser} onClose={() => setViewingLocationUser(null)} />
            )}
          </AnimatePresence>

          {/* ── REJECTED APPLICATIONS LOG ─────────────────────────── */}
          <AnimatePresence>
            {showRejectedLog && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowRejectedLog(false); setViewingRejected(null); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: viewingRejected ? '480px' : '760px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>
                      {viewingRejected ? 'Rejected Application' : 'Rejected Applications'}
                    </h3>
                    <button
                      onClick={() => viewingRejected ? setViewingRejected(null) : (() => { setShowRejectedLog(false); setViewingRejected(null); })()}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                    ><X size={18} /></button>
                  </div>

                  {viewingRejected ? (
                    <>
                      <div style={{ padding: '0.9rem 1.1rem', borderRadius: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1.2rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Rejection Reason</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{viewingRejected.rejection_reason}</div>
                      </div>

                      {[
                        { label: 'Name', value: viewingRejected.name || '—' },
                        { label: 'Email', value: viewingRejected.email || '—' },
                        { label: 'Phone', value: viewingRejected.phone || '—' },
                        { label: 'City', value: viewingRejected.city || '—' },
                        { label: 'Area', value: viewingRejected.area || '—' },
                        { label: 'Address', value: viewingRejected.address || '—' },
                        { label: 'CNIC', value: viewingRejected.cnic || '—' },
                        { label: 'Service Type', value: viewingRejected.service_type || '—', cap: true },
                        { label: 'Experience', value: viewingRejected.experience || '—' },
                        { label: 'Skills', value: Array.isArray(viewingRejected.skills) && viewingRejected.skills.length ? viewingRejected.skills.join(', ') : '—' },
                        { label: 'Rejected At', value: viewingRejected.rejected_at ? new Date(viewingRejected.rejected_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                      ].map(({ label, value, cap }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', flexShrink: 0 }}>{label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: cap ? 'capitalize' : 'none', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                        </div>
                      ))}

                      {(viewingRejected.cnic_front_url || viewingRejected.cnic_back_url || viewingRejected.selfie_url || viewingRejected.portfolio_url || viewingRejected.certificates_url) && (
                        <div style={{ marginTop: '1.2rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>KYC Documents</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.7rem' }}>
                            {[
                              { label: 'CNIC Front', url: viewingRejected.cnic_front_url },
                              { label: 'CNIC Back', url: viewingRejected.cnic_back_url },
                              { label: 'Selfie', url: viewingRejected.selfie_url },
                              { label: 'Portfolio', url: viewingRejected.portfolio_url },
                              { label: 'Certificates', url: viewingRejected.certificates_url },
                            ].filter(d => d.url).map(d => (
                              <a key={d.label} href={d.url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <img src={d.url} alt={d.label} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                                <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>{d.label}</div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleDeleteRejectedLog(viewingRejected.id)}
                        style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}
                      >Delete Log Entry</button>
                    </>
                  ) : rejectedLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
                  ) : rejectedApplications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No rejected applications on record.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {rejectedApplications.map(r => (
                        <div key={r.id} onClick={() => setViewingRejected(r)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                            {(r.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{r.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</div>
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rejection_reason}</div>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                            {r.rejected_at ? new Date(r.rejected_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : ''}
                          </div>
                          <ChevronRight size={16} color="var(--text-dim)" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── CONTACT MESSAGE DETAIL MODAL ─────────────────────────── */}
          <AnimatePresence>
            {viewingContact && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingContact(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '480px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>Message Details</h3>
                    <button onClick={() => setViewingContact(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                    {viewingContact.sender_role && (
                      <span style={{
                        padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'capitalize',
                        background: viewingContact.sender_role === 'provider' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: viewingContact.sender_role === 'provider' ? '#10b981' : 'var(--primary)',
                      }}>
                        {viewingContact.sender_role}
                      </span>
                    )}
                    {viewingContact.sender_specialization && (
                      <span style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                        {viewingContact.sender_specialization}
                      </span>
                    )}
                    {!viewingContact.sender_role && (
                      <span style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                        Guest (not logged in)
                      </span>
                    )}
                    <StatusBadge status={viewingContact.status === 'resolved' ? 'Completed' : 'Pending'} />
                  </div>

                  {[
                    { label: 'Name', value: viewingContact.name || '—' },
                    { label: 'Email', value: viewingContact.email || '—' },
                    { label: 'Phone', value: viewingContact.phone || '—' },
                    { label: 'Subject', value: viewingContact.subject || '—' },
                    { label: 'Received', value: new Date(viewingContact.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{row.label}</span>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', textAlign: 'right' }}>{row.value}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Message</div>
                    <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                      {viewingContact.message}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.8rem' }}>
                    {viewingContact.status === 'resolved' ? (
                      <button onClick={() => handleMarkContactResolved(viewingContact.id, 'new')} style={{ flex: 1, padding: '0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>Mark as New</button>
                    ) : (
                      <button onClick={() => handleMarkContactResolved(viewingContact.id, 'resolved')} style={{ flex: 1, padding: '0.9rem', borderRadius: '100px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: '800', cursor: 'pointer' }}>Mark Resolved</button>
                    )}
                    <button onClick={() => handleDeleteContactMessage(viewingContact.id)} style={{ padding: '0.9rem 1.2rem', borderRadius: '100px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── REJECT PROVIDER MODAL ─────────────────────────────── */}
          <AnimatePresence>
            {rejectingUser && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !rejectSubmitting && setRejectingUser(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '440px', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.15rem' }}>Reject {rejectingUser.name}</h3>
                    <button onClick={() => !rejectSubmitting && setRejectingUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.2rem' }}>
                    Their account will be deleted and this reason logged. They'll see it on their app and can register again with the same email.
                  </p>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Reason for Rejection</label>
                  <textarea
                    autoFocus
                    value={rejectReasonInput}
                    onChange={e => setRejectReasonInput(e.target.value)}
                    placeholder="e.g. CNIC photo doesn't match selfie"
                    rows={4}
                    style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                      onClick={() => setRejectingUser(null)}
                      disabled={rejectSubmitting}
                      style={{ flex: 1, padding: '0.9rem', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontWeight: '800', cursor: rejectSubmitting ? 'not-allowed' : 'pointer' }}
                    >Cancel</button>
                    <button
                      onClick={confirmRejectProvider}
                      disabled={rejectSubmitting || !rejectReasonInput.trim()}
                      style={{ flex: 1, padding: '0.9rem', borderRadius: '100px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: '800', cursor: (rejectSubmitting || !rejectReasonInput.trim()) ? 'not-allowed' : 'pointer', opacity: (rejectSubmitting || !rejectReasonInput.trim()) ? 0.5 : 1 }}
                    >{rejectSubmitting ? 'Rejecting...' : 'Reject & Delete'}</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── SERVICE CREATE/EDIT MODAL ─────────────────────────── */}
          <AnimatePresence>
            {showServiceModal && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowServiceModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', width: '100%', maxWidth: '540px', zIndex: 1, maxHeight: '92vh', overflowY: 'auto' }}>

                  {/* Image Banner */}
                  <div style={{ height: '160px', position: 'relative', borderRadius: '28px 28px 0 0', overflow: 'hidden', background: serviceImgPreview ? 'transparent' : `linear-gradient(135deg, ${serviceForm.color}30, ${serviceForm.color}08)`, cursor: 'pointer' }} onClick={() => document.getElementById('svc-img-input').click()}>
                    {serviceImgPreview
                      ? <img src={serviceImgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <div style={{ color: serviceForm.color, opacity: 0.4, transform: 'scale(3.5)', marginBottom: '0.5rem' }}>{SERVICE_ICONS[serviceForm.icon] || SERVICE_ICONS.Sparkles}</div>
                        </div>
                    }
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white', fontWeight: '800', fontSize: '0.85rem' }}>
                      <ImageIcon size={18} /> {serviceImgPreview ? 'Click to change image' : 'Click to upload image'}
                    </div>
                    <input id="svc-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleServiceImgPick} />
                    {/* Floating icon badge */}
                    <div style={{ position: 'absolute', bottom: '-20px', left: '24px', color: serviceForm.color, background: '#0f0f0f', border: `2px solid ${serviceForm.color}40`, width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                      {SERVICE_ICONS[serviceForm.icon] || SERVICE_ICONS.Sparkles}
                    </div>
                  </div>

                  <div style={{ padding: '2rem', paddingTop: '2.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.8rem' }}>
                      <div>
                        <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>{editingService ? 'Edit Service' : 'Create New Service'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>Visible on web app, mobile app, and provider registration.</p>
                      </div>
                      <button onClick={() => setShowServiceModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer', flexShrink: 0 }}><X size={18} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      {/* Name */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Name *</label>
                        <input className="input-minimal" value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. AC Repair, Deep Cleaning" />
                      </div>

                      {/* Icon + Color */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Icon</label>
                          <select className="input-minimal" value={serviceForm.icon} onChange={e => setServiceForm(f => ({ ...f, icon: e.target.value }))}>
                            {ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme Color</label>
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            <input type="color" value={serviceForm.color} onChange={e => setServiceForm(f => ({ ...f, color: e.target.value }))} style={{ width: '44px', height: '44px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: 'none', flexShrink: 0 }} />
                            <input className="input-minimal" value={serviceForm.color} onChange={e => setServiceForm(f => ({ ...f, color: e.target.value }))} placeholder="#3b82f6" style={{ flex: 1 }} />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                        <textarea className="input-minimal" rows={3} value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown on the services page..." style={{ resize: 'none' }} />
                      </div>

                      {/* Active toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', background: serviceForm.isActive ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', borderRadius: '14px', border: `1px solid ${serviceForm.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, cursor: 'pointer' }} onClick={() => setServiceForm(f => ({ ...f, isActive: !f.isActive }))}>
                        {serviceForm.isActive ? <ToggleRight size={24} color="#10b981" /> : <ToggleLeft size={24} color="#ef4444" />}
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: serviceForm.isActive ? '#10b981' : '#ef4444' }}>
                            {serviceForm.isActive ? 'Active' : 'Disabled'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {serviceForm.isActive ? 'Visible to customers and providers' : 'Hidden from all users'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {serviceError && (
                      <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '0.82rem', fontWeight: '600', lineHeight: '1.5' }}>
                        ⚠ {serviceError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
                      <button onClick={() => setShowServiceModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '100px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                      <motion.button whileHover={{ scale: 1.02 }} onClick={handleServiceSave} disabled={serviceSaving || !serviceForm.name.trim()} style={{ flex: 2, padding: '1rem', borderRadius: '100px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', opacity: (serviceSaving || !serviceForm.name.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Save size={16} /> {serviceImgUploading ? 'Uploading...' : serviceSaving ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ===================== BOOKINGS TAB ===================== */}
          {activeTab === 'bookings' && (
             <motion.div key="bookings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                   <div>
                      <h2 style={{ fontWeight: '900' }}>Global Bookings</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor all service requests across the platform.</p>
                   </div>
                   <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.6rem 1rem', borderRadius: '100px', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                        <Search size={15} color="var(--text-muted)" />
                        <input value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} placeholder="Search bookings..." style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.85rem', width: '160px' }} />
                      </div>
                      <select value={bookingStatusFilter} onChange={e => setBookingStatusFilter(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', padding: '0.6rem 1rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button onClick={fetchBookings} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '0.6rem 1.2rem', borderRadius: '100px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>↻ Refresh</button>
                   </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
                   <div style={{ overflowX: 'auto' }}>
                      {bookingsLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading service requests...</div>
                      ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                       <thead>
                          <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>ID & Service</th>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</th>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Provider</th>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                             <th style={{ padding: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Manage</th>
                          </tr>
                       </thead>
                       <tbody>
                          {realBookings
                            .filter(b => {
                              const search = bookingSearch.toLowerCase();
                              const matchSearch = !search ||
                                b.customer_name?.toLowerCase().includes(search) ||
                                b.service_name?.toLowerCase().includes(search) ||
                                b.providerName?.toLowerCase().includes(search) ||
                                b.id?.toLowerCase().includes(search);
                              const matchStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
                              return matchSearch && matchStatus;
                            })
                            .map((b) => (
                             <tr key={b.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '1.5rem' }}>
                                   <div style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '0.2rem', fontSize: '0.78rem', letterSpacing: '0.5px' }}>#{b.id.slice(0, 8).toUpperCase()}</div>
                                   <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{b.service_name}</div>
                                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{b.created_at ? new Date(b.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                                </td>
                                <td style={{ padding: '1.5rem' }}>
                                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{b.customer_name || '—'}</div>
                                  {b.customer_phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{b.customer_phone}</div>}
                                </td>
                                <td style={{ padding: '1.5rem', fontWeight: '600', fontSize: '0.9rem', color: !b.providerName ? '#f59e0b' : 'white' }}>
                                  {b.providerName || 'Unassigned'}
                                </td>
                                <td style={{ padding: '1.5rem', fontWeight: '800' }}>{b.amount ? `RS ${Number(b.amount).toLocaleString()}` : '—'}</td>
                                <td style={{ padding: '1.5rem' }}><StatusBadge status={formatBookingStatus(b.status)} /></td>
                                <td style={{ padding: '1.5rem' }}>
                                   <button onClick={() => setViewingBooking(b)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '8px' }}>Details</button>
                                </td>
                             </tr>
                          ))}
                          {!bookingsLoading && realBookings.filter(b => {
                            const search = bookingSearch.toLowerCase();
                            const matchSearch = !search || b.customer_name?.toLowerCase().includes(search) || b.service_name?.toLowerCase().includes(search) || b.providerName?.toLowerCase().includes(search) || b.id?.toLowerCase().includes(search);
                            return matchSearch && (bookingStatusFilter === 'all' || b.status === bookingStatusFilter);
                          }).length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {realBookings.length === 0 ? 'No service requests found in database.' : 'No results match your filter.'}
                            </td></tr>
                          )}
                       </tbody>
                    </table>
                    )}
                   </div>
                </div>

                {realBookings.length > 0 && (
                  <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    <span style={{ color: 'white', fontWeight: '900' }}>{realBookings.length}</span> total requests
                    {' · '}
                    <span style={{ color: '#10b981', fontWeight: '900' }}>{realBookings.filter(b => b.status === 'completed').length}</span> completed
                    {' · '}
                    <span style={{ color: '#f59e0b', fontWeight: '900' }}>{realBookings.filter(b => b.status === 'pending').length}</span> pending
                  </div>
                )}
             </motion.div>
          )}

          {/* ── BOOKING DETAIL MODAL ─────────────────────────── */}
          <AnimatePresence>
            {viewingBooking && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingBooking(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '500px', zIndex: 1, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
                    <div>
                      <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>Request Details</h3>
                      <p style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '700', marginTop: '0.2rem' }}>#{viewingBooking.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button onClick={() => setViewingBooking(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><X size={18} /></button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div>
                      <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>{viewingBooking.service_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{viewingBooking.created_at ? new Date(viewingBooking.created_at).toLocaleString('en-PK') : '—'}</div>
                    </div>
                    <StatusBadge status={formatBookingStatus(viewingBooking.status)} />
                  </div>

                  {viewingBooking.image_url && (
                    <div style={{ marginBottom: '1.2rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Photo</div>
                      <a href={viewingBooking.image_url} target="_blank" rel="noopener noreferrer">
                        <img src={viewingBooking.image_url} alt="Request" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '14px', border: '1px solid var(--border)', display: 'block' }} />
                      </a>
                    </div>
                  )}

                  {[
                    { label: 'Customer', value: viewingBooking.customer_name || '—' },
                    { label: 'Phone', value: viewingBooking.customer_phone || '—' },
                    { label: 'Provider', value: viewingBooking.providerName || 'Unassigned' },
                    { label: 'Amount', value: viewingBooking.amount ? `RS ${Number(viewingBooking.amount).toLocaleString()}` : '—' },
                    { label: 'City', value: viewingBooking.city || '—' },
                    { label: 'Area', value: viewingBooking.area || '—' },
                    { label: 'Address', value: viewingBooking.address || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', textAlign: 'right', color: label === 'Provider' && !viewingBooking.providerName ? '#f59e0b' : 'inherit' }}>{value}</span>
                    </div>
                  ))}

                  {/* Both parties' locations — customer's from the request itself,
                      provider's from their registered provider_profiles row (joined
                      in fetchBookings), since the request row's own provider_lat/lng
                      is only ever live-tracking data from an active job, not a
                      reliable "where are they based" location. */}
                  <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.2rem' }}>
                    <button
                      disabled={!viewingBooking.latitude || !viewingBooking.longitude}
                      onClick={() => setViewingLocationUser({ name: `${viewingBooking.customer_name || 'Customer'} (Customer)`, latitude: viewingBooking.latitude, longitude: viewingBooking.longitude })}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.75rem', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: (viewingBooking.latitude && viewingBooking.longitude) ? 'var(--primary)' : 'var(--text-dim)', fontWeight: '700', fontSize: '0.8rem', cursor: (viewingBooking.latitude && viewingBooking.longitude) ? 'pointer' : 'not-allowed', opacity: (viewingBooking.latitude && viewingBooking.longitude) ? 1 : 0.5 }}
                    >
                      <MapPin size={14} /> Customer Location
                    </button>
                    <button
                      disabled={!viewingBooking.providerLat || !viewingBooking.providerLng}
                      onClick={() => setViewingLocationUser({ name: `${viewingBooking.providerName || 'Provider'} (Provider)`, latitude: viewingBooking.providerLat, longitude: viewingBooking.providerLng })}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.75rem', borderRadius: '100px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: (viewingBooking.providerLat && viewingBooking.providerLng) ? '#10b981' : 'var(--text-dim)', fontWeight: '700', fontSize: '0.8rem', cursor: (viewingBooking.providerLat && viewingBooking.providerLng) ? 'pointer' : 'not-allowed', opacity: (viewingBooking.providerLat && viewingBooking.providerLng) ? 1 : 0.5 }}
                    >
                      <MapPin size={14} /> Provider Location
                    </button>
                  </div>

                  {viewingBooking.description && (
                    <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Problem Description</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0 }}>{viewingBooking.description}</p>
                    </div>
                  )}

                  <button onClick={() => setViewingBooking(null)} style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '100px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Close</button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ===================== SERVICES TAB ===================== */}
          {activeTab === 'services' && (
            <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                 <div>
                    <h2 style={{ fontWeight: '900' }}>Service Portfolio</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage services — they appear on web, mobile app &amp; provider registration.</p>
                 </div>
                 <motion.button whileHover={{ scale: 1.03 }} onClick={() => openServiceModal()} className="btn-primary" style={{ padding: '0.8rem 1.5rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <Plus size={18} /> ADD SERVICE
                 </motion.button>
               </div>

               {servicesLoading ? (
                 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading services...</div>
               ) : realServices.length === 0 ? (
                 <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                   <Briefcase size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                   <h3 style={{ fontWeight: '800' }}>No services yet</h3>
                   <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Click "ADD SERVICE" to create your first service.</p>
                 </div>
               ) : (
               <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : windowWidth < 1200 ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '1.5rem' }}>
                  {realServices.map(s => (
                    <div key={s.id} style={{ borderRadius: '24px', background: 'var(--surface)', border: s.isActive ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'opacity 0.2s', opacity: s.isActive ? 1 : 0.65 }}>

                      {/* Image / Gradient Banner */}
                      <div style={{ height: '140px', position: 'relative', overflow: 'hidden', background: s.imgUrl ? 'transparent' : `linear-gradient(135deg, ${s.color || '#3b82f6'}28, ${s.color || '#3b82f6'}06)` }}>
                        {s.imgUrl
                          ? <img src={s.imgUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: s.color || '#3b82f6', opacity: 0.1, transform: 'scale(4.5)' }}>{SERVICE_ICONS[s.icon] || SERVICE_ICONS.Sparkles}</div>
                        }
                        {/* Active/Disable badge top-right */}
                        <button onClick={() => handleToggleActive(s)} style={{ position: 'absolute', top: '12px', right: '12px', background: s.isActive ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)', color: 'white', border: 'none', borderRadius: '100px', padding: '4px 12px', fontSize: '0.68rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(6px)' }}>
                          {s.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {s.isActive ? 'ACTIVE' : 'DISABLED'}
                        </button>
                        {/* Floating icon */}
                        <div style={{ position: 'absolute', bottom: '-18px', left: '18px', color: s.color || '#3b82f6', background: 'var(--surface)', border: `2px solid ${s.color || '#3b82f6'}30`, width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                          {SERVICE_ICONS[s.icon] || SERVICE_ICONS.Sparkles}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '1.8rem 1.4rem 1.4rem 1.4rem', paddingTop: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{s.name}</h3>
                        {s.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.55', marginBottom: '0.8rem', flex: 1 }}>{s.description}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color || '#3b82f6' }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>{s.icon}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <motion.button whileHover={{ scale: 1.08 }} onClick={() => openServiceModal(s)} title="Edit" style={{ background: 'rgba(59,130,246,0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', color: '#3b82f6' }}><Edit2 size={16} /></motion.button>
                            <motion.button whileHover={{ scale: 1.08 }} onClick={() => handleDeleteService(s)} title="Delete" style={{ background: 'rgba(239,68,68,0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', color: '#ef4444' }}><Trash2 size={16} /></motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
               )}
            </motion.div>
          )}

          {/* ===================== LOCATIONS TAB ===================== */}
          {activeTab === 'locations' && (
            <motion.div key="locations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
                 <div>
                    <h2 style={{ fontWeight: '900' }}>Platform Locations</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage the cities and areas available for service bookings.</p>
                 </div>
                 <form onSubmit={handleAddCity} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input
                      className="input-minimal"
                      placeholder="Enter New City Name"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      style={{ width: windowWidth < 640 ? '100%' : '220px' }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
                       <Plus size={18} /> ADD CITY
                    </button>
                 </form>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  {locations.map((loc) => (
                    <div key={loc._id} className="card" style={{ borderRadius: '24px', padding: '1.8rem', border: '1px solid var(--border)' }}>
                       <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                             <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={22} />
                             </div>
                             <h3 style={{ fontWeight: '900', fontSize: '1.3rem' }}>{loc.city}</h3>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            onClick={() => handleDeleteCity(loc._id)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                          >
                             <Trash2 size={18} />
                          </motion.button>
                       </div>

                       <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '1.2rem' }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Areas ({loc.areas.length})</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                             {loc.areas.map((area, idx) => (
                                <span key={idx} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   {area}
                                   <X size={12} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveArea(loc._id, area)} />
                                </span>
                             ))}
                             {loc.areas.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>No areas added yet.</span>}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                             <input 
                                className="input-minimal" 
                                placeholder="New Area Name" 
                                value={newAreaNames[loc._id] || ''}
                                onChange={(e) => setNewAreaNames({ ...newAreaNames, [loc._id]: e.target.value })}
                                style={{ fontSize: '0.85rem' }}
                             />
                             <button 
                               onClick={() => handleAddArea(loc._id)}
                               className="btn-primary" 
                               style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}
                             >
                                <Plus size={16} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {/* ===================== CONTACT & SUPPORT TAB ===================== */}
          {activeTab === 'contact' && (
            <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex-between" style={{ marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontWeight: '900' }}>Contact & Support</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Messages submitted from the website and the mobile app.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {['All', 'New', 'Resolved'].map(f => (
                    <button
                      key={f}
                      onClick={() => setContactFilter(f)}
                      style={{
                        padding: '0.6rem 1.2rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700',
                        cursor: 'pointer',
                        background: contactFilter === f ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: contactFilter === f ? 'var(--primary)' : 'var(--text-muted)',
                        border: contactFilter === f ? '1px solid var(--primary)' : '1px solid var(--border)',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {contactLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading messages...</p>
              ) : (() => {
                const filtered = contactMessages.filter(m => {
                  if (contactFilter === 'New') return m.status !== 'resolved';
                  if (contactFilter === 'Resolved') return m.status === 'resolved';
                  return true;
                });
                if (filtered.length === 0) {
                  return (
                    <div className="card" style={{ borderRadius: '24px', padding: '3rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                      <Mail size={36} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-muted)' }}>No messages here.</p>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 900 ? '1fr' : 'repeat(2, 1fr)', gap: '1.2rem' }}>
                    {filtered.map((m) => (
                      <motion.div
                        key={m.id}
                        whileHover={{ y: -3 }}
                        onClick={() => setViewingContact(m)}
                        className="card"
                        style={{ borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                      >
                        <div className="flex-between" style={{ marginBottom: '0.8rem', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '4px' }}>{m.name}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{m.email}</p>
                          </div>
                          <StatusBadge status={m.status === 'resolved' ? 'Completed' : 'Pending'} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                          {m.sender_role && (
                            <span style={{
                              padding: '4px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800',
                              textTransform: 'capitalize',
                              background: m.sender_role === 'provider' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                              color: m.sender_role === 'provider' ? '#10b981' : 'var(--primary)',
                            }}>
                              {m.sender_role}
                            </span>
                          )}
                          {m.sender_specialization && (
                            <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                              {m.sender_specialization}
                            </span>
                          )}
                          {!m.sender_role && (
                            <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                              Guest
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>{m.subject || 'No subject'}</p>
                        <p style={{
                          color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.5',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {m.message}
                        </p>

                        <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '1rem' }}>
                          {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ===================== AI INSIGHTS TAB ===================== */}
          {activeTab === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)', fontSize: '0.7rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>
                  <Sparkles size={12} /> AI-POWERED
                </div>
                <h2 style={{ fontWeight: '900' }}>AI Insights</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review sentiment and demand trends, reasoned by AI over your real booking data.</p>
              </div>

              {insightsLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Analyzing…</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 1100 ? '1fr' : '1fr 1fr', gap: '2rem' }}>

                  {/* Sentiment section */}
                  <div className="card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                    <h3 style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Review Sentiment</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>{reviewedRequests.length} reviews analyzed</p>

                    {(() => {
                      const counts = { Positive: 0, Neutral: 0, Negative: 0 };
                      reviewedRequests.forEach(r => { const s = sentimentById[r.id]; if (s && counts[s] != null) counts[s]++; });
                      const total = Math.max(1, counts.Positive + counts.Neutral + counts.Negative);
                      const buckets = [
                        { label: 'Positive', count: counts.Positive, color: '#10b981', Icon: Smile },
                        { label: 'Neutral', count: counts.Neutral, color: '#f59e0b', Icon: Meh },
                        { label: 'Negative', count: counts.Negative, color: '#ef4444', Icon: Frown },
                      ];
                      return (
                        <>
                          <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
                            {buckets.map(b => (
                              <div key={b.label} style={{ flex: 1, padding: '1rem 0.75rem', borderRadius: 16, background: `${b.color}12`, border: `1px solid ${b.color}30`, textAlign: 'center' }}>
                                <b.Icon size={18} color={b.color} style={{ marginBottom: 6 }} />
                                <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'white' }}>{b.count}</div>
                                <div style={{ fontSize: '0.7rem', color: b.color, fontWeight: 700 }}>{b.label}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>{Math.round((b.count / total) * 100)}%</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                            {reviewedRequests.slice(0, 12).map(r => {
                              const s = sentimentById[r.id];
                              const color = s === 'Positive' ? '#10b981' : s === 'Negative' ? '#ef4444' : '#f59e0b';
                              return (
                                <div key={r.id} style={{ padding: '0.75rem 0.9rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{r.service_name}</span>
                                    {s && <span style={{ fontSize: '0.65rem', fontWeight: 800, color, background: `${color}18`, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{s}</span>}
                                  </div>
                                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0', overflowWrap: 'break-word' }}>"{r.review}"</p>
                                </div>
                              );
                            })}
                            {reviewedRequests.length === 0 && (
                              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No reviews yet.</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Demand section */}
                  <div className="card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                    <h3 style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>Demand Prediction</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Trending area/service combinations, based on recent vs. older request volume</p>

                    {demandInsights?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {demandInsights.map((d, i) => {
                          const color = d.trend === 'rising' ? '#10b981' : d.trend === 'falling' ? '#ef4444' : '#94a3b8';
                          return (
                            <div key={i} style={{ padding: '1rem', borderRadius: 16, background: `${color}0d`, border: `1px solid ${color}30` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{d.service} — {d.area}</div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 800, color, background: `${color}18`, padding: '3px 9px', borderRadius: 100, flexShrink: 0 }}>
                                  {d.trend === 'rising' && <ArrowUpRight size={11} />} {d.trend?.toUpperCase()}
                                </span>
                              </div>
                              {d.insight && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>{d.insight}</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Not enough request history yet to predict demand trends.</p>
                    )}
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* ===================== GLOBAL SETTINGS TAB ===================== */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontWeight: '900' }}>Global Settings</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Platform-wide operational configuration — bidding limits, provider approval, maintenance mode.</p>
                </div>

                {platformSettingsLoading || !platformSettings ? (
                  <p style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div className="card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.25rem' }}>Platform</h3>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Platform Name</label>
                        <input className="input-minimal" value={platformSettings.platform_name || ''}
                          onChange={e => setPlatformSettings(s => ({ ...s, platform_name: e.target.value }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Support Phone</label>
                          <input className="input-minimal" value={platformSettings.support_phone || ''}
                            onChange={e => setPlatformSettings(s => ({ ...s, support_phone: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Support Email</label>
                          <input className="input-minimal" value={platformSettings.support_email || ''}
                            onChange={e => setPlatformSettings(s => ({ ...s, support_email: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.25rem' }}>Bidding Limits</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Min Bid (Rs)</label>
                          <input className="input-minimal" type="number" min="0" value={platformSettings.min_bid_amount ?? 0}
                            onChange={e => setPlatformSettings(s => ({ ...s, min_bid_amount: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Max Bid (Rs)</label>
                          <input className="input-minimal" type="number" min="0" value={platformSettings.max_bid_amount ?? 0}
                            onChange={e => setPlatformSettings(s => ({ ...s, max_bid_amount: Number(e.target.value) }))} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ borderRadius: 24, padding: '1.75rem' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.25rem' }}>Providers</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Auto-approve new providers</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Skip manual review — new providers go live immediately after signup.</div>
                        </div>
                        <div onClick={() => setPlatformSettings(s => ({ ...s, auto_approve_providers: !s.auto_approve_providers }))}
                          style={{ width: 48, height: 28, borderRadius: 100, background: platformSettings.auto_approve_providers ? 'var(--primary)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: platformSettings.auto_approve_providers ? 23 : 3, transition: 'left 0.2s' }} />
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ borderRadius: 24, padding: '1.75rem', border: platformSettings.maintenance_mode ? '1px solid rgba(239,68,68,0.35)' : undefined }}>
                      <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.25rem' }}>Maintenance Mode</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: platformSettings.maintenance_mode ? '1.25rem' : 0 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Enable maintenance mode</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Shows a maintenance banner to customers and providers on both apps.</div>
                        </div>
                        <div onClick={() => setPlatformSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                          style={{ width: 48, height: 28, borderRadius: 100, background: platformSettings.maintenance_mode ? '#ef4444' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: platformSettings.maintenance_mode ? 23 : 3, transition: 'left 0.2s' }} />
                        </div>
                      </div>
                      {platformSettings.maintenance_mode && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 }}>Maintenance Message</label>
                          <textarea className="input-minimal" rows={3} value={platformSettings.maintenance_message || ''}
                            onChange={e => setPlatformSettings(s => ({ ...s, maintenance_message: e.target.value }))} style={{ resize: 'vertical', width: '100%' }} />
                        </div>
                      )}
                    </div>

                    {platformSettingsError && (
                      <div style={{ padding: '0.9rem 1.1rem', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem' }}>
                        {platformSettingsError}
                      </div>
                    )}

                    <button onClick={savePlatformSettings} disabled={platformSettingsSaving}
                      style={{
                        padding: '1rem', borderRadius: 14, border: 'none', cursor: platformSettingsSaving ? 'not-allowed' : 'pointer',
                        background: platformSettingsSaved ? '#10b981' : 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: platformSettingsSaving ? 0.7 : 1,
                      }}>
                      <Save size={16} /> {platformSettingsSaving ? 'Saving...' : platformSettingsSaved ? 'Saved!' : 'Save Settings'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ===================== CMS / SITE CONTENT TAB ===================== */}
          {activeTab === 'site' && (
             <motion.div key="site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
                   <div style={{ marginBottom: '2.5rem' }}>
                      <h2 style={{ fontWeight: '900' }}>Frontend CMS</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control text, images, and SEO metadata dynamically.</p>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      
                      {/* CMS Tabs Navigation */}
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '12px', gap: '0.5rem', overflowX: 'auto' }}>
                         {['home', 'services', 'about', 'contact', 'footer'].map(tab => (
                            <button
                               key={tab}
                               onClick={() => setCmsTab(tab)}
                               style={{
                                  padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                                  background: cmsTab === tab ? 'var(--primary)' : 'transparent',
                                  color: cmsTab === tab ? 'white' : 'var(--text-muted)',
                                  transition: 'all 0.3s', whiteSpace: 'nowrap'
                               }}
                            >
                               {tab} CMS
                            </button>
                         ))}
                      </div>

                      {/* --- HOME CMS --- */}
                      {cmsTab === 'home' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                              {/* Hero Section */}
                              <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                 <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                   <Layout size={22} color="var(--primary)" /> Hero Section Text
                                 </h3>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Top Badge Country</label>
                                       <input className="input-minimal" name="topBadgeCountry" value={cmsData.homeCMS.topBadgeCountry} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Main Heading (H1)</label>
                                       <input className="input-minimal" name="mainHeading" value={cmsData.homeCMS.mainHeading} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Sub-text Paragraph</label>
                                       <textarea className="input-minimal" name="subTitle" value={cmsData.homeCMS.subTitle} onChange={(e) => handleCMSChange('homeCMS', e)} rows={3} style={{ resize: 'none' }} />
                                    </div>
                                 </div>
                              </div>

                              {/* Metrics Section */}
                              <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                                 <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                   <TrendingUp size={22} color="var(--primary)" /> Statistics & Metrics
                                 </h3>
                                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Users Served</label>
                                       <input className="input-minimal" name="usersServedCount" value={cmsData.homeCMS.usersServedCount} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Average Rating</label>
                                       <input className="input-minimal" name="averageRating" value={cmsData.homeCMS.averageRating} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Service Types</label>
                                       <input className="input-minimal" name="serviceTypesCount" value={cmsData.homeCMS.serviceTypesCount} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                 </div>
                              </div>

                              {/* App Download Links Section */}
                              <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
                                 <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                   <Globe size={22} color="var(--primary)" /> App Download Links
                                 </h3>
                                 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>App Store Link</label>
                                       <input className="input-minimal" name="appStoreLink" value={cmsData.homeCMS.appStoreLink} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Google Play Store Link</label>
                                       <input className="input-minimal" name="playStoreLink" value={cmsData.homeCMS.playStoreLink} onChange={(e) => handleCMSChange('homeCMS', e)} />
                                    </div>
                                 </div>
                              </div>
                          </div>
                      )}

                      {/* --- SERVICES CMS --- */}
                      {cmsTab === 'services' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                             {/* Page Settings */}
                             <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                                <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                  <Briefcase size={22} color="var(--primary)" /> Services Page Settings
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Page Title</label>
                                      <input className="input-minimal" name="pageTitle" value={cmsData.servicesCMS.pageTitle} onChange={(e) => handleCMSChange('servicesCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Page Description</label>
                                      <textarea className="input-minimal" name="pageDescription" value={cmsData.servicesCMS.pageDescription} onChange={(e) => handleCMSChange('servicesCMS', e)} rows={2} style={{ resize: 'none' }} />
                                   </div>
                                </div>
                             </div>

                             {/* Featured Services — currently selected */}
                             <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                  <CheckCircle size={22} color="#10b981" /> Featured on Homepage
                                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: '700', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: '100px' }}>
                                    {cmsData.servicesCMS.servicesList?.length || 0} selected
                                  </span>
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.8rem' }}>These services will appear in the scrolling carousel on the homepage.</p>

                                {(!cmsData.servicesCMS.servicesList || cmsData.servicesCMS.servicesList.length === 0) ? (
                                  <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                                    <Briefcase size={36} style={{ opacity: 0.2, marginBottom: '0.8rem' }} />
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontStyle: 'italic' }}>No services selected yet. Pick from the list below.</p>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {(cmsData.servicesCMS.servicesList || []).map((s) => (
                                      <motion.div
                                        key={s.id || s.name}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.2rem', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '14px' }}
                                      >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color || '#3b82f6'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                          {SERVICE_ICONS[s.iconName] || SERVICE_ICONS.Sparkles ? React.cloneElement(SERVICE_ICONS[s.iconName] || SERVICE_ICONS.Sparkles, { size: 18, color: s.color || '#3b82f6' }) : null}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {s.name}
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color || '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                                          </div>
                                          {s.desc && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</p>}
                                        </div>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          onClick={() => removeFromFeatured(s.id || s.name)}
                                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                          title="Remove from homepage"
                                        >
                                          <X size={15} />
                                        </motion.button>
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                             </div>

                             {/* All DB Services — select to add */}
                             <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                                <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                  <Zap size={22} color="var(--primary)" /> Your Services Database
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.8rem' }}>Click any service to add it to the homepage. Services marked with a checkmark are already featured.</p>

                                {servicesLoading ? (
                                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading services from database...</div>
                                ) : realServices.length === 0 ? (
                                  <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No services found. Go to <strong style={{ color: 'white' }}>Services Hub</strong> tab to add services first.</p>
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                    {realServices.map(s => {
                                      const isSelected = (cmsData.servicesCMS.servicesList || []).some(x => (x.id || x.name) === (s.id || s.name));
                                      return (
                                        <motion.div
                                          key={s.id}
                                          whileHover={!isSelected ? { scale: 1.02, y: -3 } : {}}
                                          onClick={() => !isSelected && addToFeatured(s)}
                                          style={{
                                            padding: '1.2rem',
                                            borderRadius: '16px',
                                            border: isSelected ? `1.5px solid rgba(16,185,129,0.5)` : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                                            cursor: isSelected ? 'default' : 'pointer',
                                            opacity: !s.isActive ? 0.5 : 1,
                                            position: 'relative',
                                            transition: 'all 0.2s',
                                          }}
                                        >
                                          {isSelected && (
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#10b981', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <CheckCircle size={14} color="white" strokeWidth={3} />
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color || '#3b82f6'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color || '#3b82f6', flexShrink: 0 }}>
                                              {SERVICE_ICONS[s.icon] || SERVICE_ICONS.Sparkles}
                                            </div>
                                            <div>
                                              <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{s.name}</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.isActive ? '#10b981' : '#6b7280', display: 'inline-block' }} />
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '600' }}>{s.isActive ? 'Active' : 'Disabled'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          {s.description && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.description}</p>}
                                          {!isSelected && (
                                            <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
                                              <Plus size={13} /> Add to Homepage
                                            </div>
                                          )}
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                )}
                             </div>
                          </div>
                      )}

                      {/* --- ABOUT US CMS --- */}
                      {cmsTab === 'about' && (
                          <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                             <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                               <Shield size={22} color="var(--primary)" /> About Us Settings
                             </h3>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                 {/* SECTION 1: HEADER & MISSION */}
                                 <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                                    <h4 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>1. Header & Mission</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Main Title</label>
                                          <input className="input-minimal" name="title" value={cmsData.aboutUsCMS.title} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                       </div>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Mission Statement</label>
                                          <textarea className="input-minimal" name="missionStatement" value={cmsData.aboutUsCMS.missionStatement} onChange={(e) => handleCMSChange('aboutUsCMS', e)} rows={3} style={{ resize: 'none' }} />
                                       </div>
                                    </div>
                                 </div>

                                 {/* SECTION 2: VALUES CARDS */}
                                 <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                                    <h4 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>2. Three Core Values Cards</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                       {/* Card 1 */}
                                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', marginBottom: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Card 1 (Left)</label>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                             <input className="input-minimal" placeholder="Card Title" name="card1Title" value={cmsData.aboutUsCMS.card1Title} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                             <textarea className="input-minimal" placeholder="Card Description" name="card1Desc" value={cmsData.aboutUsCMS.card1Desc} onChange={(e) => handleCMSChange('aboutUsCMS', e)} rows={2} style={{ resize: 'none' }} />
                                          </div>
                                       </div>

                                       {/* Card 2 */}
                                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', marginBottom: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Card 2 (Middle)</label>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                             <input className="input-minimal" placeholder="Card Title" name="card2Title" value={cmsData.aboutUsCMS.card2Title} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                             <textarea className="input-minimal" placeholder="Card Description" name="card2Desc" value={cmsData.aboutUsCMS.card2Desc} onChange={(e) => handleCMSChange('aboutUsCMS', e)} rows={2} style={{ resize: 'none' }} />
                                          </div>
                                       </div>

                                       {/* Card 3 */}
                                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', marginBottom: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Card 3 (Right)</label>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                             <input className="input-minimal" placeholder="Card Title" name="card3Title" value={cmsData.aboutUsCMS.card3Title} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                             <textarea className="input-minimal" placeholder="Card Description" name="card3Desc" value={cmsData.aboutUsCMS.card3Desc} onChange={(e) => handleCMSChange('aboutUsCMS', e)} rows={2} style={{ resize: 'none' }} />
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 {/* SECTION 3: STORY & EXPERIENCE */}
                                 <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                                    <h4 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>3. Story & History</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Story Heading</label>
                                          <input className="input-minimal" name="storyHeading" value={cmsData.aboutUsCMS.storyHeading} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                       </div>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Story Text Content</label>
                                          <textarea className="input-minimal" name="storyText" value={cmsData.aboutUsCMS.storyText} onChange={(e) => handleCMSChange('aboutUsCMS', e)} rows={4} style={{ resize: 'none' }} />
                                       </div>
                                    </div>
                                 </div>

                                 {/* SECTION 4: STATS & BADGE */}
                                 <div>
                                    <h4 style={{ fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem' }}>4. Statistics & Badges</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Users Served Count</label>
                                          <input className="input-minimal" placeholder="e.g. 15k+" name="statsUsers" value={cmsData.aboutUsCMS.statsUsers} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                       </div>
                                       <div>
                                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Experts Onboard Count</label>
                                          <input className="input-minimal" placeholder="e.g. 200+" name="statsExperts" value={cmsData.aboutUsCMS.statsExperts} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                       </div>
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Bottom Badge Text</label>
                                       <input className="input-minimal" placeholder="e.g. Top Rated Startup 2026" name="badgeText" value={cmsData.aboutUsCMS.badgeText} onChange={(e) => handleCMSChange('aboutUsCMS', e)} />
                                    </div>
                                 </div>
                              </div>
                             </div>
                          </div>
                      )}

                      {/* --- CONTACT US CMS --- */}
                      {cmsTab === 'contact' && (
                          <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                             <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                               <Users size={22} color="var(--primary)" /> Contact Us Settings
                             </h3>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Title</label>
                                      <input className="input-minimal" name="title" value={cmsData.contactUsCMS.title} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Highlighted Word</label>
                                      <input className="input-minimal" name="highlightedTitleWord" value={cmsData.contactUsCMS.highlightedTitleWord} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                </div>
                                <div>
                                   <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Description</label>
                                   <textarea className="input-minimal" name="description" value={cmsData.contactUsCMS.description} onChange={(e) => handleCMSChange('contactUsCMS', e)} rows={2} style={{ resize: 'none' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Email Label</label>
                                      <input className="input-minimal" name="emailLabel" value={cmsData.contactUsCMS.emailLabel} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Email Address</label>
                                      <input className="input-minimal" value={platformSettings?.support_email || ''} disabled
                                        style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Set this in Global Settings — it applies everywhere automatically" />
                                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Set in Global Settings → Support Email (applies to this page and both apps' Contact Us forms).</p>
                                   </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Phone Label</label>
                                      <input className="input-minimal" name="phoneLabel" value={cmsData.contactUsCMS.phoneLabel} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Phone Number</label>
                                      <input className="input-minimal" value={platformSettings?.support_phone || ''} disabled
                                        style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Set this in Global Settings — it applies everywhere automatically" />
                                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Set in Global Settings → Support Phone (applies to this page and both apps' Contact Us forms).</p>
                                   </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Address Label</label>
                                      <input className="input-minimal" name="addressLabel" value={cmsData.contactUsCMS.addressLabel} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Address Details</label>
                                      <input className="input-minimal" name="address" value={cmsData.contactUsCMS.address} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Instagram Link</label>
                                      <input className="input-minimal" name="instagramLink" value={cmsData.contactUsCMS.instagramLink} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Twitter Link</label>
                                       <input className="input-minimal" name="twitterLink" value={cmsData.contactUsCMS.twitterLink} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Facebook Link</label>
                                      <input className="input-minimal" name="facebookLink" value={cmsData.contactUsCMS.facebookLink} onChange={(e) => handleCMSChange('contactUsCMS', e)} />
                                   </div>
                                   <div style={{ gridColumn: '1 / -1' }}>
                                      <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'block', textTransform: 'uppercase' }}>Form Dropdown Subjects</label>
                                      
                                      {/* Badges/Chips container */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                                         {(cmsData.contactUsCMS.formSubjects || [])
                                            .map(s => (typeof s === 'string' ? s.trim() : ''))
                                            .filter(s => s !== '')
                                            .map((sub, idx) => (
                                               <motion.span 
                                                  key={idx} 
                                                  whileHover={{ scale: 1.05 }}
                                                  style={{ 
                                                     display: 'inline-flex', 
                                                     alignItems: 'center', 
                                                     gap: '8px', 
                                                     padding: '8px 16px', 
                                                     background: 'rgba(59, 130, 246, 0.1)', 
                                                     color: 'var(--primary)', 
                                                     border: '1px solid rgba(59, 130, 246, 0.2)', 
                                                     borderRadius: '100px', 
                                                     fontSize: '0.85rem',
                                                     fontWeight: '700'
                                                  }}
                                               >
                                                  {sub}
                                                  <X 
                                                     size={14} 
                                                     style={{ cursor: 'pointer', opacity: 0.7 }} 
                                                     onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                     onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                                                     onClick={() => {
                                                        const updated = (cmsData.contactUsCMS.formSubjects || []).filter((_, i) => i !== idx);
                                                        setCmsData(prev => ({
                                                           ...prev,
                                                           contactUsCMS: { ...prev.contactUsCMS, formSubjects: updated }
                                                        }));
                                                     }} 
                                                  />
                                               </motion.span>
                                            ))}
                                         {(!cmsData.contactUsCMS.formSubjects || cmsData.contactUsCMS.formSubjects.filter(s => s && s.trim() !== '').length === 0) && (
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic' }}>No subjects added. Add at least one subject.</span>
                                         )}
                                      </div>

                                      {/* Input area to add new subject */}
                                      <div style={{ display: 'flex', gap: '0.8rem', maxWidth: '500px' }}>
                                         <input 
                                            className="input-minimal" 
                                            placeholder="Type new subject (e.g. Booking Issue)" 
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            onKeyDown={(e) => {
                                               if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const trimmed = newSubject.trim();
                                                  if (trimmed) {
                                                     const current = cmsData.contactUsCMS.formSubjects || [];
                                                     if (!current.includes(trimmed)) {
                                                        setCmsData(prev => ({
                                                           ...prev,
                                                           contactUsCMS: { 
                                                              ...prev.contactUsCMS, 
                                                              formSubjects: [...current, trimmed] 
                                                           }
                                                        }));
                                                        setNewSubject('');
                                                     } else {
                                                        alert("Subject already exists!");
                                                     }
                                                  }
                                               }
                                            }}
                                         />
                                         <button 
                                            type="button"
                                            onClick={() => {
                                               const trimmed = newSubject.trim();
                                               if (trimmed) {
                                                  const current = cmsData.contactUsCMS.formSubjects || [];
                                                  if (!current.includes(trimmed)) {
                                                     setCmsData(prev => ({
                                                        ...prev,
                                                        contactUsCMS: { 
                                                           ...prev.contactUsCMS, 
                                                           formSubjects: [...current, trimmed] 
                                                        }
                                                     }));
                                                     setNewSubject('');
                                                  } else {
                                                     alert("Subject already exists!");
                                                  }
                                               }
                                            }}
                                            className="btn-primary" 
                                            style={{ padding: '0 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
                                         >
                                            <Plus size={18} />
                                         </button>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                      )}

                      {/* --- FOOTER CMS --- */}
                      {/* --- FOOTER CMS --- */}
                      {cmsTab === 'footer' && (
                          <div className="card cms-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                             <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                               <Globe size={22} color="var(--primary)" /> Footer Settings
                             </h3>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                   <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Short Description</label>
                                   <textarea className="input-minimal" name="shortDescription" value={cmsData.footerCMS.shortDescription} onChange={(e) => handleCMSChange('footerCMS', e)} rows={3} style={{ resize: 'none' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Instagram Link</label>
                                       <input className="input-minimal" name="instagramLink" value={cmsData.footerCMS.instagramLink} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Twitter Link</label>
                                       <input className="input-minimal" name="twitterLink" value={cmsData.footerCMS.twitterLink} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Facebook Link</label>
                                       <input className="input-minimal" name="facebookLink" value={cmsData.footerCMS.facebookLink} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                    </div>
                                </div>
                                <div>
                                   <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Copyright Text</label>
                                   <input className="input-minimal" name="copyrightText" value={cmsData.footerCMS.copyrightText} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Privacy Policy Link</label>
                                       <input className="input-minimal" name="privacyPolicyLink" value={cmsData.footerCMS.privacyPolicyLink} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                    </div>
                                    <div>
                                       <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Terms of Service Link</label>
                                       <input className="input-minimal" name="termsOfServiceLink" value={cmsData.footerCMS.termsOfServiceLink} onChange={(e) => handleCMSChange('footerCMS', e)} />
                                    </div>
                                </div>
                             </div>
                          </div>
                      )}

                       <button 
                         onClick={handleSaveCMS}
                         disabled={isSaving}
                         className="btn-primary" 
                         style={{ alignSelf: 'flex-end', padding: '1rem 3rem', borderRadius: '100px', gap: '0.8rem', fontSize: '1rem', opacity: isSaving ? 0.7 : 1 }}
                       >
                          <Save size={20} /> {isSaving ? 'PUBLISHING...' : 'PUBLISH CHANGES TO LIVE SITE'}
                       </button>

                   </div>
                </div>
             </motion.div>
          )}

        </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
