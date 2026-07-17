import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, hashPassword } from './shared';

const LOCK_KEY = 'tys_auth_lock';

const checkLockout = () => {
  const lockDataStr = localStorage.getItem(LOCK_KEY);
  if (!lockDataStr) return null;
  const lockData = JSON.parse(lockDataStr);
  const now = new Date().getTime();
  if (lockData.lockedUntil && now < lockData.lockedUntil) {
    const remainingSecs = Math.ceil((lockData.lockedUntil - now) / 1000);
    throw new Error(`Çok fazla hatalı deneme! Lütfen ${remainingSecs} saniye bekleyin.`);
  }
  // Clear if expired
  if (lockData.lockedUntil && now >= lockData.lockedUntil) {
    localStorage.removeItem(LOCK_KEY);
    return null;
  }
  return lockData;
};

const recordFailedAttempt = () => {
  let lockData = getJson(LOCK_KEY, { attempts: 0 });
  lockData.attempts += 1;
  if (lockData.attempts >= 5) {
    lockData.lockedUntil = new Date().getTime() + 60 * 1000; // 60 seconds
  }
  saveJson(LOCK_KEY, lockData);
  if (lockData.attempts >= 5) {
    throw new Error(`Çok fazla hatalı deneme! Lütfen 60 saniye bekleyin.`);
  }
};

const clearFailedAttempts = () => {
  localStorage.removeItem(LOCK_KEY);
};

export const authService = {
  login: async (usernameOrEmail, password, rememberMe) => {
    checkLockout();

    // 1. Check Local Admin first
    const userStr = localStorage.getItem('tys_admin_user');
    let localMatched = false;
    let localUser = null;

    if (userStr) {
      localUser = JSON.parse(userStr);
      const hashedInput = await hashPassword(password);
      if (
        usernameOrEmail.trim().toLowerCase() === localUser.username.toLowerCase() && 
        hashedInput === localUser.passwordHash
      ) {
        localMatched = true;
      }
    }

    if (localMatched) {
      clearFailedAttempts();
      const session = {
        isLoggedIn: true,
        username: localUser.username,
        role: localUser.role || 'admin',
        expires: rememberMe 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
          : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime()
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return { success: true, mustChangePassword: localUser.mustChangePassword === true };
    }

    // 2. If not matched locally, try Supabase if configured and it's an email
    if (isSupabaseConfigured && usernameOrEmail.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameOrEmail.trim(),
          password: password
        });
        
        if (error) {
          recordFailedAttempt();
          throw new Error(error.message);
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
    }

    // 3. Neither matched
    recordFailedAttempt();
    return { success: false };
  },
  changeLocalPassword: async (newPassword) => {
    const userStr = localStorage.getItem('tys_admin_user');
    if (!userStr) throw new Error("Kullanıcı bulunamadı.");
    const user = JSON.parse(userStr);
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
    localStorage.removeItem(STORAGE_KEYS.AUTH);
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
