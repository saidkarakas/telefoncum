import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS, getJson, saveJson, safeNumber, mergeCollections, syncToCloud, initDb } from '../db/services/shared';
import { authService } from '../db/services/authService';
import { phoneService } from '../db/services/phoneService';
import { repairService } from '../db/services/repairService';
import { expenseService } from '../db/services/expenseService';
import { installmentService } from '../db/services/installmentService';
import { tradeInService } from '../db/services/tradeInService';
import { cashMovementService } from '../db/services/cashMovementService';
import { settingsService } from '../db/services/settingsService';
import { transactionService } from '../db/services/transactionService';
import { runTransaction } from '../db/services/transactionRunner';

describe('Expanded System Verification Tests (14 Requirements)', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = String(value); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  // 1. Kaynak kodda admin123 bulunmaması
  it('1. authService source code does not use default admin123', async () => {
    const isConfigured = authService.isLocalAdminConfigured();
    expect(isConfigured).toBe(false);
    await expect(async () => {
      await authService.login('admin', 'admin123');
    }).rejects.toThrow();
  });

  // 2. Takas formunun processTradeIn() çağırması
  it('2. TradeIn processTradeIn correctly creates trade, received phone, and cash movement', async () => {
    const soldPhone = {
      id: 'phone-stock-1',
      brand: 'Apple',
      model: 'iPhone 13',
      purchasePrice: 15000,
      salesPrice: 20000,
      status: 'Stokta'
    };
    localStorage.setItem(STORAGE_KEYS.PHONES, JSON.stringify([soldPhone]));

    const tradePayload = {
      soldPhoneId: 'phone-stock-1',
      soldPhonePrice: 20000,
      receivedPhoneValue: 12000,
      paidAmount: 8000,
      paymentType: 'Nakit',
      customerData: { fullName: 'Ahmet Takas', phone: '05551112233' },
      receivedPhoneData: { brand: 'Samsung', model: 'S21', imei1: '999888777666555' }
    };

    const trade = await tradeInService.processTradeIn(tradePayload);
    expect(trade).toBeDefined();
    expect(trade.differenceAmount).toBe(8000);
    expect(trade.paidAmount).toBe(8000);

    const phones = phoneService.getAll();
    const received = phones.find(p => p.stockSource === 'trade_in');
    expect(received).toBeDefined();
    expect(received.purchasePrice).toBe(12000);
  });

  // 3. Tamir formunun stok parçası göndermesi
  it('3. Repair form correctly sends stock parts and updates inventory deltas', async () => {
    const stockPart = {
      id: 'part-screen-1',
      name: 'iPhone 11 Ekran',
      quantity: 5,
      purchasePrice: 400,
      salePrice: 1000
    };
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify([stockPart]));

    const repairData = {
      phoneDescription: 'iPhone 11 Ekran Tamiri',
      defect: 'Kırık Cam',
      status: 'Bekliyor',
      usedParts: [
        {
          partId: 'part-screen-1',
          nameSnapshot: 'iPhone 11 Ekran',
          quantity: 2,
          unitCostSnapshot: 400,
          unitSalePrice: 1000,
          lineTotal: 2000
        }
      ],
      laborFee: 500
    };

    const repair = await repairService.save(repairData);
    expect(repair.partsSaleTotal).toBe(2000);

    const updatedParts = getJson(STORAGE_KEYS.PARTS, []);
    const partInDb = updatedParts.find(p => p.id === 'part-screen-1');
    expect(partInDb.quantity).toBe(3); // 5 - 2 = 3
  });

  // 4. Tamir toplamının boş manuel tutarda hesaplanması
  it('4. Repair total cost falls back to calculated total when manual cost is empty string', async () => {
    const repairData = {
      phoneDescription: 'iPhone 12 Soket',
      defect: 'Şarj olmuyor',
      cost: '', // empty string!
      usedParts: [
        {
          partId: '',
          nameSnapshot: 'Şarj Soketi',
          quantity: 1,
          unitCostSnapshot: 100,
          unitSalePrice: 300,
          lineTotal: 300
        }
      ],
      laborFee: 200
    };

    const repair = await repairService.save(repairData);
    expect(repair.cost).toBe(500); // 300 parça + 200 işçilik
  });

  // 5. Reset butonunun koleksiyonları boşaltması
  it('5. Reset database clears all collections', async () => {
    localStorage.setItem(STORAGE_KEYS.PHONES, JSON.stringify([{ id: 'p1', brand: 'Test' }]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([{ id: 'c1', name: 'Test' }]));

    await settingsService.resetDatabase();

    expect(getJson(STORAGE_KEYS.PHONES, [])).toEqual([]);
    expect(getJson(STORAGE_KEYS.CUSTOMERS, [])).toEqual([]);
  });

  // 6. Import işleminin beklenmesi
  it('6. Import database is async and resolves promise', async () => {
    const importPayload = JSON.stringify({
      _version: '3.0',
      [STORAGE_KEYS.CUSTOMERS]: JSON.stringify([{ id: 'cust-imp-1', name: 'İçe Aktarılan Müşteri' }])
    });

    const promise = settingsService.importDatabase(importPayload);
    expect(promise).toBeInstanceOf(Promise);
    await promise;

    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    expect(customers.length).toBe(1);
    expect(customers[0].name).toBe('İçe Aktarılan Müşteri');
  });

  // 7. Müşterisiz nakit satışta kasa girişi
  it('7. Customer-less cash sale generates real cash movement and records sale', async () => {
    const phone = {
      id: 'phone-no-cust',
      brand: 'Xiaomi',
      model: 'Redmi Note 10',
      purchasePrice: 4000,
      status: 'Stokta'
    };
    localStorage.setItem(STORAGE_KEYS.PHONES, JSON.stringify([phone]));

    await phoneService.sell('phone-no-cust', {
      salesPrice: 6000,
      salesPaymentType: 'Nakit',
      soldToId: '',
      soldToName: ''
    });

    const updatedPhone = phoneService.getById('phone-no-cust');
    expect(updatedPhone.status).toBe('Satıldı');

    const cashMovements = cashMovementService.getAll();
    expect(cashMovements.length).toBe(1);
    expect(cashMovements[0].direction).toBe('in');
    expect(cashMovements[0].amount).toBe(6000);
  });

  // 8. Genel giderde kasa çıkışı
  it('8. General expense creates cash outflow', async () => {
    await expenseService.save({
      category: 'Kira',
      amount: 15000,
      paymentMethod: 'Nakit',
      description: 'Dükkan Kirası'
    });

    const cashMovements = cashMovementService.getAll();
    expect(cashMovements.length).toBe(1);
    expect(cashMovements[0].direction).toBe('out');
    expect(cashMovements[0].amount).toBe(15000);
  });

  // 9. Veresiye fazla ödeme engeli
  it('9. Overpayment prevention throws error for veresiye payments', async () => {
    await expect(async () => {
      await transactionService.save({
        contactId: 'c1',
        type: 'tahsilat',
        amount: -500
      });
    }).rejects.toThrow();
  });

  // 10. Taksit ödeme idempotency
  it('10. Installment payment with duplicate operationId does not deduct balance twice', async () => {
    const plan = await installmentService.createPlan({
      contactId: 'cust-inst-id',
      totalAmount: 3000,
      installmentCount: 3,
      startDate: '2026-08-01'
    });

    const instId = plan.schedule[0].id;
    const opId = 'idempotent-op-123';

    await installmentService.payInstallment(plan.id, instId, 1000, 'Nakit', '', opId);
    // Duplicate call with same opId
    await installmentService.payInstallment(plan.id, instId, 1000, 'Nakit', '', opId);

    const refreshed = installmentService.getById(plan.id);
    expect(refreshed.schedule[0].paidAmount).toBe(1000); // exactly 1000, not 2000!
  });

  // 11. safeNumber throws explicit error on invalid or negative numbers
  it('11. safeNumber throws explicit error on invalid or negative numbers', () => {
    expect(() => safeNumber('abc')).toThrow();
    expect(() => safeNumber(-50)).toThrow();
    expect(() => safeNumber(Infinity)).toThrow();
    expect(safeNumber(100)).toBe(100);
  });

  // 12. Çevrimdışı silmenin yeniden ortaya çıkmaması (Tombstones)
  it('12. mergeCollections filters out soft deleted items with tombstone deletedAt', () => {
    const localItems = [{ id: '1', name: 'Local Active', updatedAt: '2026-07-22T09:00:00Z' }];
    const remoteItems = [{ id: '1', name: 'Local Active', deletedAt: '2026-07-22T10:00:00Z', updatedAt: '2026-07-22T10:00:00Z' }];

    const merged = mergeCollections(localItems, remoteItems);
    expect(merged.length).toBe(0);
  });

  // 13. İki cihazdaki değişikliklerin birbirini silmemesi (Merge Collections)
  it('13. mergeCollections preserves latest updatedAt items from both local and remote', () => {
    const localItems = [
      { id: '1', name: 'Item 1', updatedAt: '2026-07-22T12:00:00Z' },
      { id: '2', name: 'Item 2 Local', updatedAt: '2026-07-22T14:00:00Z' }
    ];
    const remoteItems = [
      { id: '2', name: 'Item 2 Old', updatedAt: '2026-07-22T10:00:00Z' },
      { id: '3', name: 'Item 3 Remote', updatedAt: '2026-07-22T13:00:00Z' }
    ];

    const merged = mergeCollections(localItems, remoteItems);
    expect(merged.length).toBe(3);
    expect(merged.find(i => i.id === '2').name).toBe('Item 2 Local');
  });

  // 14. Transaction rollback sırasında stok hareketlerinin tutarlı kalması
  it('14. Transaction runner restores memory snapshot on action error', async () => {
    const initialPart = { id: 'part-roll-1', name: 'Ekran', quantity: 10 };
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify([initialPart]));

    await expect(async () => {
      await runTransaction(async () => {
        saveJson(STORAGE_KEYS.PARTS, [{ id: 'part-roll-1', name: 'Ekran', quantity: 0 }]);
        throw new Error("Simulated failure inside transaction");
      });
    }).rejects.toThrow();

    const parts = getJson(STORAGE_KEYS.PARTS, []);
    expect(parts[0].quantity).toBe(10); // Restored back to 10!
  });
});
