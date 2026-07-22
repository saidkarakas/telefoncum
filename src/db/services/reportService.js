import { STORAGE_KEYS, getJson, safeNumber, round2 } from './shared';
import { phoneService } from './phoneService';
import { repairService } from './repairService';
import { expenseService } from './expenseService';
import { installmentService } from './installmentService';
import { tradeInService } from './tradeInService';
import { partService } from './partService';
import { customerService } from './customerService';
import { supplierService } from './supplierService';

export const reportService = {
  getDashboardData: () => {
    const phones = phoneService.getAll();
    const repairs = repairService.getAll();
    const installments = installmentService.getAll();
    const parts = partService.getAll();
    const todayStr = new Date().toISOString().split('T')[0];

    const stockCount = phones.filter(p => p.status !== 'Satıldı').length;
    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);
    const totalSalesAmount = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const boughtToday = phones.filter(p => p.purchaseDate === todayStr).length;
    const soldToday = phones.filter(p => p.salesDate === todayStr).length;
    const inRepair = repairs.filter(r => r.status === 'Serviste' || r.status === 'Tamirde').length;
    const pendingRepairs = repairs.filter(r => r.status === 'Bekliyor').length;

    // Overdue installments metrics
    let overdueCount = 0;
    let overdueTotalAmount = 0;
    installments.forEach(plan => {
      (plan.schedule || []).forEach(item => {
        if (item.status === 'Gecikmiş' && item.remainingAmount > 0) {
          overdueCount += 1;
          overdueTotalAmount += item.remainingAmount;
        }
      });
    });

    // Critical stock parts
    const criticalParts = parts.filter(p => p.quantity <= (p.minQuantity || 0));

    const sortedByDate = [...phones].sort((a, b) => new Date(b.purchaseDate || Date.now()) - new Date(a.purchaseDate || Date.now()));
    const recentAdded = sortedByDate.slice(0, 5);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');
    const recentSold = [...soldPhones].sort((a, b) => new Date(b.salesDate || Date.now()) - new Date(a.salesDate || Date.now())).slice(0, 5);

    const waitingInStock = phones.filter(p => p.status !== 'Satıldı');
    const longWaiting = [...waitingInStock]
      .sort((a, b) => b.daysInStock - a.daysInStock)
      .slice(0, 5);

    // Upsell Renewal Bot
    const nowTs = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const upsellCandidates = soldPhones.filter(p => {
      if (!p.salesDate) return false;
      const soldTs = new Date(p.salesDate).getTime();
      const diffDays = Math.floor((nowTs - soldTs) / oneDay);
      return diffDays >= 330 && diffDays <= 395;
    }).sort((a, b) => new Date(b.salesDate) - new Date(a.salesDate));

    return {
      cards: {
        stockCount,
        totalStockCost,
        totalSalesAmount,
        totalProfit,
        boughtToday,
        soldToday,
        inRepair,
        pendingRepairs,
        overdueCount,
        overdueTotalAmount: round2(overdueTotalAmount),
        criticalPartsCount: criticalParts.length
      },
      lists: {
        recentAdded,
        recentSold,
        longWaiting,
        upsellCandidates,
        criticalParts: criticalParts.slice(0, 5)
      }
    };
  },

  getReportSummary: () => {
    const phones = phoneService.getAll();
    const gExpenses = expenseService.getAll();
    const repairs = repairService.getAll();
    const tradeIns = tradeInService.getAll();
    const installments = installmentService.getAll();
    const parts = partService.getAll();
    const customers = customerService.getAll();
    const suppliers = supplierService.getAll();
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    const totalPurchaseValue = phones.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalSalesValue = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const totalPhoneExpenses = phones.reduce((sum, p) => sum + p.totalExpenses, 0);
    const totalGeneralExpenses = gExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalPhoneExpenses + totalGeneralExpenses;

    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');

    // 1. Trade-in Metrics
    const tradeCount = tradeIns.length;
    const tradeReceivedValue = tradeIns.reduce((sum, t) => sum + safeNumber(t.receivedPhoneValue), 0);
    const tradeCollectedDiff = tradeIns.reduce((sum, t) => sum + safeNumber(t.paidAmount), 0);
    const tradeCustomerReceivables = tradeIns
      .filter(t => t.differenceDirection === 'customer_owes')
      .reduce((sum, t) => sum + safeNumber(t.remainingAmount), 0);
    const tradeBusinessPayables = tradeIns
      .filter(t => t.differenceDirection === 'business_owes')
      .reduce((sum, t) => sum + safeNumber(t.remainingAmount), 0);

    // 2. Installment & Receivables Metrics
    const totalCustomerReceivables = customers.reduce((sum, c) => sum + safeNumber(c.debt), 0);
    const totalSupplierPayables = suppliers.reduce((sum, s) => sum + safeNumber(s.debt), 0);
    
    let totalOverdueReceivables = 0;
    let upcomingInstallmentsTotal = 0;
    const currentMonthKey = new Date().toISOString().substring(0, 7);

    const monthlyCollections = transactions
      .filter(t => (t.type === 'collection' || t.type === 'tahsilat') && (t.date || '').startsWith(currentMonthKey))
      .reduce((sum, t) => sum + safeNumber(t.amount), 0);

    installments.forEach(plan => {
      (plan.schedule || []).forEach(item => {
        if (item.status === 'Gecikmiş') {
          totalOverdueReceivables += item.remainingAmount;
        } else if (item.status === 'Bekliyor') {
          upcomingInstallmentsTotal += item.remainingAmount;
        }
      });
    });

    // 3. Parts Stock Metrics
    const partsTotalPurchaseCost = parts.reduce((sum, p) => sum + (safeNumber(p.quantity) * safeNumber(p.purchasePrice)), 0);
    const partsTotalPotentialSale = parts.reduce((sum, p) => sum + (safeNumber(p.quantity) * safeNumber(p.salePrice)), 0);
    const criticalPartsList = parts.filter(p => p.quantity <= (p.minQuantity || 0));

    let repairPartsCostTotal = 0;
    let repairPartsSaleTotal = 0;
    let repairLaborIncomeTotal = 0;

    repairs.forEach(r => {
      repairPartsCostTotal += safeNumber(r.partsCostTotal || 0);
      repairPartsSaleTotal += safeNumber(r.partsSaleTotal || 0);
      repairLaborIncomeTotal += safeNumber(r.laborFee || 0);
    });

    const repairPartsProfit = round2(repairPartsSaleTotal - repairPartsCostTotal);

    // Brand & Model distribution
    const brandCounts = {};
    const modelCounts = {};
    soldPhones.forEach(p => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      modelCounts[`${p.brand} ${p.model}`] = (modelCounts[`${p.brand} ${p.model}`] || 0) + 1;
    });

    let topBrand = 'N/A';
    let topBrandCount = 0;
    Object.keys(brandCounts).forEach(b => {
      if (brandCounts[b] > topBrandCount) {
        topBrandCount = brandCounts[b];
        topBrand = b;
      }
    });

    let topModel = 'N/A';
    let topModelCount = 0;
    Object.keys(modelCounts).forEach(m => {
      if (modelCounts[m] > topModelCount) {
        topModelCount = modelCounts[m];
        topModel = m;
      }
    });

    // Monthly Sales
    const monthlySales = {};
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      monthlySales[key] = { count: 0, sales: 0, profit: 0 };
    }

    soldPhones.forEach(p => {
      if (!p.salesDate) return;
      const sDate = new Date(p.salesDate);
      const key = `${months[sDate.getMonth()]} ${sDate.getFullYear().toString().substr(-2)}`;
      if (monthlySales[key]) {
        monthlySales[key].count += 1;
        monthlySales[key].sales += p.salesPrice;
        monthlySales[key].profit += p.profit;
      }
    });

    const monthlySalesArray = Object.keys(monthlySales).map(k => ({
      month: k,
      count: monthlySales[k].count,
      sales: monthlySales[k].sales,
      profit: monthlySales[k].profit
    }));

    return {
      totalPurchaseValue,
      totalSalesValue,
      totalProfit,
      totalExpenses,
      totalGeneralExpenses,
      totalStockCost,
      topBrand: topBrandCount > 0 ? `${topBrand} (${topBrandCount} Adet)` : 'Satış Yok',
      topModel: topModelCount > 0 ? `${topModel} (${topModelCount} Adet)` : 'Satış Yok',
      monthlySales: monthlySalesArray,

      // New Report Sections
      trade: {
        tradeCount,
        tradeReceivedValue: round2(tradeReceivedValue),
        tradeCollectedDiff: round2(tradeCollectedDiff),
        tradeCustomerReceivables: round2(tradeCustomerReceivables),
        tradeBusinessPayables: round2(tradeBusinessPayables)
      },
      receivables: {
        totalCustomerReceivables: round2(totalCustomerReceivables),
        totalSupplierPayables: round2(totalSupplierPayables),
        totalOverdueReceivables: round2(totalOverdueReceivables),
        monthlyCollections: round2(monthlyCollections),
        upcomingInstallmentsTotal: round2(upcomingInstallmentsTotal)
      },
      parts: {
        partsTotalPurchaseCost: round2(partsTotalPurchaseCost),
        partsTotalPotentialSale: round2(partsTotalPotentialSale),
        criticalPartsCount: criticalPartsList.length,
        criticalPartsList,
        repairPartsCostTotal: round2(repairPartsCostTotal),
        repairPartsSaleTotal: round2(repairPartsSaleTotal),
        repairPartsProfit,
        repairLaborIncomeTotal: round2(repairLaborIncomeTotal)
      }
    };
  }
};
