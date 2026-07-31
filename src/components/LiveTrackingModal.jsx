import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';

const PRIMARY = '#6366f1';
const SUCCESS = '#10b981';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const providerIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${SUCCESS};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;">P</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const customerIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${PRIMARY};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;">C</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Live GPS tracking during an active job, mirroring Flutter's
// active_job_map_screen.dart: provider pushes its coordinates every ~5s to
// service_requests.provider_lat/lng, customer (or provider, viewing their
// own position) polls/subscribes to those same columns.
const LiveTrackingModal = ({ requestId, isProvider, onClose }) => {
  const [request, setRequest] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const providerMarker = useRef(null);
  const customerMarker = useRef(null);
  const watchId = useRef(null);
  const pollTimer = useRef(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.from('service_requests').select('*').eq('id', requestId).maybeSingle();
      if (active && data) setRequest(data);
    };
    load();

    // Provider: push live GPS every 5s.
    if (isProvider && 'geolocation' in navigator) {
      const pushLocation = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase.from('service_requests').update({
            provider_lat: pos.coords.latitude,
            provider_lng: pos.coords.longitude,
          }).eq('id', requestId);
        }, () => {}, { enableHighAccuracy: true });
      };
      pushLocation();
      watchId.current = setInterval(pushLocation, 5000);
    }

    // Both roles: poll for updated coordinates every 3s (customer watches
    // the provider move; provider view stays in sync if reopened elsewhere).
    pollTimer.current = setInterval(load, 3000);

    return () => {
      active = false;
      if (watchId.current) clearInterval(watchId.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [requestId, isProvider]);

  useEffect(() => {
    if (!request || !mapRef.current) return;

    const customerLat = request.latitude, customerLng = request.longitude;
    const providerLat = request.provider_lat, providerLng = request.provider_lng;
    const center = providerLat && providerLng ? [providerLat, providerLng] : (customerLat && customerLng ? [customerLat, customerLng] : [24.8607, 67.0011]);

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(center, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }

    if (customerLat && customerLng) {
      if (customerMarker.current) customerMarker.current.setLatLng([customerLat, customerLng]);
      else customerMarker.current = L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(mapInstance.current).bindPopup('Customer location');
    }

    if (providerLat && providerLng) {
      if (providerMarker.current) providerMarker.current.setLatLng([providerLat, providerLng]);
      else providerMarker.current = L.marker([providerLat, providerLng], { icon: providerIcon }).addTo(mapInstance.current).bindPopup('Provider — live location');
      mapInstance.current.panTo([providerLat, providerLng]);
    }

    return () => {};
  }, [request]);

  useEffect(() => () => { mapInstance.current?.remove(); mapInstance.current = null; }, []);

  const openInMaps = () => {
    if (!request?.provider_lat) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${request.provider_lat},${request.provider_lng}`, '_blank');
  };

  const hasProviderLocation = !!(request?.provider_lat && request?.provider_lng);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 640, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={18} color={PRIMARY} />
            <span style={{ fontWeight: 900, fontSize: '1rem' }}>{isProvider ? 'Share Your Location' : 'Track Provider'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div ref={mapRef} style={{ flex: 1, background: '#111' }} />

        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '0.78rem', color: hasProviderLocation ? SUCCESS : '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} />
            {hasProviderLocation ? 'Live location active' : (isProvider ? 'Sharing your location...' : 'Waiting for provider location...')}
          </div>
          {!isProvider && hasProviderLocation && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={openInMaps}
              style={{ padding: '0.6rem 1.1rem', borderRadius: 100, background: `linear-gradient(90deg,${PRIMARY},#4f46e5)`, color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
              Open in Maps
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LiveTrackingModal;
