import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber, round2 } from './shared';

export const normalizePhone = (value) => {
  if (!value) return '';
  let digits = String(value).trim().replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits;
};

export const normalizeName = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
};

export const customerService = {
  normalizePhone,
  normalizeName,

  getAll: () => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return customers.map(c => {
      const contactTransactions = transactions.filter(t => t.contactId === c.id && t.contactType === 'customer');
      
      const saleDebt = contactTransactions
        .filter(t => t.type === 'sale_debt' || t.type === 'trade_difference_receivable')
        .reduce((sum, t) => sum + safeNumber(t.amount), 0);

      const collections = contactTransactions
        .filter(t => t.type === 'collection' || t.type === 'tahsilat')
        .reduce((sum, t) => sum + safeNumber(t.amount), 0);

      const paymentsToCustomer = contactTransactions
        .filter(t => t.type === 'payment' || t.type === 'odeme' || t.type === 'trade_difference_payable')
        .reduce((sum, t) => sum + safeNumber(t.amount), 0);

      // Fallback for legacy phone sales where no sale_debt / collection transaction exists
      const customerPurchases = phones.filter(p => p.soldToId === c.id);
      let legacySalesDebt = 0;
      customerPurchases.forEach(p => {
        const hasTx = contactTransactions.some(t => t.sourceId === p.id || t.phoneId === p.id);
        if (!hasTx) {
          legacySalesDebt += safeNumber(p.salesPrice);
        }
      });

      const totalSalesToCustomer = round2(saleDebt + legacySalesDebt);
      const balance = round2((totalSalesToCustomer + paymentsToCustomer) - collections);

      return {
        ...c,
        totalSales: totalSalesToCustomer,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    if (!id) return null;
    const customers = customerService.getAll();
    return customers.find(c => c.id === id) || null;
  },

  findByPhone: (phone) => {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    return customers.find(c => normalizePhone(c.phone) === norm) || null;
  },

  findByName: (name) => {
    const norm = normalizeName(name);
    if (!norm) return null;
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    return customers.find(c => normalizeName(c.name) === norm) || null;
  },

  findOrCreate: async (data) => {
    if (!data) return null;
    if (data.id) {
      const existing = customerService.getById(data.id);
      if (existing) return existing;
    }

    const normPhone = normalizePhone(data.phone);
    const normName = normalizeName(data.name);

    if (!normPhone && !normName) return null;

    let existing = null;
    if (normPhone) {
      existing = customerService.findByPhone(normPhone);
    }
    if (!existing && normName) {
      existing = customerService.findByName(normName);
    }

    if (existing) {
      if (!existing.phone && data.phone) {
        await customerService.save({ ...existing, phone: data.phone });
      }
      return customerService.getById(existing.id);
    }

    const newCustomer = {
      id: data.id || generateUUID(),
      name: data.name ? data.name.trim() : 'Müşteri',
      phone: data.phone ? data.phone.trim() : '',
      address: data.address ? data.address.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    await customerService.save(newCustomer);
    return newCustomer;
  },

  save: async (customerData) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    const exists = customerData.id ? customers.some(c => c.id === customerData.id) : false;
    let updated;
    if (exists) {
      updated = customers.map(c => c.id === customerData.id ? { ...c, ...customerData } : c);
    } else {
      const newCust = {
        ...customerData,
        id: customerData.id || generateUUID(),
        createdAt: customerData.createdAt || new Date().toISOString()
      };
      updated = [...customers, newCust];
    }
    await saveJson(STORAGE_KEYS.CUSTOMERS, updated);
    return true;
  },

  delete: async (id) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    await saveJson(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    await saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};
