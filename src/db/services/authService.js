import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { STORAGE_KEYS, getJson, saveJson, hashPassword } from './shared';

export const authService = {
  login: async (usernameOrEmail, password, rememberMe) => {
    if (isSupabaseConfigured && usernameOrEmail.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameOrEmail.trim(),
          password: password
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        const session = {
          isLoggedIn: true,
          username: data.user.email,
          expires: rememberMe 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
            : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime(),
          userId: data.user.id
        };
        saveJson(STORAGE_KEYS.AUTH, session);
        return true;
      } catch (err) {
        console.error("Supabase Auth hatası:", err);
        throw err;
      }
    } else {
      // Local authentication fallback using secure SHA-256
      const userStr = localStorage.getItem('tys_admin_user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      
      const hashedInput = await hashPassword(password);
      if (
        usernameOrEmail.trim().toLowerCase() === user.username.toLowerCase() && 
        hashedInput === user.passwordHash
      ) {
        const session = {
          isLoggedIn: true,
          username: user.username,
          expires: rememberMe 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() 
            : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime()
        };
        saveJson(STORAGE_KEYS.AUTH, session);
        return true;
      }
      return false;
    }
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
