import { STORAGE_KEYS, getJson, saveJson, SECURITY_LIMITS } from './shared';

export const settingsService = {
  get: () => {
    return getJson(STORAGE_KEYS.SETTINGS, {
      businessName: 'Telefon Yönetim Sistemi',
      logo: '',
      currency: 'TL',
      theme: 'dark'
    });
  },

  save: (settingsData) => {
    saveJson(STORAGE_KEYS.SETTINGS, settingsData);
    return true;
  },

  exportDatabase: () => {
    const db = { _version: '2.0' };
    const EXCLUDED_KEYS = [STORAGE_KEYS.AUTH, STORAGE_KEYS.AUDIT_LOG, 'tys_admin_user'];
    
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

  importDatabase: (jsonString) => {
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
      const db = JSON.parse(jsonString);
      if (!db || typeof db !== 'object' || Array.isArray(db)) {
        throw new Error("Geçersiz yedek formatı.");
      }

      // Validasyon aşaması: Sadece geçerli anahtarları ve bozuk olmayan JSON verilerini kabul et
      const validKeys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.AUTH && k !== STORAGE_KEYS.AUDIT_LOG);
      const dataToSave = {};

      for (const key of Object.keys(db)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new Error("Güvenlik İhlali: Prototype Pollution denemesi engellendi.");
        }
        if (key === '_version') continue;
        
        if (validKeys.includes(key) && db[key]) {
           try {
             const parsed = JSON.parse(db[key]);
             if (Array.isArray(parsed) && parsed.length > SECURITY_LIMITS.MAX_ARRAY_LENGTH) {
                 throw new Error(`Kayıt sayısı çok yüksek: ${key}`);
             }
             const sanitized = sanitizeObj(parsed);
             dataToSave[key] = JSON.stringify(sanitized);
           } catch (err) {
             throw new Error(`'${key}' verisi bozuk veya geçersiz formatta: ` + err.message);
           }
        }
      }

      if (Object.keys(dataToSave).length === 0) {
        throw new Error("Yedek dosyasında aktarılacak geçerli veri bulunamadı.");
      }

      // Hata fırlatılmadıysa güvenle kaydet
      Object.keys(dataToSave).forEach(k => {
        localStorage.setItem(k, dataToSave[k]);
      });
      return true;
    } catch (e) {
      throw new Error(e.message || "Yedek dosyası geçersiz veya bozuk.");
    }
  }
};
