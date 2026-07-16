import { STORAGE_KEYS, getJson, saveJson } from './shared';
import { phoneService } from './phoneService';

export const supplierService = {
  getAll: () => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    const phones = phoneService.getAll();
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return suppliers.map(s => {
      const supplierPhones = phones.filter(p => p.boughtFromId === s.id);
      const totalPurchasedValue = supplierPhones.reduce((sum, p) => sum + p.purchasePrice, 0);

      const contactTransactions = transactions.filter(t => t.contactId === s.id && t.contactType === 'supplier');
      const wePaidToThem = contactTransactions.filter(t => t.type === 'odeme').reduce((sum, t) => sum + t.amount, 0);
      const theyPaidToUs = contactTransactions.filter(t => t.type === 'tahsilat').reduce((sum, t) => sum + t.amount, 0);

      const balance = (totalPurchasedValue + theyPaidToUs) - wePaidToThem;

      return {
        ...s,
        totalPhones: supplierPhones.length,
        totalPurchases: totalPurchasedValue,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    const suppliers = supplierService.getAll();
    return suppliers.find(s => s.id === id) || null;
  },

  save: (supplierData) => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    let updated;
    if (supplierData.id) {
      updated = suppliers.map(s => s.id === supplierData.id ? { ...s, ...supplierData } : s);
    } else {
      updated = [...suppliers, { ...supplierData, id: `supp-${Date.now()}` }];
    }
    saveJson(STORAGE_KEYS.SUPPLIERS, updated);
    return true;
  },

  delete: (id) => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    saveJson(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};
