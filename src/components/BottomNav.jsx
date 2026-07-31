import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, User, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const navItems = [
    { name: 'Dashboard', path: '/customer-dashboard', icon: <Home size={22} /> },
    { name: 'Search', path: '/search', icon: <Search size={22} /> },
    { name: 'Activity', path: '/customer-dashboard', state: { tab: 'bookings' }, icon: <Calendar size={22} /> },
    { name: 'Profile', path: '/profile', icon: <User size={22} /> },
  ];

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="mobile-only bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            state={item.state}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <aside className="desktop-only sidebar-nav">
        <div style={{ padding: '2rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'white' }}>
            <LayoutGrid color="var(--primary)" size={24} />
            <span style={{ fontWeight: '900', letterSpacing: '1px', fontSize: '1.2rem' }}>DASHBOARD</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              state={item.state}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <div className="icon-box">{item.icon}</div>
              <span className="label-text">{item.name}</span>
              <motion.div 
                layoutId="sidebar-hover"
                className="active-indicator"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </NavLink>
          ))}
        </nav>
      </aside>

      <style>{`
        /* Sidebar Styling */
        .sidebar-nav {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: rgba(10, 10, 10, 0.6);
          backdrop-filter: blur(30px);
          border-right: 1px solid var(--border);
          z-index: 1001;
          display: flex;
          flex-direction: column;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          padding: 1rem 1.5rem;
          color: var(--text-dim);
          text-decoration: none;
          font-weight: 700;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .sidebar-item:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .sidebar-item.active {
          color: white;
          background: rgba(59, 130, 246, 0.1);
        }

        .sidebar-item.active .icon-box {
          color: var(--primary);
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
        }

        .sidebar-item.active .active-indicator {
          position: absolute;
          left: 0;
          width: 4px;
          height: 20px;
          background: var(--primary);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 15px var(--primary);
        }

        .icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .label-text {
          font-size: 0.95rem;
          letter-spacing: 0.3px;
        }
      `}</style>
    </>
  );
};

export default BottomNav;
