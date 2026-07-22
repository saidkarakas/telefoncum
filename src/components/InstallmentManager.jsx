import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  AlertTriangle,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';
import { installmentService } from '../db/services/installmentService';
import { customerService } from '../db/services/customerService';
import { supplierService } from '../db/services/supplierService';
import { escapeHtml } from '../utils/security';

export default function InstallmentManager({ setActivePage, setSelectedContactId }) {
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, OVERDUE, TODAY, THIS_MONTH

  // Pay Modal
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payPlan, setPayPlan] = useState(null);
  const [payInst, setPayInst] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('Nakit');
  const [payNote, setPayNote] = useState('');

  // Detail & Print Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);

  // Submitting / Notifications
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = () => {
    const loadedPlans = installmentService.getAll();
    const loadedCustomers = customerService.getAll();
    const loadedSuppliers = supplierService.getAll();
    setPlans(loadedPlans);
    setCustomers(loadedCustomers);
    setSuppliers(loadedSuppliers);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, []);

  const getContactInfo = (contactId, contactType) => {
    if (contactType === 'supplier') {
      const supp = suppliers.find(s => s.id === contactId);
      return supp ? { name: supp.name, phone: supp.phone, typeLabel: 'Tedarikçi' } : { name: 'Bilinmeyen Tedarikçi', phone: '', typeLabel: 'Tedarikçi' };
    }
    const cust = customers.find(c => c.id === contactId);
    return cust ? { name: cust.name, phone: cust.phone, typeLabel: 'Müşteri' } : { name: 'Bilinmeyen Müşteri', phone: '', typeLabel: 'Müşteri' };
  };

  // Filter Plans
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthKey = todayStr.substring(0, 7);

  const filteredPlans = plans.filter(plan => {
    const contact = getContactInfo(plan.contactId, plan.contactType);
    const matchesSearch = !searchQuery || (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchQuery)) ||
      (plan.note && plan.note.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      matchesStatus = plan.status === statusFilter;
    }

    let matchesDate = true;
    if (dateFilter === 'OVERDUE') {
      matchesDate = (plan.schedule || []).some(i => i.status === 'Gecikmiş' && i.remainingAmount > 0);
    } else if (dateFilter === 'TODAY') {
      matchesDate = (plan.schedule || []).some(i => i.dueDate === todayStr && i.remainingAmount > 0);
    } else if (dateFilter === 'THIS_MONTH') {
      matchesDate = (plan.schedule || []).some(i => (i.dueDate || '').startsWith(currentMonthKey) && i.remainingAmount > 0);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate Metrics
  const totalCustomerReceivables = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.debt || 0), 0);

  let overdueCount = 0;
  let overdueTotal = 0;
  let dueTodayTotal = 0;
  let thisMonthTotal = 0;

  plans.forEach(plan => {
    (plan.schedule || []).forEach(item => {
      if (item.remainingAmount > 0) {
        if (item.status === 'Gecikmiş') {
          overdueCount += 1;
          overdueTotal += item.remainingAmount;
        }
        if (item.dueDate === todayStr) {
          dueTodayTotal += item.remainingAmount;
        }
        if ((item.dueDate || '').startsWith(currentMonthKey)) {
          thisMonthTotal += item.remainingAmount;
        }
      }
    });
  });

  const handleOpenPay = (plan, installment) => {
    setPayPlan(plan);
    setPayInst(installment);
    setPayAmount(installment.remainingAmount);
    setPayType('Nakit');
    setPayNote('');
    setErrorMsg('');
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !payPlan || !payInst) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      
      await installmentService.payInstallment(
        payPlan.id,
        payInst.id,
        payAmount,
        payType,
        payNote
      );

      setIsPayOpen(false);
      setSuccessMsg(`Taksit #${payInst.installmentNo} ödemesi kaydedildi.`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Ödeme kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = (plan) => {
    setDetailPlan(plan);
    setIsDetailOpen(true);
  };

  const handlePrintPlan = (plan) => {
    const contact = getContactInfo(plan.contactId, plan.contactType);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = (plan.schedule || []).map(item => `
      <tr class="${item.status === 'Ödendi' ? 'paid' : item.status === 'Gecikmiş' ? 'overdue' : ''}">
        <td>#${item.installmentNo}</td>
        <td>${new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>
        <td>${Number(item.amount).toLocaleString('tr-TR')} TL</td>
        <td>${Number(item.paidAmount).toLocaleString('tr-TR')} TL</td>
        <td>${Number(item.remainingAmount).toLocaleString('tr-TR')} TL</td>
        <td><strong>${escapeHtml(item.status)}</strong></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Taksit Sözleşmesi ve Ödeme Planı</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          .info { margin: 15px 0; font-size: 13px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
          tr.paid { background: #f0fdf4; }
          tr.overdue { background: #fef2f2; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Taksitli Satış Ödeme Planı</h2>
          <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <div class="info">
          <p><strong>Müşteri:</strong> ${escapeHtml(contact.name)} (${escapeHtml(contact.phone || 'Telefon Yok')})</p>
          <p><strong>Toplam Tutar:</strong> ${Number(plan.totalAmount).toLocaleString('tr-TR')} TL</p>
          <p><strong>Alınan Peşinat:</strong> ${Number(plan.downPayment).toLocaleString('tr-TR')} TL</p>
          <p><strong>Kalan Taksit Tutarı:</strong> ${Number(plan.remainingAmount).toLocaleString('tr-TR')} TL (${plan.installmentCount} Taksit)</p>
          ${plan.note ? `<p><strong>Not:</strong> ${escapeHtml(plan.note)}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Taksit No</th>
              <th>Vade Tarihi</th>
              <th>Taksit Tutarı</th>
              <th>Ödenen</th>
              <th>Kalan</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <p><strong>Müşteri İmza:</strong></p>
            <br/><br/>
            <p>___________________</p>
          </div>
          <div>
            <p><strong>İşletme İmza / Kaşe:</strong></p>
            <br/><br/>
            <p>___________________</p>
          </div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-teal-500" size={24} />
            Taksit & Veresiye Yönetimi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Açık alacakları, taksitli satış sözleşmelerini ve geciken ödemeleri takip edin.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam Açık Alacak</div>
          <div className="text-xl font-bold font-display text-teal-600 dark:text-teal-400">
            {totalCustomerReceivables.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Toplam İşletme Borcu</div>
          <div className="text-xl font-bold font-display text-rose-500">
            {totalSupplierPayables.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Bugün Vadesi Gelen</div>
          <div className="text-xl font-bold font-display text-amber-500">
            {dueTodayTotal.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Bu Ay Tahsil Edilecek</div>
          <div className="text-xl font-bold font-display text-emerald-500">
            {thisMonthTotal.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          overdueCount > 0 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="text-xs font-semibold mb-1 flex items-center gap-1">
            {overdueCount > 0 && <AlertTriangle size={14} className="animate-bounce" />}
            Geciken Taksitler
          </div>
          <div className="text-xl font-bold font-display">
            {overdueCount} Taksit ({overdueTotal.toLocaleString('tr-TR')} TL)
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
            placeholder="Müşteri adı, telefon numarası veya not ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="ALL">Tüm Vade Tarihleri</option>
          <option value="OVERDUE">Gecikenler</option>
          <option value="TODAY">Bugün Vadesi Gelenler</option>
          <option value="THIS_MONTH">Bu Ay Vadesi Gelenler</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="ALL">Tüm Durumlar</option>
          <option value="Bekliyor">Bekliyor</option>
          <option value="Kısmi Ödendi">Kısmi Ödendi</option>
          <option value="Gecikmiş">Gecikmiş</option>
          <option value="Tamamlandı">Tamamlandı</option>
        </select>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
            Aranan kriterlere uygun taksit planı bulunamadı.
          </div>
        ) : (
          filteredPlans.map(plan => {
            const contact = getContactInfo(plan.contactId, plan.contactType);
            const isCompleted = plan.status === 'Tamamlandı';
            const isOverdue = plan.status === 'Gecikmiş';

            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{contact.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        {contact.typeLabel}
                      </span>
                      {contact.phone && (
                        <span className="text-xs text-slate-400 font-mono">({contact.phone})</span>
                      )}
                    </div>
                    {plan.note && <p className="text-xs text-slate-500 mt-0.5">{plan.note}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      isCompleted 
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : isOverdue 
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' 
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {plan.status}
                    </span>

                    <button
                      onClick={() => handleOpenDetail(plan)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={14} />
                      Yazdır / Detay
                    </button>
                  </div>
                </div>

                {/* Plan Summary Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Toplam Satış Bedeli</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {Number(plan.totalAmount).toLocaleString('tr-TR')} TL
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Alınan Peşinat</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {Number(plan.downPayment || 0).toLocaleString('tr-TR')} TL
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Kalan Borç Tutarı</span>
                    <span className="font-bold font-mono text-rose-500">
                      {Number(plan.remainingAmount).toLocaleString('tr-TR')} TL
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Taksit Adedi / Vade</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {plan.installmentCount} Ay Taksit
                    </span>
                  </div>
                </div>

                {/* Schedule Items Table Preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2">Taksit No</th>
                        <th className="py-2">Vade Tarihi</th>
                        <th className="py-2">Tutar</th>
                        <th className="py-2">Ödenen</th>
                        <th className="py-2">Kalan</th>
                        <th className="py-2">Durum</th>
                        <th className="py-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {(plan.schedule || []).map(inst => (
                        <tr key={inst.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                          <td className="py-2 font-bold font-mono text-slate-900 dark:text-white">#{inst.installmentNo}</td>
                          <td className="py-2 font-mono">{new Date(inst.dueDate).toLocaleDateString('tr-TR')}</td>
                          <td className="py-2 font-mono">{Number(inst.amount).toLocaleString('tr-TR')} TL</td>
                          <td className="py-2 font-mono text-emerald-600">{Number(inst.paidAmount).toLocaleString('tr-TR')} TL</td>
                          <td className="py-2 font-mono font-bold text-rose-500">{Number(inst.remainingAmount).toLocaleString('tr-TR')} TL</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inst.status === 'Ödendi'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : inst.status === 'Gecikmiş'
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {inst.status}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {inst.remainingAmount > 0 && (
                              <button
                                onClick={() => handleOpenPay(plan, inst)}
                                className="px-3 py-1 rounded-lg bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition text-[11px] cursor-pointer"
                              >
                                Ödeme Al
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: MAKE PAYMENT */}
      {isPayOpen && payPlan && payInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-display text-base text-slate-900 dark:text-white">
                Taksit Ödemesi Al (#Taksit {payInst.installmentNo})
              </h3>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 space-y-1">
                <div className="text-slate-400">Kalan Taksit Borcu: <strong className="text-rose-500 font-mono">{payInst.remainingAmount} TL</strong></div>
                <div className="text-slate-400">Vade Tarihi: <strong className="text-slate-800 dark:text-slate-200">{new Date(payInst.dueDate).toLocaleDateString('tr-TR')}</strong></div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Ödenecek Tutar (TL) *</label>
                <input
                  type="number"
                  min="0.01"
                  max={payInst.remainingAmount}
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-base font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Ödeme Şekli</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="Nakit">Nakit</option>
                  <option value="Havale/EFT">Havale / EFT</option>
                  <option value="Kart">Kredi / Banka Kartı</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Açıklama / Not</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Kısmi ödeme veya dekont no..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PLAN DETAIL & PRINT */}
      {isDetailOpen && detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold font-display text-base text-slate-900 dark:text-white">
                  Taksitli Satış Plan Detayı
                </h3>
                <p className="text-xs text-slate-500">Plan ID: {detailPlan.id}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Toplam Satış</span>
                  <span className="font-bold font-mono">{Number(detailPlan.totalAmount).toLocaleString('tr-TR')} TL</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Peşinat</span>
                  <span className="font-bold font-mono text-emerald-500">{Number(detailPlan.downPayment).toLocaleString('tr-TR')} TL</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kalan Borç</span>
                  <span className="font-bold font-mono text-rose-500">{Number(detailPlan.remainingAmount).toLocaleString('tr-TR')} TL</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Taksit Takvimi</h4>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {(detailPlan.schedule || []).map(inst => (
                    <div key={inst.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold font-mono text-slate-900 dark:text-white">#{inst.installmentNo} Taksit</span>
                        <span className="text-slate-400 ml-2">Vade: {new Date(inst.dueDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{Number(inst.amount).toLocaleString('tr-TR')} TL</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inst.status === 'Ödendi' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {inst.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handlePrintPlan(detailPlan)}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition flex items-center gap-2 text-xs cursor-pointer"
              >
                <Printer size={15} />
                Sözleşmeyi Yazdır
              </button>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
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
