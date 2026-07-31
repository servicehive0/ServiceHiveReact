import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import NoInternetOverlay from './components/NoInternetOverlay';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import CustomerDashboard from './pages/CustomerDashboard';
import ServicesPage from './pages/ServicesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import MaintenancePage from './pages/MaintenancePage';

import Footer from './components/Footer';

import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminLogin from './pages/AdminLogin';
import PendingApproval from './pages/PendingApproval';

// Gates customer/provider login, register, and every logged-in customer/
// provider screen behind maintenance mode — admin routes stay open so an
// admin can always get in (and stay in) to toggle it back off. Realtime
// subscription means an already-open tab flips to/from the maintenance
// page live, no refresh needed.
const useMaintenanceStatus = () => {
  const [state, setState] = useState({ loading: true, on: false, message: '' });

  const fetchStatus = () => {
    supabase.from('platform_settings').select('maintenance_mode, maintenance_message').eq('id', 1).single()
      .then(({ data }) => setState({
        loading: false,
        on: !!data?.maintenance_mode,
        message: data?.maintenance_message || '',
      }));
  };

  useEffect(() => {
    fetchStatus();
    const channel = supabase.channel('maintenance_gate_watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings' }, fetchStatus)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { ...state, fetchStatus };
};

const MaintenanceGate = ({ children }) => {
  const { loading, on, message, fetchStatus } = useMaintenanceStatus();
  if (loading) return null;
  if (on) return <MaintenancePage message={message} onRecheck={fetchStatus} />;
  return children;
};

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  
  const publicPages = ['/', '/services', '/about', '/contact'];
  const isPublic = publicPages.includes(pathname);
  const isAuth = ['/login', '/register', '/admin-login', '/pending-approval'].includes(pathname);
  const isAdmin = pathname.startsWith('/admin') && pathname !== '/admin-login';
  const isProvider = pathname.startsWith('/provider-dashboard');
  // CustomerDashboard renders its own complete sidebar + bottom nav — the
  // app-level Navbar/BottomNav would double up and overlap on top of it.
  const isCustomerDashboard = pathname === '/customer-dashboard';
  const isDashboard = pathname.includes('dashboard') || pathname === '/profile' || pathname === '/search' || isAdmin || isProvider;
  // Admin & Provider have their own internal sidebars — don't add app-level sidebar CSS offset
  const hasAppSidebar = isDashboard && !isAdmin && !isProvider && !isCustomerDashboard;

  // Admin/Provider/Customer dashboards each manage their own bottom padding
  // for their own internal bottom nav — the app-level .content padding-bottom
  // would just add unwanted extra empty space below them on mobile.
  const managesOwnPadding = isAdmin || isProvider || isCustomerDashboard;

  return (
    <div className={`app-container ${hasAppSidebar ? 'has-sidebar' : ''}`}>
      {!isAuth && !isDashboard && !isAdmin && !isProvider && <Navbar />}
      {user && isDashboard && !isAdmin && !isProvider && !isCustomerDashboard && <BottomNav />}
      <main className="content" style={managesOwnPadding ? { paddingBottom: 0 } : undefined}>
        {children}
      </main>
      {isPublic && <Footer />}
    </div>
  );
};

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={role === 'admin' ? '/admin-login' : '/login'} />;
  if (role && user.role !== role) {
    const fallback = user.role === 'admin' ? '/admin'
      : user.role === 'provider' ? '/provider-dashboard'
      : '/customer-dashboard';
    return <Navigate to={fallback} />;
  }
  // Admins keep access to their own dashboard during maintenance (they're
  // the ones who need to turn it back off) — customers/providers get gated.
  if (role === 'admin') return children;
  return <MaintenanceGate>{children}</MaintenanceGate>;
};

function App() {
  return (
    <AuthProvider>
      <NoInternetOverlay />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<MaintenanceGate><AuthPage /></MaintenanceGate>} />
            <Route path="/register" element={<MaintenanceGate><AuthPage /></MaintenanceGate>} />
            
            <Route path="/customer-dashboard" element={
              <ProtectedRoute role="user"><CustomerDashboard /></ProtectedRoute>
            } />

            <Route path="/search" element={
              <ProtectedRoute><SearchPage /></ProtectedRoute>
            } />

            {/* Legacy direct-booking routes — kept alive as redirects (not
                deleted) so any existing links/bookmarks still land somewhere
                useful, in the current bidding-based flow, instead of 404ing
                or opening the retired BookingFlow/BookingsPage wizards. */}
            <Route path="/bookings" element={
              <Navigate to="/customer-dashboard" state={{ tab: 'bookings' }} replace />
            } />

            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />

             <Route path="/book/:serviceId" element={
              <Navigate to="/customer-dashboard" replace />
            } />

             <Route path="/provider-dashboard" element={
               <ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>
             } />

            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/pending-approval" element={<PendingApproval />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
