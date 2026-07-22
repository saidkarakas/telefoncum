import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  Smartphone,
  User,
  ShieldAlert,
  Printer,
  PlusCircle,
  MinusCircle,
  PackageCheck
} from 'lucide-react';
import { repairService } from '../db/services/repairService';
import { phoneService } from '../db/services/phoneService';
import { customerService } from '../db/services/customerService';
import { partService } from '../db/services/partService';
import { escapeHtml } from '../utils/security';

export default function RepairManager({ activePage, globalSearchQuery }) {
  const [repairs, setRepairs] = useState([]);
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockParts, setStockParts] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Quick Customer State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: '', phone: '' });

  // Form State
  const [formData, setFormData] = useState({
    phoneId: '', 
    phoneDescription: '', 
    defect: '', 
    actionTaken: '', 
    cost: '', 
    status: 'Bekliyor',
    technician: '',
    customerId: '',
    devicePassword: '',
    warrantyMonths: '',
    spareParts: [],
    usedParts: [],
    laborCost: ''
  });

  const [formError, setFormError] = useState('');

  const loadData = () => {
    setRepairs(repairService.getAll());
    setPhones(phoneService.getAll().filter(p => p.status !== 'Satıldı'));
    setCustomers(customerService.getAll());
    setStockParts(partService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, [activePage]);

  // Filter List
  const getFilteredRepairs = () => {
    let list = repairs;

    if (globalSearchQuery && globalSearchQuery.trim() !== '') {
      const q = globalSearchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.phoneDescription && r.phoneDescription.toLowerCase().includes(q)) ||
        (r.defect && r.defect.toLowerCase().includes(q)) ||
        (r.actionTaken && r.actionTaken.toLowerCase().includes(q))
      );
    }

    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }

    return list;
  };

  const filteredRepairs = getFilteredRepairs();

  // Add / Edit Trigger
  const handleAddClick = () => {
    setEditingRepair(null);
    setIsNewCustomer(false);
    setNewCustomer({ fullName: '', phone: '' });
    setFormData({
      phoneId: '', 
      phoneDescription: '', 
      defect: '', 
      actionTaken: '', 
      cost: '', 
      status: 'Bekliyor',
      technician: '',
      customerId: '',
      devicePassword: '',
      warrantyMonths: '',
      spareParts: [],
      usedParts: [],
      laborCost: ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleEditClick = (repair) => {
    setEditingRepair(repair);
    setIsNewCustomer(false);
    setNewCustomer({ fullName: '', phone: '' });
    setFormData({
      phoneId: repair.phoneId || '',
      phoneDescription: repair.phoneDescription || '',
      defect: repair.defect || '',
      actionTaken: repair.actionTaken || '',
      cost: repair.cost !== undefined ? repair.cost : '',
      status: repair.status || 'Bekliyor',
      technician: repair.technician || '',
      customerId: repair.customerId || '',
      devicePassword: repair.devicePassword || '',
      warrantyMonths: repair.warrantyMonths || '',
      spareParts: repair.spareParts || [],
      usedParts: repair.usedParts || [],
      laborCost: repair.laborCost || repair.laborFee || ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  // Requirement 3: Add stock part to usedParts array
  const handleAddStockPart = (partId) => {
    if (!partId) return;
    const part = stockParts.find(p => p.id === partId);
    if (!part) return;

    setFormData(prev => {
      const existing = (prev.usedParts || []).find(p => p.partId === partId);
      let updated;
      if (existing) {
        updated = prev.usedParts.map(p => p.partId === partId ? {
          ...p,
          quantity: p.quantity + 1,
          lineTotal: (p.quantity + 1) * p.unitSalePrice
        } : p);
      } else {
        const item = {
          partId: part.id,
          nameSnapshot: part.name,
          quantity: 1,
          unitCostSnapshot: part.purchasePrice || 0,
          unitSalePrice: part.salePrice || 0,
          lineTotal: part.salePrice || 0
        };
        updated = [...(prev.usedParts || []), item];
      }
      return { ...prev, usedParts: updated };
    });
  };

  // Save Form (Requirement 7: await repairService.save)
  const handleSaveRepair = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const isManualInput = !formData.phoneId;
    if (isManualInput && !formData.phoneDescription.trim()) {
      setFormError('Lütfen cihaz açıklamasını girin.');
      return;
    }
    if (!formData.defect.trim()) {
      setFormError('Arıza detayı boş bırakılamaz.');
      return;
    }

    try {
      setIsSubmitting(true);
      let finalCustomerId = formData.customerId;

      if (isNewCustomer && newCustomer.fullName.trim()) {
        const custObj = await customerService.findOrCreate({
          name: newCustomer.fullName,
          fullName: newCustomer.fullName,
          phone: newCustomer.phone
        });
        if (custObj) {
          finalCustomerId = custObj.id;
        }
      }

      const payload = { ...formData, customerId: finalCustomerId };
      delete payload.devicePassword;

      await repairService.save(editingRepair ? { ...editingRepair, ...payload } : payload);
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Servis kaydı kaydedilirken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSelect = (pId) => {
    if (!pId) {
      setFormData(prev => ({ ...prev, phoneId: '', phoneDescription: '' }));
      return;
    }
    const phone = phones.find(p => p.id === pId);
    if (phone) {
      setFormData(prev => ({
        ...prev,
        phoneId: phone.id,
        phoneDescription: `${phone.brand} ${phone.model} (${phone.storage} - S/N: ${phone.serialNumber || 'Yok'})`,
        customerId: phone.boughtFromType === 'customer' ? phone.boughtFromId : prev.customerId
      }));
    }
  };

  const handlePrintReceipt = (repairData, isFormPasswordAllowed = false) => {
    const cust = customers.find(c => c.id === repairData.customerId) || {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const doc = printWindow.document;
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teknik Servis Fişi - ${escapeHtml(repairData.phoneDescription || 'Cihaz')}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .box { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
          .label { font-weight: bold; color: #666; font-size: 12px; }
          .val { font-size: 14px; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
          .sign-box { border-top: 1px solid #aaa; width: 40%; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>TEKNİK SERVİS TESLİM FİŞİ</h2>
          <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        <div id="content"></div>
      </body>
      </html>
    `);

    const container = doc.getElementById('content');

    const box1 = doc.createElement('div');
    box1.className = 'box';
    box1.innerHTML = `
      <div class="label">Müşteri Bilgileri</div>
      <div class="val" id="p-cust"></div>
      <div class="label">Cihaz Bilgisi</div>
      <div class="val" id="p-phone"></div>
      <div class="label">Arıza Şikayeti</div>
      <div class="val" id="p-defect"></div>
      <div class="label">Cihaz Ekran Şifresi</div>
      <div class="val" id="p-pass"></div>
    `;

    box1.querySelector('#p-cust').textContent = (cust.fullName || cust.name || 'Bilinmiyor') + (cust.phone ? ` (${cust.phone})` : '');
    box1.querySelector('#p-phone').textContent = repairData.phoneDescription || '-';
    box1.querySelector('#p-defect').textContent = repairData.defect || '-';
    
    let passVal = repairData.devicePassword || 'Yok / Belirtilmedi';
    if (!isFormPasswordAllowed && passVal !== 'Yok / Belirtilmedi') {
      passVal = '[GİZLENDİ]';
    }
    box1.querySelector('#p-pass').textContent = passVal;
    container.appendChild(box1);

    const box2 = doc.createElement('div');
    box2.className = 'box';
    box2.innerHTML = '<div class="label">Uygulanan İşlemler ve Notlar</div><div class="val" id="p-act"></div><div id="p-parts"></div><div style="margin-top:20px; text-align:right; font-size:18px;"><strong>Toplam Tutar:</strong> <span id="p-cost"></span> TL</div>';
    box2.querySelector('#p-act').textContent = repairData.actionTaken || '-';
    box2.querySelector('#p-cost').textContent = repairData.cost || 0;
    
    if (repairData.usedParts && repairData.usedParts.length > 0) {
      const partsDiv = doc.createElement('div');
      partsDiv.innerHTML = '<div class="label" style="margin-top:20px;">Kullanılan Parçalar</div><table><tr><th>Parça Adı</th><th>Miktar</th><th style="text-align:right">Satır Toplamı</th></tr><tbody id="p-parts-body"></tbody></table>';
      const tbody = partsDiv.querySelector('#p-parts-body');
      repairData.usedParts.forEach(p => {
        const tr = doc.createElement('tr');
        const tdName = doc.createElement('td');
        tdName.textContent = p.nameSnapshot || p.name;
        const tdQty = doc.createElement('td');
        tdQty.textContent = p.quantity || 1;
        const tdPrice = doc.createElement('td');
        tdPrice.style.textAlign = 'right';
        tdPrice.textContent = (p.lineTotal || (p.quantity * p.unitSalePrice)) + ' TL';
        tr.appendChild(tdName);
        tr.appendChild(tdQty);
        tr.appendChild(tdPrice);
        tbody.appendChild(tr);
      });
      box2.querySelector('#p-parts').appendChild(partsDiv);
    }
    container.appendChild(box2);

    const terms = doc.createElement('div');
    terms.style.cssText = 'font-size: 11px; color: #666; margin-top: 30px; text-align: justify;';
    terms.textContent = `ŞARTLAR: Teslim edilen cihazların 30 gün içinde alınması gerekmektedir. Teslim alınmayan cihazlardan firmamız sorumlu değildir. Veri kaybından firmamız sorumlu tutulamaz, lütfen verilerinizi yedekleyiniz. Garanti süresi: ${repairData.warrantyMonths || 0} ay.`;
    container.appendChild(terms);

    const signatures = doc.createElement('div');
    signatures.className = 'signatures';
    signatures.innerHTML = '<div class="sign-box">Müşteri İmzası</div><div class="sign-box">Teslim Alan / Teknisyen</div>';
    container.appendChild(signatures);

    doc.body.appendChild(container);
    
    printWindow.onload = function() {
      printWindow.print();
      setTimeout(function() { printWindow.close(); }, 500);
    };
  };

  const handleDeleteRepair = async (id) => {
    if (confirm('Bu teknik servis kaydını silmek istediğinize emin misiniz?')) {
      try {
        await repairService.delete(id);
        loadData();
      } catch (err) {
        alert(err.message || "Servis kaydı silinemedi.");
      }
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Bekliyor': 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30',
      'Tamirde': 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
      'Hazır': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30',
      'Teslim Edildi': 'bg-slate-100 text-slate-650 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-800/40'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Bekliyor']}`}>
        {status}
      </span>
    );
  };

  const calculatedPartsSaleTotal = (formData.usedParts || []).reduce((s, p) => s + Number(p.lineTotal || (p.quantity * p.unitSalePrice) || 0), 0) +
    (formData.spareParts || []).reduce((s, p) => s + Number(p.price || 0), 0);
  const calculatedGrandTotal = calculatedPartsSaleTotal + Number(formData.laborCost || 0);

  return (
    <div className="space-y-4 text-xs">
      
      {/* FILTER BUTTONS & ADD BUTTON ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === '' ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tümü</button>
          <button onClick={() => setStatusFilter('Bekliyor')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Bekliyor' ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}>Bekleyenler</button>
          <button onClick={() => setStatusFilter('Tamirde')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Tamirde' ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}>Tamirdekiler</button>
          <button onClick={() => setStatusFilter('Hazır')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Hazır' ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}>Hazır / Tamamlanan</button>
          <button onClick={() => setStatusFilter('Teslim Edildi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'Teslim Edildi' ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-750'}`}>Teslim Edilenler</button>
        </div>

        <button
          onClick={handleAddClick}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 active:scale-[0.98] transition text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus size={16} />
          Servis Kaydı Aç
        </button>
      </div>

      {/* REPAIRS TABLE LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                <th className="p-4 py-3.5">Cihaz Tanımı</th>
                <th className="p-4 py-3.5">Arıza / Şikayet</th>
                <th className="p-4 py-3.5">Müşteri</th>
                <th className="p-4 py-3.5">Teknisyen</th>
                <th className="p-4 py-3.5">Tutar</th>
                <th className="p-4 py-3.5">Durum</th>
                <th className="p-4 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Kayıtlı teknik servis kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((repair) => {
                  const cust = customers.find(c => c.id === repair.customerId);
                  return (
                    <tr key={repair.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition">
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                        {repair.phoneDescription || 'Cihaz'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{repair.defect}</td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {cust ? (cust.fullName || cust.name) : 'Bilinmeyen'}
                      </td>
                      <td className="p-4 text-slate-500">{repair.technician || '-'}</td>
                      <td className="p-4 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {repair.cost !== undefined && repair.cost !== '' ? Number(repair.cost).toLocaleString('tr-TR') + ' TL' : (repair.totalPrice ? Number(repair.totalPrice).toLocaleString('tr-TR') + ' TL' : '0 TL')}
                      </td>
                      <td className="p-4">{getStatusBadge(repair.status)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handlePrintReceipt(repair)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer" title="Fiş Yazdır"><Printer size={15} /></button>
                        <button onClick={() => handleEditClick(repair)} className="p-1.5 text-indigo-600 hover:text-indigo-800 cursor-pointer" title="Düzenle"><Edit3 size={15} /></button>
                        <button onClick={() => handleDeleteRepair(repair.id)} className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer" title="Sil"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5">
                <Wrench className="text-indigo-650" size={16} />
                {editingRepair ? 'Servis Kaydını Düzenle' : 'Yeni Servis Kaydı Aç'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRepair} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Select / Create */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Müşteri *</label>
                  <label className="flex items-center gap-1 text-[11px] text-indigo-600 cursor-pointer">
                    <input type="checkbox" checked={isNewCustomer} onChange={(e) => setIsNewCustomer(e.target.checked)} className="rounded" />
                    Yeni Müşteri Oluştur
                  </label>
                </div>
                {!isNewCustomer ? (
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent font-bold"
                  >
                    <option value="">Müşteri Seçin</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.fullName || c.name} ({c.phone || 'Tel Yok'})</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Ad Soyad *" value={newCustomer.fullName} onChange={(e) => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))} className="p-2 border rounded-xl bg-transparent font-bold" />
                    <input type="text" placeholder="Telefon *" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} className="p-2 border rounded-xl bg-transparent font-bold" />
                  </div>
                )}
              </div>

              {/* Device & Defect */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 uppercase">Cihaz Açıklaması *</label>
                  <input type="text" value={formData.phoneDescription} onChange={(e) => setFormData(prev => ({ ...prev, phoneDescription: e.target.value }))} placeholder="iPhone 11 Siyah" className="w-full p-2.5 border rounded-xl bg-transparent font-bold" required />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 uppercase">Cihaz Ekran Şifresi</label>
                  <input type="text" value={formData.devicePassword} onChange={(e) => setFormData(prev => ({ ...prev, devicePassword: e.target.value }))} placeholder="123456 (Sadece yazdırılır)" className="w-full p-2.5 border rounded-xl bg-transparent font-bold" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-500 uppercase">Arıza Şikayeti *</label>
                <textarea value={formData.defect} onChange={(e) => setFormData(prev => ({ ...prev, defect: e.target.value }))} placeholder="Ekran kırık, dokunmatik basmıyor..." rows="2" className="w-full p-2.5 border rounded-xl bg-transparent" required />
              </div>

              {/* Requirement 3: Central Stock Parts Selection UI */}
              <div className="p-3 border border-indigo-500/30 rounded-xl bg-indigo-500/5 space-y-3">
                <div className="flex justify-between items-center font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="flex items-center gap-1.5"><PackageCheck size={16} /> MERKEZİ STOKTAN PARÇA KULLANIMI</span>
                  <select
                    onChange={(e) => {
                      handleAddStockPart(e.target.value);
                      e.target.value = '';
                    }}
                    className="p-1.5 border border-indigo-500/30 rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="">+ Stoktan Parça Ekle</option>
                    {stockParts.map(sp => (
                      <option key={sp.id} value={sp.id} disabled={sp.quantity <= 0}>
                        {sp.name} (Stok: {sp.quantity} | {sp.salePrice} TL)
                      </option>
                    ))}
                  </select>
                </div>

                {(formData.usedParts || []).length > 0 && (
                  <div className="space-y-2">
                    {formData.usedParts.map((partItem, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="col-span-4 font-bold text-slate-800 dark:text-white truncate">
                          {partItem.nameSnapshot}
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] text-slate-400 block">Adet</label>
                          <input
                            type="number"
                            min="1"
                            value={partItem.quantity}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value || 1, 10));
                              const updated = [...formData.usedParts];
                              updated[idx] = {
                                ...updated[idx],
                                quantity: qty,
                                lineTotal: qty * updated[idx].unitSalePrice
                              };
                              setFormData(prev => ({ ...prev, usedParts: updated }));
                            }}
                            className="w-full p-1 border rounded bg-transparent font-bold text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] text-slate-400 block">Birim Fiyat</label>
                          <input
                            type="number"
                            min="0"
                            value={partItem.unitSalePrice}
                            onChange={(e) => {
                              const price = Number(e.target.value || 0);
                              const updated = [...formData.usedParts];
                              updated[idx] = {
                                ...updated[idx],
                                unitSalePrice: price,
                                lineTotal: updated[idx].quantity * price
                              };
                              setFormData(prev => ({ ...prev, usedParts: updated }));
                            }}
                            className="w-full p-1 border rounded bg-transparent font-bold"
                          />
                        </div>
                        <div className="col-span-3 text-right font-bold text-teal-600">
                          {((partItem.quantity || 1) * (partItem.unitSalePrice || 0)).toLocaleString('tr-TR')} TL
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.usedParts];
                              updated.splice(idx, 1);
                              setFormData(prev => ({ ...prev, usedParts: updated }));
                            }}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <MinusCircle size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legacy Free-Text Parts & Labor */}
              <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300">
                  <span>SERBEST MANUEL PARÇALAR & İŞÇİLİK</span>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, spareParts: [...prev.spareParts, { name: '', price: '' }] }))} className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer">
                    <PlusCircle size={13} /> Manuel Parça Ekle
                  </button>
                </div>

                {formData.spareParts.map((sp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" placeholder="Parça Adı" value={sp.name} onChange={(e) => { const n = [...formData.spareParts]; n[idx].name = e.target.value; setFormData(prev => ({ ...prev, spareParts: n })); }} className="flex-1 p-2 border rounded bg-white dark:bg-slate-900" />
                    <input type="number" placeholder="Fiyat" value={sp.price} onChange={(e) => { const n = [...formData.spareParts]; n[idx].price = e.target.value; setFormData(prev => ({ ...prev, spareParts: n })); }} className="w-24 p-2 border rounded bg-white dark:bg-slate-900" />
                    <button type="button" onClick={() => { const n = [...formData.spareParts]; n.splice(idx, 1); setFormData(prev => ({ ...prev, spareParts: n })); }} className="text-rose-500 p-1 cursor-pointer"><MinusCircle size={15}/></button>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-semibold text-slate-500 uppercase text-[10px]">İşçilik Ücreti (TL)</label>
                    <input type="number" min="0" value={formData.laborCost} onChange={(e) => setFormData(prev => ({ ...prev, laborCost: e.target.value }))} placeholder="0" className="w-full p-2 border rounded bg-white dark:bg-slate-900 font-bold" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-500 uppercase text-[10px]">Hesaplanan Toplam Tutarı</label>
                    <div className="p-2 border rounded bg-slate-100 dark:bg-slate-900 font-bold text-teal-600">{calculatedGrandTotal.toLocaleString('tr-TR')} TL</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="font-semibold text-slate-500 uppercase text-[10px]">Özel Servis Tutarı (Boş Bırakılırsa Hesaplanan Alınır)</label>
                  <input type="number" min="0" value={formData.cost} onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))} placeholder="Boş bırakılırsa hesaplanan toplam alınır" className="w-full p-2 border rounded bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-semibold text-slate-500 uppercase">Servis Durumu</label>
                <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} className="w-full p-2.5 border rounded-xl bg-transparent font-bold">
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="Tamirde">Tamirde</option>
                  <option value="Hazır">Hazır</option>
                  <option value="Teslim Edildi">Teslim Edildi</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddEditModal(false)} className="px-4 py-2 border rounded-xl font-semibold cursor-pointer">Vazgeç</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50">
                  {isSubmitting ? 'Kaydediliyor...' : 'Servis Kaydını Kaydet'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
