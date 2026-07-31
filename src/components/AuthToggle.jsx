import React from 'react';
import { motion } from 'framer-motion';

const AuthToggle = ({ activeMode, onChange }) => {
  return (
    <div style={{ 
      background: 'rgba(20, 20, 20, 0.8)', 
      backdropFilter: 'blur(12px)',
      padding: '4px', 
      borderRadius: '100px', 
      display: 'flex', 
      position: 'relative',
      width: '350px', 
      maxWidth: '100%',
      margin: '0 auto 2.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.05)',
      overflow: 'hidden'
    }}>
      {/* Background Slider */}
      <motion.div 
        animate={{ x: activeMode === 'login' ? 0 : '100%' }}
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

      {/* Option 1: Login */}
      <div 
        onClick={() => activeMode !== 'login' && onChange('login')}
        style={{ 
          flex: 1,
          padding: '0.8rem 0', 
          fontSize: '0.85rem', 
          fontWeight: '800', 
          color: activeMode === 'login' ? 'white' : '#64748b',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          minWidth: '50%'
        }}
      >
        Login
      </div>

      {/* Option 2: Register */}
      <div 
        onClick={() => activeMode !== 'register' && onChange('register')}
        style={{ 
          flex: 1,
          padding: '0.8rem 0', 
          fontSize: '0.85rem', 
          fontWeight: '800', 
          color: activeMode === 'register' ? 'white' : '#64748b',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          minWidth: '50%'
        }}
      >
        Register
      </div>
    </div>
  );
};

export default AuthToggle;
