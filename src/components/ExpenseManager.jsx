import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Calendar, 
  AlertCircle,
  X,
  PieChart,
  ChevronDown
} from 'lucide-react';
import { expenseService } from '../db/services/expenseService';

export default function ExpenseManager({ activePage, globalSearchQuery }) {
  const [expenses, setExpenses] = useState([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    category: 'Kira', // Kira, Elektrik, İnternet, Yakıt, Kargo, Malzeme, Diğer
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [formError, setFormError] = useState('');

  const loadData = () => {
    setExpenses(expenseService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, [activePage]);

  // Filtered List
  const getFilteredExpenses = () => {
    let list = expenses;

    // Search query
    if (globalSearchQuery && globalSearchQuery.trim() !== '') {
      const q = globalSearchQuery.toLowerCase().trim();
      list = list.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter) {
      list = list.filter(e => e.category === categoryFilter);
    }

    return list;
  };

  const filteredExpenses = getFilteredExpenses();

  // Save Expense
  const handleSaveExpense = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Lütfen sıfırdan büyük geçerli bir tutar girin.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Açıklama alanı boş bırakılamaz.');
      return;
    }

    try {
      expenseService.save({
        ...formData,
        amount: Number(formData.amount)
      });
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setFormError('Gider kaydedilemedi.');
    }
  };

  // Delete Expense
  const handleDeleteExpense = (id) => {
    if (confirm('Bu genel gider kaydını silmek istediğinize emin misiniz?')) {
      expenseService.delete(id);
      loadData();
    }
  };

  // Summary calculations
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categories = ['Kira', 'Elektrik', 'İnternet', 'Yakıt', 'Kargo', 'Malzeme', 'Diğer'];

  // Categories breakdowns for inline bars
  const categorySummary = {};
  categories.forEach(cat => { categorySummary[cat] = 0; });
  expenses.forEach(e => {
    if (categorySummary[e.category] !== undefined) {
      categorySummary[e.category] += e.amount;
    } else {
      categorySummary['Diğer'] += e.amount;
    }
  });

  const grandTotalAllTime = Object.values(categorySummary).reduce((a, b) => a + b, 0);

  // AI Smart Expense Estimation (Madde 47)
  const calculateAiEstimation = () => {
    // Only care about recurring ones
    const recurringCats = ['Kira', 'Elektrik', 'İnternet'];
    const now = new Date();
    // Look at last 3 full months
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    let totalRecurring = 0;
    let monthsCounted = new Set();
    
    expenses.forEach(e => {
      if (recurringCats.includes(e.category)) {
        const d = new Date(e.date);
        if (d >= threeMonthsAgo && d < new Date(now.getFullYear(), now.getMonth(), 1)) {
          totalRecurring += e.amount;
          monthsCounted.add(`${d.getFullYear()}-${d.getMonth()}`);
        }
      }
    });

    // Average per month
    const distinctMonths = monthsCounted.size > 0 ? monthsCounted.size : 1;
    return Math.round(totalRecurring / distinctMonths);
  };

  const aiEstimation = calculateAiEstimation();

  return (
    <div className="space-y-6">
      
      {aiEstimation > 0 && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl flex items-center justify-between text-indigo-700 dark:text-indigo-400 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span className="font-semibold tracking-wide">AI Gider Tahmini:</span>
            Geçmiş aylara dayanarak bu ayki muhtemel sabit giderleriniz (Kira, Elektrik, İnternet) yaklaşık 
            <strong className="ml-1 text-indigo-900 dark:text-indigo-300">{aiEstimation.toLocaleString('tr-TR')} TL</strong> olacaktır. 
            Kasada bu tutarı hazır bulundurmanız önerilir.
          </div>
        </div>
      )}

      {/* SUMMARY DASHBOARD METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Summary Total */}
        <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Seçili Listelenen Gider</span>
            <h3 className="text-2xl font-extrabold text-indigo-650 dark:text-indigo-400 mt-1">
              {totalAmount.toLocaleString('tr-TR')} TL
            </h3>
          </div>
          <span className="text-[10px] text-slate-450 block mt-2">
            Filtreleme kriterlerine uyan toplam genel gider tutarıdır.
          </span>
        </div>

        {/* Right Side: Category Breakdown Bars (2 grid widths) */}
        <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-450 flex items-center gap-1">
            <PieChart size={14} className="text-teal-500" />
            Tüm Zamanlar Kategori Dağılımı
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
            {categories.map(cat => {
              const val = categorySummary[cat] || 0;
              const percent = grandTotalAllTime > 0 ? (val / grandTotalAllTime) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">{cat}</span>
                    <span>{val.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* FILTER BUTTONS & ADD BUTTON ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        
        {/* Category Filters */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === ''
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tümü
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Add Button */}
        <button
          onClick={() => {
            setFormData({
              category: 'Kira',
              amount: '',
              date: new Date().toISOString().split('T')[0],
              description: ''
            });
            setFormError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 active:scale-[0.98] transition text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer whitespace-nowrap"
        >
          <Plus size={16} />
          Gider Kaydı Ekle
        </button>
      </div>

      {/* EXPENSE TABLE LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                <th className="p-4 py-3.5">Kategori</th>
                <th className="p-4 py-3.5">İşlem Açıklaması</th>
                <th className="p-4 py-3.5">Gider Tarihi</th>
                <th className="p-4 py-3.5 text-right">Tutar</th>
                <th className="p-4 py-3.5 text-center no-print">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                    Kayıtlı genel gider bulunmamaktadır.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                    
                    {/* Category */}
                    <td className="p-4 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        {exp.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="p-4 text-slate-700 dark:text-slate-350">
                      {exp.description}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-slate-500">
                      {new Date(exp.date).toLocaleDateString('tr-TR')}
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-right font-bold text-red-500 text-sm">
                      {exp.amount.toLocaleString('tr-TR')} TL
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center no-print">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-650 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-100 text-xs">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1">
                <Receipt size={16} className="text-indigo-600" />
                Yeni Genel Gider Kaydı
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-1">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Select */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Gider Kategorisi</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                >
                  <option value="Kira">Kira</option>
                  <option value="Elektrik">Elektrik</option>
                  <option value="İnternet">İnternet</option>
                  <option value="Yakıt">Yakıt</option>
                  <option value="Kargo">Kargo</option>
                  <option value="Malzeme">Malzeme</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Tutar *</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Gider tutarı"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2.5 pl-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent font-bold text-slate-900 dark:text-white"
                    required
                  />
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold">₺</span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Gider Tarihi</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Açıklama / Detay *</label>
                <input
                  type="text"
                  placeholder="Gider detayı yazın"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Kaydet
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
