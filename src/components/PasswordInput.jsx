import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ value, onChange, placeholder, className, required, name, style }) => {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className || "input-minimal"}
        required={required}
        name={name}
        style={{ paddingRight: '45px' }} // Ensure space for the icon
      />
      <div
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
          zIndex: 10,
          userSelect: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </div>
    </div>
  );
};

export default PasswordInput;
