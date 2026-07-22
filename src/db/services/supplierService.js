import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, round2 } from './shared';

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

export const supplierService = {
  normalizePhone,
  normalizeName,

  getAll: () => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return suppliers.map(s => {
      const displayName = (s.fullName || s.name || 'Tedarikçi').trim();
      const supplierPhones = phones.filter(p => p.boughtFromId === s.id);
      const contactTransactions = transactions.filter(t => t.contactId === s.id && t.contactType === 'supplier');
      
      const purchaseDebt = contactTransactions
        .filter(t => t.type === 'purchase_debt' || t.type === 'trade_difference_payable')
        .reduce((sum, t) => sum + parseNumber(t.amount), 0);

      const payments = contactTransactions
        .filter(t => t.type === 'payment' || t.type === 'odeme')
        .reduce((sum, t) => sum + parseNumber(t.amount), 0);

      const collectionsFromSupplier = contactTransactions
        .filter(t => t.type === 'collection' || t.type === 'tahsilat' || t.type === 'trade_difference_receivable')
        .reduce((sum, t) => sum + parseNumber(t.amount), 0);

      // Fallback for legacy phone purchases where no purchase_debt transaction exists
      let legacyPurchaseDebt = 0;
      supplierPhones.forEach(p => {
        const hasTx = contactTransactions.some(t => t.sourceId === p.id || t.phoneId === p.id);
        if (!hasTx) {
          legacyPurchaseDebt += parseNumber(p.purchasePrice);
        }
      });

      const totalPurchases = round2(purchaseDebt + legacyPurchaseDebt);
      const balance = round2((totalPurchases + collectionsFromSupplier) - payments);

      return {
        ...s,
        fullName: displayName,
        name: displayName,
        totalPhones: supplierPhones.length,
        totalPurchases,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    if (!id) return null;
    const suppliers = supplierService.getAll();
    return suppliers.find(s => s.id === id) || null;
  },

  findByPhone: (phone) => {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    const suppliers = supplierService.getAll();
    return suppliers.find(s => normalizePhone(s.phone) === norm) || null;
  },

  findByName: (name) => {
    const norm = normalizeName(name);
    if (!norm) return null;
    const suppliers = supplierService.getAll();
    return suppliers.find(s => normalizeName(s.fullName || s.name) === norm) || null;
  },

  findOrCreate: async (data) => {
    if (!data) return null;
    if (data.id) {
      const existing = supplierService.getById(data.id);
      if (existing) return existing;
    }

    const normPhone = normalizePhone(data.phone);
    const inputName = data.fullName || data.name || '';
    const normName = normalizeName(inputName);

    if (!normPhone && !normName) return null;

    let existing = null;
    if (normPhone) {
      existing = supplierService.findByPhone(normPhone);
    }
    if (!existing && normName) {
      existing = supplierService.findByName(normName);
    }

    if (existing) {
      if (!existing.phone && data.phone) {
        await supplierService.save({ ...existing, phone: data.phone });
      }
      return supplierService.getById(existing.id);
    }

    const cleanName = (inputName || 'Tedarikçi').trim();
    const newSupplier = {
      id: data.id || generateUUID(),
      fullName: cleanName,
      name: cleanName,
      phone: data.phone ? data.phone.trim() : '',
      address: data.address ? data.address.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    await supplierService.save(newSupplier);
    return newSupplier;
  },

  save: async (supplierData) => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    const cleanName = (supplierData.fullName || supplierData.name || 'Tedarikçi').trim();
    
    const preparedData = {
      ...supplierData,
      fullName: cleanName,
      name: cleanName,
      id: supplierData.id || generateUUID(),
      createdAt: supplierData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const exists = suppliers.some(s => s.id === preparedData.id);
    let updated;
    if (exists) {
      updated = suppliers.map(s => s.id === preparedData.id ? { ...s, ...preparedData } : s);
    } else {
      updated = [...suppliers, preparedData];
    }
    await saveJson(STORAGE_KEYS.SUPPLIERS, updated);
    return true;
  },

  delete: async (id) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const hasPhoneLink = phones.some(p => p.boughtFromId === id);

    if (hasPhoneLink) {
      throw new Error("Bu tedarikçiden satın alınmış cihazlar bulunduğu için tedarikçi silinemez.");
    }

    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    await saveJson(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    await saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};
