import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  CheckCircle2, 
  Wrench, 
  Clock, 
  Calendar, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { reportService } from '../db/storage';

export default function Dashboard({ setActivePage, setSelectedPhoneId, setOpenPhoneDetail }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const refreshData = () => {
      setData(reportService.getDashboardData());
    };
    refreshData();
    window.addEventListener('tys_db_update', refreshData);
    return () => window.removeEventListener('tys_db_update', refreshData);
  }, []);

  if (!data) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
    </div>
  );

  const { cards, lists } = data;

  const cardItems = [
    {
      title: 'Stoktaki Telefonlar',
      value: cards.stockCount,
      desc: 'Aktif Satışta & Stokta',
      icon: Smartphone,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
    },
    {
      title: 'Toplam Stok Maliyeti',
      value: `${cards.totalStockCost.toLocaleString('tr-TR')} TL`,
      desc: 'Alış + Yapılan Masraflar',
      icon: DollarSign,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
    },
    {
      title: 'Toplam Satış Tutarı',
      value: `${cards.totalSalesAmount.toLocaleString('tr-TR')} TL`,
      desc: 'Satılan Cihazların Ciro Toplamı',
      icon: CheckCircle2,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
    },
    {
      title: 'Toplam Net Kar',
      value: `${cards.totalProfit.toLocaleString('tr-TR')} TL`,
      desc: 'Satış Fiyatı - Maliyet',
      icon: TrendingUp,
      color: cards.totalProfit >= 0 
        ? 'from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
        : 'from-red-500/10 to-rose-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50'
    },
    {
      title: 'Bugün Alınan',
      value: cards.boughtToday,
      desc: 'Bugün Eklenen Cihazlar',
      icon: ShoppingCart,
      color: 'from-sky-500/10 to-cyan-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/50'
    },
    {
      title: 'Bugün Satılan',
      value: cards.soldToday,
      desc: 'Bugün Çıkışı Yapılanlar',
      icon: Calendar,
      color: 'from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50'
    },
    {
      title: 'Tamirdeki Telefon',
      value: cards.inRepair,
      desc: 'Serviste İşlem Görenler',
      icon: Wrench,
      color: 'from-violet-500/10 to-fuchsia-500/10 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50'
    },
    {
      title: 'Bekleyen Telefon',
      value: cards.pendingRepairs,
      desc: 'Kabul Sırasında Bekleyen',
      icon: Clock,
      color: 'from-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
    }
  ];

  const handleViewDetail = (phoneId) => {
    setSelectedPhoneId(phoneId);
    setOpenPhoneDetail(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Stokta': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-450 border-blue-200 dark:border-blue-900/40',
      'Satışta': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900/40',
      'Tamirde': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-450 border-amber-200 dark:border-amber-900/40',
      'Rezerve': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-450 border-purple-200 dark:border-purple-900/40',
      'Satıldı': 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-800'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Stokta']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 8 SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border flex flex-col justify-between shadow-sm transition-all hover:scale-[1.01]`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block tracking-wide truncate max-w-[80%]">
                  {item.title}
                </span>
                <span className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/50 shadow-sm">
                  <Icon size={16} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl md:text-2xl font-bold tracking-tight block text-slate-900 dark:text-white">
                  {item.value}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-450 block mt-0.5">
                  {item.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DASHBOARD LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Son Eklenen Telefonlar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">
              Son Eklenen Telefonlar
            </h3>
            <button 
              onClick={() => setActivePage('phones')} 
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
            >
              Tümünü Gör <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-semibold">
                  <th className="py-2.5 pb-2">Model</th>
                  <th className="py-2.5 pb-2">Alış Tarihi</th>
                  <th className="py-2.5 pb-2 text-right">Maliyet</th>
                  <th className="py-2.5 pb-2 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/55">
                {lists.recentAdded.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">Kayıt Bulunmamaktadır.</td>
                  </tr>
                ) : (
                  lists.recentAdded.map(phone => (
                    <tr 
                      key={phone.id} 
                      onClick={() => handleViewDetail(phone.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-250">
                        {phone.brand} {phone.model} <span className="text-[10px] text-slate-400">({phone.storage})</span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(phone.purchaseDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {phone.totalCost.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(phone.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Son Satılan Telefonlar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">
              Son Satılan Telefonlar
            </h3>
            <button 
              onClick={() => setActivePage('phones')} 
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
            >
              Arşive Git <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-semibold">
                  <th className="py-2.5 pb-2">Model</th>
                  <th className="py-2.5 pb-2">Satış Tarihi</th>
                  <th className="py-2.5 pb-2 text-right">Satış Fiyatı</th>
                  <th className="py-2.5 pb-2 text-right">Kar / Zarar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/55">
                {lists.recentSold.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">Satış Bulunmamaktadır.</td>
                  </tr>
                ) : (
                  lists.recentSold.map(phone => (
                    <tr 
                      key={phone.id}
                      onClick={() => handleViewDetail(phone.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-250">
                        {phone.brand} {phone.model} <span className="text-[10px] text-slate-400">({phone.storage})</span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(phone.salesDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {phone.salesPrice.toLocaleString('tr-TR')} TL
                      </td>
                      <td className={`py-3 text-right font-bold ${phone.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {phone.profit >= 0 ? '+' : ''}{phone.profit.toLocaleString('tr-TR')} TL
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Uzun Süredir Stokta Bekleyen Telefonlar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Uzun Süredir Stokta Bekleyen Cihazlar</span>
              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold animate-pulse">Kritik</span>
            </h3>
            <button 
              onClick={() => setActivePage('phones')} 
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
            >
              Stok Listesi <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-semibold">
                  <th className="py-2.5 pb-2">Model</th>
                  <th className="py-2.5 pb-2">Alış Tarihi</th>
                  <th className="py-2.5 pb-2 text-center">Bekleme Süresi</th>
                  <th className="py-2.5 pb-2 text-right">Alış Fiyatı</th>
                  <th className="py-2.5 pb-2 text-right">Toplam Maliyet</th>
                  <th className="py-2.5 pb-2 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/55">
                {lists.longWaiting.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">Bekleyen Cihaz Bulunmamaktadır.</td>
                  </tr>
                ) : (
                  lists.longWaiting.map(phone => (
                    <tr 
                      key={phone.id}
                      onClick={() => handleViewDetail(phone.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-250">
                        {phone.brand} {phone.model} <span className="text-[10px] text-slate-400">({phone.storage} / {phone.color})</span>
                      </td>
                      <td className="py-3 text-slate-500">{new Date(phone.purchaseDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-semibold ${phone.daysInStock > 30 ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'}`}>
                          {phone.daysInStock} Gün
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {phone.purchasePrice.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 text-right font-bold text-slate-850 dark:text-white">
                        {phone.totalCost.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(phone.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
