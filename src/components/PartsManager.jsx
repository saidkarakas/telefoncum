import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  X,
  History,
  CheckCircle2
} from 'lucide-react';
import { partService, PART_CATEGORIES } from '../db/services/partService';
import { stockMovementService } from '../db/services/stockMovementService';
import { supplierService } from '../db/services/supplierService';
import { escapeHtml } from '../utils/security';

export default function PartsManager({ globalSearchQuery }) {
  const [parts, setParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, CRITICAL, OUT_OF_STOCK

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustPart, setAdjustPart] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState('in'); // 'in' or 'out'
  const [adjustNote, setAdjustNote] = useState('');
  
  // History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyPart, setHistoryPart] = useState(null);
  const [movements, setMovements] = useState([]);

  // Loading / Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    category: 'Ekran',
    brand: '',
    compatibleModels: '',
    supplierId: '',
    purchasePrice: 0,
    salePrice: 0,
    quantity: 0,
    minQuantity: 2,
    location: '',
    notes: ''
  });

  const loadData = () => {
    setParts(partService.getAll());
    setSuppliers(supplierService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, []);

  useEffect(() => {
    if (globalSearchQuery) {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Filter Parts
  const filteredParts = parts.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = !searchQuery || (
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.compatibleModels && p.compatibleModels.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    let matchesStock = true;
    if (stockFilter === 'CRITICAL') {
      matchesStock = p.quantity <= (p.minQuantity || 0);
    } else if (stockFilter === 'OUT_OF_STOCK') {
      matchesStock = p.quantity <= 0;
    }
    return matchesCategory && matchesSearch && matchesStock;
  });

  // Calculate Metrics
  const totalTypes = parts.length;
  const totalQty = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalPurchaseValue = parts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.purchasePrice || 0)), 0);
  const totalSaleValue = parts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.salePrice || 0)), 0);
  const criticalCount = parts.filter(p => p.quantity <= (p.minQuantity || 0)).length;

  const handleOpenAdd = () => {
    setEditingPart(null);
    setFormData({
      code: `PRT-${Date.now().toString().slice(-6)}`,
      barcode: '',
      name: '',
      category: 'Ekran',
      brand: '',
      compatibleModels: '',
      supplierId: '',
      purchasePrice: '',
      salePrice: '',
      quantity: 0,
      minQuantity: 2,
      location: '',
      notes: ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (part) => {
    setEditingPart(part);
    setFormData({
      ...part,
      supplierId: part.supplierId || ''
    });
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim()) {
      setErrorMsg('Parça adı zorunludur.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      
      const supp = suppliers.find(s => s.id === formData.supplierId);
      await partService.save({
        ...formData,
        id: editingPart ? editingPart.id : undefined,
        supplierName: supp ? supp.name : ''
      });

      setSuccessMsg(editingPart ? 'Parça güncellendi.' : 'Yeni parça eklendi.');
      setIsFormOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Parça kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdjust = (part) => {
    setAdjustPart(part);
    setAdjustQty(1);
    setAdjustType('in');
    setAdjustNote('');
    setErrorMsg('');
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !adjustPart) return;

    const delta = adjustType === 'in' ? Math.abs(Number(adjustQty)) : -Math.abs(Number(adjustQty));

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await partService.adjustStock(adjustPart.id, delta, {
        sourceType: 'manual',
        description: adjustNote ? `Manuel İşlem: ${adjustNote}` : `Manuel Stok ${adjustType === 'in' ? 'Girişi' : 'Çıkışı'}`
      });

      setIsAdjustOpen(false);
      setSuccessMsg('Stok miktarı güncellendi.');
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Stok güncellenirken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHistory = (part) => {
    setHistoryPart(part);
    setMovements(stockMovementService.getByItemId(part.id));
    setIsHistoryOpen(true);
  };

  const handleDelete = async (part) => {
    if (!window.confirm(`"${part.name}" parçasını silmek istediğinize emin misiniz?`)) return;

    try {
      await partService.delete(part.id);
      setSuccessMsg('Parça silindi.');
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredParts.map(p => `
      <tr>
        <td>${escapeHtml(p.code)}</td>
        <td>${escapeHtml(p.barcode || '-')}</td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.category)}</td>
        <td>${escapeHtml(p.brand)} ${escapeHtml(p.compatibleModels)}</td>
        <td>${p.quantity} Adet</td>
        <td>${Number(p.purchasePrice || 0).toLocaleString('tr-TR')} TL</td>
        <td>${Number(p.salePrice || 0).toLocaleString('tr-TR')} TL</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Parça Stok Listesi</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h2 { border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 11px; text-align: right; color: #666; }
        </style>
      </head>
      <body>
        <h2>Parça Stok Raporu</h2>
        <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
        <table>
          <thead>
            <tr>
              <th>Kod</th>
              <th>Barkod</th>
              <th>Parça Adı</th>
              <th>Kategori</th>
              <th>Marka / Model</th>
              <th>Mevcut Stok</th>
              <th>Alış Fiyatı</th>
              <th>Satış Fiyatı</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="footer">Telefoncum Yönetim Sistemi</div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="text-teal-500" size={24} />
            Parça Stok Yönetimi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Yedek parça stoğunu izleyin, kritik stok uyarılarını takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <Printer size={15} />
            Yazdır
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 transition shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <Plus size={16} />
            Yeni Parça Ekle
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Parça Çeşidi</div>
          <div className="text-xl font-bold font-display text-slate-900 dark:text-white">{totalTypes}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Stok Adedi</div>
          <div className="text-xl font-bold font-display text-slate-900 dark:text-white">{totalQty}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Alış Stok Değeri</div>
          <div className="text-xl font-bold font-display text-teal-600 dark:text-teal-400">
            {totalPurchaseValue.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Satış Potansiyeli</div>
          <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {totalSaleValue.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          criticalCount > 0 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="text-xs font-semibold mb-1 flex items-center gap-1">
            {criticalCount > 0 && <AlertTriangle size={14} className="animate-bounce" />}
            Kritik Stok Uyarısı
          </div>
          <div className="text-xl font-bold font-display">
            {criticalCount} Çeşit
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Parça adı, kod, barkod veya model ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="ALL">Tüm Kategoriler</option>
          {PART_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="ALL">Tüm Stok Durumları</option>
          <option value="CRITICAL">Kritik Stoktakiler</option>
          <option value="OUT_OF_STOCK">Stokta Olmayanlar</option>
        </select>
      </div>

      {/* Parts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-3">Kod / Barkod</th>
                <th className="p-3">Parça Adı</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Marka / Uyumlu Model</th>
                <th className="p-3">Stok Durumu</th>
                <th className="p-3">Alış Fiyatı</th>
                <th className="p-3">Satış Fiyatı</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Aranan kriterlere uygun parça bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredParts.map(part => {
                  const isCritical = part.quantity <= (part.minQuantity || 0);
                  const isOut = part.quantity <= 0;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{part.code}</div>
                        {part.barcode && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Barcode size={10} />
                            {part.barcode}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{part.name}</div>
                        {part.location && (
                          <div className="text-[10px] text-slate-400">Konum: {part.location}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {part.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 dark:text-slate-200">{part.brand || '-'}</div>
                        <div className="text-[10px] text-slate-400">{part.compatibleModels || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {part.quantity} Adet
                          </span>
                          {isCritical && (
                            <span title="Kritik Stok Uyarısı">
                              <AlertTriangle size={14} className="text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono">{Number(part.purchasePrice || 0).toLocaleString('tr-TR')} TL</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(part.salePrice || 0).toLocaleString('tr-TR')} TL
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenAdjust(part)}
                            title="Stok Giriş/Çıkış Yap"
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 dark:text-teal-400 transition cursor-pointer"
                          >
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenHistory(part)}
                            title="Hareket Geçmişi"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:text-slate-300 transition cursor-pointer"
                          >
                            <History size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(part)}
                            title="Düzenle"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:text-slate-300 transition cursor-pointer"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(part)}
                            title="Sil"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PART */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-display text-base text-slate-900 dark:text-white">
                {editingPart ? 'Parçayı Düzenle' : 'Yeni Parça Ekle'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Parça Kodu</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Barkod</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Okutun veya yazın..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Parça Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: iPhone 13 Orijinal Ekran"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    {PART_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Marka</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Apple, Samsung vb."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Uyumlu Modeller</label>
                <input
                  type="text"
                  value={formData.compatibleModels}
                  onChange={(e) => setFormData({ ...formData, compatibleModels: e.target.value })}
                  placeholder="iPhone 13, iPhone 13 Pro..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Alış Fiyatı (TL)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Satış Fiyatı (TL)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Stok Miktarı</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Kritik Stok Sınırı</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Depo Konumu</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Raf A-2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Tedarikçi</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="">-- Seçiniz --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || 'Telefon yok'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {isAdjustOpen && adjustPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-display text-base text-slate-900 dark:text-white">
                Stok Giriş / Çıkış
              </h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{adjustPart.name}</span> (Mevcut Stok: {adjustPart.quantity} Adet)
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    adjustType === 'in' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Stok Girişi (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    adjustType === 'out' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500'
                  }`}
                >
                  <ArrowDownRight size={16} />
                  Stok Çıkışı (-)
                </button>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">İşlem Miktarı (Adet)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Açıklama / Not</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Örn: Yeni faturalı ürün gelişi / Hasarlı değişim"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'İşleniyor...' : 'Stok Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STOCK MOVEMENT HISTORY */}
      {isHistoryOpen && historyPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold font-display text-base text-slate-900 dark:text-white">
                  Stok Hareket Geçmişi
                </h3>
                <p className="text-xs text-slate-500">{historyPart.name} ({historyPart.code})</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {movements.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Henüz stok hareketi kaydedilmemiş.</div>
              ) : (
                movements.map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {m.description || 'Stok Hareketi'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tarih: {new Date(m.createdAt || m.date).toLocaleString('tr-TR')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${m.movementType === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {m.movementType === 'in' ? '+' : '-'}{m.quantity} Adet
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {m.previousQuantity} &rarr; {m.newQuantity} Adet
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
