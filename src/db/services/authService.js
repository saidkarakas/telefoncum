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
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    const timeStr = mins > 0 ? `${mins} dk ${secs} sn` : `${secs} saniye`;
    throw new Error(`Brute-force (Saldırı) koruması aktif! Lütfen ${timeStr} bekleyin.`);
  }
  
  // Sadece süre dolmuşsa ama attemptleri tamamen sıfırlama (hemen art arda denerse diye)
  // Başarılı girişte tamamen sıfırlanıyor zaten.
  if (lockData.lockedUntil && now >= lockData.lockedUntil) {
    lockData.lockedUntil = null;
    saveJson(LOCK_KEY, lockData);
  }
  return lockData;
};

const recordFailedAttempt = () => {
  let lockData = getJson(LOCK_KEY, { attempts: 0 });
  lockData.attempts += 1;
  
  // Üstel bekleme süresi (Exponential Backoff)
  if (lockData.attempts >= 15) {
    lockData.lockedUntil = new Date().getTime() + 60 * 60 * 1000; // 1 saat kilit
    saveJson(LOCK_KEY, lockData);
    throw new Error(`Çok fazla saldırı girişimi! Sistem 1 saat kilitlendi.`);
  } else if (lockData.attempts >= 10) {
    lockData.lockedUntil = new Date().getTime() + 15 * 60 * 1000; // 15 dakika kilit
    saveJson(LOCK_KEY, lockData);
    throw new Error(`Şüpheli işlem tespiti! Sistem 15 dakika kilitlendi.`);
  } else if (lockData.attempts >= 5) {
    lockData.lockedUntil = new Date().getTime() + 60 * 1000; // 1 dakika kilit
    saveJson(LOCK_KEY, lockData);
    throw new Error(`Çok fazla hatalı deneme! Lütfen 60 saniye bekleyin.`);
  }
  
  saveJson(LOCK_KEY, lockData);
};

const clearFailedAttempts = () => {
  localStorage.removeItem(LOCK_KEY);
};

export const authService = {
  login: async (usernameOrEmail, password, rememberMe) => {
    checkLockout();

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
    } else {
      // Supabase Yoksa SADECE Yerel Admin
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
      
      recordFailedAttempt();
      return { success: false };
    }
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
