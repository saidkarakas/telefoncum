import { STORAGE_KEYS, getJson, saveJson, SECURITY_LIMITS, ensureStorageKeys } from './shared';

export const settingsService = {
  get: () => {
    return getJson(STORAGE_KEYS.SETTINGS, {
      businessName: 'Telefon Yönetim Sistemi',
      logo: '',
      currency: 'TL',
      theme: 'dark'
    });
  },

  save: async (settingsData) => {
    await saveJson(STORAGE_KEYS.SETTINGS, settingsData);
    return true;
  },

  exportDatabase: () => {
    const db = { _version: '3.0' };
    const EXCLUDED_KEYS = [STORAGE_KEYS.AUTH, STORAGE_KEYS.AUDIT_LOG, 'tys_admin_user', STORAGE_KEYS.PENDING_SYNC];
    
    Object.keys(STORAGE_KEYS).forEach(k => {
      const key = STORAGE_KEYS[k];
      if (EXCLUDED_KEYS.includes(key)) return;
      
      let dataStr = localStorage.getItem(key);
      if (!dataStr) return;
      
      // Mask device passwords in repairs before exporting
      if (key === STORAGE_KEYS.REPAIRS) {
        try {
          const repairs = JSON.parse(dataStr);
          if (Array.isArray(repairs)) {
            dataStr = JSON.stringify(repairs.map(r => ({ ...r, devicePassword: r.devicePassword ? '[GİZLENDİ]' : '' })));
          }
        } catch (e) {}
      }
      
      db[key] = dataStr;
    });
    
    return JSON.stringify(db);
  },

  importDatabase: async (jsonString) => {
    const sanitizeObj = (obj, depth = 0) => {
      if (depth > SECURITY_LIMITS.MAX_OBJECT_DEPTH) throw new Error("Obje derinliği çok yüksek.");
      if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'string' && obj.length > SECURITY_LIMITS.MAX_STRING_LENGTH) throw new Error("Çok uzun metin.");
        return obj;
      }
      
      if (Array.isArray(obj)) {
        if (obj.length > SECURITY_LIMITS.MAX_ARRAY_LENGTH) throw new Error("Dizi çok büyük.");
        return obj.map(item => sanitizeObj(item, depth + 1));
      }
      
      const cleanObj = {};
      const keys = Object.keys(obj);
      if (keys.length > SECURITY_LIMITS.MAX_OBJECT_KEYS) throw new Error("Çok fazla obje özelliği.");
      
      for (const k of keys) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
           throw new Error("Güvenlik İhlali: Prototype Pollution denemesi engellendi.");
        }
        cleanObj[k] = sanitizeObj(obj[k], depth + 1);
      }
      return cleanObj;
    };

    try {
      if (typeof jsonString === 'string' && (jsonString.includes('__proto__') || jsonString.includes('constructor') || jsonString.includes('prototype'))) {
        throw new Error("Güvenlik İhlali: Prototype Pollution denemesi engellendi.");
      }

      const db = JSON.parse(jsonString);
      if (!db || typeof db !== 'object' || Array.isArray(db)) {
        throw new Error("Geçersiz yedek formatı.");
      }

      const validKeys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.AUTH && k !== STORAGE_KEYS.AUDIT_LOG && k !== STORAGE_KEYS.PENDING_SYNC);
      const collectionsToRestore = {};

      // Parse and sanitize collections in backup file
      for (const key of validKeys) {
        if (db[key]) {
          try {
            const parsed = typeof db[key] === 'string' ? JSON.parse(db[key]) : db[key];
            const sanitized = sanitizeObj(parsed);
            collectionsToRestore[key] = sanitized;
          } catch (err) {
            throw new Error(`'${key}' verisi bozuk: ` + err.message);
          }
        } else {
          // Requirement 11: Missing new collections initialized as empty array [] or default settings
          if (key === STORAGE_KEYS.SETTINGS) {
            collectionsToRestore[key] = settingsService.get();
          } else {
            collectionsToRestore[key] = [];
          }
        }
      }

      // Save and sync each collection to LocalStorage AND Supabase
      for (const [key, data] of Object.entries(collectionsToRestore)) {
        await saveJson(key, data);
      }

      ensureStorageKeys();
      return true;
    } catch (e) {
      throw new Error(e.message || "Yedek dosyası geçersiz veya bozuk.");
    }
  },

  resetDatabase: async () => {
    const dataKeys = [
      STORAGE_KEYS.PHONES,
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.SUPPLIERS,
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.REPAIRS,
      STORAGE_KEYS.PARTS,
      STORAGE_KEYS.STOCK_MOVEMENTS,
      STORAGE_KEYS.INSTALLMENTS,
      STORAGE_KEYS.TRADE_INS,
      STORAGE_KEYS.CASH_MOVEMENTS
    ];

    // Reset data collections to [] while preserving auth session & settings
    for (const key of dataKeys) {
      await saveJson(key, []);
    }
    return true;
  }
};
