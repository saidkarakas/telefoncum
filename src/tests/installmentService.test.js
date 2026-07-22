import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installmentService } from '../db/services/installmentService';
import { customerService } from '../db/services/customerService';
import { phoneService } from '../db/services/phoneService';
import { transactionService } from '../db/services/transactionService';

describe('Installment & Receivables System', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; })
    });
  });

  it('4. should close debt and collection on full cash phone sale', async () => {
    const cust = await customerService.findOrCreate({ name: 'Nakit Müşteri', phone: '05550001122' });
    const phone = await phoneService.save({ brand: 'Apple', model: 'iPhone 13', purchasePrice: 20000 });

    await phoneService.sell(phone.id, {
      soldToId: cust.id,
      soldToName: cust.name,
      salesPrice: 25000,
      salesPaymentType: 'Nakit'
    });

    const updatedCust = customerService.getById(cust.id);
    expect(updatedCust.debt).toBe(0);
    expect(updatedCust.balance).toBe(0);
  });

  it('5. should create sale debt without collection on veresiye sale', async () => {
    const cust = await customerService.findOrCreate({ name: 'Veresiye Müşteri', phone: '05550003344' });
    const phone = await phoneService.save({ brand: 'Samsung', model: 'S23', purchasePrice: 15000 });

    await phoneService.sell(phone.id, {
      soldToId: cust.id,
      soldToName: cust.name,
      salesPrice: 20000,
      salesPaymentType: 'Veresiye'
    });

    const updatedCust = customerService.getById(cust.id);
    expect(updatedCust.debt).toBe(20000);

    const txs = transactionService.getByContactId(cust.id);
    const hasCollection = txs.some(t => t.type === 'collection');
    expect(hasCollection).toBe(false);
  });

  it('6. should make total installment schedule equal to sales amount minus down payment', async () => {
    const cust = await customerService.findOrCreate({ name: 'Taksitli Müşteri', phone: '05550005566' });
    const plan = await installmentService.createPlan({
      contactId: cust.id,
      totalAmount: 10000,
      downPayment: 2000,
      installmentCount: 4,
      startDate: '2026-08-01'
    });

    expect(plan.remainingAmount).toBe(8000);
    const sumSchedule = plan.schedule.reduce((sum, item) => sum + item.amount, 0);
    expect(sumSchedule).toBe(8000);
  });

  it('7. should add penny rounding difference to the last installment', async () => {
    const cust = await customerService.findOrCreate({ name: 'Kuruş Müşteri', phone: '05550007788' });
    // 1000 / 3 = 333.33 * 3 = 999.99 (0.01 diff)
    const plan = await installmentService.createPlan({
      contactId: cust.id,
      totalAmount: 1000,
      downPayment: 0,
      installmentCount: 3,
      startDate: '2026-08-01'
    });

    expect(plan.schedule[0].amount).toBe(333.33);
    expect(plan.schedule[1].amount).toBe(333.33);
    expect(plan.schedule[2].amount).toBe(333.34);
  });

  it('8. should calculate correct remaining debt on partial installment payment', async () => {
    const cust = await customerService.findOrCreate({ name: 'Ödeme Müşteri', phone: '05550009900' });
    const plan = await installmentService.createPlan({
      contactId: cust.id,
      totalAmount: 5000,
      downPayment: 0,
      installmentCount: 5,
      startDate: '2026-08-01'
    });

    const firstInst = plan.schedule[0];
    const updatedPlan = await installmentService.payInstallment(plan.id, firstInst.id, 400, 'Nakit');

    const updatedInst = updatedPlan.schedule[0];
    expect(updatedInst.paidAmount).toBe(400);
    expect(updatedInst.remainingAmount).toBe(600);
    expect(updatedInst.status).toBe('Kısmi Ödendi');
  });
});
