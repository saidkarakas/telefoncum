import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const STORAGE_KEYS = {
  PHONES: 'tys_phones',
  CUSTOMERS: 'tys_customers',
  SUPPLIERS: 'tys_suppliers',
  TRANSACTIONS: 'tys_transactions',
  EXPENSES: 'tys_expenses',
  REPAIRS: 'tys_repairs',
  SETTINGS: 'tys_settings',
  AUTH: 'tys_auth_session',
  AUDIT_LOG: 'tys_audit_log'
};

// Helper: Get item from LocalStorage
export const getJson = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

// Helper: Sync data to Supabase in the background
export const syncToCloud = async (key, data) => {
  if (!isSupabaseConfigured) return;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const owner_id = authData?.user?.id;
    if (!owner_id) return;

    const { error } = await supabase
      .from('tys_data')
      .upsert({ key, value: data, updated_at: new Date().toISOString(), owner_id });
    
    if (error) {
      console.error(`Supabase sync error for ${key}:`, error);
    }
  } catch (err) {
    console.error("Supabase sync network error:", err);
  }
};

export const logAction = async (action, entityType, entityId, oldValue, newValue) => {
  let localLogs = getJson(STORAGE_KEYS.AUDIT_LOG, []);
  
  const { data: authData } = isSupabaseConfigured ? await supabase.auth.getUser() : { data: null };
  const owner_id = authData?.user?.id || null;
  const localSession = getJson(STORAGE_KEYS.AUTH, { username: 'Bilinmeyen' });

  const newLog = {
    id: Math.random().toString(36).substring(2, 15),
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
    created_at: new Date().toISOString(),
    username: localSession.username
  };

  localLogs.unshift(newLog);
  if (localLogs.length > 500) localLogs = localLogs.slice(0, 500);
  
  // Custom manual save to avoid recursive syncToCloud loops if we hooked it there
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(localLogs));
    // Trigger local event
    window.dispatchEvent(new Event('tys_audit_log_update'));
  } catch (e) {
    console.error("Audit log kaydetme hatası", e);
  }

  // Sync to supabase if configured
  if (isSupabaseConfigured && owner_id) {
    try {
      await supabase.from('tys_audit_log').insert({
        owner_id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue
      });
    } catch (err) {
      console.error("Supabase audit log error:", err);
    }
  }
};

// Helper: Save item to LocalStorage and trigger sync to cloud
export const saveJson = (key, data) => {
  const oldValue = getJson(key, null);
  
  if (key !== STORAGE_KEYS.AUDIT_LOG && key !== STORAGE_KEYS.AUTH && Array.isArray(data) && Array.isArray(oldValue)) {
    const added = data.filter(n => !oldValue.find(o => o.id === n.id));
    added.forEach(item => logAction('CREATE', key, item.id, null, item));
    
    const deleted = oldValue.filter(o => !data.find(n => n.id === o.id));
    deleted.forEach(item => logAction('DELETE', key, item.id, item, null));
    
    const modified = data.filter(n => {
      const o = oldValue.find(old => old.id === n.id);
      return o && JSON.stringify(o) !== JSON.stringify(n);
    });
    modified.forEach(item => {
      const o = oldValue.find(old => old.id === item.id);
      logAction('UPDATE', key, item.id, o, item);
    });
  }

  localStorage.setItem(key, JSON.stringify(data));
  return syncToCloud(key, data);
};

// Helper: Secure SHA-256 Password Hasher using native browser SubtleCrypto
export const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper: Calculate phone costs, profits and aging
export const calculatePhoneCosts = (phone) => {
  const purchasePrice = Number(phone.purchasePrice || 0);
  const totalExpenses = (phone.expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalCost = purchasePrice + totalExpenses;
  const salesPrice = Number(phone.salesPrice || 0);
  const profit = phone.status === 'Satıldı' ? salesPrice - totalCost : 0;
  
  // Calculate days in stock
  const purchaseDate = new Date(phone.purchaseDate);
  const endDate = phone.status === 'Satıldı' ? new Date(phone.salesDate) : new Date();
  const diffTime = Math.abs(endDate - purchaseDate);
  const daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;

  return {
    totalExpenses,
    totalCost,
    profit,
    daysInStock
  };
};

// Initialize DB and seed demo data if empty
export const initDb = async (force = false) => {
  // 8. Auth session (default admin user: admin@telefoncum.com / 123456)
  const defaultAuth = {
    username: 'admin@telefoncum.com',
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // SHA-256 of '123456'
    isLoggedIn: false,
    role: 'admin',
    mustChangePassword: true
  };
  
  const existingUserStr = localStorage.getItem('tys_admin_user');
  if (existingUserStr) {
    try {
      const existingUser = JSON.parse(existingUserStr);
      // Eski MD5 veya sadece 'admin' olan verileri yeni asenkron SHA-256 standardına dönüştür
      if (existingUser.username === 'admin' || (existingUser.passwordHash && existingUser.passwordHash.length === 32)) {
        localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
      }
    } catch (e) {
      localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
    }
  } else {
    localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
  }

  if (!force && localStorage.getItem(STORAGE_KEYS.PHONES)) {
    return; // Already initialized
  }

  // 1. Settings
  const defaultSettings = {
    businessName: 'GigaTeknoloji Telefon Alım Satım',
    logo: '',
    currency: 'TL',
    theme: 'dark'
  };

  if (force) {
    await Promise.all([
      saveJson(STORAGE_KEYS.SETTINGS, defaultSettings),
      saveJson(STORAGE_KEYS.CUSTOMERS, []),
      saveJson(STORAGE_KEYS.SUPPLIERS, []),
      saveJson(STORAGE_KEYS.PHONES, []),
      saveJson(STORAGE_KEYS.EXPENSES, []),
      saveJson(STORAGE_KEYS.TRANSACTIONS, []),
      saveJson(STORAGE_KEYS.REPAIRS, [])
    ]);
  } else {
    saveJson(STORAGE_KEYS.SETTINGS, defaultSettings);
    saveJson(STORAGE_KEYS.CUSTOMERS, []);
    saveJson(STORAGE_KEYS.SUPPLIERS, []);
    saveJson(STORAGE_KEYS.PHONES, []);
    saveJson(STORAGE_KEYS.EXPENSES, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.REPAIRS, []);
  }
};
