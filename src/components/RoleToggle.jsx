import React from 'react';
import { motion } from 'framer-motion';

const RoleToggle = ({ activeRole, onChange }) => {
  return (
    <div style={{ 
      background: 'rgba(20, 20, 20, 0.8)', 
      backdropFilter: 'blur(12px)',
      padding: '4px', 
      borderRadius: '100px', 
      display: 'flex', 
      position: 'relative',
      width: '320px', 
      maxWidth: '100%',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.05)',
      overflow: 'hidden'
    }}>
      {/* Background Slider */}
      <motion.div 
        animate={{ x: activeRole === 'customer' ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{ 
          position: 'absolute', 
          top: '4px', 
          left: '4px', 
          bottom: '4px', 
          width: 'calc(50% - 4px)', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
          borderRadius: '100px',
          zIndex: 0,
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
        }} 
      />

      {/* Option 1: Get Service */}
      <div 
        onClick={() => activeRole !== 'customer' && onChange('customer')}
        style={{ 
          flex: 1,
          padding: '0.8rem 0', 
          fontSize: '0.85rem', 
          fontWeight: '800', 
          color: activeRole === 'customer' ? 'white' : '#64748b',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        Get Service
      </div>

      {/* Option 2: Provide Service */}
      <div 
        onClick={() => activeRole !== 'worker' && onChange('worker')}
        style={{ 
          flex: 1,
          padding: '0.8rem 0', 
          fontSize: '0.85rem', 
          fontWeight: '800', 
          color: activeRole === 'worker' ? 'white' : '#64748b',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        Provide Service
      </div>
    </div>
  );
};

export default RoleToggle;


