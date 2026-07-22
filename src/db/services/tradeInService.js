import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber, round2 } from './shared';
import { customerService } from './customerService';
import { phoneService } from './phoneService';
import { transactionService } from './transactionService';
import { installmentService } from './installmentService';
import { runTransaction } from './transactionRunner';

export const tradeInService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.TRADE_INS, []);
  },

  getById: (id) => {
    const tradeIns = tradeInService.getAll();
    return tradeIns.find(t => t.id === id) || null;
  },

  processTradeIn: async (tradeData) => {
    const operationId = tradeData.operationId || generateUUID();

    return await runTransaction({
      operationId,
      keysToLock: [
        STORAGE_KEYS.TRADE_INS,
        STORAGE_KEYS.PHONES,
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.INSTALLMENTS
      ],
      action: async () => {
        // 1. Verify sold phone
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const soldPhone = phones.find(p => p.id === tradeData.soldPhoneId);
        if (!soldPhone) {
          throw new Error("Satılacak telefon sistemde bulunamadı.");
        }
        if (soldPhone.status === 'Satıldı') {
          throw new Error("Seçilen telefon zaten satılmış.");
        }

        // 2. Validate received phone IMEI uniqueness
        const receivedData = tradeData.receivedPhoneData || {};
        if (receivedData.imei1 || receivedData.imei2) {
          const duplicate = phones.find(p => 
            (receivedData.imei1 && (p.imei1 === receivedData.imei1 || p.imei2 === receivedData.imei1)) ||
            (receivedData.imei2 && (p.imei1 === receivedData.imei2 || p.imei2 === receivedData.imei2))
          );
          if (duplicate) {
            throw new Error(`Takasta alınacak cihazın IMEI numarası zaten sistemde kayıtlı: ${duplicate.brand} ${duplicate.model}`);
          }
        }

        // 3. Resolve Customer
        let customer = null;
        if (tradeData.customerId) {
          customer = customerService.getById(tradeData.customerId);
        }
        if (!customer && tradeData.customerData) {
          customer = await customerService.findOrCreate(tradeData.customerData);
        }
        if (!customer) {
          throw new Error("Takas işlemi için müşteri bilgisi zorunludur.");
        }

        const soldPhonePrice = safeNumber(tradeData.soldPhonePrice);
        const receivedPhoneValue = safeNumber(tradeData.receivedPhoneValue);
        const diff = round2(soldPhonePrice - receivedPhoneValue);

        let diffDirection = 'closed';
        let diffAmount = 0;

        if (diff > 0) {
          diffDirection = 'customer_owes';
          diffAmount = diff;
        } else if (diff < 0) {
          diffDirection = 'business_owes';
          diffAmount = Math.abs(diff);
        }

        const paidAmount = safeNumber(tradeData.paidAmount);
        const remainingAmount = round2(diffAmount - paidAmount);
        const tradeDate = tradeData.tradeDate || new Date().toISOString().split('T')[0];
        const tradeInId = generateUUID();
        const receivedPhoneId = generateUUID();

        // 4. Create Received Phone (Stock entry)
        const newStockPhone = {
          id: receivedPhoneId,
          brand: (receivedData.brand || 'Bilinmiyor').trim(),
          model: (receivedData.model || 'Cihaz').trim(),
          imei1: (receivedData.imei1 || '').trim(),
          imei2: (receivedData.imei2 || '').trim(),
          serialNumber: (receivedData.serialNumber || '').trim(),
          color: (receivedData.color || '').trim(),
          storage: (receivedData.storage || '').trim(),
          ram: (receivedData.ram || '').trim(),
          cosmeticStatus: receivedData.cosmeticStatus || 'İyi',
          batteryHealth: receivedData.batteryHealth || '',
          boxStatus: receivedData.boxStatus || 'Yok',
          invoiceStatus: receivedData.invoiceStatus || 'Yok',
          warrantyStatus: receivedData.warrantyStatus || 'Yok',
          description: receivedData.description || '',
          defects: receivedData.defects || '',
          purchasePrice: receivedPhoneValue,
          salesPrice: 0,
          status: 'Stokta',
          stockSource: 'trade_in',
          boughtFromId: customer.id,
          boughtFromName: customer.name,
          boughtFromType: 'customer',
          tradeInId: tradeInId,
          purchaseDate: tradeDate,
          photos: receivedData.photos || [],
          expenses: [],
          createdAt: new Date().toISOString()
        };

        // 5. Update Sold Phone Status
        const updatedPhones = phones.map(p => {
          if (p.id === soldPhone.id) {
            return {
              ...p,
              status: 'Satıldı',
              soldToId: customer.id,
              soldToName: customer.name,
              salesDate: tradeDate,
              salesPrice: soldPhonePrice,
              salesPaymentType: 'Takas',
              tradeInId: tradeInId
            };
          }
          return p;
        });

        updatedPhones.push(newStockPhone);

        // 6. Manage Accounting Transactions
        const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
        const newTxList = [...transactions];

        // Primary Sale Debt
        const saleDebtTx = {
          id: generateUUID(),
          contactId: customer.id,
          contactType: 'customer',
          type: 'sale_debt',
          amount: soldPhonePrice,
          date: tradeDate,
          sourceType: 'trade_in_sale',
          sourceId: soldPhone.id,
          operationId: `${operationId}-debt`,
          description: `Takaslı Satış - ${soldPhone.brand} ${soldPhone.model}`
        };
        newTxList.unshift(saleDebtTx);

        // Trade-in Credit offset for received phone value
        const tradeCreditTx = {
          id: generateUUID(),
          contactId: customer.id,
          contactType: 'customer',
          type: 'collection',
          amount: receivedPhoneValue,
          date: tradeDate,
          sourceType: 'trade_in_received_phone',
          sourceId: receivedPhoneId,
          operationId: `${operationId}-credit`,
          description: `Takasa Alınan Cihaz Bedeli - ${newStockPhone.brand} ${newStockPhone.model}`
        };
        newTxList.unshift(tradeCreditTx);

        // Cash collection / payment for difference
        if (diffDirection === 'customer_owes') {
          if (paidAmount > 0) {
            newTxList.unshift({
              id: generateUUID(),
              contactId: customer.id,
              contactType: 'customer',
              type: 'collection',
              amount: paidAmount,
              date: tradeDate,
              sourceType: 'trade_in_diff_payment',
              sourceId: tradeInId,
              operationId: `${operationId}-diff-pay`,
              description: `Takas Farkı Tahsilatı (${tradeData.paymentType || 'Nakit'})`
            });
          }
        } else if (diffDirection === 'business_owes') {
          if (paidAmount > 0) {
            newTxList.unshift({
              id: generateUUID(),
              contactId: customer.id,
              contactType: 'customer',
              type: 'payment',
              amount: paidAmount,
              date: tradeDate,
              sourceType: 'trade_in_diff_outflow',
              sourceId: tradeInId,
              operationId: `${operationId}-diff-out`,
              description: `Müşteriye Ödenen Takas Farkı (${tradeData.paymentType || 'Nakit'})`
            });
          }
        }

        // Installment plan if chosen
        let installmentPlanId = null;
        if (diffDirection === 'customer_owes' && remainingAmount > 0 && tradeData.paymentType === 'Taksit') {
          const instPlan = await installmentService.createPlan({
            contactId: customer.id,
            contactType: 'customer',
            sourceType: 'trade_in',
            sourceId: tradeInId,
            operationId: `${operationId}-inst`,
            totalAmount: remainingAmount,
            downPayment: 0,
            installmentCount: tradeData.installmentCount || 2,
            startDate: tradeData.installmentStartDate || tradeDate,
            note: `Takas Farkı Taksit Planı - ${soldPhone.brand} ${soldPhone.model}`
          });
          installmentPlanId = instPlan.id;
        }

        // 7. Create Trade In Record
        const tradeInRecord = {
          id: tradeInId,
          customerId: customer.id,
          customerName: customer.name,
          soldPhoneId: soldPhone.id,
          soldPhoneName: `${soldPhone.brand} ${soldPhone.model}`,
          receivedPhoneId: receivedPhoneId,
          receivedPhoneName: `${newStockPhone.brand} ${newStockPhone.model}`,
          soldPhonePrice,
          receivedPhoneValue,
          differenceAmount: diffAmount,
          differenceDirection: diffDirection,
          paidAmount,
          remainingAmount,
          paymentType: tradeData.paymentType || 'Nakit',
          installmentPlanId,
          operationId,
          notes: tradeData.notes || '',
          tradeDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const existingTradeIns = getJson(STORAGE_KEYS.TRADE_INS, []);
        const updatedTradeIns = [tradeInRecord, ...existingTradeIns];

        return {
          data: tradeInRecord,
          toSave: {
            [STORAGE_KEYS.TRADE_INS]: updatedTradeIns,
            [STORAGE_KEYS.PHONES]: updatedPhones,
            [STORAGE_KEYS.TRANSACTIONS]: newTxList
          }
        };
      }
    });
  }
};
