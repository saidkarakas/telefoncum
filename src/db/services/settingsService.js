import { STORAGE_KEYS, getJson, saveJson } from './shared';

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
    try {
      const db = JSON.parse(jsonString);
      if (!db || typeof db !== 'object' || Array.isArray(db)) {
        throw new Error("Geçersiz yedek formatı.");
      }

      // Validasyon aşaması: Sadece geçerli anahtarları ve bozuk olmayan JSON verilerini kabul et
      const validKeys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.AUTH && k !== STORAGE_KEYS.AUDIT_LOG);
      const dataToSave = {};

      for (const key of Object.keys(db)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (key === '_version') continue;
        
        if (validKeys.includes(key) && db[key]) {
           try {
             const parsed = JSON.parse(db[key]); // Sadece geçerli JSON ise hata atmaz
             if (Array.isArray(parsed) && parsed.length > 50000) {
                 throw new Error(`Kayıt sayısı çok yüksek: ${key}`);
             }
             dataToSave[key] = db[key];
           } catch (err) {
             throw new Error(`'${key}' verisi bozuk veya geçersiz formatta.`);
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
