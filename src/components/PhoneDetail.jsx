import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Smartphone, 
  ShoppingBag, 
  Receipt, 
  BadgeCheck, 
  Trash2, 
  Plus, 
  AlertCircle,
  PiggyBank,
  CheckCircle,
  FileText,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { phoneService } from '../db/services/phoneService';
import { calculatePhoneCosts } from '../db/services/shared';
import { escapeHtml } from '../utils/security';

export default function PhoneDetail({ phoneId, onClose, onDataChanged }) {
  const [phone, setPhone] = useState(null);
  
  // Add Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    name: 'Ekran', // Ekran, Batarya, Kargo, Komisyon, Temizlik, Yol, Diğer
    customName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [expenseError, setExpenseError] = useState('');

  const loadPhone = () => {
    if (!phoneId) return;
    const p = phoneService.getById(phoneId);
    setPhone(p);
  };

  useEffect(() => {
    loadPhone();
  }, [phoneId]);

  if (!phone) return null;

  // Add Expense Action
  const handleAddExpense = (e) => {
    e.preventDefault();
    setExpenseError('');

    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setExpenseError('Lütfen geçerli bir masraf tutarı girin.');
      return;
    }

    const expenseName = expenseForm.name === 'Diğer' && expenseForm.customName.trim() !== ''
      ? expenseForm.customName.trim()
      : expenseForm.name;

    try {
      phoneService.addExpense(phone.id, {
        name: expenseName,
        amount: Number(expenseForm.amount),
        date: expenseForm.date
      });
      // Reset form
      setExpenseForm({
        name: 'Ekran',
        customName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      loadPhone();
      if (onDataChanged) onDataChanged(); // Trigger reload in list
    } catch (err) {
      setExpenseError('Masraf eklenirken hata oluştu.');
    }
  };

  // Delete Expense Action
  const handleDeleteExpense = (expenseId) => {
    if (confirm('Bu masrafı silmek istediğinizden emin misiniz?')) {
      phoneService.deleteExpense(phone.id, expenseId);
      loadPhone();
      if (onDataChanged) onDataChanged();
    }
  };

  // Print Slip
  const triggerPrintDetail = () => {
    window.print();
  };

  // Print Label (QR)
  const triggerPrintLabel = () => {
    const svgNode = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svgNode);
    
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    const doc = printWindow.document;
    doc.head.innerHTML = '<title>Etiket Yazdır</title>';
    const style = doc.createElement('style');
    style.textContent = `
      @page { margin: 0; size: 58mm 40mm; }
      body { 
        margin: 0; padding: 5px; text-align: center; font-family: sans-serif;
        width: 58mm; display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .title { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
      .subtitle { font-size: 8px; color: #333; margin-bottom: 4px; }
      .qr-container svg { width: 30mm; height: 30mm; }
    `;
    doc.head.appendChild(style);

    const titleDiv = doc.createElement('div');
    titleDiv.className = 'title';
    titleDiv.textContent = phone.brand + ' ' + phone.model;

    const subTitleDiv = doc.createElement('div');
    subTitleDiv.className = 'subtitle';
    subTitleDiv.textContent = phone.storage + ' - ' + phone.color;

    const qrContainer = doc.createElement('div');
    qrContainer.className = 'qr-container';
    qrContainer.innerHTML = svgData;

    doc.body.appendChild(titleDiv);
    doc.body.appendChild(subTitleDiv);
    doc.body.appendChild(qrContainer);

    printWindow.onload = function() {
      printWindow.print();
      setTimeout(function() { printWindow.close(); }, 500);
    };
  };

  // Get Status Style
  const getStatusBadge = (status) => {
    const styles = {
      'Stokta': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      'Satışta': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
      'Tamirde': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
      'Rezerve': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
      'Satıldı': 'bg-slate-100 text-slate-650 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-800/40',
      'Hurda / Parçalandı': 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/30'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Stokta']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-150 print:border-0 print:shadow-none print:max-h-full print:bg-white print:text-black">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 no-print">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-white">
              Cihaz Detay Kartı
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={triggerPrintLabel}
              className="flex items-center gap-1.5 p-1.5 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800/30 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
              title="Barkod/QR Etiket Yazdır"
            >
              <QrCode size={16} />
              <span className="text-[10px] font-bold hidden sm:inline">QR Etiket</span>
            </button>
            <button 
              onClick={triggerPrintDetail}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-650 transition cursor-pointer"
              title="Yazdır / PDF Al"
            >
              <Printer size={16} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hidden QR Code for Printing */}
        <div className="hidden">
          <QRCodeSVG id="qr-code-svg" value={phone.id} size={100} level="H" />
        </div>

        {/* Modal Body (Scrollable content) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs print:overflow-visible print:p-0">
          
          {/* Printable Header */}
          <div className="hidden print:flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {localStorage.getItem('tys_settings') ? JSON.parse(localStorage.getItem('tys_settings')).businessName : 'Telefon Yönetim Sistemi'}
              </h2>
              <p className="text-[10px] text-slate-500">Cihaz Ekstre Belgesi</p>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              Tarih: {new Date().toLocaleDateString('tr-TR')}
            </div>
          </div>

          {/* Photos Gallery if exists */}
          {phone.photos && phone.photos.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 no-print">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Cihaz Görselleri</span>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                {phone.photos.map((pic, idx) => (
                  <div 
                    key={idx} 
                    className="relative w-36 h-28 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-shrink-0 group cursor-pointer" 
                    onClick={() => window.open(pic, '_blank')}
                    title="Büyütmek için tıklayın"
                  >
                    <img src={pic} className="w-full h-full object-cover hover:scale-105 transition duration-200" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-semibold">
                      🔍 Büyüt
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN GRID SUMMARY BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Phone Specifications Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3.5 print:bg-white print:border">
              <div className="flex justify-between items-start border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-white">
                    {phone.brand} {phone.model}
                  </h3>
                  <span className="text-[10px] text-slate-450 mt-0.5 block">
                    {phone.storage}
                    {phone.ram ? ` / ${phone.ram}` : ''}
                    {phone.color ? ` / ${phone.color}` : ''}
                  </span>
                </div>
                {getStatusBadge(phone.status)}
              </div>

              {/* Technical Specifications */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-slate-550 dark:text-slate-400">
                  <span>IMEI 1:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    <span>{phone.imei1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(phone.imei1);
                        window.open("https://www.turkiye.gov.tr/imei-sorgulama", "_blank");
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-[9px] text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold transition cursor-pointer"
                      title="IMEI Kopyala & BTK Sorgula"
                    >
                      BTK
                    </button>
                  </div>
                </div>
                {phone.imei2 && (
                  <div className="flex justify-between items-center text-slate-550 dark:text-slate-400">
                    <span>IMEI 2:</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                      <span>{phone.imei2}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(phone.imei2);
                          window.open("https://www.turkiye.gov.tr/imei-sorgulama", "_blank");
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-[9px] text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold transition cursor-pointer"
                        title="IMEI Kopyala & BTK Sorgula"
                      >
                        BTK
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Seri Numarası:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{phone.serialNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Pil Sağlığı:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">%{phone.batteryHealth}</span>
                </div>
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Kutusu / Kutu:</span>
                  <span className="font-semibold">{phone.hasBox ? '✅ Var' : '❌ Yok'}</span>
                </div>
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Faturası:</span>
                  <span className="font-semibold">{phone.hasInvoice ? '✅ Var' : '❌ Yok'}</span>
                </div>
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Garantisi:</span>
                  <span className="font-semibold">{phone.hasWarranty ? '✅ Var' : '❌ Yok'}</span>
                </div>
                <div className="flex justify-between text-slate-550 dark:text-slate-400">
                  <span>Sistem Donanım:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {phone.faceId && 'FaceID '}
                    {phone.touchId && 'TouchID '}
                    {phone.trueTone && 'TrueTone'}
                    {!phone.faceId && !phone.touchId && !phone.trueTone && '-'}
                  </span>
                </div>
              </div>

              {/* Changed Parts */}
              {phone.changedParts && phone.changedParts.length > 0 && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
                  <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wide">Değişen Parçalar</div>
                  <div className="flex flex-wrap gap-1">
                    {phone.changedParts.map((part, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:bg-amber-550/20 dark:text-amber-400 border border-amber-500/20 dark:border-amber-900/30">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {phone.description && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-500 italic">
                  <strong>Açıklama:</strong> {phone.description}
                </div>
              )}
            </div>

            {/* 2. Purchase Information Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3.5 print:bg-white print:border">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                <ShoppingBag size={14} className="text-indigo-500" />
                Alış Bilgileri
              </h4>

              <div className="space-y-2">
                <div>
                  <div className="text-slate-450">Kimden Alındı</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{phone.boughtFromName || 'Bilinmiyor'}</div>
                </div>
                {phone.purchaseContactPhone && (
                  <div>
                    <div className="text-slate-450">İletişim Telefon</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{phone.purchaseContactPhone}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-slate-450">Alış Tarihi</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{new Date(phone.purchaseDate).toLocaleDateString('tr-TR')}</div>
                  </div>
                  <div>
                    <div className="text-slate-450">Ödeme Türü</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{phone.purchasePaymentType}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                    <span>Alış Fiyatı:</span>
                    <span>{phone.purchasePrice.toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
                {phone.purchaseNote && (
                  <div className="text-[10px] text-slate-500 italic mt-1">
                    <strong>Not:</strong> {phone.purchaseNote}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Financial Cost / Profit Card */}
            <div className="bg-gradient-to-br from-indigo-500/5 to-teal-500/5 dark:from-indigo-950/15 dark:to-teal-950/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3.5 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1 border-b border-indigo-100/50 dark:border-indigo-900/30 pb-2">
                  <PiggyBank size={14} className="text-teal-500" />
                  Mali Analiz ve Satış
                </h4>

                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Ham Alış Fiyatı:</span>
                    <span className="font-semibold">{phone.purchasePrice.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Toplam Masraflar:</span>
                    <span className="font-semibold text-amber-500">{phone.totalExpenses.toLocaleString('tr-TR')} TL</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-850 dark:text-white pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span>Toplam Maliyet:</span>
                    <span>{phone.totalCost.toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              </div>

              {/* Sales Info Section */}
              <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 mt-4 space-y-3">
                {phone.status === 'Satıldı' ? (
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle size={12} /> Satış Tamamlandı
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        Müşteri: <strong>{phone.soldToName}</strong> ({phone.salesContactPhone || '-'})
                      </div>
                      <div className="text-[10px] text-slate-450">
                        Tarih: {new Date(phone.salesDate).toLocaleDateString('tr-TR')} | Tür: {phone.salesPaymentType}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-slate-800 dark:text-slate-250 font-semibold text-xs">
                      <span>Satış Fiyatı:</span>
                      <span>{phone.salesPrice.toLocaleString('tr-TR')} TL</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex justify-between items-center font-bold text-sm ${
                      phone.profit >= 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                        : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:text-red-450 dark:border-red-900/30'
                    }`}>
                      <span>Net Kar:</span>
                      <span>{phone.profit >= 0 ? '+' : ''}{phone.profit.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl">
                    Cihaz henüz satılmadı.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* EXPENSES MANAGEMENT COLUMN SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* A: EXPENSE LIST */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Receipt size={14} className="text-amber-500" />
                Telefona Yapılan Masraflar
              </h4>

              <div className="max-h-60 overflow-y-auto pr-1">
                {(!phone.expenses || phone.expenses.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 font-medium">
                    Bu cihaza henüz herhangi bir masraf kaydı eklenmedi.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 uppercase font-semibold">
                        <th className="pb-2">Masraf Adı</th>
                        <th className="pb-2">Tarih</th>
                        <th className="pb-2 text-right">Tutar</th>
                        <th className="pb-2 text-center no-print">Sil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {phone.expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/35">
                          <td className="py-2.5 font-medium text-slate-850 dark:text-slate-200">{exp.name}</td>
                          <td className="py-2.5 text-slate-500">{new Date(exp.date).toLocaleDateString('tr-TR')}</td>
                          <td className="py-2.5 text-right font-bold text-amber-600">{exp.amount.toLocaleString('tr-TR')} TL</td>
                          <td className="py-2.5 text-center no-print">
                            <button
                              disabled={phone.status === 'Satıldı'} // Block modifications if sold
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* B: ADD EXPENSE FORM */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 no-print">
              <h4 className="font-bold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Plus size={14} className="text-indigo-500" />
                Yeni Masraf Ekle
              </h4>

              {phone.status === 'Satıldı' ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Satılan cihazlara sonradan masraf eklenemez. Önce satışı iptal etmelisiniz.</span>
                </div>
              ) : (
                <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
                  {expenseError && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-650 text-[10px] flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>{expenseError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category Select */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">Masraf Kalemi</label>
                      <select
                        value={expenseForm.name}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                      >
                        <option value="Ekran">Ekran</option>
                        <option value="Batarya">Batarya</option>
                        <option value="Kargo">Kargo</option>
                        <option value="Komisyon">Komisyon</option>
                        <option value="Temizlik">Temizlik</option>
                        <option value="Yol">Yol</option>
                        <option value="Diğer">Diğer (Belirtin)</option>
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">Masraf Tutarı *</label>
                      <input
                        type="number"
                        placeholder="Örn: 1500"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Custom Name (if Other selected) */}
                  {expenseForm.name === 'Diğer' && (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">Açıklama / Masraf Adı *</label>
                      <input
                        type="text"
                        placeholder="Masraf sebebini yazın"
                        value={expenseForm.customName}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, customName: e.target.value }))}
                        className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                        required
                      />
                    </div>
                  )}

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Masraf Tarihi</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    <Plus size={14} />
                    Masrafı Kaydet
                  </button>

                </form>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
