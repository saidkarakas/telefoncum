import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, pbkdf2Hash, verifyPbkdf2 } from './shared';
import { generateTotpSecret, verifyTotpCode, getOtpAuthUrl } from '../../utils/totp';

const LOCK_KEY = 'tys_auth_lock';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000; // 30 seconds

const checkLockout = () => {
  const lockData = getJson(LOCK_KEY, null);
  if (!lockData) return null;

  if (lockData.attempts >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((lockData.lockUntil - Date.now()) / 1000);
    if (remainingTime > 0) {
      throw new Error(`Çok fazla başarısız giriş denemesi. Lütfen ${remainingTime} saniye bekleyin.`);
    } else {
      clearFailedAttempts();
    }
  }
  return null;
};

const recordFailedAttempt = () => {
  const lockData = getJson(LOCK_KEY, { attempts: 0, lockUntil: 0 });
  const attempts = lockData.attempts + 1;
  const lockUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
  saveJson(LOCK_KEY, { attempts, lockUntil });
};

const clearFailedAttempts = () => {
  localStorage.removeItem(LOCK_KEY);
};

export const authService = {
  isLocalAdminConfigured: () => {
    const userStr = localStorage.getItem('tys_admin_user');
    return Boolean(userStr);
  },

  getTotpDetails: () => {
    const userStr = localStorage.getItem('tys_admin_user');
    let user = userStr ? JSON.parse(userStr) : null;
    let secret = user?.totpSecret;

    if (!secret) {
      secret = generateTotpSecret(16);
      if (user) {
        user.totpSecret = secret;
        localStorage.setItem('tys_admin_user', JSON.stringify(user));
      }
    }

    const accountName = user?.username || 'admin';
    const otpAuthUrl = getOtpAuthUrl(secret, accountName, 'Telefoncum');
    return { secret, otpAuthUrl, accountName, isEnabled: !!user?.totpEnabled };
  },

  setupInitialLocalAdmin: async (username, password, totpSecret = null) => {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || !password || password.length < 6) {
      throw new Error('Yönetici kullanıcı adı ve en az 6 karakterli şifre girmek zorunludur.');
    }
    const { combined } = await pbkdf2Hash(password);
    const secret = totpSecret || generateTotpSecret(16);

    const user = {
      username: cleanUsername,
      passwordHash: combined,
      role: 'admin',
      totpSecret: secret,
      totpEnabled: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('tys_admin_user', JSON.stringify(user));
    return user;
  },

  login: async (usernameOrEmail, password, rememberMe, totpCode = null) => {
    checkLockout();

    const cleanUsername = (usernameOrEmail || '').trim();
    if (!cleanUsername || !password) {
      throw new Error('Kullanıcı adı/e-posta ve şifre girmek zorunludur.');
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanUsername,
          password: password
        });

        if (error) {
          recordFailedAttempt();
          throw new Error(error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }

        clearFailedAttempts();
        const session = {
          isLoggedIn: true,
          username: data.user.email,
          role: data.user.user_metadata?.role || 'admin',
          expires: rememberMe 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
            : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
          userId: data.user.id
        };
        saveJson(STORAGE_KEYS.AUTH, session);
        return { success: true };
      } catch (err) {
        console.error("Supabase Auth hatası:", err);
        throw err;
      }
    } else {
      // Offline local authentication with TOTP 2FA Authenticator check
      const userStr = localStorage.getItem('tys_admin_user');
      if (!userStr) {
        throw new Error('Yönetici hesabı henüz tanımlanmamış. Lütfen ilk kurulumu yapın.');
      }

      const user = JSON.parse(userStr);
      const isMatch = (cleanUsername.toLowerCase() === user.username.toLowerCase()) && 
        await verifyPbkdf2(password, user.passwordHash);

      if (!isMatch) {
        recordFailedAttempt();
        throw new Error('Hatalı kullanıcı adı veya şifre.');
      }

      // Check TOTP Authenticator code if enabled or configured
      if (user.totpSecret) {
        if (!totpCode || totpCode.trim() === '') {
          return { requires2FA: true, secret: user.totpSecret };
        }

        const isValidTotp = await verifyTotpCode(user.totpSecret, totpCode);
        if (!isValidTotp) {
          recordFailedAttempt();
          throw new Error('Geçersiz Authenticator doğrulama kodu! Lütfen telefonunuzdaki 6 haneli kodu kontrol edin.');
        }
      }

      clearFailedAttempts();
      const session = {
        isLoggedIn: true,
        username: user.username,
        role: user.role || 'admin',
        expires: rememberMe 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
          : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
        userId: 'local-admin-id'
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return { success: true };
    }
  },

  verifyTotpDirectly: async (totpCode) => {
    const userStr = localStorage.getItem('tys_admin_user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (!user.totpSecret) return false;
    return await verifyTotpCode(user.totpSecret, totpCode);
  },

  // Google OAuth Integration
  signInWithGoogle: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Google OAuth hatası:', error);
        throw new Error(error.message || 'Google ile giriş başlatılamadı.');
      }

      if (data?.url) {
        window.location.href = data.url;
      }

      return data;
    } else {
      clearFailedAttempts();
      const session = {
        isLoggedIn: true,
        username: 'google.admin@gmail.com',
        role: 'admin',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
        userId: 'google-local-admin-id',
        provider: 'google'
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return { success: true };
    }
  },

  changeLocalPassword: async (newPassword) => {
    const userStr = localStorage.getItem('tys_admin_user');
    if (!userStr) throw new Error('Yönetici hesabı bulunamadı.');
    let user = JSON.parse(userStr);
    const { combined } = await pbkdf2Hash(newPassword);
    user.passwordHash = combined;
    localStorage.setItem('tys_admin_user', JSON.stringify(user));
    return true;
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase çıkış hatası:", err);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(LOCK_KEY);
  },

  checkSession: () => {
    const session = getJson(STORAGE_KEYS.AUTH, null);
    if (!session) return false;
    if (new Date().getTime() > session.expires) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      return false;
    }
    return true;
  }
};
