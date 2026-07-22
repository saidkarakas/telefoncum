import { STORAGE_KEYS, getJson, saveJson, generateUUID, validateNonNegative } from './shared';
import { cashMovementService } from './cashMovementService';
import { mapPaymentMethod } from './installmentService';
import { runTransaction } from './transactionRunner';

export const expenseService = {
  getAll: () => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getById: (id) => {
    const expenses = expenseService.getAll();
    return expenses.find(e => e.id === id) || null;
  },

  save: async (expenseData) => {
    return await runTransaction(async () => {
      const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
      const amount = validateNonNegative(expenseData.amount, 'Gider Tutarı');
      const isEdit = Boolean(expenseData.id);
      const expenseId = expenseData.id || generateUUID();
      const opId = expenseData.operationId || `${expenseId}-cash`;

      const preparedExpense = {
        ...expenseData,
        id: expenseId,
        amount,
        operationId: opId,
        paymentMethod: expenseData.paymentMethod || 'Nakit',
        category: expenseData.category || 'Genel Gider',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        createdAt: expenseData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updated;
      if (isEdit) {
        updated = expenses.map(e => e.id === expenseId ? preparedExpense : e);
      } else {
        updated = [preparedExpense, ...expenses];
      }

      await saveJson(STORAGE_KEYS.EXPENSES, updated);

      // Requirement 13: Create or update real cash movement for general expenses
      if (amount > 0) {
        await cashMovementService.save({
          operationId: opId,
          direction: 'out',
          paymentMethod: mapPaymentMethod(expenseData.paymentMethod || 'Nakit'),
          amount,
          sourceType: 'general_expense',
          sourceId: expenseId,
          description: `Genel Gider - ${expenseData.title || expenseData.name || 'Gider'} (${expenseData.category || 'Diğer'})`,
          date: preparedExpense.date
        });
      }

      return preparedExpense;
    });
  },

  delete: async (id) => {
    return await runTransaction(async () => {
      const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
      const expense = expenses.find(e => e.id === id);
      if (!expense) return true;

      // Requirement 13 & 16: Delete linked cash movement for general expense
      const opId = expense.operationId || `${id}-cash`;
      await cashMovementService.deleteByOperationId(opId);

      await saveJson(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
      return true;
    });
  }
};
