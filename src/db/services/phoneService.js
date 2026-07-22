import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, validateNonNegative, round2 } from './shared';
import { customerService } from './customerService';
import { supplierService } from './supplierService';
import { transactionService } from './transactionService';
import { cashMovementService } from './cashMovementService';
import { installmentService, mapPaymentMethod } from './installmentService';
import { runTransaction } from './transactionRunner';

export const phoneService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.PHONES, []);
  },

  getById: (id) => {
    const phones = phoneService.getAll();
    return phones.find(p => p.id === id) || null;
  },

  save: async (phoneData) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const isNew = !phoneData.id;
      const phoneId = phoneData.id || generateUUID();

      const purchasePrice = validateNonNegative(phoneData.purchasePrice, 'Alış Fiyatı');

      // Dual support for seller contact info
      let boughtFromId = phoneData.boughtFromId || '';
      let boughtFromName = phoneData.boughtFromName || phoneData.boughtFromPhone || phoneData.purchaseContactPhone || '';
      let boughtFromType = phoneData.boughtFromType || 'supplier';

      if (!boughtFromId && (boughtFromName || phoneData.purchaseContactPhone)) {
        const supp = await supplierService.findOrCreate({
          name: boughtFromName || 'Tedarikçi',
          fullName: boughtFromName || 'Tedarikçi',
          phone: phoneData.purchaseContactPhone || phoneData.boughtFromPhone,
          company: phoneData.boughtFromCompany
        });
        if (supp) {
          boughtFromId = supp.id;
          boughtFromName = supp.fullName || supp.name;
          boughtFromType = 'supplier';
        }
      }

      const preparedPhone = {
        ...phoneData,
        id: phoneId,
        brand: phoneData.brand || 'Diğer',
        model: phoneData.model || 'Bilinmeyen Model',
        status: phoneData.status || 'Stokta',
        purchasePrice,
        boughtFromId,
        boughtFromName,
        boughtFromType,
        boughtFromPhone: phoneData.boughtFromPhone || phoneData.purchaseContactPhone || '',
        purchaseContactPhone: phoneData.purchaseContactPhone || phoneData.boughtFromPhone || '',
        salesPrice: phoneData.salesPrice ? parseNumber(phoneData.salesPrice) : null,
        expenses: phoneData.expenses || [],
        purchaseDate: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
        createdAt: phoneData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedPhones;
      if (isNew) {
        updatedPhones = [preparedPhone, ...phones];
      } else {
        updatedPhones = phones.map(p => p.id === phoneId ? preparedPhone : p);
      }

      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);

      // Purchase Accounting & Payment Types
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

          // Requirement 12: Support supplier installment plan for purchase
          if (instAmt > 0 && boughtFromId) {
            const count = Math.max(1, parseInt(phoneData.installmentCount || 1, 10));
            await installmentService.createPlan({
              contactId: boughtFromId,
              contactType: 'supplier',
              sourceType: 'phone_purchase',
              sourceId: phoneId,
              operationId: `${opId}-supplier-plan`,
              totalAmount: instAmt,
              downPayment: 0,
              installmentCount: count,
              startDate: phoneData.firstPaymentDate || phoneData.purchaseDate || new Date().toISOString().split('T')[0],
              note: `${phoneData.brand} ${phoneData.model} Alış Taksit Planı`,
              recordDownPaymentTransaction: false
            });
          }
        } else if (purchasePaymentType === 'Taksit') {
          // Requirement 12: Direct Taksit purchase option
          if (boughtFromId) {
            const count = Math.max(1, parseInt(phoneData.installmentCount || 1, 10));
            const upfront = validateNonNegative(phoneData.paidAmount || 0, 'Peşin Ödenen');
            if (upfront > 0) {
              await transactionService.save({
                contactId: boughtFromId,
                contactType: boughtFromType,
                type: 'payment',
                amount: upfront,
                date: phoneData.purchaseDate || new Date().toISOString().split('T')[0],
                sourceType: 'phone_purchase_payment',
                sourceId: phoneId,
                operationId: `${opId}-pay-upfront`,
                description: `Telefon Alış Peşinat Ödemesi - ${phoneData.brand} ${phoneData.model}`
              });

              await cashMovementService.save({
                operationId: `${opId}-cash-upfront`,
                direction: 'out',
                paymentMethod: 'cash',
                amount: upfront,
                sourceType: 'phone_purchase',
                sourceId: phoneId,
                description: `Telefon Alış Peşinatı - ${phoneData.brand} ${phoneData.model}`,
                date: phoneData.purchaseDate || new Date().toISOString().split('T')[0]
              });
            }

            const remTaksit = round2(purchasePrice - upfront);
            if (remTaksit > 0) {
              await installmentService.createPlan({
                contactId: boughtFromId,
                contactType: 'supplier',
                sourceType: 'phone_purchase',
                sourceId: phoneId,
                operationId: `${opId}-supplier-plan`,
                totalAmount: remTaksit,
                downPayment: 0,
                installmentCount: count,
                startDate: phoneData.firstPaymentDate || phoneData.purchaseDate || new Date().toISOString().split('T')[0],
                note: `${phoneData.brand} ${phoneData.model} Alış Taksit Planı`,
                recordDownPaymentTransaction: false
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

      const hasLinkedRepairs = repairs.some(r => r.phoneId === id);
      const hasLinkedTradeIns = tradeIns.some(t => t.soldPhoneId === id || t.receivedPhoneId === id);

      if (hasLinkedRepairs || hasLinkedTradeIns) {
        throw new Error("Bu telefona bağlı tamir veya takas kaydı bulunduğu için silinemez.");
      }

      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updated = phones.filter(p => p.id !== id);
      await saveJson(STORAGE_KEYS.PHONES, updated);
      return true;
    });
  },

  // Requirement 11: Sell phone with/without customer
  sell: async (id, salesData) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const phone = phones.find(p => p.id === id);
      if (!phone) throw new Error("Satılacak telefon bulunamadı.");

      const salesPrice = validateNonNegative(salesData.salesPrice, 'Satış Fiyatı');

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

      const operationId = generateUUID();

      // Requirement 11: Customer-less cash sale generates real cash movement and records sale on phone!
      if (salesPrice > 0) {
        if (paymentType === 'Nakit' || paymentType === 'Havale/EFT' || paymentType === 'Kart' || paymentType === 'Havale') {
          await cashMovementService.save({
            operationId: `${operationId}-cash-sale`,
            direction: 'in',
            paymentMethod: mapPaymentMethod(paymentType),
            amount: salesPrice,
            sourceType: 'phone_sale',
            sourceId: id,
            description: `Telefon Peşin Satış Tahsilatı - ${phone.brand} ${phone.model}${soldToName ? ` (${soldToName})` : ''}`,
            date: salesDate
          });
        }
      }

      // Record customer ledger debt & collections if customer selected
      if (soldToId && salesPrice > 0) {
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
          await transactionService.save({
            contactId: soldToId,
            contactType: 'customer',
            type: 'collection',
            amount: salesPrice,
            date: salesDate,
            sourceType: 'phone_sale_collection',
            sourceId: id,
            operationId: `${operationId}-col`,
            description: `Telefon Satış Tahsilatı (${paymentType}) - ${phone.brand} ${phone.model}`
          });
        } else if (paymentType === 'Taksit') {
          const remTaksit = round2(salesPrice - downPayment);
          if (downPayment > 0) {
            await transactionService.save({
              contactId: soldToId,
              contactType: 'customer',
              type: 'collection',
              amount: downPayment,
              date: salesDate,
              sourceType: 'phone_sale_collection',
              sourceId: id,
              operationId: `${operationId}-dp`,
              description: `Telefon Satış Peşinatı - ${phone.brand} ${phone.model}`
            });

            await cashMovementService.save({
              operationId: `${operationId}-cash-dp`,
              direction: 'in',
              paymentMethod: 'cash',
              amount: downPayment,
              sourceType: 'phone_sale',
              sourceId: id,
              description: `Telefon Satış Peşinatı - ${phone.brand} ${phone.model}`,
              date: salesDate
            });
          }

          if (remTaksit > 0) {
            const count = Math.max(1, parseInt(salesData.installmentCount || 1, 10));
            await installmentService.createPlan({
              contactId: soldToId,
              contactType: 'customer',
              sourceType: 'phone_sale',
              sourceId: id,
              operationId: `${operationId}-plan`,
              totalAmount: remTaksit,
              downPayment: 0,
              installmentCount: count,
              startDate: salesData.firstInstallmentDate || salesDate,
              note: `${phone.brand} ${phone.model} Satış Taksit Planı`,
              recordDownPaymentTransaction: false
            });
          }
        }
      }

      return true;
    });
  },

  // Requirement 13 & 16: Delete phone expense with linked cash movement cleanup
  deleteExpense: async (phoneId, expenseId) => {
    return await runTransaction(async () => {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updated = phones.map(p => {
        if (p.id === phoneId) {
          const updatedExp = (p.expenses || []).filter(e => e.id !== expenseId);
          return {
            ...p,
            expenses: updatedExp,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      await saveJson(STORAGE_KEYS.PHONES, updated);
      await cashMovementService.deleteByOperationId(`phone-exp-${expenseId}`);
      return true;
    });
  }
};
