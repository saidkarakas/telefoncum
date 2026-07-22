import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wrench,
  Clock,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { reportService } from '../db/services/reportService';

// Signature element: stoktaki cihazın "yaşını" gerçek bir pil göstergesi gibi
// çizer. 0 gün = dolu/yeşil, 60+ gün = boş/kırmızı. Süs değil, veri taşıyor.
function BatteryLevel({ days }) {
  const pct = Math.max(4, Math.min(100, 100 - (days / 60) * 100));
  const tone =
    pct > 60 ? 'stroke-teal-500 fill-teal-500 dark:fill-teal-400 dark:stroke-teal-400'
    : pct > 30 ? 'stroke-amber-500 fill-amber-500 dark:fill-amber-400 dark:stroke-amber-400'
    : 'stroke-rose-500 fill-rose-500 dark:fill-rose-450 dark:stroke-rose-450';

  return (
    <span className="inline-flex items-center gap-1.5" title={`${days} gündür stokta`}>
      <svg width="26" height="13" viewBox="0 0 26 13" className="shrink-0">
        <rect x="0.5" y="0.5" width="21" height="12" rx="2.5"
          className="fill-none stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" />
        <rect x="22" y="4" width="2.5" height="5" rx="1"
          className="fill-slate-300 dark:fill-slate-600" />
        <rect x="2" y="2" width={Math.max(1.5, 18 * pct / 100)} height="9" rx="1.5"
          className={tone.split(' ').filter(c => c.startsWith('fill')).join(' ')} />
      </svg>
      <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{days}g</span>
    </span>
  );
}

export default function Dashboard({ setActivePage, setSelectedPhoneId, setOpenPhoneDetail }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const triggerNotifications = (dashboardData) => {
      const lastNotify = localStorage.getItem('tys_last_notify');
      const now = Date.now();
      if (lastNotify && now - parseInt(lastNotify) < 3600000) return; // 1 hour cooldown

      const messages = [];
      if (dashboardData.cards.stockCount < 5) {
        messages.push(`Kritik Stok: Sadece ${dashboardData.cards.stockCount} cihaz kaldı.`);
      }
      if (dashboardData.cards.pendingRepairs > 0) {
        messages.push(`${dashboardData.cards.pendingRepairs} adet bekleyen tamir işlemi var.`);
      }

      if (messages.length > 0) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: 'TYS Sistem Uyarısı',
            options: { body: messages.join('\n') }
          });
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification('TYS Sistem Uyarısı', { body: messages.join('\n') });
        }
        localStorage.setItem('tys_last_notify', now.toString());
      }
    };

    const refreshData = () => {
      const dashData = reportService.getDashboardData();
      setData(dashData);

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          triggerNotifications(dashData);
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") triggerNotifications(dashData);
          });
        }
      }
    };

    refreshData();
    window.addEventListener('tys_db_update', refreshData);
    return () => window.removeEventListener('tys_db_update', refreshData);
  }, []);

  if (!data) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
    </div>
  );

  const { cards, lists } = data;
  const netProfitPositive = cards.totalProfit >= 0;
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const railStats = [
    { label: 'Stokta', value: cards.stockCount, icon: Smartphone, page: 'phones' },
    { label: 'Bugün Alınan', value: cards.boughtToday, icon: ShoppingCart, page: 'phones' },
    { label: 'Bugün Satılan', value: cards.soldToday, icon: CheckCircle2, page: 'phones' },
    { label: 'Geciken Taksit', value: cards.overdueCount || 0, icon: Clock, page: 'installments' },
    { label: 'Kritik Parça', value: cards.criticalPartsCount || 0, icon: Wrench, page: 'parts' },
  ];

  const handleViewDetail = (phoneId) => {
    setSelectedPhoneId(phoneId);
    setOpenPhoneDetail(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Stokta': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-450 border-blue-200 dark:border-blue-900/40',
      'Satışta': 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-450 border-teal-200 dark:border-teal-900/40',
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

      {/* ENSTRÜMAN PANELİ — dolu renkli hero blok + koyu istatistik rayı */}
      <div className="rounded-2xl overflow-hidden shadow-lg shadow-slate-900/5 dark:shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-stretch bg-slate-900">

          {/* Net kâr — dolu gradyan blok */}
          <div
            onClick={() => setActivePage('reports')}
            className="relative px-6 py-5 lg:w-[320px] overflow-hidden cursor-pointer bg-gradient-to-br from-teal-500 via-teal-600 to-slate-900"
          >
            <div className="absolute -right-6 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-teal-50/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              Canlı Panel · {today}
            </div>
            <span className="relative block mt-3 text-xs font-semibold text-teal-50/70 uppercase tracking-wide">
              Toplam Net Kâr
            </span>
            <div className={`relative mt-1 flex items-baseline gap-1.5 font-display text-4xl font-bold tracking-tight text-white`}>
              {netProfitPositive ? '+' : ''}{cards.totalProfit.toLocaleString('tr-TR')}
              <span className="text-base font-semibold text-teal-50/70">TL</span>
            </div>
            <div className="relative mt-1.5 flex items-center gap-1 text-[11px] font-medium text-teal-50/80">
              {netProfitPositive ? <TrendingUp size={13} className="shrink-0" /> : <TrendingDown size={13} className="shrink-0" />}
              <span className="font-mono">{cards.totalSalesAmount.toLocaleString('tr-TR')} TL</span> ciro ·{' '}
              <span className="font-mono">{cards.totalStockCost.toLocaleString('tr-TR')} TL</span> maliyet
            </div>
          </div>

          {/* İstatistik rayı — koyu zemin, renkli ikon çipleri */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-white/5">
            {railStats.map((s, i) => {
              const Icon = s.icon;
              const chipTones = ['bg-teal-500/15 text-teal-400', 'bg-amber-500/15 text-amber-400', 'bg-sky-500/15 text-sky-400', 'bg-violet-500/15 text-violet-400', 'bg-rose-500/15 text-rose-400'];
              return (
                <button
                  key={i}
                  onClick={() => setActivePage(s.page)}
                  className="flex flex-col items-start gap-2 p-4 text-left hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span className={`p-1.5 rounded-lg ${chipTones[i % chipTones.length]}`}>
                    <Icon size={14} />
                  </span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-white">
                    {s.value}
                  </span>
                  <span className="text-[10.5px] text-slate-400 leading-tight">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* LİSTELER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Son Eklenen Telefonlar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">
              Son Eklenen Telefonlar
            </h3>
            <button
              onClick={() => setActivePage('phones')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-0.5 cursor-pointer"
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
                      <td className="py-3 font-mono text-slate-500">{new Date(phone.purchaseDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
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
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-0.5 cursor-pointer"
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
                      <td className="py-3 font-mono text-slate-500">{new Date(phone.salesDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {phone.salesPrice.toLocaleString('tr-TR')} TL
                      </td>
                      <td className={`py-3 text-right font-mono font-bold ${phone.profit >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                        {phone.profit >= 0 ? '+' : ''}{phone.profit.toLocaleString('tr-TR')} TL
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Uzun Süredir Stokta Bekleyen Telefonlar — pil göstergeli stok sağlığı */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Stok Sağlığı</span>
              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                {lists.longWaiting.length} Kritik
              </span>
            </h3>
            <button
              onClick={() => setActivePage('phones')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-0.5 cursor-pointer"
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
                  <th className="py-2.5 pb-2">Pil Durumu (Stok Yaşı)</th>
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
                      <td className="py-3 font-mono text-slate-500">{new Date(phone.purchaseDate).toLocaleDateString('tr-TR')}</td>
                      <td className="py-3">
                        <BatteryLevel days={phone.daysInStock} />
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {phone.purchasePrice.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-850 dark:text-white">
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

        {/* 1 Yıl Önce Satılanlar / Yenileme Teklifi Botu */}
        {lists.upsellCandidates && lists.upsellCandidates.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/50 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-teal-800 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall size={16} />
                <span>Yenileme Teklifi Fırsatları (1 Yıl Önce Satılanlar)</span>
                <span className="bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-450 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Bot</span>
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 mb-4">
              Aşağıdaki cihazlar yaklaşık 1 yıl önce satıldı. Müşterilere ulaşıp cihazlarını yenilemek veya kılıf/ekran koruyucu gibi aksesuarlar satmak için harika bir fırsat!
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-teal-100 dark:border-teal-900/30 text-teal-600 dark:text-teal-500 uppercase font-semibold">
                    <th className="py-2.5 pb-2">Model</th>
                    <th className="py-2.5 pb-2">Satış Tarihi</th>
                    <th className="py-2.5 pb-2">Geçen Süre</th>
                    <th className="py-2.5 pb-2 text-right">Müşteri Numarası</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-50 dark:divide-teal-900/20">
                  {lists.upsellCandidates.map(phone => {
                    const daysAgo = Math.floor((new Date().getTime() - new Date(phone.salesDate).getTime()) / (1000 * 3600 * 24));
                    return (
                      <tr
                        key={phone.id}
                        onClick={() => handleViewDetail(phone.id)}
                        className="hover:bg-teal-50/50 dark:hover:bg-teal-950/20 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-250">
                          {phone.brand} {phone.model} <span className="text-[10px] text-slate-400">({phone.storage})</span>
                        </td>
                        <td className="py-3 font-mono text-slate-500">{new Date(phone.salesDate).toLocaleDateString('tr-TR')}</td>
                        <td className="py-3 font-semibold text-teal-700 dark:text-teal-400">{daysAgo} Gün</td>
                        <td className="py-3 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                          {phone.customerPhone || 'Kayıtlı Değil'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
