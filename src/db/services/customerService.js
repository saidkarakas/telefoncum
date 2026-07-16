import { STORAGE_KEYS, getJson, saveJson } from './shared';
import { phoneService } from './phoneService';

export const customerService = {
  getAll: () => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    const phones = phoneService.getAll();
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return customers.map(c => {
      const customerPurchases = phones.filter(p => p.soldToId === c.id);
      const totalSalesToCustomer = customerPurchases.reduce((sum, p) => sum + p.salesPrice, 0);

      const customerSalesToUs = phones.filter(p => p.boughtFromId === c.id);
      const totalPurchasesFromCustomer = customerSalesToUs.reduce((sum, p) => sum + p.purchasePrice, 0);

      const contactTransactions = transactions.filter(t => t.contactId === c.id && t.contactType === 'customer');
      
      const wePaidToThem = contactTransactions.filter(t => t.type === 'odeme').reduce((sum, t) => sum + t.amount, 0);
      const theyPaidToUs = contactTransactions.filter(t => t.type === 'tahsilat').reduce((sum, t) => sum + t.amount, 0);
      
      const balance = (totalSalesToCustomer + wePaidToThem) - (totalPurchasesFromCustomer + theyPaidToUs);
      
      return {
        ...c,
        totalSales: totalSalesToCustomer,
        totalPurchases: totalPurchasesFromCustomer,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    const customers = customerService.getAll();
    return customers.find(c => c.id === id) || null;
  },

  save: (customerData) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    let updated;
    if (customerData.id) {
      updated = customers.map(c => c.id === customerData.id ? { ...c, ...customerData } : c);
    } else {
      updated = [...customers, { ...customerData, id: `cust-${Date.now()}` }];
    }
    saveJson(STORAGE_KEYS.CUSTOMERS, updated);
    return true;
  },

  delete: (id) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    saveJson(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};
