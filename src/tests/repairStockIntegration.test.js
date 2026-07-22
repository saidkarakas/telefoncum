import { describe, it, expect, beforeEach, vi } from 'vitest';
import { repairService } from '../db/services/repairService';
import { partService } from '../db/services/partService';

describe('Repair & Parts Stock Integration', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('14. should deduct part stock when added to repair', async () => {
    await partService.save({ id: 'part-ekran', name: 'iPhone 11 Ekran', quantity: 10, purchasePrice: 1000, salePrice: 2000 });

    const repair = await repairService.save({
      customerName: 'Müşteri Tamir',
      defect: 'Ekran Kırık',
      usedParts: [
        { partId: 'part-ekran', nameSnapshot: 'iPhone 11 Ekran', quantity: 2, unitCostSnapshot: 1000, unitSalePrice: 2000, lineTotal: 4000 }
      ],
      laborFee: 500
    });

    const updatedPart = partService.getById('part-ekran');
    expect(updatedPart.quantity).toBe(8);
    expect(repair.totalPrice).toBe(4500);
  });

  it('15. should not double deduct part stock when editing repair without quantity change', async () => {
    await partService.save({ id: 'part-batarya', name: 'iPhone 11 Batarya', quantity: 10, purchasePrice: 500, salePrice: 1000 });

    const repair = await repairService.save({
      customerName: 'Müşteri Batarya',
      defect: 'Batarya Değişimi',
      usedParts: [
        { partId: 'part-batarya', nameSnapshot: 'iPhone 11 Batarya', quantity: 1, unitCostSnapshot: 500, unitSalePrice: 1000, lineTotal: 1000 }
      ]
    });

    let updatedPart = partService.getById('part-batarya');
    expect(updatedPart.quantity).toBe(9);

    // Save repair again without changing quantity
    await repairService.save({
      ...repair,
      notes: 'Ek not eklendi'
    });

    updatedPart = partService.getById('part-batarya');
    expect(updatedPart.quantity).toBe(9);
  });

  it('16. should restore stock when part is removed or repair is deleted', async () => {
    await partService.save({ id: 'part-kamera', name: 'Kamera', quantity: 10, purchasePrice: 300, salePrice: 600 });

    const repair = await repairService.save({
      customerName: 'Silme Müşteri',
      defect: 'Kamera Bozuk',
      usedParts: [
        { partId: 'part-kamera', nameSnapshot: 'Kamera', quantity: 3, unitCostSnapshot: 300, unitSalePrice: 600, lineTotal: 1800 }
      ]
    });

    let part = partService.getById('part-kamera');
    expect(part.quantity).toBe(7);

    // Delete repair
    await repairService.delete(repair.id);
    part = partService.getById('part-kamera');
    expect(part.quantity).toBe(10);
  });

  it('17. should display and support legacy repair part format ({ name, price })', async () => {
    const legacyRepair = await repairService.save({
      customerName: 'Eski Tamir Müşteri',
      defect: 'Soket Tamiri',
      parts: [
        { name: 'Şarj Soketi', price: 300 }
      ],
      cost: 150,
      totalPrice: 450
    });

    expect(legacyRepair).not.toBeNull();
    expect(legacyRepair.totalPrice).toBe(450);
  });
});
