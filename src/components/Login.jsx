import React, { useState, useEffect } from 'react';
import { KeyRound, User, Eye, EyeOff, ShieldCheck, AlertCircle, QrCode, Smartphone, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../db/services/authService';
import { isSupabaseConfigured } from '../db/supabaseClient';
import { getOtpAuthUrl, generateTotpSecret } from '../utils/totp';

export default function Login({ onLoginSuccess }) {
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Setup 2FA State
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupOtpUrl, setSetupOtpUrl] = useState('');
  const [setupVerifyCode, setSetupVerifyCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const configured = authService.isLocalAdminConfigured();
      setIsSetupNeeded(!configured);
      if (!configured) {
        const sec = generateTotpSecret(16);
        setSetupSecret(sec);
        setSetupOtpUrl(getOtpAuthUrl(sec, 'admin', 'Telefoncum'));
      }
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
    if (setupVerifyCode.trim().length !== 6) {
      setError('Lütfen Authenticator uygulamanızdaki 6 haneli doğrulama kodunu girin.');
      return;
    }

    setLoading(true);
    try {
      // Create admin user with TOTP secret
      await authService.setupInitialLocalAdmin(setupUsername, setupPassword, setupSecret);
      
      // Verify code
      const isValid = await authService.verifyTotpDirectly(setupVerifyCode);
      if (!isValid) {
        setLoading(false);
        setError('QR Kod doğrulama kodu hatalı! Lütfen Authenticator uygulamasındaki 6 haneli kodu kontrol edin.');
        return;
      }

      setLoading(false);
      setIsSetupNeeded(false);
      setUsername(setupUsername);
      setPassword('');
      setTotpCode('');
      setError('');
      alert('2FA Authenticator ve Yönetici hesabı başarıyla kuruldu!');
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
      const result = await authService.login(username, password, rememberMe, totpCode);
      setLoading(false);
      
      if (result.requires2FA) {
        setRequires2FA(true);
        setError('Lütfen Google Authenticator / Authy uygulamanızdaki 6 haneli kodu girin.');
        return;
      }

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
      const res = await authService.signInWithGoogle();
      setLoading(false);
      if (res?.success) {
        onLoginSuccess();
      }
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
            {isSetupNeeded ? '2FA QR Kod ile Kurulum' : (requires2FA ? '2FA Kod Doğrulama' : 'Giriş Yap')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Telefon Stok & Cari Takip Sistemi
          </p>
        </div>

        {/* Body */}
        {isSetupNeeded ? (
          <form onSubmit={handleSetupSubmit} className="px-8 pb-8 space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-400">
              Telefonunuzdaki <strong>Google Authenticator</strong> veya <strong>Authy</strong> uygulamasıyla aşağıdaki QR kodu okutun.
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <QRCodeSVG
                value={setupOtpUrl}
                size={160}
                level="M"
                includeMargin={true}
              />
              <div className="mt-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 tracking-widest select-all">
                Gizli Anahtar: {setupSecret}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-semibold">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Yönetici Kullanıcı Adı *
              </label>
              <input
                type="text"
                required
                value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)}
                placeholder="Örn: admin"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                  Şifre *
                </label>
                <input
                  type="password"
                  required
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                  Şifre Tekrar *
                </label>
                <input
                  type="password"
                  required
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                <QrCode size={14} /> Authenticator 6 Haneli Kod *
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={setupVerifyCode}
                onChange={(e) => setSetupVerifyCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-indigo-500 bg-transparent text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
              ) : (
                '2FA Kurulumunu Tamamla ve Giriş Yap'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 font-semibold">
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

            {/* 2FA TOTP Code Input (Shown if required or for direct input) */}
            <div className="space-y-1 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
              <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Smartphone size={16} /> Authenticator 6 Haneli Kod
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest text-lg"
              />
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

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase tracking-wider">veya</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-slate-800 dark:text-white font-semibold bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google ile Giriş Yap
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
