import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Receipt, 
  DollarSign, 
  Award,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { reportService } from '../db/services/reportService';
import { phoneService } from '../db/services/phoneService';
import { expenseService } from '../db/services/expenseService';
import { STORAGE_KEYS, getJson } from '../db/services/shared';

export default function Reports({ activePage }) {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const refreshData = () => {
      setData(reportService.getReportSummary());
      setLogs(getJson(STORAGE_KEYS.AUDIT_LOG, []).slice(0, 15)); // Son 15 islem
    };
    refreshData();
    window.addEventListener('tys_db_update', refreshData);
    window.addEventListener('tys_audit_log_update', refreshData);
    return () => {
      window.removeEventListener('tys_db_update', refreshData);
      window.removeEventListener('tys_audit_log_update', refreshData);
    };
  }, [activePage]);

  if (!data) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-650 border-t-transparent"></div>
    </div>
  );

  const netProfit = data.totalProfit - data.totalExpenses;

  // Option 4: Custom brand profit & expense breakdown calculations
  const allPhonesList = phoneService.getAll();
  const soldList = allPhonesList.filter(p => p.status === 'Satıldı');
  
  // Calculate Brand Profit distribution
  const brandProfitData = {};
  let totalProfitSum = 0;
  
  soldList.forEach(p => {
    const profit = Number(p.profit || 0);
    brandProfitData[p.brand] = (brandProfitData[p.brand] || 0) + profit;
    totalProfitSum += profit;
  });

  const sortedBrandProfits = Object.entries(brandProfitData)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topBrandProfitSum = sortedBrandProfits.reduce((sum, b) => sum + b[1], 0);
  if (totalProfitSum > topBrandProfitSum && (totalProfitSum - topBrandProfitSum) > 0) {
    sortedBrandProfits.push(['Diğer', totalProfitSum - topBrandProfitSum]);
  }

  // Calculate Expense breakdown
  const gExpenses = expenseService.getAll();
  const phoneExpenses = allPhonesList.reduce((sum, p) => sum + (p.totalExpenses || 0), 0);
  
  const expenseBreakdown = {};
  expenseBreakdown['Cihaz Masrafları'] = phoneExpenses;
  
  gExpenses.forEach(e => {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + Number(e.amount || 0);
  });

  const sortedExpenses = Object.entries(expenseBreakdown)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalAllExpenses = sortedExpenses.reduce((sum, e) => sum + e[1], 0);

  // Donut chart variables
  const donutRadius = 38;
  const donutCirc = 2 * Math.PI * donutRadius;
  let donutAccumulatedPercent = 0;
  const donutColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6">
      
      {/* FINANCIAL INTELLIGENCE CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Total Purchase */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-500">Kümülatif Alış Tutarı</span>
          <div className="text-xl font-extrabold text-slate-850 dark:text-white">
            {data.totalPurchaseValue.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Sisteme eklenen tüm cihazların toplam alış değeridir.</span>
        </div>

        {/* Total Sales */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-500">Kümülatif Satış Cirosu</span>
          <div className="text-xl font-extrabold text-slate-850 dark:text-white">
            {data.totalSalesValue.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Satışı tamamlanmış (arşivdeki) cihazların toplam ciro bedelidir.</span>
        </div>

        {/* Gross Profit */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-500">Cihaz Brüt Karı</span>
          <div className="text-xl font-extrabold text-emerald-500">
            {data.totalProfit.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Satılan cihazlardan elde edilen toplam brüt kardır (Masraf dahil).</span>
        </div>

        {/* Total General Expenses */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-500">Toplam Giderler</span>
          <div className="text-xl font-extrabold text-amber-500">
            {data.totalExpenses.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Telefona yapılan masraflar + genel dükkan giderleri toplamıdır.</span>
        </div>

        {/* Net Profit (After expenses) */}
        <div className={`p-4 border rounded-2xl shadow-sm space-y-2.5 ${
          netProfit >= 0 
            ? 'bg-emerald-50/50 border-emerald-250/50 dark:bg-emerald-950/10 dark:border-emerald-950/20' 
            : 'bg-red-50/50 border-red-250/50 dark:bg-red-950/10 dark:border-red-950/20'
        }`}>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Dükkan Net Kar / Zararı</span>
          <div className={`text-xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-550'}`}>
            {netProfit.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Brüt Cihaz Karı - Toplam Giderler. Gerçek dükkan kazancıdır.</span>
        </div>

        {/* Total Stock Value */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5">
          <span className="text-[10px] uppercase font-bold text-slate-500">Mevcut Stok Değeri</span>
          <div className="text-xl font-extrabold text-indigo-650 dark:text-indigo-400">
            {data.totalStockCost.toLocaleString('tr-TR')} TL
          </div>
          <span className="text-[10px] text-slate-450 block">Şu an stokta bekleyen cihazların maliyetler toplamıdır.</span>
        </div>

      </div>

      {/* NEW MODULE REPORTS: TAKAS, ALACAK & PARÇA STOK */}
      {data.trade && data.receivables && data.parts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Takas Raporu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-xs text-teal-600 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Takas Raporu
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Toplam Takas Sayısı:</span>
                <span className="font-bold text-slate-900 dark:text-white">{data.trade.tradeCount} İşlem</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alınan Takas Cihaz Değeri:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{data.trade.tradeReceivedValue.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tahsil Edilen Takas Farkı:</span>
                <span className="font-bold font-mono text-emerald-500">{data.trade.tradeCollectedDiff.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Müşteri Takas Borcu:</span>
                <span className="font-bold font-mono text-amber-500">{data.trade.tradeCustomerReceivables.toLocaleString('tr-TR')} TL</span>
              </div>
            </div>
          </div>

          {/* Taksit ve Veresiye Raporu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-xs text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Taksit & Cari Raporu
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Toplam Açık Müşteri Alacağı:</span>
                <span className="font-bold font-mono text-teal-600 dark:text-teal-400">{data.receivables.totalCustomerReceivables.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gecikmiş Taksit Alacağı:</span>
                <span className="font-bold font-mono text-rose-500">{data.receivables.totalOverdueReceivables.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bu Ay Alınan Tahsilatlar:</span>
                <span className="font-bold font-mono text-emerald-500">{data.receivables.monthlyCollections.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vadesi Yaklaşan Taksitler:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{data.receivables.upcomingInstallmentsTotal.toLocaleString('tr-TR')} TL</span>
              </div>
            </div>
          </div>

          {/* Parça Stok & Tamir Raporu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-xs text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Parça Stok & Tamir Kârı
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Parça Stok Alış Değeri:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{data.parts.partsTotalPurchaseCost.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tamir Parça Kârı:</span>
                <span className="font-bold font-mono text-emerald-500">{data.parts.repairPartsProfit.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tamir İşçilik Geliri:</span>
                <span className="font-bold font-mono text-indigo-500">{data.parts.repairLaborIncomeTotal.toLocaleString('tr-TR')} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kritik Stok Uyarısı:</span>
                <span className={`font-bold ${data.parts.criticalPartsCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                  {data.parts.criticalPartsCount} Çeşit Parça
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPULAR BRANDS AND SALES CHARTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Brand & Model Leaderboard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Award size={14} className="text-amber-500" />
            Popüler Satış Liderleri
          </h4>
          
          <div className="space-y-4">
            {/* Top Brand */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">En Çok Satılan Marka</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-xs">{data.topBrand}</div>
                  <div className="text-[9px] text-slate-450">Tüm zamanlar satışı</div>
                </div>
              </div>
            </div>

            {/* Top Model */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">En Çok Satılan Model</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <div className="font-bold text-slate-850 dark:text-white text-xs truncate max-w-[200px]">{data.topModel}</div>
                  <div className="text-[9px] text-slate-450">Adet bazlı satış şampiyonu</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Month Sales SVG Bar Chart (takes 2 grid spaces) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <BarChart3 size={14} className="text-indigo-500" />
            Son 6 Aylık Finansal Dağılım (Ciro / Net Kâr)
          </h4>

          {/* Legend */}
          <div className="flex gap-4 text-[10px] font-semibold px-2 justify-end">
            <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-indigo-600 block"></span>
              Ciro (Satış)
            </div>
            <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 block"></span>
              Net Kâr
            </div>
          </div>

          {/* SVG/CSS Chart container */}
          <div className="h-44 flex items-end justify-around gap-4 px-2 pt-4">
            {data.monthlySales.map((m, index) => {
              const maxSalesVal = Math.max(...data.monthlySales.map(item => item.sales), 10000);
              const salesHeight = (m.sales / maxSalesVal) * 80; // max 80% height limit for padding
              const profitHeight = (m.profit / maxSalesVal) * 80;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-850 dark:bg-slate-800 text-white rounded-xl text-[10px] p-2 shadow-lg z-10 text-left pointer-events-none min-w-[120px] border border-slate-700">
                    <div className="font-bold text-slate-300 text-[9px] mb-1">{m.month} Raporu</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Satış Adet:</span>
                      <span className="font-bold text-slate-200">{m.count} Adet</span>
                    </div>
                    <div className="flex justify-between gap-2 mt-0.5">
                      <span className="text-indigo-400">Ciro:</span>
                      <span className="font-bold text-indigo-300">{m.sales.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="flex justify-between gap-2 mt-0.5">
                      <span className="text-emerald-400">Net Kâr:</span>
                      <span className="font-bold text-emerald-300">{m.profit.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>

                  {/* Dual Bars */}
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    {/* Sales Bar */}
                    <div 
                      className="w-4 sm:w-6 bg-gradient-to-t from-indigo-650 to-indigo-500 rounded-t"
                      style={{ height: `${Math.max(salesHeight, 3)}%` }}
                    ></div>
                    {/* Profit Bar */}
                    <div 
                      className="w-4 sm:w-6 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                      style={{ height: `${Math.max(profitHeight, 3)}%` }}
                    ></div>
                  </div>

                  {/* Month Label */}
                  <span className="text-[9px] text-slate-500 mt-2 font-semibold truncate max-w-full">
                    {m.month}
                  </span>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ROW 3: DETAILED BREAKDOWNS (Donut and Expense Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Brand Profit Distribution Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            Marka Bazlı Kâr Dağılımı
          </h4>
          
          {totalProfitSum === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center h-48 text-slate-400 font-medium">
              Henüz kâr verisi bulunmamaktadır.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Donut Chart SVG */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {sortedBrandProfits.map(([brand, val], idx) => {
                    const pct = (val / totalProfitSum) * 100;
                    const strokeLength = (pct / 100) * donutCirc;
                    const strokeOffset = donutCirc - strokeLength + (donutAccumulatedPercent / 100) * donutCirc;
                    donutAccumulatedPercent += pct;
                    return (
                      <circle
                        key={brand}
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="transparent"
                        stroke={donutColors[idx % donutColors.length]}
                        strokeWidth="11"
                        strokeDasharray={`${strokeLength} ${donutCirc - strokeLength}`}
                        strokeDashoffset={strokeOffset}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-200 hover:stroke-[13px]"
                      />
                    );
                  })}
                  <circle cx="50" cy="50" r="27" fill="white" className="dark:fill-slate-900" />
                  <text x="50" y="47" textAnchor="middle" className="text-[10px] font-bold fill-slate-800 dark:fill-white">
                    {totalProfitSum.toLocaleString('tr-TR')}
                  </text>
                  <text x="50" y="58" textAnchor="middle" className="text-[6px] fill-slate-450 font-bold uppercase tracking-wider">
                    Toplam Kar
                  </text>
                </svg>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-2 w-full">
                {sortedBrandProfits.map(([brand, val], idx) => {
                  const pct = (val / totalProfitSum) * 100;
                  return (
                    <div key={brand} className="flex justify-between items-center text-[10px] font-medium">
                      <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: donutColors[idx % donutColors.length] }}></span>
                        <span className="text-slate-700 dark:text-slate-350 truncate">{brand}</span>
                      </div>
                      <div className="text-right text-slate-500 font-semibold">
                        <span>{val.toLocaleString('tr-TR')} </span>
                        <span className="text-[9px] text-slate-400">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expense Category Breakdown Bars (takes 2 grid spaces) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Receipt size={14} className="text-amber-500" />
            Gider Analizi ve Kategoriler
          </h4>

          {totalAllExpenses === 0 ? (
            <div className="flex flex-col justify-center items-center h-48 text-slate-400 font-medium">
              Kayıtlı gider verisi bulunmamaktadır.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-1">
              {sortedExpenses.map(([category, val]) => {
                const pct = (val / totalAllExpenses) * 100;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-700 dark:text-slate-350">
                      <span>{category}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {val.toLocaleString('tr-TR')} TL <span className="text-[9px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ROW 4: AUDIT LOG (AKTIVITE GECMISTI) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Layers size={14} className="text-indigo-500" />
          Aktivite Geçmişi (Son 15 İşlem)
        </h4>

        {logs.length === 0 ? (
          <div className="text-center text-[11px] text-slate-400 py-4">Kayıtlı aktivite bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2 px-3 font-semibold rounded-tl-lg">Tarih</th>
                  <th className="py-2 px-3 font-semibold">Kullanıcı</th>
                  <th className="py-2 px-3 font-semibold">İşlem</th>
                  <th className="py-2 px-3 font-semibold">Modül</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-700 dark:text-slate-300">
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{log.username}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{log.entity_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
