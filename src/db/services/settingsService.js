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
      Object.keys(db).forEach(k => {
        if (db[k] !== null) {
          localStorage.setItem(k, db[k]);
        }
      });
      return true;
    } catch (e) {
      throw new Error("Yedek dosyası geçersiz veya bozuk.");
    }
  }
};
