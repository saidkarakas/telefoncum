import { STORAGE_KEYS, getJson, saveJson, setSyncPaused, syncToCloud } from './shared';

/**
 * Yerel Rollback ve Çevrimdışı Yeniden Deneme Kuyruğu Kullanan İşlem Koşucusu (Local Transaction Runner)
 * Note: Gerçek Supabase çoklu tablo atomikliği olmadığından yerel bellekte bellek snapshot'ı,
 * rollback ve çevrimdışı yeniden deneme kuyruğu yönetimi uygulanır.
 * 
 * 1. Belirtilen tüm LocalStorage anahtarlarının snapshot'ını alır.
 * 2. Ara bulut senkronizasyonlarını duraklatır (isSyncPaused = true).
 * 3. İşlem callback fonksiyonunu çalıştırır.
 * 4. Hata oluşursa tüm yerel verileri snapshot durumuna geri yükler (rollback).
 * 5. Başarılı olursa ara senkronizasyonu kaldırıp (isSyncPaused = false) güncellenen koleksiyonları buluta gönderir.
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

  // Requirement 10: Include REPAIRS, STOCK_MOVEMENTS, EXPENSES, SETTINGS in snapshot
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
    STORAGE_KEYS.CASH_MOVEMENTS,
    STORAGE_KEYS.REPAIRS,
    STORAGE_KEYS.STOCK_MOVEMENTS,
    STORAGE_KEYS.EXPENSES,
    STORAGE_KEYS.SETTINGS
  ])];
  
  targetKeys.forEach(key => {
    snapshots[key] = localStorage.getItem(key);
  });

  // Pause cloud sync for intermediate calls
  setSyncPaused(true);

  try {
    const result = await action();

    if (result && result.toSave) {
      for (const [key, data] of Object.entries(result.toSave)) {
        await saveJson(key, data);
      }
    }

    // Resume cloud sync and flush updated keys to cloud
    setSyncPaused(false);
    for (const key of targetKeys) {
      const currentStr = localStorage.getItem(key);
      if (currentStr !== snapshots[key]) {
        const currentData = getJson(key, []);
        syncToCloud(key, currentData).catch(err => console.error(`Transaction final cloud sync error for ${key}:`, err));
      }
    }

    return (result && result.data !== undefined) ? result.data : result;
  } catch (error) {
    // Rollback Local Storage
    setSyncPaused(false);
    console.error("İşlem hatası, yerel veriler snapshot durumuna geri yükleniyor:", error);
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
