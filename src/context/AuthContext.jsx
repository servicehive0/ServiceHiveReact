import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// ─── Shape helpers ────────────────────────────────────────────────────────────
// Keep camelCase + _id so all existing components work without changes.

const mapUser = (profile, email) => ({
  _id: profile.id,
  id: profile.id,
  name: profile.name,
  email: email || profile.email,
  role: profile.role,
  isVerified: profile.is_verified,
  rejectionReason: profile.rejection_reason || null,
  phone: profile.phone || '',
  area: profile.area || '',
  city: profile.city || '',
  address: profile.address || '',
  latitude: profile.latitude,
  longitude: profile.longitude,
  locationUpdatedAt: profile.location_updated_at || null,
  createdAt: profile.created_at,
  avatarUrl: profile.avatar_url || null,
  showPhone: profile.show_phone !== false,
  showEmail: profile.show_email !== false,
});

const mapBooking = (b) => ({
  _id: b.id,
  id: b.id,
  user: b.user_id,
  provider: b.provider_id,
  customerName: b.customer?.name || '',
  customerPhone: b.customer?.phone || '',
  providerName: b.provider_user?.name || '',
  providerPhone: b.provider_user?.phone || '',
  service: b.service,
  serviceSlug: b.service_slug,
  address: b.address,
  scheduledType: b.scheduled_type,
  scheduledDate: b.scheduled_date,
  scheduledTime: b.scheduled_time,
  status: b.status,
  price: b.price,
  notes: b.notes,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});

const mapService = (s) => ({
  _id: s.id,
  id: s.id,
  name: s.name,
  slug: s.slug,
  icon: s.icon,
  color: s.color,
  description: s.description,
  startingPrice: s.starting_price,
  imgUrl: s.img_url || null,
  isActive: s.is_active,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the public.users profile and hydrate state
  const hydrateUser = async (authUser) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (error || !profile) return null;
    const mapped = mapUser(profile, authUser.email);
    setUser(mapped);
    localStorage.setItem('user', JSON.stringify(mapped));
    return mapped;
  };

  useEffect(() => {
    // Restore session on mount. If this ever throws (network hiccup,
    // Supabase error), loading must still resolve to false — otherwise
    // ProtectedRoute stays on `if (loading) return null` forever, which
    // renders as a permanently blank page with no error shown anywhere.
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          await hydrateUser(session.user);
        }
      })
      .catch((err) => console.error('Session restore failed:', err))
      .finally(() => setLoading(false));

    // Keep state in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await hydrateUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('user');
        } else if (event === 'USER_UPDATED' && session?.user) {
          await hydrateUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email, password, role) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return { success: false, message: 'Please verify your email first.', needsVerification: true, email };
      }
      return { success: false, message: error.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { success: false, message: 'Could not load user profile.' };
    }

    // Role guard — allow admin to log in from any page
    if (role && profile.role !== role && profile.role !== 'admin') {
      await supabase.auth.signOut();
      return { success: false, message: `This account is registered as a "${profile.role}", not "${role}".` };
    }

    // Provider approval gate — block login until admin approves. Deliberately
    // does NOT sign out here (unlike the failure branches above): the
    // session needs to stay alive so PendingApproval.jsx can read it
    // directly and poll/subscribe for the admin's decision, matching
    // Flutter's pendingApproval flow. `user` stays null either way, so nothing
    // elsewhere in the app treats this as a logged-in session.
    if (profile.role === 'provider' && !profile.is_verified) {
      return {
        success: false,
        pending: true,
        message: 'Your account is under review. Admin will approve you shortly.',
        email: data.user.email,
      };
    }

    const mapped = mapUser(profile, data.user.email);
    setUser(mapped);
    localStorage.setItem('user', JSON.stringify(mapped));
    return { success: true, user: mapped };
  };

  // Providers carry extra fields (KYC + professional details) beyond `users`.
  // Persisted to both a ref (fast path, no re-renders) AND localStorage
  // (survives a tab refresh/close between signUp and email-OTP-verify —
  // previously a ref-only in-memory value meant closing the tab to check
  // email for the OTP silently lost all profile fields and uploaded docs).
  const PENDING_PROVIDER_KEY = 'sh_pending_provider_registration';
  const pendingProviderRef = useRef({ profile: null, urls: null });

  const KYC_FILE_LABELS = {
    cnicFront: 'CNIC Front', cnicBack: 'CNIC Back', selfie: 'Selfie with ID',
    workImages: 'Work Portfolio', certificate: 'Certificate',
  };

  // Uploads a single KYC file to Cloudinary immediately when the user picks
  // it in the registration form (before the account even exists), so only
  // a plain URL string — not a File object — needs to survive the signUp ->
  // OTP-verify gap. URL strings are JSON-safe and can be persisted to
  // localStorage; File objects cannot.
  const uploadKycFileNow = async (file, key) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dbuhxbyq1';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'servicehive_unsigned';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', uploadPreset);
        form.append('folder', 'provider-docs/pending');
        const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: form,
        });
        if (resp.ok) {
          const body = await resp.json();
          return { success: true, url: body.secure_url };
        }
        const body = await resp.json().catch(() => null);
        console.error(`KYC upload (${key}) attempt ${attempt + 1} rejected:`, body?.error?.message || resp.status);
      } catch (err) {
        console.error(`KYC upload (${key}) attempt ${attempt + 1} failed:`, err);
      }
    }
    return { success: false, url: null };
  };

  // Called by AuthPage before submitting the worker registration form. Files
  // must already be uploaded (see uploadKycFileNow) — this only stores the
  // resulting URLs + text fields, both JSON-safe, mirrored into localStorage
  // so createProviderProfile can recover them even after a fresh page load.
  const setPendingProviderRegistration = (profileFields, urls) => {
    const pending = { profile: profileFields, urls };
    pendingProviderRef.current = pending;
    try { localStorage.setItem(PENDING_PROVIDER_KEY, JSON.stringify(pending)); } catch { /* ignore quota errors */ }
  };

  // Returns { success, failedUploads } instead of swallowing failures, so the
  // registration flow can warn the user exactly which document didn't upload
  // rather than silently approving providers with missing KYC docs.
  const createProviderProfile = async (userId) => {
    let pending = pendingProviderRef.current;
    if (!pending.profile) {
      try {
        const stored = localStorage.getItem(PENDING_PROVIDER_KEY);
        if (stored) pending = JSON.parse(stored);
      } catch { /* ignore corrupt storage */ }
    }
    const pendingProfile = pending.profile;
    const urls = pending.urls || {};
    if (!pendingProfile) return { success: true, failedUploads: [] };
    const { specialization, cnic, skills, experience } = pendingProfile;
    const skillsList = (skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      id: userId,
      service_type: specialization || '',
      cnic: cnic || '',
      skills: skillsList,
      experience: experience || '',
      is_online: false,
      rating: 0,
      total_jobs: 0,
      ...(urls.cnicFront && { cnic_front_url: urls.cnicFront }),
      ...(urls.cnicBack && { cnic_back_url: urls.cnicBack }),
      ...(urls.selfie && { selfie_url: urls.selfie }),
      ...(urls.workImages && { portfolio_url: urls.workImages }),
      ...(urls.certificate && { certificates_url: urls.certificate }),
    };
    let profileSaved = false;
    let lastError = null;
    for (let attempt = 0; attempt < 2 && !profileSaved; attempt++) {
      const { error } = await supabase.from('provider_profiles').upsert(payload, { onConflict: 'id' });
      if (!error) profileSaved = true;
      else { lastError = error; console.error(`createProviderProfile attempt ${attempt + 1} failed:`, error.message); }
    }

    const failedUploads = profileSaved
      ? Object.keys(KYC_FILE_LABELS).filter((k) => pending.urls && Object.prototype.hasOwnProperty.call(pending.urls, `${k}_failed`)).map((k) => KYC_FILE_LABELS[k])
      : (lastError ? ['profile details (server error)'] : []);

    pendingProviderRef.current = { profile: null, urls: null };
    try { localStorage.removeItem(PENDING_PROVIDER_KEY); } catch { /* ignore */ }
    return { success: profileSaved, failedUploads };
  };

  const register = async (userData) => {
    const {
      name,
      email,
      password,
      role = 'user',
      phone = '',
      city = '',
      area = '',
      address = '',
    } = userData;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone, city, area, address },
      },
    });

    if (error) return { success: false, message: error.message };

    // Supabase returns an empty identities array when the email already exists
    if (data.user?.identities?.length === 0) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    // If session is returned immediately, email confirmation is disabled in Supabase
    if (data.session) {
      let kycFailures = [];
      if (role === 'provider') {
        const result = await createProviderProfile(data.user.id);
        kycFailures = result.failedUploads;
      }
      const mapped = await hydrateUser(data.user);
      return { success: true, skipOtp: true, user: mapped, kycFailures };
    }

    return { success: true, message: 'A 6-digit verification OTP has been sent to your email.' };
  };

  const verifyOtp = async (email, otp) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });
    if (error) return { success: false, message: error.message };

    let kycFailures = [];
    if (data.user?.user_metadata?.role === 'provider') {
      const result = await createProviderProfile(data.user.id);
      kycFailures = result.failedUploads;
    }

    const mapped = await hydrateUser(data.user);
    return { success: true, user: mapped, kycFailures };
  };

  const resendOtp = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'OTP resent. Please check your email.' };
  };

  const forgotPassword = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'A 6-digit OTP has been sent to your email.' };
  };

  const verifyResetOtp = async (email, otp) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const resetPassword = async (_email, _otp, password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, message: error.message };
    await supabase.auth.signOut();
    return { success: true, message: 'Password reset successfully. Please log in.' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  // ─── Locations ─────────────────────────────────────────────────────────────

  const getLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*, location_areas(area)')
      .order('city');
    if (error) { console.error('getLocations:', error); return []; }
    return data.map((loc) => ({
      _id: loc.id,
      id: loc.id,
      city: loc.city,
      areas: loc.location_areas.map((a) => a.area),
    }));
  };

  const addCity = async (city) => {
    const { data, error } = await supabase
      .from('locations')
      .insert({ city })
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data };
  };

  const deleteCity = async (cityId) => {
    const { error } = await supabase.from('locations').delete().eq('id', cityId);
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const addArea = async (cityId, area) => {
    const { error } = await supabase
      .from('location_areas')
      .insert({ location_id: cityId, area });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const removeArea = async (cityId, areaName) => {
    const { error } = await supabase
      .from('location_areas')
      .delete()
      .eq('location_id', cityId)
      .eq('area', areaName);
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  // ─── Site Settings / CMS ───────────────────────────────────────────────────

  const getSiteSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) { console.error('getSiteSettings error:', error.message); return null; }
    return {
      homeCMS:      data.home_cms      || {},
      servicesCMS:  data.services_cms  || {},
      aboutUsCMS:   data.about_us_cms  || {},
      contactUsCMS: data.contact_us_cms || {},
      footerCMS:    data.footer_cms    || {},
    };
  };

  const updateSiteSettings = async (settingsData) => {
    const payload = {
      home_cms:       settingsData.homeCMS      || {},
      services_cms:   settingsData.servicesCMS  || {},
      about_us_cms:   settingsData.aboutUsCMS   || {},
      contact_us_cms: settingsData.contactUsCMS || {},
      footer_cms:     settingsData.footerCMS    || {},
    };

    const { error } = await supabase
      .from('site_settings')
      .update(payload)
      .eq('id', 1);

    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  // ─── Platform Settings (Admin "Global Settings" tab) ────────────────────────
  // Operational config (commission, maintenance mode, bid limits) — distinct
  // from site_settings above, which is marketing/CMS page copy only.

  const getPlatformSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) { console.error('getPlatformSettings error:', error.message); return null; }
    return data;
  };

  const updatePlatformSettings = async (settingsData) => {
    const { error } = await supabase
      .from('platform_settings')
      .update({ ...settingsData, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  // ─── Services ──────────────────────────────────────────────────────────────

  const getServices = async (query = '') => {
    let req = supabase.from('services').select('*').eq('is_active', true).order('name');
    if (query) req = req.ilike('name', `%${query}%`);
    const { data, error } = await req;
    if (error) { console.error('getServices:', error); return []; }
    return data.map(mapService);
  };

  const getAllServices = async () => {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) { console.error('getAllServices:', error); return []; }
    return data.map(mapService);
  };

  const getService = async (slug) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return mapService(data);
  };

  const uploadServiceImage = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || cloudName === 'your_cloud_name') {
      return { success: false, message: 'Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env file.' };
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'service-hive/services');
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error?.message || 'Upload failed' };
      return { success: true, url: data.secure_url };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const createService = async (serviceData) => {
    const payload = {
      name: serviceData.name,
      slug: serviceData.slug,
      icon: serviceData.icon || 'Sparkles',
      color: serviceData.color || '#3b82f6',
      description: serviceData.description || '',
      starting_price: serviceData.startingPrice ?? serviceData.starting_price ?? 0,
      is_active: serviceData.isActive ?? serviceData.is_active ?? true,
    };
    const imgUrl = serviceData.imgUrl || serviceData.img_url || null;
    if (imgUrl) payload.img_url = imgUrl;
    const { data, error } = await supabase
      .from('services')
      .insert(payload)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data: mapService(data) };
  };

  const updateService = async (id, serviceData) => {
    const payload = {};
    if (serviceData.name        !== undefined) payload.name          = serviceData.name;
    if (serviceData.slug        !== undefined) payload.slug          = serviceData.slug;
    if (serviceData.icon        !== undefined) payload.icon          = serviceData.icon;
    if (serviceData.color       !== undefined) payload.color         = serviceData.color;
    if (serviceData.description !== undefined) payload.description   = serviceData.description;
    if (serviceData.startingPrice !== undefined) payload.starting_price = serviceData.startingPrice;
    if (serviceData.starting_price !== undefined) payload.starting_price = serviceData.starting_price;
    if (serviceData.isActive    !== undefined) payload.is_active     = serviceData.isActive;
    if (serviceData.is_active   !== undefined) payload.is_active     = serviceData.is_active;
    const imgUrl = serviceData.imgUrl || serviceData.img_url || null;
    if (imgUrl) payload.img_url = imgUrl;

    const { data, error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data: mapService(data) };
  };

  const deleteService = async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  // ─── Bookings ──────────────────────────────────────────────────────────────

  const createBooking = async (data) => {
    const payload = {
      user_id: user.id,
      service: data.service,
      service_slug: data.serviceSlug ?? data.service_slug,
      address: data.address,
      scheduled_type: data.scheduledType ?? data.scheduled_type ?? 'asap',
      scheduled_date: data.scheduledDate ?? data.scheduled_date ?? null,
      scheduled_time: data.scheduledTime ?? data.scheduled_time ?? null,
      price: data.price ?? null,
      notes: data.notes ?? null,
    };
    const { data: created, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data: mapBooking(created) };
  };

  const getMyBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customer:user_id(name, phone), provider_user:provider_id(name, phone)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(mapBooking);
  };

  const cancelBooking = async (id) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data: mapBooking(data) };
  };

  const getAllBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customer:user_id(name, phone), provider_user:provider_id(name, phone)')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data.map(mapBooking);
  };

  // ─── Users / Profile ───────────────────────────────────────────────────────

  const updateProfile = async (profileData) => {
    // Accept both camelCase (from forms) and snake_case
    const payload = {};
    if (profileData.name    !== undefined) payload.name    = profileData.name;
    if (profileData.phone   !== undefined) payload.phone   = profileData.phone;
    if (profileData.city    !== undefined) payload.city    = profileData.city;
    if (profileData.area    !== undefined) payload.area    = profileData.area;
    if (profileData.address !== undefined) payload.address = profileData.address;
    if (profileData.latitude  !== undefined) payload.latitude  = profileData.latitude;
    if (profileData.longitude !== undefined) payload.longitude = profileData.longitude;
    if (profileData.showPhone    !== undefined) payload.show_phone    = profileData.showPhone;
    if (profileData.showEmail    !== undefined) payload.show_email    = profileData.showEmail;

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    const updatedUser = { ...user, ...mapUser(data, user.email) };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return { success: true, data: mapUser(data, user.email) };
  };

  // Profile picture upload — same Cloudinary account/preset as KYC docs and
  // service images, so every asset type lands in the same place. Available
  // to both customers and providers from the shared Profile page.
  const uploadAvatar = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dbuhxbyq1';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'servicehive_unsigned';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `avatars/${user.id}`);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: formData });
      const body = await res.json();
      if (!res.ok) return { success: false, message: body.error?.message || 'Upload failed' };

      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: body.secure_url })
        .eq('id', user.id)
        .select()
        .single();
      if (error) return { success: false, message: error.message };

      const updatedUser = { ...user, ...mapUser(data, user.email) };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, url: body.secure_url };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const getAllUsers = async () => {
    const { data, error } = await supabase.rpc('admin_get_all_users');
    if (error) { console.error('getAllUsers error:', error.message); return { error: error.message, data: [] }; }
    if (!Array.isArray(data)) { console.error('getAllUsers: RPC returned non-array data', data); return { error: 'Unexpected response from server.', data: [] }; }
    return { error: null, data: data.map((u) => mapUser(u, u.email)) };
  };

  const deleteUser = async (id) => {
    const { error } = await supabase.rpc('admin_delete_user', { user_id: id });
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const adminUpdateUser = async (id, profileData) => {
    const payload = {};
    if (profileData.name       !== undefined) payload.name        = profileData.name;
    if (profileData.role       !== undefined) payload.role        = profileData.role;
    if (profileData.phone      !== undefined) payload.phone       = profileData.phone;
    if (profileData.city       !== undefined) payload.city        = profileData.city;
    if (profileData.area       !== undefined) payload.area        = profileData.area;
    if (profileData.address    !== undefined) payload.address     = profileData.address;
    if (profileData.isVerified !== undefined) payload.is_verified = profileData.isVerified;

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, data: mapUser(data, data.email) };
  };

  // ─── Contact ───────────────────────────────────────────────────────────────

  const submitContact = async (formData) => {
    let senderSpecialization = null;
    if (user?.role === 'provider') {
      const { data } = await supabase
        .from('provider_profiles')
        .select('service_type')
        .eq('id', user.id)
        .maybeSingle();
      senderSpecialization = data?.service_type || null;
    }

    const { error } = await supabase.from('contact_messages').insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      subject: formData.subject || null,
      message: formData.message,
      sender_role: user?.role || null,
      sender_specialization: senderSpecialization,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Your message has been sent successfully!' };
  };

  // ─── Context value ─────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, verifyOtp, resendOtp,
      forgotPassword, verifyResetOtp, resetPassword, logout,
      setPendingProviderRegistration, uploadKycFileNow,
      getLocations, addCity, deleteCity, addArea, removeArea,
      getSiteSettings, updateSiteSettings,
      getPlatformSettings, updatePlatformSettings,
      getServices, getAllServices, getService, createService, updateService, deleteService, uploadServiceImage,
      createBooking, getMyBookings, cancelBooking, getAllBookings,
      updateProfile, uploadAvatar, getAllUsers, deleteUser, adminUpdateUser,
      submitContact,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
