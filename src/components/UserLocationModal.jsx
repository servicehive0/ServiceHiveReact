import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${PRIMARY};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;">📍</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const timeAgo = (iso) => {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'Live';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
};

// One-shot map view of a single user's last-known coordinates from the
// admin Users table — unlike LiveTrackingModal.jsx (which this borrows its
// Leaflet setup from), there is no polling and no navigator.geolocation
// push here: this only renders whatever lat/lng is already in the admin's
// realUsers state, which the Users tab's own realtime subscription
// (AdminDashboard.jsx's admin_users_live channel) already keeps current.
const UserLocationModal = ({ user, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !user?.latitude || !user?.longitude) return;
    const center = [user.latitude, user.longitude];

    mapInstance.current = L.map(mapRef.current).setView(center, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstance.current);
    markerRef.current = L.marker(center, { icon: userIcon }).addTo(mapInstance.current).bindPopup(user.name || 'User');

    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, [user?.latitude, user?.longitude, user?.name]);

  const openInMaps = () => {
    if (!user?.latitude) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${user.latitude},${user.longitude}`, '_blank');
  };

  const freshness = timeAgo(user?.locationUpdatedAt);
  const isLive = freshness === 'Live';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 640, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1rem' }}>{user?.name || 'User'}'s Location</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div ref={mapRef} style={{ flex: 1, background: '#111' }} />

        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '0.78rem', color: isLive ? SUCCESS : '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} />
            {freshness || 'Location unavailable'}
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={openInMaps}
            style={{ padding: '0.6rem 1.1rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
            Open in Maps
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default UserLocationModal;
