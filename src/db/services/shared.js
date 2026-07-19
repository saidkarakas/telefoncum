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

export const SECURITY_LIMITS = {
  MAX_BACKUP_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_OBJECT_DEPTH: 10,
  MAX_ARRAY_LENGTH: 10000,
  MAX_STRING_LENGTH: 500000,
  MAX_OBJECT_KEYS: 200
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

  const sensitiveFields = ['password', 'pin', 'pattern', 'screenpassword', 'devicepassword', 'accesscode', 'passwordhash'];
  
  const redact = (val) => {
    if (!val || typeof val !== 'object') return val;
    const redacted = { ...val };
    for (const k of Object.keys(redacted)) {
      if (sensitiveFields.includes(k.toLowerCase())) {
        redacted[k] = '[GİZLENDİ]';
      }
    }
    return redacted;
  };

  const newLog = {
    id: Math.random().toString(36).substring(2, 15),
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: redact(oldValue),
    new_value: redact(newValue),
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
        old_value: redact(oldValue),
        new_value: redact(newValue)
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
  // 8. Auth session (Removed default admin for security)
  // The system should rely on Supabase for auth.
  const existingUserStr = localStorage.getItem('tys_admin_user');
  if (existingUserStr && import.meta.env.DEV) {
    // Only in DEV environment we keep existing local user.
  } else {
    localStorage.removeItem('tys_admin_user');
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
