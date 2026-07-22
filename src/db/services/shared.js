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
  AUDIT_LOG: 'tys_audit_log',
  PARTS: 'tys_parts',
  STOCK_MOVEMENTS: 'tys_stock_movements',
  INSTALLMENTS: 'tys_installments',
  TRADE_INS: 'tys_trade_ins',
  CASH_MOVEMENTS: 'tys_cash_movements',
  PENDING_SYNC: 'tys_pending_sync'
};

export const SECURITY_LIMITS = {
  MAX_BACKUP_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_OBJECT_DEPTH: 10,
  MAX_ARRAY_LENGTH: 10000,
  MAX_STRING_LENGTH: 500000,
  MAX_OBJECT_KEYS: 200
};

// Helper: Safe UUID Generator
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
};

// Helper: Parse number with 2 decimal precision
export const parseNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Helper: Validate non-negative numbers explicitly
export const validateNonNegative = (val, fieldName = 'Tutar') => {
  const num = parseNumber(val);
  if (num < 0) {
    throw new Error(`${fieldName} negatif olamaz.`);
  }
  return num;
};

// Legacy safeNumber wrapper
export const safeNumber = (val, allowNegative = false) => {
  if (allowNegative) return parseNumber(val);
  return validateNonNegative(val < 0 ? 0 : val);
};

export const round2 = (val) => parseNumber(val);

// Helper: Get item from LocalStorage
export const getJson = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
};

// Pending sync queue management
export const addToPendingSync = (key) => {
  const queue = getJson(STORAGE_KEYS.PENDING_SYNC, []);
  if (!queue.includes(key)) {
    queue.push(key);
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
  }
};

export const removeFromPendingSync = (key) => {
  const queue = getJson(STORAGE_KEYS.PENDING_SYNC, []);
  const updated = queue.filter(k => k !== key);
  localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(updated));
};

// Helper: Sync data to Supabase with offline queue and retry
export const syncToCloud = async (key, data) => {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const owner_id = authData?.user?.id;
    if (!owner_id) return false;

    const { error } = await supabase
      .from('tys_data')
      .upsert({ 
        key, 
        value: data, 
        updated_at: new Date().toISOString(), 
        owner_id 
      });
    
    if (error) {
      console.error(`Supabase sync error for ${key}:`, error);
      addToPendingSync(key);
      return false;
    } else {
      removeFromPendingSync(key);
      return true;
    }
  } catch (err) {
    console.error("Supabase sync network error:", err);
    addToPendingSync(key);
    return false;
  }
};

// Flush pending sync queue
export const flushPendingSync = async () => {
  if (!isSupabaseConfigured) return;
  const queue = getJson(STORAGE_KEYS.PENDING_SYNC, []);
  if (queue.length === 0) return;

  for (const key of queue) {
    const localData = getJson(key, null);
    if (localData !== null) {
      const success = await syncToCloud(key, localData);
      if (!success) break; // Network still unavailable
    }
  }
};

// Safe Merge of Local and Remote collection data (Latest updatedAt wins)
export const mergeCollections = (localItems = [], remoteItems = []) => {
  if (!Array.isArray(localItems)) localItems = [];
  if (!Array.isArray(remoteItems)) remoteItems = [];

  const itemMap = new Map();

  // Load local items first
  localItems.forEach(item => {
    if (item && item.id) {
      itemMap.set(item.id, item);
    }
  });

  // Merge remote items based on updatedAt timestamp
  remoteItems.forEach(remoteItem => {
    if (!remoteItem || !remoteItem.id) return;
    
    const localItem = itemMap.get(remoteItem.id);
    if (!localItem) {
      itemMap.set(remoteItem.id, remoteItem);
    } else {
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
      if (remoteTime > localTime) {
        itemMap.set(remoteItem.id, remoteItem);
      }
    }
  });

  return Array.from(itemMap.values());
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
    id: generateUUID(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: redact(oldValue),
    new_value: redact(newValue),
    created_at: new Date().toISOString(),
    username: localSession.username || 'System'
  };

  localLogs.unshift(newLog);
  if (localLogs.length > 500) localLogs = localLogs.slice(0, 500);
  
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(localLogs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tys_audit_log_update'));
    }
  } catch (e) {
    console.error("Audit log kaydetme hatası", e);
  }

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

// Helper: Save item to LocalStorage with timestamp and trigger sync to cloud
export const saveJson = async (key, data) => {
  const oldValue = getJson(key, null);

  // Attach updatedAt to records if array
  let preparedData = data;
  const nowStr = new Date().toISOString();

  if (Array.isArray(data) && key !== STORAGE_KEYS.AUDIT_LOG) {
    preparedData = data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return {
          ...item,
          updatedAt: item.updatedAt || nowStr
        };
      }
      return item;
    });
  }
  
  if (key !== STORAGE_KEYS.AUDIT_LOG && key !== STORAGE_KEYS.AUTH && Array.isArray(preparedData) && Array.isArray(oldValue)) {
    const added = preparedData.filter(n => !oldValue.find(o => o && o.id === n.id));
    added.forEach(item => logAction('CREATE', key, item.id, null, item));
    
    const deleted = oldValue.filter(o => o && !preparedData.find(n => n.id === o.id));
    deleted.forEach(item => logAction('DELETE', key, item.id, item, null));
    
    const modified = preparedData.filter(n => {
      const o = oldValue.find(old => old && old.id === n.id);
      return o && JSON.stringify(o) !== JSON.stringify(n);
    });
    modified.forEach(item => {
      const o = oldValue.find(old => old && old.id === item.id);
      logAction('UPDATE', key, item.id, o, item);
    });
  }

  localStorage.setItem(key, JSON.stringify(preparedData));
  await syncToCloud(key, preparedData);
  return true;
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
  const purchasePrice = parseNumber(phone.purchasePrice);
  const totalExpenses = (phone.expenses || []).reduce((sum, exp) => sum + parseNumber(exp.amount), 0);
  const totalCost = round2(purchasePrice + totalExpenses);
  const salesPrice = parseNumber(phone.salesPrice);
  const profit = phone.status === 'Satıldı' ? round2(salesPrice - totalCost) : 0;
  
  const purchaseDate = new Date(phone.purchaseDate || Date.now());
  const endDate = phone.status === 'Satıldı' && phone.salesDate ? new Date(phone.salesDate) : new Date();
  const diffTime = Math.abs(endDate - purchaseDate);
  const daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;

  return {
    totalExpenses,
    totalCost,
    profit,
    daysInStock
  };
};

export const ensureStorageKeys = () => {
  const keysToEnsure = [
    { key: STORAGE_KEYS.PHONES, defaultVal: [] },
    { key: STORAGE_KEYS.CUSTOMERS, defaultVal: [] },
    { key: STORAGE_KEYS.SUPPLIERS, defaultVal: [] },
    { key: STORAGE_KEYS.TRANSACTIONS, defaultVal: [] },
    { key: STORAGE_KEYS.EXPENSES, defaultVal: [] },
    { key: STORAGE_KEYS.REPAIRS, defaultVal: [] },
    { key: STORAGE_KEYS.PARTS, defaultVal: [] },
    { key: STORAGE_KEYS.STOCK_MOVEMENTS, defaultVal: [] },
    { key: STORAGE_KEYS.INSTALLMENTS, defaultVal: [] },
    { key: STORAGE_KEYS.TRADE_INS, defaultVal: [] },
    { key: STORAGE_KEYS.CASH_MOVEMENTS, defaultVal: [] },
    { key: STORAGE_KEYS.PENDING_SYNC, defaultVal: [] }
  ];

  keysToEnsure.forEach(({ key, defaultVal }) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    }
  });
};

// Initialize DB and seed demo data if empty
export const initDb = async (force = false) => {
  const existingUserStr = localStorage.getItem('tys_admin_user');
  if (existingUserStr && import.meta.env.DEV) {
    // Keep existing user in dev
  } else if (!existingUserStr) {
    // Local user setup initialized on demand
  }

  ensureStorageKeys();

  if (!force && localStorage.getItem(STORAGE_KEYS.PHONES) && localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    return;
  }

  const defaultSettings = {
    businessName: 'Telefoncum',
    logo: '',
    currency: 'TL',
    theme: 'dark'
  };

  await saveJson(STORAGE_KEYS.SETTINGS, defaultSettings);
  await Promise.all([
    saveJson(STORAGE_KEYS.CUSTOMERS, getJson(STORAGE_KEYS.CUSTOMERS, [])),
    saveJson(STORAGE_KEYS.SUPPLIERS, getJson(STORAGE_KEYS.SUPPLIERS, [])),
    saveJson(STORAGE_KEYS.PHONES, getJson(STORAGE_KEYS.PHONES, [])),
    saveJson(STORAGE_KEYS.EXPENSES, getJson(STORAGE_KEYS.EXPENSES, [])),
    saveJson(STORAGE_KEYS.TRANSACTIONS, getJson(STORAGE_KEYS.TRANSACTIONS, [])),
    saveJson(STORAGE_KEYS.REPAIRS, getJson(STORAGE_KEYS.REPAIRS, [])),
    saveJson(STORAGE_KEYS.PARTS, getJson(STORAGE_KEYS.PARTS, [])),
    saveJson(STORAGE_KEYS.STOCK_MOVEMENTS, getJson(STORAGE_KEYS.STOCK_MOVEMENTS, [])),
    saveJson(STORAGE_KEYS.INSTALLMENTS, getJson(STORAGE_KEYS.INSTALLMENTS, [])),
    saveJson(STORAGE_KEYS.TRADE_INS, getJson(STORAGE_KEYS.TRADE_INS, [])),
    saveJson(STORAGE_KEYS.CASH_MOVEMENTS, getJson(STORAGE_KEYS.CASH_MOVEMENTS, []))
  ]);
};
