import { describe, it, expect, beforeEach, vi } from 'vitest';
import { customerService, normalizePhone, normalizeName } from '../db/services/customerService';
import { supplierService } from '../db/services/supplierService';
import { STORAGE_KEYS } from '../db/services/shared';

describe('Contact Service & Auto Registration', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('1. should normalize different phone formats to the same value', () => {
    const p1 = normalizePhone('0555 111 22 33');
    const p2 = normalizePhone('05551112233');
    const p3 = normalizePhone('+90 555 111 22 33');
    const p4 = normalizePhone('905551112233');

    expect(p1).toBe('5551112233');
    expect(p2).toBe('5551112233');
    expect(p3).toBe('5551112233');
    expect(p4).toBe('5551112233');
  });

  it('2. should auto create supplier when buying phone manually', async () => {
    const supp = await supplierService.findOrCreate({
      name: 'Ahmet Tedarikçi',
      phone: '+90 532 999 88 77'
    });

    expect(supp).not.toBeNull();
    expect(supp.name).toBe('Ahmet Tedarikçi');
    expect(normalizePhone(supp.phone)).toBe('5329998877');

    const allSuppliers = supplierService.getAll();
    expect(allSuppliers.length).toBe(1);
  });

  it('3. should auto create customer when selling phone manually', async () => {
    const cust = await customerService.findOrCreate({
      name: 'Mehmet Müşteri',
      phone: '0544 123 45 67'
    });

    expect(cust).not.toBeNull();
    expect(cust.name).toBe('Mehmet Müşteri');
    expect(normalizePhone(cust.phone)).toBe('5441234567');

    const allCustomers = customerService.getAll();
    expect(allCustomers.length).toBe(1);
  });

  it('4. should prevent creating duplicate customers with the same phone number', async () => {
    const cust1 = await customerService.findOrCreate({
      name: 'Ali Yılmaz',
      phone: '0555 111 22 33'
    });

    const cust2 = await customerService.findOrCreate({
      name: 'Ali Yılmaz Yeni',
      phone: '+90 555 111 22 33'
    });

    expect(cust1.id).toBe(cust2.id);
    const allCustomers = customerService.getAll();
    expect(allCustomers.length).toBe(1);
  });
});
