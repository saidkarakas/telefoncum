import { describe, it, expect, beforeEach, vi } from 'vitest';
import { partService } from '../db/services/partService';
import { stockMovementService } from '../db/services/stockMovementService';

describe('Parts Stock Management', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('should save, search and manage parts', async () => {
    await partService.save({
      name: 'iPhone 13 Orijinal Ekran',
      category: 'Ekran',
      code: 'PRT-101',
      barcode: '8690001112233',
      purchasePrice: 2500,
      salePrice: 4000,
      quantity: 10,
      minQuantity: 3
    });

    const parts = partService.getAll();
    expect(parts.length).toBe(1);
    expect(parts[0].name).toBe('iPhone 13 Orijinal Ekran');

    const foundByBar = partService.findByBarcode('8690001112233');
    expect(foundByBar).not.toBeNull();
    expect(foundByBar.id).toBe(parts[0].id);

    const searchRes = partService.search('Orijinal Ekran');
    expect(searchRes.length).toBe(1);
  });

  it('should filter low stock parts when quantity <= minQuantity', async () => {
    await partService.save({ name: 'Kritik Batarya', category: 'Batarya', quantity: 2, minQuantity: 5 });
    await partService.save({ name: 'Normal Batarya', category: 'Batarya', quantity: 10, minQuantity: 3 });

    const lowStock = partService.getLowStockParts();
    expect(lowStock.length).toBe(1);
    expect(lowStock[0].name).toBe('Kritik Batarya');
  });

  it('should adjust stock quantity and log stock movement', async () => {
    await partService.save({ id: 'p-1', name: 'Test Parça', quantity: 5, purchasePrice: 100 });

    await partService.adjustStock('p-1', 3, { sourceType: 'manual', description: 'Stok Ekleme' });
    let p = partService.getById('p-1');
    expect(p.quantity).toBe(8);

    await partService.adjustStock('p-1', -2, { sourceType: 'repair', description: 'Tamir Kullanımı' });
    p = partService.getById('p-1');
    expect(p.quantity).toBe(6);

    const movements = stockMovementService.getByItemId('p-1');
    expect(movements.length).toBeGreaterThanOrEqual(2);
  });
});
