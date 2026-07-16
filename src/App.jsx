import React, { useState, useEffect } from 'react';
import { initDb, authService } from './db/storage';
import { supabase, isSupabaseConfigured } from './db/supabaseClient';

// Component imports
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PhoneManager from './components/PhoneManager';
import PhoneDetail from './components/PhoneDetail';
import CustomerSupplierManager from './components/CustomerSupplierManager';
import RepairManager from './components/RepairManager';
import ExpenseManager from './components/ExpenseManager';
import Reports from './components/Reports';
import SettingsPage from './components/Settings';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Phone Detail Modal State
  const [selectedPhoneId, setSelectedPhoneId] = useState(null);
  const [openPhoneDetail, setOpenPhoneDetail] = useState(false);

  // Initialize DB and Check Authentication
  useEffect(() => {
    initDb();
    setIsLoggedIn(authService.checkSession());

    // Register PWA Service Worker for offline capability
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            console.log('PWA Service Worker registered successfully with scope: ', reg.scope);
          })
          .catch(err => {
            console.warn('PWA Service Worker registration failed: ', err);
          });
      });
    }
  }, []);

  // Supabase Cloud Synchronisation Polling Loop
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const pullFromCloud = async () => {
      try {
        const { data, error } = await supabase
          .from('tys_data')
          .select('*');
          
        if (error) {
          console.error("Supabase pull error:", error);
          return;
        }

        if (data && data.length > 0) {
          let updated = false;
          data.forEach(row => {
            const localVal = localStorage.getItem(row.key);
            const remoteValStr = JSON.stringify(row.value);
            if (localVal !== remoteValStr) {
              localStorage.setItem(row.key, remoteValStr);
              updated = true;
            }
          });
          
          if (updated) {
            window.dispatchEvent(new Event('tys_db_update'));
          }
        }
      } catch (err) {
        console.error("Supabase connection error during sync:", err);
      }
    };

    // Initial pull
    pullFromCloud();

    // Check for updates every 10 seconds (Polling)
    const interval = setInterval(pullFromCloud, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
  };

  // Render correct page component based on router state
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            setActivePage={setActivePage} 
            setSelectedPhoneId={setSelectedPhoneId} 
            setOpenPhoneDetail={setOpenPhoneDetail} 
          />
        );
      case 'phones':
        return (
          <PhoneManager 
            globalSearchQuery={globalSearchQuery} 
            setSelectedPhoneId={setSelectedPhoneId} 
            setOpenPhoneDetail={setOpenPhoneDetail}
            activePage={activePage}
          />
        );
      case 'contacts':
        return <CustomerSupplierManager activePage={activePage} globalSearchQuery={globalSearchQuery} />;
      case 'repairs':
        return <RepairManager activePage={activePage} globalSearchQuery={globalSearchQuery} />;
      case 'expenses':
        return <ExpenseManager activePage={activePage} globalSearchQuery={globalSearchQuery} />;
      case 'reports':
        return <Reports activePage={activePage} />;
      case 'settings':
        return <SettingsPage activePage={activePage} />;
      default:
        return (
          <Dashboard 
            setActivePage={setActivePage} 
            setSelectedPhoneId={setSelectedPhoneId} 
            setOpenPhoneDetail={setOpenPhoneDetail} 
          />
        );
    }
  };

  // If session is unauthenticated, redirect to Login
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated Layout
  return (
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      onLogout={handleLogout}
      globalSearchQuery={globalSearchQuery}
      setGlobalSearchQuery={setGlobalSearchQuery}
    >
      {renderPage()}

      {/* Global Phone Detail slide-in/modal overlay */}
      {openPhoneDetail && selectedPhoneId && (
        <PhoneDetail 
          phoneId={selectedPhoneId} 
          onClose={() => setOpenPhoneDetail(false)}
          onDataChanged={() => {
            // Force active page reloading by quickly toggling page trigger or using reload callbacks
            const current = activePage;
            setActivePage('');
            setTimeout(() => setActivePage(current), 10);
          }}
        />
      )}
    </Layout>
  );
}
