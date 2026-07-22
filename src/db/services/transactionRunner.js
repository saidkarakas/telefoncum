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
export const runTransaction = async ({ operationId, keysToLock = [], action }) => {
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
  const targetKeys = [...new Set([...keysToLock, STORAGE_KEYS.TRANSACTIONS])];
  
  targetKeys.forEach(key => {
    snapshots[key] = JSON.stringify(getJson(key, []));
  });

  try {
    // Step 2: Execute Action (In-memory validations & updates)
    const result = await action();

    // Step 3: Local Commits
    // If action succeeded, saveJson to localStorage & trigger sync
    if (result && result.toSave) {
      for (const [key, data] of Object.entries(result.toSave)) {
        await saveJson(key, data);
      }
    }

    return result ? result.data : true;
  } catch (error) {
    // Step 4: Rollback Local Storage
    console.error("İşlem hatası, yerel veriler geri yükleniyor:", error);
    for (const [key, snapshotStr] of Object.entries(snapshots)) {
      try {
        localStorage.setItem(key, snapshotStr);
      } catch (e) {
        console.error(`Rollback restore error for key ${key}:`, e);
      }
    }
    throw error;
  }
};
