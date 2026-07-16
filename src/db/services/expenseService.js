import { STORAGE_KEYS, getJson, saveJson } from './shared';

export const expenseService = {
  getAll: () => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  save: (expenseData) => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    let updated;
    if (expenseData.id) {
      updated = expenses.map(e => e.id === expenseData.id ? { ...e, ...expenseData } : e);
    } else {
      updated = [...expenses, { ...expenseData, id: `exp-${Date.now()}` }];
    }
    saveJson(STORAGE_KEYS.EXPENSES, updated);
    return true;
  },

  delete: (id) => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    saveJson(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
    return true;
  }
};
