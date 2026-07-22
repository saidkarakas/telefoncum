import { STORAGE_KEYS, getJson, saveJson, generateUUID, validateNonNegative } from './shared';
import { cashMovementService } from './cashMovementService';
import { runTransaction } from './transactionRunner';

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

  // Requirement 14: Veresiye / Ledger transaction with strict non-negative validation, runTransaction, and cash movement linkage
  save: async (transactionData) => {
    return await runTransaction(async () => {
      const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

      // Check operationId / sourceId duplicate prevention
      if (transactionData.operationId && transactionData.type) {
        const existing = transactions.find(t => 
          t.operationId === transactionData.operationId && t.type === transactionData.type
        );
        if (existing) {
          return existing;
        }
      }

      const cleanAmount = validateNonNegative(transactionData.amount, 'İşlem Tutarı');
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        throw new Error('Ödeme/Tahsilat tutarı sıfırdan büyük geçerli bir sayı olmalıdır.');
      }

      const isEdit = Boolean(transactionData.id);
      const trId = transactionData.id || generateUUID();
      const opId = transactionData.operationId || `${trId}-cash`;

      const newTr = {
        ...transactionData,
        id: trId,
        operationId: opId,
        amount: cleanAmount,
        date: transactionData.date || new Date().toISOString().split('T')[0],
        createdAt: transactionData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updated;
      if (isEdit) {
        updated = transactions.map(t => t.id === trId ? newTr : t);
      } else {
        updated = [newTr, ...transactions];
      }

      await saveJson(STORAGE_KEYS.TRANSACTIONS, updated);

      // Requirement 13 & 14: Record matching cash movement for collection/payment
      const typeLower = (transactionData.type || '').toLowerCase();
      if (typeLower === 'tahsilat' || typeLower === 'collection') {
        await cashMovementService.save({
          operationId: opId,
          direction: 'in',
          paymentMethod: transactionData.paymentMethod || 'cash',
          amount: cleanAmount,
          sourceType: 'ledger_collection',
          sourceId: trId,
          description: `Cari Tahsilat - ${transactionData.description || 'Tahsilat'}`,
          date: newTr.date
        });
      } else if (typeLower === 'odeme' || typeLower === 'payment') {
        await cashMovementService.save({
          operationId: opId,
          direction: 'out',
          paymentMethod: transactionData.paymentMethod || 'cash',
          amount: cleanAmount,
          sourceType: 'ledger_payment',
          sourceId: trId,
          description: `Cari Ödeme - ${transactionData.description || 'Ödeme'}`,
          date: newTr.date
        });
      }

      return newTr;
    });
  },

  delete: async (id) => {
    return await runTransaction(async () => {
      const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
      const tr = transactions.find(t => t.id === id);
      if (!tr) return true;

      const opId = tr.operationId || `${id}-cash`;
      await cashMovementService.deleteByOperationId(opId);

      await saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
      return true;
    });
  }
};

export const getTransactionService = () => transactionService;
