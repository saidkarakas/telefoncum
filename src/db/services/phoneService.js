import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, validateNonNegative, round2, calculatePhoneCosts } from './shared';
import { supplierService } from './supplierService';
import { customerService } from './customerService';
import { transactionService } from './transactionService';
import { installmentService, mapPaymentMethod } from './installmentService';
import { cashMovementService } from './cashMovementService';
import { runTransaction } from './transactionRunner';

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
    return await runTransaction(async () => {
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

      // Requirement 4: Seller Phone Mapping (boughtFromPhone vs purchaseContactPhone)
      const sellerPhone = phoneData.boughtFromPhone || phoneData.purchaseContactPhone || '';
      let boughtFromId = phoneData.boughtFromId || '';
      let boughtFromName = phoneData.boughtFromName || '';
      let boughtFromType = phoneData.boughtFromType || 'supplier';

      if (!boughtFromId && (boughtFromName || sellerPhone)) {
        const supp = await supplierService.findOrCreate({
          name: boughtFromName || 'Tedarikçi',
          fullName: boughtFromName || 'Tedarikçi',
          phone: sellerPhone,
          address: phoneData.boughtFromAddress
        });
        if (supp) {
          boughtFromId = supp.id;
          boughtFromName = supp.fullName || supp.name;
          boughtFromType = 'supplier';
        }
      }

      const purchasePrice = validateNonNegative(phoneData.purchasePrice, 'Alış Fiyatı');
      const salesPrice = phoneData.salesPrice !== undefined ? validateNonNegative(phoneData.salesPrice, 'Satış Fiyatı') : 0;
      const phoneId = phoneData.id || generateUUID();

      const preparedPhone = {
        ...phoneData,
        id: phoneId,
        boughtFromId,
        boughtFromName,
        boughtFromPhone: sellerPhone,
        purchaseContactPhone: sellerPhone,
        boughtFromType,
        purchasePrice,
        salesPrice,
        expenses: phoneData.expenses || [],
        photos: phoneData.photos || [],
        status: phoneData.status || 'Stokta',
        stockSource: phoneData.stockSource || 'purchase',
        createdAt: phoneData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedPhones;
      if (!isNew) {
        updatedPhones = phones.map(p => p.id === phoneData.id ? preparedPhone : p);
      } else {
        updatedPhones = [...phones, preparedPhone];
      }
      
      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

      // Requirement 6 & 7: Purchase Accounting & Payment Types
      if (isNew && purchasePrice > 0) {
        const opId = generateUUID();
        const purchasePaymentType = phoneData.purchasePaymentType || 'Nakit';

        if (boughtFromId) {
          await transactionService.save({
            contactId: boughtFromId,
            contactType: boughtFromType,
            type: 'purchase_debt',
            amount: purchasePrice,
            date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
            sourceType: 'phone_purchase',
            sourceId: phoneId,
            operationId: `${opId}-debt`,
            description: `Telefon Alış Bedeli - ${phoneData.brand} ${phoneData.model}`
          });
        }

        if (purchasePaymentType === 'Karma Ödeme') {
          const cashAmt = validateNonNegative(phoneData.cashAmount || 0, 'Nakit Tutarı');
          const bankAmt = validateNonNegative(phoneData.bankTransferAmount || 0, 'Havale Tutarı');
          const cardAmt = validateNonNegative(phoneData.cardAmount || 0, 'Kart Tutarı');
          const veresiyeAmt = validateNonNegative(phoneData.veresiyeAmount || 0, 'Veresiye Tutarı');
          const instAmt = validateNonNegative(phoneData.installmentAmount || 0, 'Taksit Tutarı');

          const splitSum = round2(cashAmt + bankAmt + cardAmt + veresiyeAmt + instAmt);
          if (splitSum !== purchasePrice) {
            throw new Error(`Karma ödeme parçaları toplamı (${splitSum} TL), alış tutarına (${purchasePrice} TL) eşit olmalıdır.`);
          }

          const splitItems = [
            { type: 'cash', amount: cashAmt, method: 'cash', name: 'Nakit' },
            { type: 'bank_transfer', amount: bankAmt, method: 'bank_transfer', name: 'Havale/EFT' },
            { type: 'card', amount: cardAmt, method: 'card', name: 'Kredi Kartı' }
          ];

          for (const item of splitItems) {
            if (item.amount > 0) {
              if (boughtFromId) {
                await transactionService.save({
                  contactId: boughtFromId,
                  contactType: boughtFromType,
                  type: 'payment',
                  amount: item.amount,
                  date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
                  sourceType: 'phone_purchase_payment',
                  sourceId: phoneId,
                  operationId: `${opId}-split-${item.type}`,
                  description: `Telefon Alış Ödemesi (${item.name}) - ${phoneData.brand} ${phoneData.model}`
                });
              }

              await cashMovementService.save({
                operationId: `${opId}-cash-${item.type}`,
                direction: 'out',
                paymentMethod: item.method,
                amount: item.amount,
                sourceType: 'phone_purchase',
                sourceId: phoneId,
                description: `Telefon Alış Ödemesi (${item.name}) - ${phoneData.brand} ${phoneData.model}`,
                date: phoneData.purchaseDate || new Date().toISOString().split('T')[0]
              });
            }
          }
        } else if (purchasePaymentType === 'Nakit' || purchasePaymentType === 'Havale/EFT' || purchasePaymentType === 'Kart' || purchasePaymentType === 'Havale') {
          if (boughtFromId) {
            await transactionService.save({
              contactId: boughtFromId,
              contactType: boughtFromType,
              type: 'payment',
              amount: purchasePrice,
              date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
              sourceType: 'phone_purchase_payment',
              sourceId: phoneId,
              operationId: `${opId}-pay`,
              description: `Telefon Alış Ödemesi (${purchasePaymentType}) - ${phoneData.brand} ${phoneData.model}`
            });
          }

          await cashMovementService.save({
            operationId: `${opId}-cash`,
            direction: 'out',
            paymentMethod: mapPaymentMethod(purchasePaymentType),
            amount: purchasePrice,
            sourceType: 'phone_purchase',
            sourceId: phoneId,
            description: `Telefon Alış Ödemesi (${purchasePaymentType}) - ${phoneData.brand} ${phoneData.model}`,
            date: phoneData.purchaseDate || new Date().toISOString().split('T')[0]
          });
        }
      }

      return preparedPhone;
    });
  },

  delete: async (id) => {
    return await runTransaction(async () => {
      const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
      const tradeIns = getJson(STORAGE_KEYS.TRADE_INS, []);
      const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);

      const hasRepairLink = repairs.some(r => r.phoneId === id);
      const hasTradeLink = tradeIns.some(t => t.soldPhoneId === id || t.receivedPhoneId === id);
      const hasInstallmentLink = installments.some(i => i.sourceId === id);

      if (hasRepairLink || hasTradeLink || hasInstallmentLink) {
        throw new Error("Bu telefona bağlı aktif tamir, takas veya taksit kaydı bulunduğu için telefon silinemez.");
      }

      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const filtered = phones.filter(p => p.id !== id);
      await saveJson(STORAGE_KEYS.PHONES, filtered);
      return true;
    });
  },

  sell: async (id, salesData) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const phone = phones.find(p => p.id === id);
      if (!phone) throw new Error("Satılacak telefon bulunamadı.");

      const salesPrice = validateNonNegative(salesData.salesPrice, 'Satış Fiyatı');

      // Requirement 3: Auto resolve Customer with dual name support
      let soldToId = salesData.soldToId || '';
      let soldToName = salesData.soldToName || '';

      if (!soldToId && (soldToName || salesData.salesContactPhone)) {
        const cust = await customerService.findOrCreate({
          name: soldToName || 'Müşteri',
          fullName: soldToName || 'Müşteri',
          phone: salesData.salesContactPhone,
          notes: salesData.salesNote
        });
        if (cust) {
          soldToId = cust.id;
          soldToName = cust.fullName || cust.name;
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
            salesNote: salesData.salesNote || '',
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });

      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

      // Requirement 5, 7, 8: Accounting, Mixed Payments & Cash Movements
      if (soldToId && salesPrice > 0) {
        const operationId = generateUUID();

        // 1. Create sale debt on ledger
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

        const downPayment = validateNonNegative(salesData.downPayment || 0, 'Peşinat');

        if (paymentType === 'Karma Ödeme') {
          const cashAmt = validateNonNegative(salesData.cashAmount || 0, 'Nakit Tutarı');
          const bankAmt = validateNonNegative(salesData.bankTransferAmount || 0, 'Havale Tutarı');
          const cardAmt = validateNonNegative(salesData.cardAmount || 0, 'Kart Tutarı');
          const veresiyeAmt = validateNonNegative(salesData.veresiyeAmount || 0, 'Veresiye Tutarı');
          const instAmt = validateNonNegative(salesData.installmentAmount || 0, 'Taksit Tutarı');

          const splitSum = round2(cashAmt + bankAmt + cardAmt + veresiyeAmt + instAmt);
          if (splitSum !== salesPrice) {
            throw new Error(`Karma ödeme parçaları toplamı (${splitSum} TL), satış fiyatına (${salesPrice} TL) eşit olmalıdır.`);
          }

          const splitItems = [
            { type: 'cash', amount: cashAmt, method: 'cash', name: 'Nakit' },
            { type: 'bank_transfer', amount: bankAmt, method: 'bank_transfer', name: 'Havale/EFT' },
            { type: 'card', amount: cardAmt, method: 'card', name: 'Kredi Kartı' }
          ];

          for (const item of splitItems) {
            if (item.amount > 0) {
              await transactionService.save({
                contactId: soldToId,
                contactType: 'customer',
                type: 'collection',
                amount: item.amount,
                date: salesDate,
                sourceType: 'phone_sale_collection',
                sourceId: id,
                operationId: `${operationId}-split-${item.type}`,
                description: `Telefon Satış Tahsilatı (${item.name})`
              });

              await cashMovementService.save({
                operationId: `${operationId}-cash-${item.type}`,
                direction: 'in',
                paymentMethod: item.method,
                amount: item.amount,
                sourceType: 'phone_sale',
                sourceId: id,
                description: `Telefon Satış Tahsilatı (${item.name}) - ${phone.brand} ${phone.model}`,
                date: salesDate
              });
            }
          }

          if (instAmt > 0) {
            const count = Math.max(1, parseInt(salesData.installmentCount || 1, 10));
            await installmentService.createPlan({
              contactId: soldToId,
              contactType: 'customer',
              sourceType: 'phone_sale',
              sourceId: id,
              operationId: `${operationId}-plan`,
              totalAmount: instAmt,
              downPayment: 0,
              installmentCount: count,
              startDate: salesData.firstInstallmentDate || salesDate,
              note: `${phone.brand} ${phone.model} Satış Taksit Planı`,
              recordDownPaymentTransaction: false
            });
          }
        } else if (paymentType === 'Nakit' || paymentType === 'Havale/EFT' || paymentType === 'Kart' || paymentType === 'Havale') {
          // Upfront sale
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

          await cashMovementService.save({
            operationId: `${operationId}-cash`,
            direction: 'in',
            paymentMethod: mapPaymentMethod(paymentType),
            amount: salesPrice,
            sourceType: 'phone_sale',
            sourceId: id,
            description: `Telefon Satış Tahsilatı (${paymentType}) - ${phone.brand} ${phone.model}`,
            date: salesDate
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

            await cashMovementService.save({
              operationId: `${operationId}-dp-cash`,
              direction: 'in',
              paymentMethod: mapPaymentMethod(salesData.downPaymentMethod || 'Nakit'),
              amount: downPayment,
              sourceType: 'phone_sale_downpayment',
              sourceId: id,
              description: `Satış Peşinat Tahsilatı - ${phone.brand} ${phone.model}`,
              date: salesDate
            });
          }

          if (paymentType === 'Taksit') {
            const count = Math.max(1, parseInt(salesData.installmentCount || 1, 10));
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
              note: `${phone.brand} ${phone.model} Satış Taksit Planı`,
              recordDownPaymentTransaction: false // Avoid double counting
            });
          }
        }
      }

      return true;
    });
  },

  addExpense: async (phoneId, expenseData) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const amount = validateNonNegative(expenseData.amount, 'Masraf Tutarı');
      const opId = generateUUID();
      
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
            expenses: [...(p.expenses || []), newExpense],
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });

      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

      if (amount > 0) {
        await cashMovementService.save({
          operationId: `${opId}-exp-cash`,
          direction: 'out',
          paymentMethod: mapPaymentMethod(expenseData.paymentMethod || 'Nakit'),
          amount: amount,
          sourceType: 'phone_expense',
          sourceId: phoneId,
          description: `Cihaz Masrafı - ${expenseData.name}`,
          date: expenseData.date || new Date().toISOString().split('T')[0]
        });
      }

      return true;
    });
  },

  deleteExpense: async (phoneId, expenseId) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updatedPhones = phones.map(p => {
        if (p.id === phoneId) {
          return {
            ...p,
            expenses: (p.expenses || []).filter(e => e.id !== expenseId),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      return true;
    });
  }
};
