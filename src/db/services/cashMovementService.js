import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, validateNonNegative } from './shared';

export const cashMovementService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.CASH_MOVEMENTS, []);
  },

  getBySource: (sourceType, sourceId) => {
    if (!sourceType || !sourceId) return [];
    const items = cashMovementService.getAll();
    return items.filter(m => m.sourceType === sourceType && m.sourceId === sourceId);
  },

  getByOperationId: (opId) => {
    if (!opId) return [];
    const items = cashMovementService.getAll();
    return items.filter(m => m.operationId === opId);
  },

  save: async (data) => {
    if (!data) return false;
    const amount = validateNonNegative(data.amount, 'Kasa Hareket Tutarı');
    if (amount === 0) return true; // Zero amount does not record a cash movement

    const items = cashMovementService.getAll();
    const opId = data.operationId || generateUUID();

    // Idempotency check: if exact same operationId & sourceType & direction exists, update or skip
    const existingIndex = items.findIndex(m => (data.id && m.id === data.id) || (data.operationId && m.operationId === data.operationId && m.direction === data.direction && m.paymentMethod === data.paymentMethod));

    const direction = data.direction === 'out' ? 'out' : 'in';
    const paymentMethod = data.paymentMethod || 'cash';

    const prepared = {
      id: data.id || generateUUID(),
      operationId: opId,
      direction,
      paymentMethod,
      amount,
      sourceType: data.sourceType || 'manual',
      sourceId: data.sourceId || '',
      description: data.description || 'Kasa Hareketi',
      date: data.date || new Date().toISOString().split('T')[0],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let updated;
    if (existingIndex >= 0) {
      updated = [...items];
      updated[existingIndex] = prepared;
    } else {
      updated = [prepared, ...items];
    }

    await saveJson(STORAGE_KEYS.CASH_MOVEMENTS, updated);
    return prepared;
  },

  delete: async (id) => {
    const items = cashMovementService.getAll();
    await saveJson(STORAGE_KEYS.CASH_MOVEMENTS, items.filter(m => m.id !== id));
    return true;
  },

  deleteByOperationId: async (opId) => {
    if (!opId) return true;
    const items = cashMovementService.getAll();
    await saveJson(STORAGE_KEYS.CASH_MOVEMENTS, items.filter(m => m.operationId !== opId));
    return true;
  }
};
