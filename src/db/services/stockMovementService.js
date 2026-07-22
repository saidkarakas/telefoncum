import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber } from './shared';

export const stockMovementService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  },

  getByItemId: (itemId) => {
    const movements = stockMovementService.getAll();
    return movements
      .filter(m => m.itemId === itemId)
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  },

  record: async (movementData) => {
    const movements = getJson(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    const qty = safeNumber(movementData.quantity);
    const unitCost = safeNumber(movementData.unitCost);
    
    const newMovement = {
      id: generateUUID(),
      itemType: movementData.itemType || 'part',
      itemId: movementData.itemId,
      movementType: movementData.movementType || 'in',
      quantity: qty,
      previousQuantity: safeNumber(movementData.previousQuantity),
      newQuantity: safeNumber(movementData.newQuantity),
      unitCost: unitCost,
      totalCost: safeNumber(qty * unitCost),
      sourceType: movementData.sourceType || 'manual',
      sourceId: movementData.sourceId || '',
      date: movementData.date || new Date().toISOString().split('T')[0],
      description: movementData.description || '',
      createdAt: new Date().toISOString()
    };

    const updated = [newMovement, ...movements];
    await saveJson(STORAGE_KEYS.STOCK_MOVEMENTS, updated);
    return newMovement;
  }
};
