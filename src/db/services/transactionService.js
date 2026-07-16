import { STORAGE_KEYS, getJson, saveJson } from './shared';

export const getTransactionService = () => ({
  getAll: () => {
    return getJson(STORAGE_KEYS.TRANSACTIONS, []);
  },

  getByContactId: (contactId) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    return transactions
      .filter(t => t.contactId === contactId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  save: (transactionData) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    let updated;
    if (transactionData.id) {
      updated = transactions.map(t => t.id === transactionData.id ? { ...t, ...transactionData } : t);
    } else {
      const newTr = {
        ...transactionData,
        id: `tr-${Date.now()}`,
        date: transactionData.date || new Date().toISOString().split('T')[0]
      };
      updated = [newTr, ...transactions];
    }
    saveJson(STORAGE_KEYS.TRANSACTIONS, updated);
    return true;
  },

  delete: (id) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
    return true;
  }
});
