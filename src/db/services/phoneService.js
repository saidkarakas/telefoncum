import { STORAGE_KEYS, getJson, saveJson, calculatePhoneCosts } from './shared';
import { getTransactionService } from './transactionService';

export const phoneService = {
  getAll: () => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    return phones.map(phone => ({
      ...phone,
      ...calculatePhoneCosts(phone)
    }));
  },

  getById: (id) => {
    const phones = phoneService.getAll();
    return phones.find(p => p.id === id) || null;
  },

  save: (phoneData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    
    const duplicateImei = phones.find(p => p.id !== phoneData.id && (
      (phoneData.imei1 && (p.imei1 === phoneData.imei1 || p.imei2 === phoneData.imei1)) ||
      (phoneData.imei2 && (p.imei1 === phoneData.imei2 || p.imei2 === phoneData.imei2))
    ));
    
    if (duplicateImei) {
      throw new Error(`Bu IMEI numarası zaten kayıtlı: ${duplicateImei.brand} ${duplicateImei.model} (S/N: ${duplicateImei.serialNumber || 'Bilinmiyor'})`);
    }

    let updatedPhones;
    if (phoneData.id) {
      updatedPhones = phones.map(p => p.id === phoneData.id ? { ...p, ...phoneData } : p);
    } else {
      const newPhone = {
        ...phoneData,
        id: `phone-${Date.now()}`,
        expenses: phoneData.expenses || [],
        photos: phoneData.photos || [],
        status: phoneData.status || 'Stokta',
        salesPrice: phoneData.salesPrice || 0
      };
      updatedPhones = [...phones, newPhone];
    }
    
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  },

  delete: (id) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const filtered = phones.filter(p => p.id !== id);
    saveJson(STORAGE_KEYS.PHONES, filtered);
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const updatedRepairs = repairs.filter(r => r.phoneId !== id);
    saveJson(STORAGE_KEYS.REPAIRS, updatedRepairs);
    return true;
  },

  sell: (id, salesData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'Satıldı',
          soldToId: salesData.soldToId,
          soldToName: salesData.soldToName,
          salesContactPhone: salesData.salesContactPhone,
          salesDate: salesData.salesDate || new Date().toISOString().split('T')[0],
          salesPrice: Number(salesData.salesPrice || 0),
          salesPaymentType: salesData.salesPaymentType,
          salesNote: salesData.salesNote
        };
      }
      return p;
    });

    saveJson(STORAGE_KEYS.PHONES, updatedPhones);

    if (salesData.soldToId) {
      const transactionService = getTransactionService();
      transactionService.save({
        contactId: salesData.soldToId,
        contactType: 'customer',
        type: 'tahsilat',
        amount: Number(salesData.salesPrice),
        date: salesData.salesDate || new Date().toISOString().split('T')[0],
        description: `${salesData.phoneModel || 'Telefon'} Satış Bedeli`
      });
    }

    return true;
  },

  addExpense: (phoneId, expenseData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === phoneId) {
        const newExpense = {
          id: `exp-${Date.now()}`,
          name: expenseData.name,
          amount: Number(expenseData.amount),
          date: expenseData.date || new Date().toISOString().split('T')[0]
        };
        return {
          ...p,
          expenses: [...(p.expenses || []), newExpense]
        };
      }
      return p;
    });
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  },

  deleteExpense: (phoneId, expenseId) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === phoneId) {
        return {
          ...p,
          expenses: (p.expenses || []).filter(e => e.id !== expenseId)
        };
      }
      return p;
    });
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  }
};
