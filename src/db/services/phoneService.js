import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber, round2, calculatePhoneCosts } from './shared';
import { supplierService } from './supplierService';
import { customerService } from './customerService';
import { transactionService } from './transactionService';
import { installmentService } from './installmentService';

export const PHONE_STATUSES = [
  'Stokta',
  'Rezerve',
  'Satıldı',
  'Takasta Alındı',
  'Serviste',
  'İade',
  'Hurda'
];

export const phoneService = {
  getAll: () => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    return phones.map(phone => ({
      ...phone,
      ...calculatePhoneCosts(phone)
    }));
  },

  getById: (id) => {
    if (!id) return null;
    const phones = phoneService.getAll();
    return phones.find(p => p.id === id) || null;
  },

  save: async (phoneData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const isNew = phoneData.id ? !phones.some(p => p.id === phoneData.id) : true;

    // Check duplicate IMEI
    const duplicateImei = phones.find(p => p.id !== phoneData.id && (
      (phoneData.imei1 && (p.imei1 === phoneData.imei1 || p.imei2 === phoneData.imei1)) ||
      (phoneData.imei2 && (p.imei1 === phoneData.imei2 || p.imei2 === phoneData.imei2))
    ));
    
    if (duplicateImei) {
      throw new Error(`Bu IMEI numarası zaten kayıtlı: ${duplicateImei.brand} ${duplicateImei.model} (S/N: ${duplicateImei.serialNumber || 'Bilinmiyor'})`);
    }

    // Auto find or create Supplier if boughtFrom details provided
    let boughtFromId = phoneData.boughtFromId || '';
    let boughtFromName = phoneData.boughtFromName || '';
    let boughtFromType = phoneData.boughtFromType || 'supplier';

    if (!boughtFromId && (boughtFromName || phoneData.boughtFromPhone)) {
      const supp = await supplierService.findOrCreate({
        name: boughtFromName,
        phone: phoneData.boughtFromPhone,
        address: phoneData.boughtFromAddress
      });
      if (supp) {
        boughtFromId = supp.id;
        boughtFromName = supp.name;
        boughtFromType = 'supplier';
      }
    }

    const purchasePrice = safeNumber(phoneData.purchasePrice);
    const salesPrice = safeNumber(phoneData.salesPrice);
    const phoneId = phoneData.id || generateUUID();

    const preparedPhone = {
      ...phoneData,
      id: phoneId,
      boughtFromId,
      boughtFromName,
      boughtFromType,
      purchasePrice,
      salesPrice,
      expenses: phoneData.expenses || [],
      photos: phoneData.photos || [],
      status: phoneData.status || 'Stokta',
      stockSource: phoneData.stockSource || 'purchase',
      createdAt: phoneData.createdAt || new Date().toISOString()
    };

    let updatedPhones;
    if (!isNew) {
      updatedPhones = phones.map(p => p.id === phoneData.id ? preparedPhone : p);
    } else {
      updatedPhones = [...phones, preparedPhone];
    }
    
    await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

    // Save purchase debt on supplier ledger if new purchase & supplier attached
    if (isNew && boughtFromId && purchasePrice > 0) {
      const opId = generateUUID();
      await transactionService.save({
        contactId: boughtFromId,
        contactType: boughtFromType,
        type: 'purchase_debt',
        amount: purchasePrice,
        date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
        sourceType: 'phone_purchase',
        sourceId: phoneId,
        operationId: opId,
        description: `Telefon Alış Bedeli - ${phoneData.brand} ${phoneData.model}`
      });

      // If marked as paid upfront on purchase
      if (phoneData.purchasePaidUpfront) {
        await transactionService.save({
          contactId: boughtFromId,
          contactType: boughtFromType,
          type: 'payment',
          amount: purchasePrice,
          date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
          sourceType: 'phone_purchase_payment',
          sourceId: phoneId,
          operationId: `${opId}-pay`,
          description: `Telefon Alış Ödemesi - ${phoneData.brand} ${phoneData.model}`
        });
      }
    }

    return preparedPhone;
  },

  delete: async (id) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const filtered = phones.filter(p => p.id !== id);
    await saveJson(STORAGE_KEYS.PHONES, filtered);
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const updatedRepairs = repairs.filter(r => r.phoneId !== id);
    await saveJson(STORAGE_KEYS.REPAIRS, updatedRepairs);
    return true;
  },

  sell: async (id, salesData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const phone = phones.find(p => p.id === id);
    if (!phone) throw new Error("Satılacak telefon bulunamadı.");

    const salesPrice = safeNumber(salesData.salesPrice);
    if (salesPrice < 0) throw new Error("Satış fiyatı negatif olamaz.");

    // Auto resolve Customer
    let soldToId = salesData.soldToId || '';
    let soldToName = salesData.soldToName || '';

    if (!soldToId && (soldToName || salesData.salesContactPhone)) {
      const cust = await customerService.findOrCreate({
        name: soldToName,
        phone: salesData.salesContactPhone,
        notes: salesData.salesNote
      });
      if (cust) {
        soldToId = cust.id;
        soldToName = cust.name;
      }
    }

    const paymentType = salesData.salesPaymentType || 'Nakit';
    const isTermed = paymentType === 'Veresiye' || paymentType === 'Taksit';

    if (isTermed && !soldToId) {
      throw new Error("Veresiye veya Taksitli satışlarda müşteri seçimi zorunludur.");
    }

    const salesDate = salesData.salesDate || new Date().toISOString().split('T')[0];

    const updatedPhones = phones.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'Satıldı',
          soldToId,
          soldToName,
          salesContactPhone: salesData.salesContactPhone || '',
          salesDate,
          salesPrice,
          salesPaymentType: paymentType,
          salesNote: salesData.salesNote || ''
        };
      }
      return p;
    });

    await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

    // Accounting
    if (soldToId && salesPrice > 0) {
      const operationId = generateUUID();

      // 1. Create sale debt
      await transactionService.save({
        contactId: soldToId,
        contactType: 'customer',
        type: 'sale_debt',
        amount: salesPrice,
        date: salesDate,
        sourceType: 'phone_sale',
        sourceId: id,
        operationId: `${operationId}-debt`,
        description: `Telefon Satış Bedeli - ${phone.brand} ${phone.model}`
      });

      const downPayment = safeNumber(salesData.downPayment);

      // 2. Collection for collected amount
      if (paymentType === 'Nakit' || paymentType === 'Havale/EFT' || paymentType === 'Kart') {
        await transactionService.save({
          contactId: soldToId,
          contactType: 'customer',
          type: 'collection',
          amount: salesPrice,
          date: salesDate,
          sourceType: 'phone_sale_collection',
          sourceId: id,
          operationId: `${operationId}-collect`,
          description: `Telefon Satış Tahsilatı (${paymentType})`
        });
      } else if (isTermed) {
        if (downPayment > 0) {
          await transactionService.save({
            contactId: soldToId,
            contactType: 'customer',
            type: 'collection',
            amount: downPayment,
            date: salesDate,
            sourceType: 'phone_sale_downpayment',
            sourceId: id,
            operationId: `${operationId}-dp`,
            description: `Satış Peşinat Tahsilatı (${phone.brand} ${phone.model})`
          });
        }

        if (paymentType === 'Taksit') {
          const count = parseInt(salesData.installmentCount || 1, 10);
          await installmentService.createPlan({
            contactId: soldToId,
            contactType: 'customer',
            sourceType: 'phone_sale',
            sourceId: id,
            operationId: `${operationId}-plan`,
            totalAmount: salesPrice,
            downPayment: downPayment,
            installmentCount: count,
            startDate: salesData.firstInstallmentDate || salesDate,
            note: `${phone.brand} ${phone.model} Satış Taksit Planı`
          });
        }
      }
    }

    return true;
  },

  addExpense: async (phoneId, expenseData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const amount = safeNumber(expenseData.amount);
    
    const updatedPhones = phones.map(p => {
      if (p.id === phoneId) {
        const newExpense = {
          id: generateUUID(),
          name: expenseData.name,
          amount,
          date: expenseData.date || new Date().toISOString().split('T')[0]
        };
        return {
          ...p,
          expenses: [...(p.expenses || []), newExpense]
        };
      }
      return p;
    });
    await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  },

  deleteExpense: async (phoneId, expenseId) => {
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
    await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  }
};
