import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Single dropdown, styled to match AuthPage.jsx's CustomSelect (animated
// open/close, click-outside overlay) so this reads as the same design
// system wherever it's dropped in.
const Dropdown = ({ label, value, options, onChange, placeholder, disabled }) => {
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
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
        }}
      >
        <span style={{ color: value ? 'white' : '#64748b', fontSize: '0.9rem' }}>
          {value || placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
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
                backdropFilter: 'blur(10px)',
              }}
            >
              {options.map((opt) => (
                <div
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
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

// Cascading City -> Area picker fed by AuthContext.getLocations(), which
// returns [{ city, areas: [...] }] from the shared `locations`/`location_areas`
// Supabase tables (same source Flutter's LocationProvider reads). Centralizes
// the locationMap derivation and the "reset area on city change" rule that
// were previously duplicated per-screen (AuthPage.jsx, ProfilePage.jsx).
export default function LocationSelect({
  locations,
  city,
  area,
  onCityChange,
  onAreaChange,
  cityLabel = 'City',
  areaLabel = 'Area',
}) {
  const locationMap = (locations || []).reduce((acc, loc) => {
    acc[loc.city] = loc.areas || [];
    return acc;
  }, {});

  return (
    <>
      <Dropdown
        label={cityLabel}
        value={city}
        placeholder="Select City"
        options={Object.keys(locationMap)}
        onChange={(val) => { onCityChange(val); onAreaChange(''); }}
      />
      <Dropdown
        label={areaLabel}
        value={area}
        placeholder={city ? 'Select Area' : 'Select city first'}
        disabled={!city}
        options={city ? (locationMap[city] || []) : []}
        onChange={onAreaChange}
      />
    </>
  );
}
