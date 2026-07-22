import { STORAGE_KEYS, getJson, saveJson } from './shared';

/**
 * Memory-First Transaction Runner for Multi-Step Operations
 * 1. Takes snapshot of specified LocalStorage keys.
 * 2. Executes operation callback.
 * 3. Checks for duplicate operationId.
 * 4. Commits changes to LocalStorage on success.
 * 5. Restores snapshot if local commit fails.
 * 6. Triggers background cloud sync via saveJson without deleting local data on network failure.
 */
export const runTransaction = async (optionsOrAction) => {
  let operationId = null;
  let keysToLock = [];
  let action = null;

  if (typeof optionsOrAction === 'function') {
    action = optionsOrAction;
  } else if (optionsOrAction && typeof optionsOrAction === 'object') {
    operationId = optionsOrAction.operationId;
    keysToLock = optionsOrAction.keysToLock || [];
    action = optionsOrAction.action;
  }

  if (!action) {
    throw new Error("Transaction action is required.");
  }

  if (operationId) {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    const tradeIns = getJson(STORAGE_KEYS.TRADE_INS, []);
    const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);

    const isDuplicate = 
      transactions.some(t => t.operationId === operationId) ||
      tradeIns.some(t => t.operationId === operationId) ||
      installments.some(i => i.operationId === operationId);

    if (isDuplicate) {
      throw new Error(`Bu işlem (ID: ${operationId}) zaten gerçekleşmiş. Tekrar kaydedilemez.`);
    }
  }

  // Step 1: Snapshot
  const snapshots = {};
  const targetKeys = [...new Set([
    ...keysToLock, 
    STORAGE_KEYS.TRANSACTIONS, 
    STORAGE_KEYS.PHONES, 
    STORAGE_KEYS.CUSTOMERS, 
    STORAGE_KEYS.SUPPLIERS, 
    STORAGE_KEYS.INSTALLMENTS, 
    STORAGE_KEYS.TRADE_INS, 
    STORAGE_KEYS.PARTS, 
    STORAGE_KEYS.CASH_MOVEMENTS
  ])];
  
  targetKeys.forEach(key => {
    snapshots[key] = localStorage.getItem(key);
  });

  try {
    // Step 2: Execute Action (In-memory validations & updates)
    const result = await action();

    // Step 3: Local Commits
    if (result && result.toSave) {
      for (const [key, data] of Object.entries(result.toSave)) {
        await saveJson(key, data);
      }
    }

    return (result && result.data !== undefined) ? result.data : result;
  } catch (error) {
    // Step 4: Rollback Local Storage
    console.error("İşlem hatası, yerel veriler geri yükleniyor:", error);
    for (const [key, snapshotStr] of Object.entries(snapshots)) {
      try {
        if (snapshotStr !== null) {
          localStorage.setItem(key, snapshotStr);
        }
      } catch (e) {
        console.error(`Rollback restore error for key ${key}:`, e);
      }
    }
    throw error;
  }
};
