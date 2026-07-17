import { phoneService } from './phoneService';
import { repairService } from './repairService';
import { expenseService } from './expenseService';

export const reportService = {
  getDashboardData: () => {
    const phones = phoneService.getAll();
    const repairs = repairService.getAll();
    const todayStr = new Date().toISOString().split('T')[0];

    const stockCount = phones.filter(p => p.status !== 'Satıldı').length;
    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);
    const totalSalesAmount = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const boughtToday = phones.filter(p => p.purchaseDate === todayStr).length;
    const soldToday = phones.filter(p => p.salesDate === todayStr).length;
    const inRepair = repairs.filter(r => r.status === 'Tamirde').length;
    const pendingRepairs = repairs.filter(r => r.status === 'Bekliyor').length;

    const sortedByDate = [...phones].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    const recentAdded = sortedByDate.slice(0, 5);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');
    const recentSold = [...soldPhones].sort((a, b) => new Date(b.salesDate) - new Date(a.salesDate)).slice(0, 5);

    const waitingInStock = phones.filter(p => p.status !== 'Satıldı');
    const longWaiting = [...waitingInStock]
      .sort((a, b) => b.daysInStock - a.daysInStock)
      .slice(0, 5);

    // Upsell Renewal Bot (Madde 14)
    // Find phones sold roughly 1 year ago (between 330 and 395 days ago)
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
        pendingRepairs
      },
      lists: {
        recentAdded,
        recentSold,
        longWaiting,
        upsellCandidates
      }
    };
  },

  getReportSummary: () => {
    const phones = phoneService.getAll();
    const gExpenses = expenseService.getAll();
    
    const totalPurchaseValue = phones.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalSalesValue = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const totalPhoneExpenses = phones.reduce((sum, p) => sum + p.totalExpenses, 0);
    const totalGeneralExpenses = gExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalPhoneExpenses + totalGeneralExpenses;

    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');
    
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

    const monthlySales = {};
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      monthlySales[key] = { count: 0, sales: 0, profit: 0 };
    }

    soldPhones.forEach(p => {
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
      monthlySales: monthlySalesArray
    };
  }
};
