import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, hashPassword } from './shared';

const LOCK_KEY = 'tys_auth_lock';

const checkLockout = () => {
  // Korumalar kaldırıldı
  return null;
};

const recordFailedAttempt = () => {
  // Korumalar kaldırıldı
};

const clearFailedAttempts = () => {
  localStorage.removeItem(LOCK_KEY);
};

export const authService = {
  login: async (usernameOrEmail, password, rememberMe) => {
    checkLockout();

    // --- SABİT KULLANICI GİRİŞİ (HARDCODED) ---
    if (usernameOrEmail.trim() === 'mustafasaidkaraka@gmail.com' && password === 'cruzerblade') {
      const session = {
        isLoggedIn: true,
        username: 'mustafasaidkaraka@gmail.com',
        role: 'admin',
        expires: rememberMe 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
          : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
        userId: 'local-admin-id'
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return { success: true, mustChangePassword: false };
    }
    // ------------------------------------------

    if (isSupabaseConfigured) {
      // SADECE Supabase girişi
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
    // Güvenlik için: Çıkış yapıldığında telefondaki/bilgisayardaki TÜM verileri (önbelleği) sil!
    localStorage.clear();
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
