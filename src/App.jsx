import React, { useState, useEffect } from 'react';
import { initDb, mergeCollections, flushPendingSync, getJson, STORAGE_KEYS } from './db/services/shared';
import { authService } from './db/services/authService';
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
import PartsManager from './components/PartsManager';
import InstallmentManager from './components/InstallmentManager';
import TradeInManager from './components/TradeInManager';

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
    
    const checkAuth = async () => {
      try {
        if (!authService.isLocalAdminConfigured()) {
          console.log("Test için varsayılan kullanıcı oluşturuluyor: test@test.com / 123456");
          await authService.setupInitialLocalAdmin('test@test.com', '123456');
        }
      } catch (e) {
        console.error("Test kullanıcısı oluşturulurken hata:", e);
      }

      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } else {
        setIsLoggedIn(authService.checkSession());
      }
    };
    checkAuth();

    let authListener;
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session);
      });
      authListener = subscription;
    }

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

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  // Supabase Cloud Synchronisation & Merge Logic (Requirement 10)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const pullFromCloud = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const owner_id = authData?.user?.id;
        if (!owner_id) return;

        // Requirement 10: Flush offline queue when online
        await flushPendingSync();

        const { data, error } = await supabase
          .from('tys_data')
          .select('*')
          .eq('owner_id', owner_id);
          
        if (error) {
          console.error("Supabase pull error:", error);
          return;
        }

        if (data && data.length > 0) {
          let updated = false;
          data.forEach(row => {
            if (row.key === STORAGE_KEYS.AUTH || row.key === STORAGE_KEYS.PENDING_SYNC) return;

            const localValStr = localStorage.getItem(row.key);
            let localVal = null;
            try {
              localVal = localValStr ? JSON.parse(localValStr) : null;
            } catch (e) {}

            const remoteVal = row.value;

            // Handle Settings (Object) vs Data Collections (Array)
            if (row.key === STORAGE_KEYS.SETTINGS) {
              const mergedSettings = { ...(localVal || {}), ...(remoteVal || {}) };
              const mergedStr = JSON.stringify(mergedSettings);
              if (localValStr !== mergedStr) {
                localStorage.setItem(row.key, mergedStr);
                updated = true;
              }
            } else if (Array.isArray(localVal) || Array.isArray(remoteVal)) {
              // Safe Merge for Arrays (Collections)
              const safeLocal = Array.isArray(localVal) ? localVal : [];
              const safeRemote = Array.isArray(remoteVal) ? remoteVal : [];
              const merged = mergeCollections(safeLocal, safeRemote);
              const mergedStr = JSON.stringify(merged);
              if (localValStr !== mergedStr) {
                localStorage.setItem(row.key, mergedStr);
                updated = true;
              }
            } else {
              // Fallback for simple values
              const remoteValStr = JSON.stringify(remoteVal);
              if (localValStr !== remoteValStr) {
                localStorage.setItem(row.key, remoteValStr);
                updated = true;
              }
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

    // Re-sync on internet reconnection
    const handleOnline = () => {
      pullFromCloud();
    };
    window.addEventListener('online', handleOnline);

    // Supabase Realtime Subscription
    let subscription;
    if (isSupabaseConfigured) {
      subscription = supabase
        .channel('public:tys_data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tys_data' }, () => {
          pullFromCloud();
        })
        .subscribe();
    }

    const interval = setInterval(pullFromCloud, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [isLoggedIn]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setActivePage('dashboard');
  };

  const handleLogout = async () => {
    await authService.logout();
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
      case 'parts':
        return <PartsManager globalSearchQuery={globalSearchQuery} />;
      case 'installments':
        return <InstallmentManager setActivePage={setActivePage} />;
      case 'trades':
        return <TradeInManager globalSearchQuery={globalSearchQuery} />;
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
            const current = activePage;
            setActivePage('');
            setTimeout(() => setActivePage(current), 10);
          }}
        />
      )}
    </Layout>
  );
}
