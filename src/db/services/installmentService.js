import { STORAGE_KEYS, getJson, saveJson, generateUUID, validateNonNegative, round2 } from './shared';
import { transactionService } from './transactionService';
import { cashMovementService } from './cashMovementService';
import { runTransaction } from './transactionRunner';

export const mapPaymentMethod = (typeStr) => {
  if (!typeStr) return 'cash';
  const lower = String(typeStr).toLowerCase();
  if (lower.includes('kart')) return 'card';
  if (lower.includes('havale') || lower.includes('eft') || lower.includes('banka')) return 'bank_transfer';
  return 'cash';
};

// Requirement 15: Month addition helper with end-of-month clamping for 29, 30, 31st
export const addMonthsClamped = (startDateStr, monthsToAdd) => {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1 + monthsToAdd, 1);
  const maxDaysInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDaysInTargetMonth);
  const finalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), clampedDay);
  return finalDate.toISOString().split('T')[0];
};

export const installmentService = {
  getAll: () => {
    const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);
    const today = new Date().toISOString().split('T')[0];

    // Requirement 15: Recalculate overdue statuses dynamically (partially paid overdue remain Gecikmiş)
    return installments.map(plan => {
      const updatedSchedule = (plan.schedule || []).map(item => {
        if ((item.status === 'Bekliyor' || item.status === 'Kısmi Ödendi') && item.dueDate < today && item.remainingAmount > 0) {
          return { ...item, status: 'Gecikmiş' };
        }
        return item;
      });

      const hasOverdue = updatedSchedule.some(i => i.status === 'Gecikmiş');
      const planStatus = (plan.status !== 'Tamamlandı' && plan.status !== 'İptal' && hasOverdue)
        ? 'Gecikmiş' 
        : plan.status;

      return {
        ...plan,
        status: planStatus,
        schedule: updatedSchedule
      };
    });
  },

  getById: (id) => {
    const plans = installmentService.getAll();
    return plans.find(p => p.id === id) || null;
  },

  getByContactId: (contactId) => {
    const plans = installmentService.getAll();
    return plans.filter(p => p.contactId === contactId);
  },

  createPlan: async (planData) => {
    const totalAmount = validateNonNegative(planData.totalAmount, 'Toplam Taksit Tutarı');
    const downPayment = validateNonNegative(planData.downPayment || 0, 'Peşinat');
    const count = Math.max(1, parseInt(planData.installmentCount || 1, 10));
    const remainingAmount = round2(totalAmount - downPayment);

    if (downPayment > totalAmount) {
      throw new Error("Peşinat toplam tutardan büyük olamaz.");
    }

    const baseAmount = Math.floor((remainingAmount / count) * 100) / 100;
    const roundingDiff = round2(remainingAmount - (baseAmount * count));

    const startDate = planData.startDate || new Date().toISOString().split('T')[0];

    // Requirement 15: Use end-of-month clamped date generation
    const schedule = [];
    for (let i = 1; i <= count; i++) {
      const dueDateStr = addMonthsClamped(startDate, i - 1);
      const instAmount = i === count ? round2(baseAmount + roundingDiff) : baseAmount;

      schedule.push({
        id: generateUUID(),
        installmentNo: i,
        dueDate: dueDateStr,
        amount: instAmount,
        paidAmount: 0,
        remainingAmount: instAmount,
        status: 'Bekliyor',
        paidAt: null
      });
    }

    const planId = planData.id || generateUUID();
    const newPlan = {
      id: planId,
      contactId: planData.contactId,
      contactType: planData.contactType || 'customer',
      sourceType: planData.sourceType || 'phone_sale',
      sourceId: planData.sourceId || '',
      operationId: planData.operationId || generateUUID(),
      totalAmount,
      downPayment,
      remainingAmount,
      installmentCount: count,
      startDate,
      frequency: 'monthly',
      status: remainingAmount <= 0 ? 'Tamamlandı' : 'Bekliyor',
      note: planData.note || '',
      schedule,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);
    await saveJson(STORAGE_KEYS.INSTALLMENTS, [newPlan, ...installments]);

    if (planData.recordDownPaymentTransaction && downPayment > 0 && planData.contactId) {
      await transactionService.save({
        contactId: planData.contactId,
        contactType: planData.contactType || 'customer',
        type: (planData.contactType === 'supplier') ? 'payment' : 'collection',
        amount: downPayment,
        date: startDate,
        sourceType: 'installment_down_payment',
        sourceId: planId,
        operationId: planData.operationId ? `${planData.operationId}-dp` : generateUUID(),
        description: `Taksit Planı Peşinatı (${planData.note || 'Peşinat'})`
      });
    }

    return newPlan;
  },

  // Requirement 15: Idempotent Installment Payment (prevents double balance deduction on duplicate calls)
  payInstallment: async (planId, installmentId, paymentAmount, paymentType = 'Nakit', note = '', customOpId = null) => {
    return await runTransaction(async () => {
      const plans = getJson(STORAGE_KEYS.INSTALLMENTS, []);
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Taksit planı bulunamadı.");

      const opId = customOpId || generateUUID();
      const existingPayments = plan.payments || [];

      // Idempotency check: If operationId already recorded in plan payments, return existing plan
      if (existingPayments.some(p => p.opId === opId)) {
        return plan;
      }

      const payVal = validateNonNegative(paymentAmount, 'Ödeme Tutarı');
      if (payVal <= 0) throw new Error("Geçerli bir ödeme tutarı giriniz.");

      const instIdx = plan.schedule.findIndex(i => i.id === installmentId);
      if (instIdx === -1) throw new Error("Taksit kalemi bulunamadı.");

      const inst = plan.schedule[instIdx];
      if (payVal > inst.remainingAmount) {
        throw new Error(`Ödeme tutarı kalan taksit borcundan (${inst.remainingAmount} TL) fazla olamaz.`);
      }

      const newPaidAmount = round2(inst.paidAmount + payVal);
      const newRemainingAmount = round2(inst.amount - newPaidAmount);
      
      const today = new Date().toISOString().split('T')[0];
      let instStatus = 'Kısmi Ödendi';
      if (newRemainingAmount <= 0) {
        instStatus = 'Ödendi';
      } else if (inst.dueDate < today) {
        instStatus = 'Gecikmiş';
      }

      const updatedInst = {
        ...inst,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: instStatus,
        paidAt: new Date().toISOString()
      };

      const newSchedule = [...plan.schedule];
      newSchedule[instIdx] = updatedInst;

      const totalRemaining = newSchedule.reduce((sum, item) => sum + item.remainingAmount, 0);
      const allPaid = newSchedule.every(item => item.status === 'Ödendi');

      const paymentRecord = {
        opId,
        installmentId,
        amount: payVal,
        paymentType,
        date: new Date().toISOString()
      };

      const updatedPlan = {
        ...plan,
        remainingAmount: totalRemaining,
        status: allPaid ? 'Tamamlandı' : 'Kısmi Ödendi',
        schedule: newSchedule,
        payments: [...existingPayments, paymentRecord],
        updatedAt: new Date().toISOString()
      };

      const updatedPlans = plans.map(p => p.id === planId ? updatedPlan : p);
      await saveJson(STORAGE_KEYS.INSTALLMENTS, updatedPlans);

      // Save collection transaction on customer ledger
      const txType = plan.contactType === 'supplier' ? 'payment' : 'collection';
      await transactionService.save({
        contactId: plan.contactId,
        contactType: plan.contactType,
        type: txType,
        amount: payVal,
        date: new Date().toISOString().split('T')[0],
        sourceType: 'installment_payment',
        sourceId: installmentId,
        operationId: `${opId}-tx`,
        description: `Taksit #${inst.installmentNo} Ödemesi (${paymentType}${note ? ' - ' + note : ''})`
      });

      // Save real cash movement for paid installment
      await cashMovementService.save({
        operationId: `${opId}-cash`,
        direction: plan.contactType === 'supplier' ? 'out' : 'in',
        paymentMethod: mapPaymentMethod(paymentType),
        amount: payVal,
        sourceType: 'installment_payment',
        sourceId: installmentId,
        description: `Taksit #${inst.installmentNo} Tahsilatı`,
        date: new Date().toISOString().split('T')[0]
      });

      return updatedPlan;
    });
  },

  // Requirement 16: Safe deletion check for installment plan
  deletePlan: async (id) => {
    return await runTransaction(async () => {
      const plans = getJson(STORAGE_KEYS.INSTALLMENTS, []);
      const plan = plans.find(p => p.id === id);
      if (!plan) return true;

      const hasPaidInstallments = (plan.schedule || []).some(s => s.paidAmount > 0);
      if (hasPaidInstallments) {
        throw new Error("Ödemesi yapılmış taksit planları doğrudan silinemez. Lütfen önce yapılan ödeme hareketlerini iptal edin.");
      }

      const updated = plans.filter(p => p.id !== id);
      await saveJson(STORAGE_KEYS.INSTALLMENTS, updated);
      return true;
    });
  }
};
