import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsService } from '../db/services/settingsService';
import { customerService } from '../db/services/customerService';
import { supplierService } from '../db/services/supplierService';
import { STORAGE_KEYS, saveJson, getJson, initDb } from '../db/services/shared';

describe('Backup Compatibility & Legacy Financial Balance Fallback', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('18. should include legacy transactions (tahsilat, odeme) and fallback legacy phone sales into balance calculation', async () => {
    // Legacy customer
    const cust = { id: 'cust-legacy-1', name: 'Eski Cari', phone: '05559998877' };
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([cust]));

    // Legacy phone sale without sale_debt transaction record
    const legacyPhone = {
      id: 'phone-legacy-1',
      brand: 'Eski',
      model: 'Cihaz',
      status: 'Satıldı',
      soldToId: 'cust-legacy-1',
      salesPrice: 10000,
      purchasePrice: 5000
    };
    localStorage.setItem(STORAGE_KEYS.PHONES, JSON.stringify([legacyPhone]));

    // Legacy transaction: tahsilat of 3000
    const legacyTx = {
      id: 'tr-legacy-1',
      contactId: 'cust-legacy-1',
      contactType: 'customer',
      type: 'tahsilat',
      amount: 3000
    };
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([legacyTx]));

    const calculatedCustomer = customerService.getById('cust-legacy-1');
    expect(calculatedCustomer).not.toBeNull();
    // 10000 sales price (fallback) - 3000 tahsilat = 7000 debt
    expect(calculatedCustomer.debt).toBe(7000);
  });

  it('19. should preserve all new collections (PARTS, STOCK_MOVEMENTS, INSTALLMENTS, TRADE_INS) during export and import', async () => {
    await initDb(true);

    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify([{ id: 'p-1', name: 'Ekran' }]));
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify([{ id: 'm-1', quantity: 5 }]));
    localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify([{ id: 'inst-1', totalAmount: 1000 }]));
    localStorage.setItem(STORAGE_KEYS.TRADE_INS, JSON.stringify([{ id: 'trade-1', soldPhonePrice: 5000 }]));

    const exportedJson = settingsService.exportDatabase();
    expect(exportedJson).toContain('tys_parts');
    expect(exportedJson).toContain('tys_stock_movements');
    expect(exportedJson).toContain('tys_installments');
    expect(exportedJson).toContain('tys_trade_ins');

    // Clear local storage and import back
    localStorage.clear();
    const result = settingsService.importDatabase(exportedJson);
    expect(result).toBe(true);

    const parts = getJson(STORAGE_KEYS.PARTS);
    expect(parts.length).toBe(1);
    expect(parts[0].id).toBe('p-1');

    const tradeIns = getJson(STORAGE_KEYS.TRADE_INS);
    expect(tradeIns.length).toBe(1);
    expect(tradeIns[0].id).toBe('trade-1');
  });
});
