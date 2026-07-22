import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber, round2 } from './shared';
import { transactionService } from './transactionService';

export const installmentService = {
  getAll: () => {
    const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);
    const today = new Date().toISOString().split('T')[0];

    // Recalculate overdue statuses dynamically
    return installments.map(plan => {
      let updated = false;
      const updatedSchedule = (plan.schedule || []).map(item => {
        if (item.status === 'Bekliyor' && item.dueDate < today && item.remainingAmount > 0) {
          updated = true;
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
    const totalAmount = safeNumber(planData.totalAmount);
    const downPayment = safeNumber(planData.downPayment);
    const count = Math.max(1, parseInt(planData.installmentCount || 1, 10));
    const remainingAmount = round2(totalAmount - downPayment);

    if (downPayment > totalAmount) {
      throw new Error("Peşinat toplam tutardan büyük olamaz.");
    }

    const baseAmount = Math.floor((remainingAmount / count) * 100) / 100;
    const roundingDiff = round2(remainingAmount - (baseAmount * count));

    const startDate = planData.startDate || new Date().toISOString().split('T')[0];
    const startDtObj = new Date(startDate);

    const schedule = [];
    for (let i = 1; i <= count; i++) {
      const instDueDate = new Date(startDtObj.getFullYear(), startDtObj.getMonth() + (i - 1), startDtObj.getDate());
      const dueDateStr = instDueDate.toISOString().split('T')[0];
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
      dueDay: startDtObj.getDate(),
      status: remainingAmount <= 0 ? 'Tamamlandı' : 'Bekliyor',
      note: planData.note || '',
      schedule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const installments = getJson(STORAGE_KEYS.INSTALLMENTS, []);
    await saveJson(STORAGE_KEYS.INSTALLMENTS, [newPlan, ...installments]);

    // Handle down payment transaction if > 0
    if (downPayment > 0 && planData.contactId) {
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

  payInstallment: async (planId, installmentId, paymentAmount, paymentType = 'Nakit', note = '') => {
    const plans = getJson(STORAGE_KEYS.INSTALLMENTS, []);
    const plan = plans.find(p => p.id === planId);
    if (!plan) throw new Error("Taksit planı bulunamadı.");

    const payVal = safeNumber(paymentAmount);
    if (payVal <= 0) throw new Error("Geçerli bir ödeme tutarı giriniz.");

    const instIdx = plan.schedule.findIndex(i => i.id === installmentId);
    if (instIdx === -1) throw new Error("Taksit kalemi bulunamadı.");

    const inst = plan.schedule[instIdx];
    if (payVal > inst.remainingAmount) {
      throw new Error(`Ödeme tutarı kalan taksit borcundan (${inst.remainingAmount} TL) fazla olamaz.`);
    }

    const newPaidAmount = round2(inst.paidAmount + payVal);
    const newRemainingAmount = round2(inst.amount - newPaidAmount);
    const instStatus = newRemainingAmount <= 0 ? 'Ödendi' : 'Kısmi Ödendi';

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

    const updatedPlan = {
      ...plan,
      remainingAmount: totalRemaining,
      status: allPaid ? 'Tamamlandı' : 'Kısmi Ödendi',
      schedule: newSchedule,
      updatedAt: new Date().toISOString()
    };

    const updatedPlans = plans.map(p => p.id === planId ? updatedPlan : p);
    await saveJson(STORAGE_KEYS.INSTALLMENTS, updatedPlans);

    // Save collection transaction to contact ledger
    const opId = generateUUID();
    await transactionService.save({
      contactId: plan.contactId,
      contactType: plan.contactType,
      type: plan.contactType === 'supplier' ? 'payment' : 'collection',
      amount: payVal,
      date: new Date().toISOString().split('T')[0],
      sourceType: 'installment_payment',
      sourceId: installmentId,
      operationId: opId,
      description: `Taksit #${inst.installmentNo} Ödemesi (${paymentType}${note ? ' - ' + note : ''})`
    });

    return updatedPlan;
  }
};
