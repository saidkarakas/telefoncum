import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Search,
  Printer,
  X,
  Plus,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { tradeInService } from '../db/services/tradeInService';
import { phoneService } from '../db/services/phoneService';
import { customerService } from '../db/services/customerService';
import { escapeHtml } from '../utils/security';

export default function TradeInManager({ globalSearchQuery }) {
  const [tradeIns, setTradeIns] = useState([]);
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);

  // New Trade Modal State (Requirement 2)
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({ fullName: '', phone: '' });

  const [soldPhoneId, setSoldPhoneId] = useState('');
  const [soldPhonePrice, setSoldPhonePrice] = useState('');
  const [receivedPhoneValue, setReceivedPhoneValue] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Nakit');
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentStartDate, setInstallmentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [receivedPhoneData, setReceivedPhoneData] = useState({
    brand: 'Apple',
    model: '',
    imei1: '',
    imei2: '',
    serialNumber: '',
    color: '',
    storage: '128 GB',
    cosmeticStatus: 'İyi',
    defects: '',
    description: ''
  });

  const loadData = () => {
    setTradeIns(tradeInService.getAll());
    setPhones(phoneService.getAll());
    setCustomers(customerService.getAll());
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

  const stockPhones = phones.filter(p => p.status === 'Stokta');

  const handleOpenNewTrade = () => {
    setFormError('');
    setIsSubmitting(false);
    setIsNewCustomer(false);
    setSelectedCustomerId('');
    setNewCustomerData({ fullName: '', phone: '' });
    setSoldPhoneId('');
    setSoldPhonePrice('');
    setReceivedPhoneValue('');
    setPaidAmount('');
    setPaymentType('Nakit');
    setInstallmentCount(3);
    setInstallmentStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setReceivedPhoneData({
      brand: 'Apple',
      model: '',
      imei1: '',
      imei2: '',
      serialNumber: '',
      color: '',
      storage: '128 GB',
      cosmeticStatus: 'İyi',
      defects: '',
      description: ''
    });
    setIsNewTradeOpen(true);
  };

  const handleSoldPhoneSelect = (pId) => {
    setSoldPhoneId(pId);
    const p = stockPhones.find(item => item.id === pId);
    if (p) {
      setSoldPhonePrice(p.salesPrice || p.purchasePrice * 1.25 || '');
    }
  };

  // Requirement 2: Submit processTradeIn call
  const handleSaveTradeIn = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (!soldPhoneId) {
      setFormError('Lütfen takasta müşteriye verilecek stok telefonunu seçin.');
      return;
    }
    if (!soldPhonePrice || Number(soldPhonePrice) <= 0) {
      setFormError('Lütfen geçerli bir satılan telefon fiyatı girin.');
      return;
    }
    if (!receivedPhoneData.brand || !receivedPhoneData.model) {
      setFormError('Takasa alınacak telefonun marka ve modelini girin.');
      return;
    }
    if (!receivedPhoneValue || Number(receivedPhoneValue) <= 0) {
      setFormError('Lütfen takasa alınacak cihaza biçilen değeri girin.');
      return;
    }

    if (isNewCustomer && (!newCustomerData.fullName.trim() || !newCustomerData.phone.trim())) {
      setFormError('Yeni müşteri adı ve telefon numarası zorunludur.');
      return;
    }
    if (!isNewCustomer && !selectedCustomerId) {
      setFormError('Lütfen takas yapacak müşteriyi seçin.');
      return;
    }

    const payload = {
      soldPhoneId,
      soldPhonePrice: Number(soldPhonePrice),
      receivedPhoneValue: Number(receivedPhoneValue),
      paidAmount: paidAmount ? Number(paidAmount) : 0,
      paymentType,
      installmentCount: Number(installmentCount),
      installmentStartDate,
      notes,
      customerId: isNewCustomer ? null : selectedCustomerId,
      customerData: isNewCustomer ? { name: newCustomerData.fullName, fullName: newCustomerData.fullName, phone: newCustomerData.phone } : null,
      receivedPhoneData
    };

    try {
      setIsSubmitting(true);
      // Requirement 2: Save button directly awaits tradeInService.processTradeIn(payload)
      await tradeInService.processTradeIn(payload);
      setIsNewTradeOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Takas kaydı oluşturulurken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Trades
  const filteredTrades = tradeIns.filter(t => {
    const custName = t.customerName || '';
    const soldName = t.soldPhoneName || '';
    const recName = t.receivedPhoneName || '';

    return !searchQuery || (
      custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      soldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.id && t.id.includes(searchQuery))
    );
  });

  // Metrics
  const totalTradeCount = tradeIns.length;
  const totalReceivedValue = tradeIns.reduce((sum, t) => sum + (t.receivedPhoneValue || 0), 0);
  const totalCollectedDiff = tradeIns.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
  const totalCustomerReceivables = tradeIns
    .filter(t => t.differenceDirection === 'customer_owes')
    .reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
  const totalBusinessPayables = tradeIns
    .filter(t => t.differenceDirection === 'business_owes')
    .reduce((sum, t) => sum + (t.remainingAmount || 0), 0);

  const handlePrintContract = (trade) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const soldPhone = phones.find(p => p.id === trade.soldPhoneId) || {};
    const receivedPhone = phones.find(p => p.id === trade.receivedPhoneId) || {};
    const cust = customers.find(c => c.id === trade.customerId) || {};

    const directionText = 
      trade.differenceDirection === 'customer_owes' ? 'Müşterinin Ödeyeceği Fark' :
      trade.differenceDirection === 'business_owes' ? 'İşletmenin Ödeyeceği Fark' :
      'Başa Baş (Fark Yok)';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Telefon Takas Sözleşmesi #${escapeHtml(trade.id.slice(0, 8))}</title>
        <style>
          body { font-family: sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; color: #0f172a; font-size: 20px; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 12px; }
          .section-title { font-weight: bold; font-size: 14px; margin-top: 20px; margin-bottom: 8px; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .grid { display: flex; gap: 20px; margin-bottom: 15px; }
          .box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .box h4 { margin: 0 0 8px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { padding: 4px 0; font-size: 12px; }
          td.label { color: #64748b; width: 40%; }
          td.val { font-weight: 600; color: #0f172a; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .summary-table th, .summary-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          .summary-table th { background: #f1f5f9; font-weight: bold; }
          .terms { font-size: 10px; color: #64748b; margin-top: 25px; background: #f1f5f9; padding: 10px; border-radius: 6px; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
          .sig-box { width: 40%; text-align: center; }
          .sig-line { margin-top: 50px; border-top: 1px solid #94a3b8; }
        </style>
      </head>
      <body>

        <div class="header">
          <h2>TELEFON TAKAS SÖZLEŞMESİ</h2>
          <p>İşlem No: ${escapeHtml(trade.id)} | Tarih: ${new Date(trade.tradeDate).toLocaleDateString('tr-TR')}</p>
        </div>

        <div class="grid">
          <div class="box">
            <h4>Müşteri (Devreden) Bilgileri</h4>
            <table>
              <tr><td class="label">Adı Soyadı:</td><td class="val">${escapeHtml(cust.fullName || cust.name || trade.customerName)}</td></tr>
              <tr><td class="label">Telefon:</td><td class="val">${escapeHtml(cust.phone || '-')}</td></tr>
              <tr><td class="label">Adres:</td><td class="val">${escapeHtml(cust.address || '-')}</td></tr>
            </table>
          </div>

          <div class="box">
            <h4>İşletme Bilgileri</h4>
            <table>
              <tr><td class="label">Firma:</td><td class="val">Telefoncum Yönetim Sistemi</td></tr>
              <tr><td class="label">Tarih:</td><td class="val">${new Date().toLocaleDateString('tr-TR')}</td></tr>
            </table>
          </div>
        </div>

        <div class="section-title">TAKASA KONU CİHAZLAR</div>

        <div class="grid">
          <div class="box">
            <h4>İşletmenin Müşteriye Verdiği Cihaz</h4>
            <table>
              <tr><td class="label">Marka / Model:</td><td class="val">${escapeHtml(soldPhone.brand || '')} ${escapeHtml(soldPhone.model || '')}</td></tr>
              <tr><td class="label">IMEI 1:</td><td class="val">${escapeHtml(soldPhone.imei1 || '-')}</td></tr>
              <tr><td class="label">IMEI 2:</td><td class="val">${escapeHtml(soldPhone.imei2 || '-')}</td></tr>
              <tr><td class="label">Seri No:</td><td class="val">${escapeHtml(soldPhone.serialNumber || '-')}</td></tr>
              <tr><td class="label">Anlaşılan Bedel:</td><td class="val">${Number(trade.soldPhonePrice).toLocaleString('tr-TR')} TL</td></tr>
            </table>
          </div>

          <div class="box">
            <h4>Müşteriden Alınan Cihaz (Takas)</h4>
            <table>
              <tr><td class="label">Marka / Model:</td><td class="val">${escapeHtml(receivedPhone.brand || '')} ${escapeHtml(receivedPhone.model || '')}</td></tr>
              <tr><td class="label">IMEI 1:</td><td class="val">${escapeHtml(receivedPhone.imei1 || '-')}</td></tr>
              <tr><td class="label">IMEI 2:</td><td class="val">${escapeHtml(receivedPhone.imei2 || '-')}</td></tr>
              <tr><td class="label">Kozmetik / Pil:</td><td class="val">${escapeHtml(receivedPhone.cosmeticStatus || '-')} / %${escapeHtml(receivedPhone.batteryHealth || '-')}</td></tr>
              <tr><td class="label">Takas Biçilen Değer:</td><td class="val">${Number(trade.receivedPhoneValue).toLocaleString('tr-TR')} TL</td></tr>
            </table>
          </div>
        </div>

        <div class="section-title">HESAP VE ÖDEME ÖZETİ</div>

        <table class="summary-table">
          <thead>
            <tr>
              <th>Verilen Cihaz Fiyatı</th>
              <th>Alınan Cihaz Takas Bedeli</th>
              <th>Fark Hesabı</th>
              <th>Ödenen Tutarı</th>
              <th>Kalan Borç</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${Number(trade.soldPhonePrice).toLocaleString('tr-TR')} TL</td>
              <td>${Number(trade.receivedPhoneValue).toLocaleString('tr-TR')} TL</td>
              <td><strong>${Number(trade.differenceAmount).toLocaleString('tr-TR')} TL</strong> (${directionText})</td>
              <td>${Number(trade.paidAmount).toLocaleString('tr-TR')} TL (${escapeHtml(trade.paymentType)})</td>
              <td><strong>${Number(trade.remainingAmount).toLocaleString('tr-TR')} TL</strong></td>
            </tr>
          </tbody>
        </table>

        ${trade.notes ? `<p style="margin-top: 10px; font-size: 11px;"><strong>İşlem Notu:</strong> ${escapeHtml(trade.notes)}</p>` : ''}

        <div class="terms">
          <strong>BEYAN VE TAAHHÜT:</strong> Müşteri, takasa verdiği cihazın yasal sahibi olduğunu, çalıntı, buluntu veya hacizli olmadığını, IMEI numarasının klonlanmamış ve yasal olduğunu beyan ve taahhüt eder. Aksi durumda doğabilecek tüm hukuki ve cezai sorumluluk müşteriye aittir.
        </div>

        <div class="signatures">
          <div class="sig-box">
            <p><strong>Müşteri (Devreden)</strong></p>
            <div class="sig-line"></div>
            <p style="font-size: 10px; color: #64748b;">İmza</p>
          </div>

          <div class="sig-box">
            <p><strong>İşletme Yetkilisi</strong></p>
            <div class="sig-line"></div>
            <p style="font-size: 10px; color: #64748b;">Kaşe / İmza</p>
          </div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const diffVal = Number(soldPhonePrice || 0) - Number(receivedPhoneValue || 0);

  return (
    <div className="space-y-6 text-xs">

      {/* Header with New Trade Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Repeat className="text-teal-500" size={24} />
            Takas İşlemleri Yönetimi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Telefon takaslarını yapın, alınan cihazları stoğa ekleyin ve sözleşmeleri yazdırın.
          </p>
        </div>

        <button
          onClick={handleOpenNewTrade}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Yeni Takas İşlemi
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Takas Sayısı</div>
          <div className="text-xl font-bold font-display text-slate-900 dark:text-white">{totalTradeCount} İşlem</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Takasla Alınan Stok Değeri</div>
          <div className="text-xl font-bold font-display text-teal-600 dark:text-teal-400">
            {totalReceivedValue.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tahsil Edilen Takas Farkı</div>
          <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {totalCollectedDiff.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Müşteri Takas Borcu</div>
          <div className="text-xl font-bold font-display text-amber-500">
            {totalCustomerReceivables.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">İşletme Takas Borcu</div>
          <div className="text-xl font-bold font-display text-rose-500">
            {totalBusinessPayables.toLocaleString('tr-TR')} TL
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adı, cihaz modeli veya takas no ara..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-3">Tarih / No</th>
                <th className="p-3">Müşteri</th>
                <th className="p-3">Verilen Telefon</th>
                <th className="p-3">Alınan Takas Telefonu</th>
                <th className="p-3">Satış / Takas Değeri</th>
                <th className="p-3">Takas Farkı</th>
                <th className="p-3">Ödenen / Kalan</th>
                <th className="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Kayıtlı takas işlemi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(trade => {
                  const directionBadge = 
                    trade.differenceDirection === 'customer_owes' 
                      ? <span className="text-amber-500 font-bold">Müşteri Ödeyecek</span> 
                      : trade.differenceDirection === 'business_owes' 
                      ? <span className="text-rose-500 font-bold">İşletme Ödeyecek</span> 
                      : <span className="text-emerald-500 font-bold">Başa Baş</span>;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          #{trade.id.substring(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(trade.tradeDate).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {trade.customerName}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-rose-500">{trade.soldPhoneName}</div>
                        <div className="text-[10px] text-slate-400">Satış: {Number(trade.soldPhonePrice).toLocaleString('tr-TR')} TL</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-emerald-500">{trade.receivedPhoneName}</div>
                        <div className="text-[10px] text-slate-400">Takas Değeri: {Number(trade.receivedPhoneValue).toLocaleString('tr-TR')} TL</div>
                      </td>
                      <td className="p-3 font-mono">
                        <div>{Number(trade.soldPhonePrice).toLocaleString('tr-TR')} TL</div>
                        <div className="text-slate-400 text-[10px]">- {Number(trade.receivedPhoneValue).toLocaleString('tr-TR')} TL</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">
                          {Number(trade.differenceAmount).toLocaleString('tr-TR')} TL
                        </div>
                        <div className="text-[10px]">{directionBadge}</div>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="text-emerald-600 font-bold">Ödenen: {Number(trade.paidAmount).toLocaleString('tr-TR')} TL</div>
                        <div className="text-rose-500 text-[10px]">Kalan: {Number(trade.remainingAmount).toLocaleString('tr-TR')} TL</div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handlePrintContract(trade)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Printer size={14} />
                          Sözleşme Yazdır
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW TRADE MODAL (Requirement 2) */}
      {isNewTradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold font-display text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Repeat className="text-teal-500" size={20} />
                Yeni Takas İşlemi Oluştur
              </h3>
              <button onClick={() => setIsNewTradeOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTradeIn} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* 1. Sold Phone Selection */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">1. Müşteriye Verilen Cihaz (Stoktan) *</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Stoktaki Cihaz *</label>
                    <select
                      value={soldPhoneId}
                      onChange={(e) => handleSoldPhoneSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                      required
                    >
                      <option value="">-- Cihaz Seçin --</option>
                      {stockPhones.map(p => (
                        <option key={p.id} value={p.id}>{p.brand} {p.model} ({p.storage} - IMEI: {p.imei1 || 'Yok'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Verilen Cihaz Satış Fiyatı (TL) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={soldPhonePrice}
                      onChange={(e) => setSoldPhonePrice(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Customer Selection */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">2. Müşteri Bilgileri *</h4>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-teal-600">
                    <input
                      type="checkbox"
                      checked={isNewCustomer}
                      onChange={(e) => setIsNewCustomer(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Yeni Müşteri Oluştur
                  </label>
                </div>

                {!isNewCustomer ? (
                  <div>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="">-- Mevcut Müşteri Seçin --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName || c.name} ({c.phone || 'Tel Yok'})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Müşteri Ad Soyad *</label>
                      <input
                        type="text"
                        value={newCustomerData.fullName}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Telefon Numarası *</label>
                      <input
                        type="text"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Received Phone Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">3. Müşteriden Alınan Cihaz (Takas) *</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Marka *</label>
                    <input
                      type="text"
                      required
                      value={receivedPhoneData.brand}
                      onChange={(e) => setReceivedPhoneData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Model *</label>
                    <input
                      type="text"
                      required
                      value={receivedPhoneData.model}
                      onChange={(e) => setReceivedPhoneData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">IMEI 1</label>
                    <input
                      type="text"
                      value={receivedPhoneData.imei1}
                      onChange={(e) => setReceivedPhoneData(prev => ({ ...prev, imei1: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">IMEI 2</label>
                    <input
                      type="text"
                      value={receivedPhoneData.imei2}
                      onChange={(e) => setReceivedPhoneData(prev => ({ ...prev, imei2: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Seri No</label>
                    <input
                      type="text"
                      value={receivedPhoneData.serialNumber}
                      onChange={(e) => setReceivedPhoneData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Takas Biçilen Değer (TL) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={receivedPhoneValue}
                      onChange={(e) => setReceivedPhoneValue(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-teal-600 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Accounting & Payment Method */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">4. Fark Hesabı ve Ödeme</h4>
                  <div className="font-bold font-mono text-xs">
                    Fark: <span className={diffVal > 0 ? 'text-amber-500' : diffVal < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                      {Math.abs(diffVal).toLocaleString('tr-TR')} TL ({diffVal > 0 ? 'Müşteri Ödeyecek' : diffVal < 0 ? 'İşletme Ödeyecek' : 'Başa Baş'})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Peşin Ödenen/Alınan Tutarı (TL)</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Ödeme Türü</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    >
                      <option value="Nakit">Nakit</option>
                      <option value="Havale/EFT">Havale / EFT</option>
                      <option value="Kart">Kredi Kartı</option>
                      <option value="Veresiye">Veresiye</option>
                      <option value="Taksit">Taksit</option>
                    </select>
                  </div>

                  {paymentType === 'Taksit' && (
                    <>
                      <div>
                        <label className="block text-slate-500 mb-1">Taksit Sayısı</label>
                        <select
                          value={installmentCount}
                          onChange={(e) => setInstallmentCount(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value="2">2 Taksit</option>
                          <option value="3">3 Taksit</option>
                          <option value="4">4 Taksit</option>
                          <option value="6">6 Taksit</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">İlk Vade Tarihi</label>
                        <input
                          type="date"
                          value={installmentStartDate}
                          onChange={(e) => setInstallmentStartDate(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Takas Notu / Kusurlar</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    placeholder="Ekran çiziği, şarj soket durumu vb..."
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTradeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>İşlem Kaydediliyor...</span>
                  ) : (
                    <span>Takas Kaydını Tamamla</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
