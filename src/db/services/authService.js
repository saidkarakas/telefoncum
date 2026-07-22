import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, hashPassword } from './shared';

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
  login: async (usernameOrEmail, password, rememberMe) => {
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
        return { success: true, mustChangePassword: false };
      } catch (err) {
        console.error("Supabase Auth hatası:", err);
        throw err;
      }
    } else {
      // Offline local authentication check using stored password hash
      const userStr = localStorage.getItem('tys_admin_user');
      let user = userStr ? JSON.parse(userStr) : null;

      // Default initial local account setup if none exists
      if (!user) {
        const defaultHash = await hashPassword('admin123');
        user = {
          username: 'admin',
          passwordHash: defaultHash,
          role: 'admin',
          mustChangePassword: true
        };
        localStorage.setItem('tys_admin_user', JSON.stringify(user));
      }

      const inputHash = await hashPassword(password);
      const isMatch = (cleanUsername.toLowerCase() === user.username.toLowerCase() || cleanUsername.toLowerCase() === 'admin') && inputHash === user.passwordHash;

      if (!isMatch) {
        recordFailedAttempt();
        throw new Error('Hatalı kullanıcı adı veya şifre.');
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
      return { success: true, mustChangePassword: !!user.mustChangePassword };
    }
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase yapılandırması eksik. Lütfen .env dosyasını kontrol edin.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error('Google OAuth hatası:', error);
      throw new Error(error.message);
    }

    if (data?.url) {
      window.location.href = data.url;
    }

    return data;
  },

  changeLocalPassword: async (newPassword) => {
    const userStr = localStorage.getItem('tys_admin_user');
    let user = userStr ? JSON.parse(userStr) : { username: 'admin', role: 'admin' };
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
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
    // DO NOT use localStorage.clear()! Only clear auth session data.
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
