import React, { useState, useEffect } from 'react';
import { KeyRound, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { authService } from '../db/services/authService';
import { isSupabaseConfigured } from '../db/supabaseClient';

export default function Login({ onLoginSuccess }) {
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Setup State
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const configured = authService.isLocalAdminConfigured();
      setIsSetupNeeded(!configured);
    }
  }, []);

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!setupUsername.trim()) {
      setError('Lütfen yönetici kullanıcı adını girin.');
      return;
    }
    if (setupPassword.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      await authService.setupInitialLocalAdmin(setupUsername, setupPassword);
      setLoading(false);
      setIsSetupNeeded(false);
      setUsername(setupUsername);
      setPassword('');
      setError('');
      alert('Yönetici hesabı başarıyla oluşturuldu. Lütfen giriş yapın.');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Yönetici hesabı oluşturulamadı.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('E-posta / Kullanıcı adı ve şifre alanları boş bırakılamaz.');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(username, password, rememberMe);
      setLoading(false);
      
      if (result.success) {
        onLoginSuccess();
      } else {
        setError('Hatalı kullanıcı adı/e-posta veya şifre!');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Google ile giriş yapılamadı.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-br from-indigo-500/10 via-teal-500/5 to-transparent">
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            {isSetupNeeded ? 'İlk Kurulum: Yönetici Hesabı' : 'Giriş Yap'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Telefon Stok & Cari Takip Sistemi
          </p>
        </div>

        {/* Body */}
        {isSetupNeeded ? (
          <form onSubmit={handleSetupSubmit} className="px-8 pb-8 space-y-5">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              Sisteminizde kayıtlı bir yönetici hesabı bulunamadı. Lütfen kullanacağınız kullanıcı adı ve şifrenizi belirleyin.
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Yönetici Kullanıcı Adı *
              </label>
              <input
                type="text"
                required
                value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)}
                placeholder="Örn: admin"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Şifre (En az 6 Karakter) *
              </label>
              <input
                type="password"
                required
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Şifre Tekrar *
              </label>
              <input
                type="password"
                required
                value={setupConfirmPassword}
                onChange={(e) => setSetupConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
              ) : (
                'Hesabı Oluştur ve Kaydet'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                E-posta veya Kullanıcı Adı
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Şifre
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <KeyRound size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:bg-slate-800 w-4.5 h-4.5"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Beni Hatırla</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
              ) : (
                'Giriş Yap'
              )}
            </button>

            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-slate-800 font-semibold bg-white border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
              >
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
                Google ile Giriş Yap
              </button>
            )}
          </form>
        )}

      </div>
    </div>
  );
}
