import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tradeInService } from '../db/services/tradeInService';
import { customerService } from '../db/services/customerService';
import { phoneService } from '../db/services/phoneService';
import { transactionService } from '../db/services/transactionService';

describe('Phone Trade-In System', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('9. should calculate positive trade difference when sold phone price > received phone value', async () => {
    const cust = await customerService.findOrCreate({ name: 'Takas Müşteri 1', phone: '05331112233' });
    const soldPhone = await phoneService.save({ brand: 'Apple', model: 'iPhone 14', purchasePrice: 25000 });

    const tradeRecord = await tradeInService.processTradeIn({
      customerId: cust.id,
      soldPhoneId: soldPhone.id,
      soldPhonePrice: 35000,
      receivedPhoneValue: 20000,
      receivedPhoneData: {
        brand: 'Apple',
        model: 'iPhone 11',
        imei1: '111112222233333'
      },
      paidAmount: 15000,
      paymentType: 'Nakit'
    });

    expect(tradeRecord.differenceAmount).toBe(15000);
    expect(tradeRecord.differenceDirection).toBe('customer_owes');
    expect(tradeRecord.remainingAmount).toBe(0);
  });

  it('10. should calculate negative trade difference when sold phone price < received phone value', async () => {
    const cust = await customerService.findOrCreate({ name: 'Takas Müşteri 2', phone: '05331114455' });
    const soldPhone = await phoneService.save({ brand: 'Xiaomi', model: 'Redmi Note 12', purchasePrice: 5000 });

    const tradeRecord = await tradeInService.processTradeIn({
      customerId: cust.id,
      soldPhoneId: soldPhone.id,
      soldPhonePrice: 7000,
      receivedPhoneValue: 12000,
      receivedPhoneData: {
        brand: 'Apple',
        model: 'iPhone 12',
        imei1: '444445555566666'
      },
      paidAmount: 5000,
      paymentType: 'Nakit'
    });

    expect(tradeRecord.differenceAmount).toBe(5000);
    expect(tradeRecord.differenceDirection).toBe('business_owes');
  });

  it('11. should not generate unnecessary cash entry on zero trade difference', async () => {
    const cust = await customerService.findOrCreate({ name: 'Takas Müşteri 3', phone: '05331116677' });
    const soldPhone = await phoneService.save({ brand: 'Samsung', model: 'A54', purchasePrice: 10000 });

    const tradeRecord = await tradeInService.processTradeIn({
      customerId: cust.id,
      soldPhoneId: soldPhone.id,
      soldPhonePrice: 15000,
      receivedPhoneValue: 15000,
      receivedPhoneData: {
        brand: 'Apple',
        model: 'iPhone 12 Mini',
        imei1: '777778888899999'
      }
    });

    expect(tradeRecord.differenceAmount).toBe(0);
    expect(tradeRecord.differenceDirection).toBe('closed');
  });

  it('12. should add trade-in received phone to stock with stockSource trade_in', async () => {
    const cust = await customerService.findOrCreate({ name: 'Takas Müşteri 4', phone: '05331118899' });
    const soldPhone = await phoneService.save({ brand: 'Apple', model: 'iPhone 13', purchasePrice: 20000 });

    const tradeRecord = await tradeInService.processTradeIn({
      customerId: cust.id,
      soldPhoneId: soldPhone.id,
      soldPhonePrice: 25000,
      receivedPhoneValue: 18000,
      receivedPhoneData: {
        brand: 'Samsung',
        model: 'S22',
        imei1: '123123123123123'
      }
    });

    const receivedPhone = phoneService.getById(tradeRecord.receivedPhoneId);
    expect(receivedPhone).not.toBeNull();
    expect(receivedPhone.status).toBe('Stokta');
    expect(receivedPhone.stockSource).toBe('trade_in');
    expect(receivedPhone.purchasePrice).toBe(18000);
    expect(receivedPhone.boughtFromId).toBe(cust.id);
  });

  it('13. should prevent adding trade-in device with duplicate IMEI', async () => {
    await phoneService.save({ brand: 'Existing', model: 'Phone', imei1: '999888777666555', purchasePrice: 5000 });

    const cust = await customerService.findOrCreate({ name: 'IMEI Müşteri', phone: '05330001122' });
    const soldPhone = await phoneService.save({ brand: 'Apple', model: 'iPhone 11', purchasePrice: 10000 });

    await expect(tradeInService.processTradeIn({
      customerId: cust.id,
      soldPhoneId: soldPhone.id,
      soldPhonePrice: 12000,
      receivedPhoneValue: 8000,
      receivedPhoneData: {
        brand: 'Dup',
        model: 'Device',
        imei1: '999888777666555'
      }
    })).rejects.toThrow(/zaten sistemde kayıtlı/);
  });
});
