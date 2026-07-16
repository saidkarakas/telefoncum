import React from 'react';
import { 
  Plus, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  FileCode, 
  Printer 
} from 'lucide-react';
import { usePhone } from '../context/PhoneContext';
import { printDataList } from '../utils/exporter';

export default function PhoneFilters() {
  const {
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    brands,
    handleAddClick,
    triggerExportExcel,
    triggerExportCSV,
    sortedAndFilteredPhones
  } = usePhone();

  const triggerPrintList = () => {
    const headers = ['Marka Model', 'IMEI', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Stok Süresi'];
    const rows = sortedAndFilteredPhones.map(p => [
      `${p.brand} ${p.model} (${p.storage} / ${p.color})`,
      p.imei1 || '-',
      `${p.totalCost} TL`,
      p.salesPrice ? `${p.salesPrice} TL` : '-',
      p.status === 'Satıldı' ? `${p.profit} TL` : '-',
      p.status,
      `${p.daysInStock} Gün`
    ]);
    printDataList('Telefon Stok ve Arşiv Listesi', headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* ACTION HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {/* Add Phone Button */}
          <button
            onClick={handleAddClick}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus size={16} />
            Telefon Ekle
          </button>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showFilters || Object.values(filters).some(x => x !== '')
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filtreler
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerExportExcel}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="Excel Dışa Aktar"
          >
            <FileSpreadsheet size={16} />
          </button>
          <button
            onClick={triggerExportCSV}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="CSV Dışa Aktar"
          >
            <FileCode size={16} />
          </button>
          <button
            onClick={triggerPrintList}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="Yazdır / PDF"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER BOX PANEL */}
      {showFilters && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-2 md:grid-cols-6 gap-3 text-xs shadow-sm no-print">
          {/* Brand */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Marka</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            >
              <option value="">Tümü</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            >
              <option value="">Tümü</option>
              <option value="Stokta">Stokta</option>
              <option value="Satışta">Satışta</option>
              <option value="Tamirde">Tamirde</option>
              <option value="Rezerve">Rezerve</option>
              <option value="Satıldı">Satıldı (Arşiv)</option>
            </select>
          </div>

          {/* Min Price */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Min. Alış</label>
            <input
              type="number"
              placeholder="0 TL"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>

          {/* Max Price */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Max. Alış</label>
            <input
              type="number"
              placeholder="100.000+"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Alış Başlangıç</label>
            <input
              type="date"
              value={filters.purchaseDateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateStart: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Alış Bitiş</label>
            <input
              type="date"
              value={filters.purchaseDateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateEnd: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>

          {/* Clear Filters */}
          <div className="col-span-2 md:col-span-6 flex justify-end">
            <button
              onClick={() => setFilters({ brand: '', status: '', minPrice: '', maxPrice: '', purchaseDateStart: '', purchaseDateEnd: '' })}
              className="text-[11px] font-semibold text-red-500 hover:underline cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
