import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Wrench,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Search,
  Menu,
  X,
  User
} from 'lucide-react';
import { settingsService } from '../db/services/settingsService';

export default function Layout({ 
  children, 
  activePage, 
  setActivePage, 
  onLogout, 
  globalSearchQuery, 
  setGlobalSearchQuery 
}) {
  const [theme, setTheme] = useState('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState({ businessName: 'Telefon Yönetim Sistemi' });

  // Load Settings
  useEffect(() => {
    const loadSettings = () => {
      const activeSettings = settingsService.get();
      setSettings(activeSettings);
      setTheme(activeSettings.theme || 'dark');
    };
    loadSettings();
    window.addEventListener('tys_db_update', loadSettings);
    return () => window.removeEventListener('tys_db_update', loadSettings);
  }, [activePage]);

  // Handle dark mode DOM changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to settings
    const activeSettings = settingsService.get();
    if (activeSettings.theme !== theme) {
      settingsService.save({ ...activeSettings, theme });
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
    { id: 'phones', label: 'Stok (Cihazlar)', icon: Smartphone },
    { id: 'contacts', label: 'Cari & Kişiler', icon: Users },
    { id: 'repairs', label: 'Tamir Takibi', icon: Wrench },
    { id: 'expenses', label: 'Genel Giderler', icon: Receipt },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-850">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/35">
            T
          </div>
          <span className="font-bold text-base tracking-tight truncate">
            {settings.businessName}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogOut size={18} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* MOBILE MENU MODAL DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-sm">
          <div className="w-64 bg-white dark:bg-slate-900 h-full p-5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold truncate text-slate-800 dark:text-white">
                {settings.businessName}
              </span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              onClick={onLogout}
              className="mt-auto w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <LogOut size={18} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
          
          {/* Left Side: Mobile burger button & Page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-850 dark:text-white capitalize tracking-tight">
              {menuItems.find(item => item.id === activePage)?.label || 'Yönetim'}
            </h1>
          </div>

          {/* Center Side: Quick Global Search Box */}
          <div className="hidden sm:flex items-center relative w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                if (['dashboard', 'reports', 'settings'].includes(activePage) && e.target.value.trim() !== '') {
                  setActivePage('phones');
                }
              }}
              placeholder="IMEI, Model, Müşteri, Seri No Ara..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Right Side: Theme switcher & Logout */}
          <div className="flex items-center gap-2">
            
            {/* Theme switcher (Modern Sliding Pill Switch) */}
            <button
              onClick={toggleTheme}
              className="relative h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 transition-colors duration-300 focus:outline-none cursor-pointer flex items-center shadow-inner"
              title={theme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
            >
              {/* Slider Indicator */}
              <div 
                className="absolute h-6 w-6 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 flex items-center justify-center"
                style={{
                  transform: theme === 'dark' ? 'translateX(26px)' : 'translateX(2px)'
                }}
              >
                {theme === 'dark' ? (
                  <Moon size={11} className="text-indigo-400 fill-indigo-400/20" />
                ) : (
                  <Sun size={11} className="text-amber-500 fill-amber-500/20" />
                )}
              </div>
              
              {/* Icons in Background */}
              <div className="flex justify-between w-full px-2 pointer-events-none select-none">
                <Sun size={10} className={`transition-opacity duration-300 ${theme === 'dark' ? 'text-slate-500 opacity-40' : 'opacity-0'}`} />
                <Moon size={10} className={`transition-opacity duration-300 ${theme === 'dark' ? 'opacity-0' : 'text-slate-400 opacity-40'}`} />
              </div>
            </button>

            {/* Business Logo Indicator or User Initials */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/10">
              <User size={16} />
            </div>
          </div>
        </header>

        {/* Global Search Banner for small viewports */}
        <div className="block sm:hidden px-4 pt-3 no-print">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                if (['dashboard', 'reports', 'settings'].includes(activePage) && e.target.value.trim() !== '') {
                  setActivePage('phones');
                }
              }}
              placeholder="IMEI, Model, Müşteri Ara..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-850 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Dashboard Main Page Body */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center md:hidden z-30 no-print">
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center gap-1 text-slate-500 cursor-pointer ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
        {/* Logout as a smaller navigation item on mobile settings, or settings button */}
        <button
          onClick={() => setActivePage('settings')}
          className={`flex flex-col items-center gap-1 text-slate-500 cursor-pointer ${
            activePage === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Settings size={18} />
          <span className="text-[10px] font-semibold">Ayarlar</span>
        </button>
      </nav>
    </div>
  );
}
