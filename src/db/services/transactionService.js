import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber } from './shared';

export const transactionService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.TRANSACTIONS, []);
  },

  getByContactId: (contactId) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    return transactions
      .filter(t => t.contactId === contactId)
      .sort((a, b) => new Date(b.date || Date.now()) - new Date(a.date || Date.now()));
  },

  save: async (transactionData) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    // Check operationId / sourceId duplicate prevention if provided
    if (transactionData.operationId && transactionData.type) {
      const existing = transactions.find(t => 
        t.operationId === transactionData.operationId && t.type === transactionData.type
      );
      if (existing) {
        return existing;
      }
    }

    let updated;
    const cleanAmount = safeNumber(transactionData.amount);

    if (transactionData.id) {
      updated = transactions.map(t => t.id === transactionData.id ? { ...t, ...transactionData, amount: cleanAmount } : t);
    } else {
      const newTr = {
        ...transactionData,
        id: transactionData.id || generateUUID(),
        amount: cleanAmount,
        date: transactionData.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      updated = [newTr, ...transactions];
    }
    await saveJson(STORAGE_KEYS.TRANSACTIONS, updated);
    return true;
  },

  delete: async (id) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    await saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
    return true;
  }
};

export const getTransactionService = () => transactionService;
