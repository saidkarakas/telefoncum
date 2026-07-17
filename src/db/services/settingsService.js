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
    const db = {};
    Object.keys(STORAGE_KEYS).forEach(k => {
      db[STORAGE_KEYS[k]] = localStorage.getItem(STORAGE_KEYS[k]);
    });
    db['tys_admin_user'] = localStorage.getItem('tys_admin_user');
    return JSON.stringify(db);
  },

  importDatabase: (jsonString) => {
    try {
      const db = JSON.parse(jsonString);
      if (!db || typeof db !== 'object' || Array.isArray(db)) {
        throw new Error("Geçersiz yedek formatı.");
      }

      // Validasyon aşaması: Sadece geçerli anahtarları ve bozuk olmayan JSON verilerini kabul et
      const validKeys = [...Object.values(STORAGE_KEYS), 'tys_admin_user'];
      const dataToSave = {};

      for (const key of Object.keys(db)) {
        if (validKeys.includes(key) && db[key]) {
           try {
             JSON.parse(db[key]); // Sadece geçerli JSON ise hata atmaz
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
