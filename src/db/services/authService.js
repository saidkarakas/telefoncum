import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, pbkdf2Hash, verifyPbkdf2, generateUUID } from './shared';
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
    const users = getJson(STORAGE_KEYS.USERS, []);
    const userStr = localStorage.getItem('tys_admin_user');
    return users.length > 0 || Boolean(userStr);
  },

  getAllUsers: () => {
    const users = getJson(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
      const adminStr = localStorage.getItem('tys_admin_user');
      if (adminStr) {
        try {
          const adminObj = JSON.parse(adminStr);
          return [{
            id: 'legacy-admin',
            email: adminObj.username,
            role: 'admin',
            totpSecret: adminObj.totpSecret,
            createdAt: adminObj.createdAt || new Date().toISOString()
          }];
        } catch (e) {}
      }
    }
    return users.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt }));
  },

  generateUser2FADetails: (email) => {
    const cleanEmail = (email || 'kullanici').trim().toLowerCase();
    const secret = generateTotpSecret(16);
    const otpAuthUrl = getOtpAuthUrl(secret, cleanEmail, 'Telefoncum');
    return { secret, otpAuthUrl, email: cleanEmail };
  },

  registerUser: async (email, password, totpSecret = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Geçerli bir e-posta adresi girmelisiniz.');
    }
    if (!password || password.length < 6) {
      throw new Error('Şifreniz en az 6 karakter olmalıdır.');
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              totpSecret: totpSecret || generateTotpSecret(16)
            }
          }
        });

        if (error && !error.message.includes('User already registered')) {
          console.warn("Supabase SignUp uyarısı:", error.message);
          // If signUp fails, proceed with local account registration
        }
      } catch (e) {
        console.warn("Supabase SignUp bağlantı uyarısı:", e);
      }
    }

    const users = getJson(STORAGE_KEYS.USERS, []);
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    const { combined } = await pbkdf2Hash(password);
    const secret = totpSecret || generateTotpSecret(16);

    const newUser = {
      id: generateUUID(),
      email: cleanEmail,
      passwordHash: combined,
      role: users.length === 0 ? 'admin' : 'staff',
      totpSecret: secret,
      createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }
    await saveJson(STORAGE_KEYS.USERS, users);

    // If first user, also save as primary admin
    if (users.length === 1) {
      localStorage.setItem('tys_admin_user', JSON.stringify({
        username: cleanEmail,
        passwordHash: combined,
        totpSecret: secret,
        role: 'admin'
      }));
    }

    return newUser;
  },

  setupInitialLocalAdmin: async (username, password, totpSecret = null) => {
    return await authService.registerUser(username, password, totpSecret);
  },

  login: async (emailOrUsername, password, rememberMe, totpCode = null) => {
    checkLockout();

    const cleanInput = (emailOrUsername || '').trim().toLowerCase();
    if (!cleanInput || !password) {
      throw new Error('E-posta / kullanıcı adı ve şifre girmek zorunludur.');
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanInput,
          password: password
        });

        if (error) {
          // If Supabase password login fails, check if user exists in local database with 2FA
          const users = getJson(STORAGE_KEYS.USERS, []);
          const localUser = users.find(u => u.email.toLowerCase() === cleanInput);
          if (localUser && await verifyPbkdf2(password, localUser.passwordHash)) {
            if (localUser.totpSecret && totpCode) {
              const isValidTotp = await verifyTotpCode(localUser.totpSecret, totpCode);
              if (!isValidTotp) {
                recordFailedAttempt();
                throw new Error('Geçersiz Authenticator doğrulama kodu! Lütfen telefonunuzdaki 6 haneli kodu kontrol edin.');
              }
            }
            clearFailedAttempts();
            const session = {
              isLoggedIn: true,
              username: localUser.email,
              role: localUser.role || 'admin',
              expires: rememberMe 
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
                : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
              userId: localUser.id || 'local-user-id'
            };
            saveJson(STORAGE_KEYS.AUTH, session);
            return { success: true };
          }

          recordFailedAttempt();
          throw new Error(error.message || 'Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.');
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
      // Offline multi-user authentication with individual 2FA secrets
      const users = getJson(STORAGE_KEYS.USERS, []);
      let user = users.find(u => u.email.toLowerCase() === cleanInput);

      // Fallback for legacy admin
      if (!user) {
        const adminStr = localStorage.getItem('tys_admin_user');
        if (adminStr) {
          try {
            const adminObj = JSON.parse(adminStr);
            if (adminObj.username.toLowerCase() === cleanInput) {
              user = adminObj;
            }
          } catch (e) {}
        }
      }

      if (!user) {
        recordFailedAttempt();
        throw new Error('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.');
      }

      const isMatch = await verifyPbkdf2(password, user.passwordHash);
      if (!isMatch) {
        recordFailedAttempt();
        throw new Error('Hatalı e-posta veya şifre.');
      }

      // Check user's specific 2FA Authenticator code
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
        username: user.email || user.username,
        role: user.role || 'admin',
        expires: rememberMe 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
          : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
        userId: user.id || 'local-user-id'
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return { success: true };
    }
  },

  verifyTotpForEmail: async (email, totpCode) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const users = getJson(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user || !user.totpSecret) return false;
    return await verifyTotpCode(user.totpSecret, totpCode);
  },

  verifyTotpDirectly: async (totpCode) => {
    const adminStr = localStorage.getItem('tys_admin_user');
    if (!adminStr) return false;
    const user = JSON.parse(adminStr);
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
        username: 'google.user@gmail.com',
        role: 'admin',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
        userId: 'google-local-user-id',
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
