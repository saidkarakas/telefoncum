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
  Layers,
  ArrowRightLeft,
  User,
  ShieldAlert,
  Printer,
  MessageCircle,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import { repairService } from '../db/services/repairService';
import { phoneService } from '../db/services/phoneService';
import { customerService } from '../db/services/customerService';

export default function RepairManager({ activePage, globalSearchQuery }) {
  const [repairs, setRepairs] = useState([]);
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(''); // All, Bekliyor, Tamirde, Hazır, Teslim Edildi

  // Quick Customer State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: '', phone: '' });

  // Form State
  const [formData, setFormData] = useState({
    phoneId: '', 
    phoneDescription: '', 
    defect: '', 
    actionTaken: '', 
    cost: '', // We'll keep this as a total computed cost if using parts, or manual if no parts
    status: 'Bekliyor',
    technician: '',
    customerId: '',
    devicePassword: '',
    warrantyMonths: '',
    spareParts: [], // { name, price }
    laborCost: ''
  });

  const [formError, setFormError] = useState('');

  const loadData = () => {
    setRepairs(repairService.getAll());
    setPhones(phoneService.getAll().filter(p => p.status !== 'Satıldı'));
    setCustomers(customerService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, [activePage]);

  // Filter List
  const getFilteredRepairs = () => {
    let list = repairs;

    // Quick search
    if (globalSearchQuery && globalSearchQuery.trim() !== '') {
      const q = globalSearchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.phoneDescription && r.phoneDescription.toLowerCase().includes(q)) ||
        (r.defect && r.defect.toLowerCase().includes(q)) ||
        (r.actionTaken && r.actionTaken.toLowerCase().includes(q))
      );
    }

    // Status filter
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
      cost: repair.cost || '',
      status: repair.status || 'Bekliyor',
      technician: repair.technician || '',
      customerId: repair.customerId || '',
      devicePassword: repair.devicePassword || '',
      warrantyMonths: repair.warrantyMonths || '',
      spareParts: repair.spareParts || [],
      laborCost: repair.laborCost || ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  // Save Form
  const handleSaveRepair = (e) => {
    e.preventDefault();
    setFormError('');

    // Verification
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
      let finalCustomerId = formData.customerId;

      // Handle new customer creation
      if (isNewCustomer && newCustomer.fullName.trim()) {
        const newCustObj = {
          fullName: newCustomer.fullName,
          phone: newCustomer.phone,
          type: 'Müşteri',
          balance: 0,
          transactions: []
        };
        const savedCustId = customerService.save(newCustObj); // save() returns true or id? wait, let's check customerService.save.
        // If it doesn't return ID, we have to find it, or we can just push it and get the new length or generate ID here.
        // I will generate the ID here just in case customerService.save doesn't return it:
        newCustObj.id = `cus-${Date.now()}`;
        customerService.save(newCustObj);
        finalCustomerId = newCustObj.id;
      }

      // Calculate total cost from parts + labor if they are used
      let computedCost = Number(formData.cost) || 0;
      if (formData.spareParts.length > 0 || formData.laborCost) {
        const partsTotal = formData.spareParts.reduce((acc, part) => acc + (Number(part.price) || 0), 0);
        const labor = Number(formData.laborCost) || 0;
        computedCost = partsTotal + labor;
      }
      
      const payload = { ...formData, cost: computedCost, customerId: finalCustomerId };

      repairService.save(editingRepair ? { ...editingRepair, ...payload } : payload);
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      setFormError('Servis kaydı kaydedilirken hata oluştu.');
    }
  };

  // Auto fill details if inventory phone selected
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
        phoneDescription: `${phone.brand} ${phone.model} (${phone.storage} - S/N: ${phone.serialNumber || 'Yok'})`
      }));
    }
  };

  // Quick update Status
  const handleQuickStatusChange = (repair, newStatus) => {
    repairService.save({ ...repair, status: newStatus });
    loadData();
  };

  // WhatsApp Integration
  const handleWhatsAppClick = (repair) => {
    if (!repair.customerId) {
      alert("Bu tamir kaydı herhangi bir müşteriye bağlanmamış. Önce düzenleyerek müşteri seçiniz.");
      return;
    }
    const customer = customers.find(c => c.id === repair.customerId);
    if (!customer || !customer.phone) {
      alert("Müşterinin kayıtlı bir telefon numarası bulunmuyor.");
      return;
    }

    let phoneStr = customer.phone.replace(/\D/g, '');
    if (phoneStr.startsWith('0')) {
      phoneStr = '9' + phoneStr;
    } else if (!phoneStr.startsWith('90') && phoneStr.length === 10) {
      phoneStr = '90' + phoneStr;
    }

    const text = `Sayın ${customer.fullName}, ${repair.phoneDescription} cihazınızın servis işlemi ${repair.status === 'Hazır' ? 'tamamlanmıştır. Cihazınızı teslim alabilirsiniz.' : 'devam etmektedir.'} ${repair.cost > 0 ? `Toplam Tutar: ${repair.cost} TL` : ''}`;

    window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Print Service Receipt
  const handlePrintReceipt = (repair) => {
    const customer = repair.customerId ? customers.find(c => c.id === repair.customerId) : null;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert("Popup engelleyiciyi kapatın.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Servis Kabul Formu</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            .box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .val { font-size: 16px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .sign-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">TEKNİK SERVİS FORMU</h1>
            <div>Kayıt No: ${repair.id.replace('rep-', '')}</div>
          </div>
          <div class="meta">
            <div><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
            <div><strong>Teknisyen:</strong> ${repair.technician || 'Belirtilmedi'}</div>
          </div>
          
          <div class="box">
            <div class="label">Müşteri Bilgileri</div>
            <div class="val">${customer ? (customer.fullName + ' - ' + customer.phone) : 'Kayıtsız Müşteri'}</div>
            
            <div class="label">Cihaz Tanımı</div>
            <div class="val">${repair.phoneDescription}</div>
            
            <div class="label">Arıza / Şikayet</div>
            <div class="val">${repair.defect}</div>

            <div class="label">Cihaz Şifresi / Deseni</div>
            <div class="val">${repair.devicePassword || 'Yok / Belirtilmedi'}</div>
          </div>

          <div class="box">
            <div class="label">Uygulanan İşlemler ve Notlar</div>
            <div class="val">${repair.actionTaken || '-'}</div>
            ${repair.spareParts && repair.spareParts.length > 0 ? `
              <div class="label" style="margin-top:20px;">Kullanılan Parçalar</div>
              <table>
                <tr><th>Parça Adı</th><th style="text-align:right">Fiyat</th></tr>
                ${repair.spareParts.map(p => `<tr><td>${p.name}</td><td style="text-align:right">${p.price} TL</td></tr>`).join('')}
              </table>
            ` : ''}
            <div style="margin-top:20px; text-align:right; font-size:18px;">
              <strong>Toplam Tutar:</strong> ${repair.cost} TL
            </div>
          </div>

          <div style="font-size: 11px; color: #666; margin-top: 30px; text-align: justify;">
            <strong>ŞARTLAR:</strong> Teslim edilen cihazların 30 gün içinde alınması gerekmektedir. Teslim alınmayan cihazlardan firmamız sorumlu değildir. Veri kaybından firmamız sorumlu tutulamaz, lütfen verilerinizi yedekleyiniz. Garanti süresi: ${repair.warrantyMonths || 0} ay.
          </div>

          <div class="signatures">
            <div class="sign-box">Müşteri İmzası</div>
            <div class="sign-box">Teslim Alan / Teknisyen</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Delete Action
  const handleDeleteRepair = (id) => {
    if (confirm('Bu teknik servis kaydını silmek istediğinize emin misiniz?')) {
      repairService.delete(id);
      loadData();
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

  return (
    <div className="space-y-4">
      
      {/* FILTER BUTTONS & ADD BUTTON ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        
        {/* Status Quick Filter Badges */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === ''
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setStatusFilter('Bekliyor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Bekliyor'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setStatusFilter('Tamirde')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Tamirde'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750'
            }`}
          >
            Tamirdekiler
          </button>
          <button
            onClick={() => setStatusFilter('Hazır')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Hazır'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750'
            }`}
          >
            Hazır / Tamamlanan
          </button>
          <button
            onClick={() => setStatusFilter('Teslim Edildi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Teslim Edildi'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-750'
            }`}
          >
            Teslim Edilenler
          </button>
        </div>

        {/* Add Button */}
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
                <th className="p-4 py-3.5">Yapılan İşlem / Durum Notu</th>
                <th className="p-4 py-3.5 text-right">Servis Masrafı</th>
                <th className="p-4 py-3.5 text-center">Durum</th>
                <th className="p-4 py-3.5 text-center no-print">Hızlı Aşama</th>
                <th className="p-4 py-3.5 text-center no-print">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                    Serviste işlem bekleyen veya tamamlanmış cihaz bulunmamaktadır.
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                    
                    {/* Device Description */}
                    <td className="p-4">
                      <div className="font-bold text-slate-850 dark:text-white">{rep.phoneDescription}</div>
                      {rep.phoneId ? (
                        <span className="inline-flex items-center text-[10px] text-indigo-500 font-semibold bg-indigo-50 dark:bg-indigo-950/20 px-1 rounded mt-1">
                          Envanter Cihazı
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800 px-1 rounded mt-1">
                          Müşteri Cihazı
                        </span>
                      )}
                    </td>

                    {/* Defect */}
                    <td className="p-4 text-slate-700 dark:text-slate-350 max-w-[180px] truncate" title={rep.defect}>
                      {rep.defect}
                    </td>

                    {/* Action Taken */}
                    <td className="p-4 text-slate-600 dark:text-slate-400 italic max-w-[200px] truncate" title={rep.actionTaken}>
                      {rep.actionTaken || <span className="text-slate-300">- İşlem Yok -</span>}
                    </td>

                    {/* Cost */}
                    <td className="p-4 text-right font-bold text-slate-850 dark:text-white">
                      {rep.cost > 0 ? `${rep.cost.toLocaleString('tr-TR')} TL` : 'Ücretsiz / Tespitsiz'}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      {getStatusBadge(rep.status)}
                    </td>

                    {/* Quick status cycle button */}
                    <td className="p-4 text-center no-print">
                      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
                        <button
                          onClick={() => handleQuickStatusChange(rep, 'Tamirde')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                            rep.status === 'Tamirde' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
                          }`}
                          title="Tamire Al"
                        >
                          Tamirde
                        </button>
                        <button
                          onClick={() => handleQuickStatusChange(rep, 'Hazır')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                            rep.status === 'Hazır' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-500'
                          }`}
                          title="Hazır Yap"
                        >
                          Hazır
                        </button>
                        <button
                          onClick={() => handleQuickStatusChange(rep, 'Teslim Edildi')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                            rep.status === 'Teslim Edildi' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500'
                          }`}
                          title="Teslim Et"
                        >
                          Teslim
                        </button>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-center space-x-1 whitespace-nowrap no-print">
                      <button
                        onClick={() => handleWhatsAppClick(rep)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/20 text-slate-500 hover:text-green-600 cursor-pointer"
                        title="Müşteriye WhatsApp'tan Yaz"
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(rep)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-slate-500 hover:text-blue-600 cursor-pointer"
                        title="Servis Formu Yazdır"
                      >
                        <Printer size={13} />
                      </button>
                      <button
                        onClick={() => handleEditClick(rep)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-500 hover:text-amber-650 cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteRepair(rep.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-650 cursor-pointer"
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

      {/* ADD / EDIT REPAIR MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-100 text-xs">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold uppercase tracking-wider text-slate-850 dark:text-white">
                {editingRepair ? 'Servis Kaydını Düzenle' : 'Yeni Servis Kaydı Aç'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRepair} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-1">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Link to Inventory Phone */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Envanterdeki Telefona Bağla</label>
                  <select
                    value={formData.phoneId}
                    onChange={(e) => handlePhoneSelect(e.target.value)}
                    disabled={editingRepair}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  >
                    <option value="">Envanter Dışı</option>
                    {phones.map(p => (
                      <option key={p.id} value={p.id}>{p.brand} {p.model} ({p.storage})</option>
                    ))}
                  </select>
                </div>

                {/* Link to Customer */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Müşteri Seçimi (Opsiyonel)</label>
                    <button 
                      type="button" 
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-[10px] font-bold"
                    >
                      {isNewCustomer ? "Listeden Seç" : "+ Yeni Müşteri Ekle"}
                    </button>
                  </div>
                  
                  {isNewCustomer ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ad Soyad" 
                        value={newCustomer.fullName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-1/2 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                        required
                      />
                      <input 
                        type="tel" 
                        placeholder="Telefon" 
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-1/2 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                      />
                    </div>
                  ) : (
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                    >
                      <option value="">Müşteri Seçilmedi</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Device Text Description (Required if manual) */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Cihaz Açıklaması *</label>
                  <input
                    type="text"
                    value={formData.phoneDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneDescription: e.target.value }))}
                    disabled={!!formData.phoneId}
                    placeholder="Örn: iPhone Xs Max Beyaz"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-950"
                    required={!formData.phoneId}
                  />
                </div>

                {/* Device Password */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><ShieldAlert size={14}/> Cihaz Şifresi/Deseni</label>
                  <input
                    type="text"
                    value={formData.devicePassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, devicePassword: e.target.value }))}
                    placeholder="Ekran şifresi"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  />
                </div>
              </div>

              {/* Defect Details */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Arıza Şikayeti / Detayı *</label>
                <textarea
                  value={formData.defect}
                  onChange={(e) => setFormData(prev => ({ ...prev, defect: e.target.value }))}
                  placeholder="Ekranda sararma var, şarj olmuyor vb..."
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Technician */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1"><User size={14}/> Sorumlu Teknisyen</label>
                  <input
                    type="text"
                    value={formData.technician}
                    onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
                    placeholder="Teknisyen Adı"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  />
                </div>

                {/* Warranty */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Garanti Süresi (Ay)</label>
                  <input
                    type="number"
                    value={formData.warrantyMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyMonths: e.target.value }))}
                    placeholder="Örn: 6"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  />
                </div>
              </div>

              {/* Action Taken */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Yapılan İşlem / Süreç Notu</label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData(prev => ({ ...prev, actionTaken: e.target.value }))}
                  placeholder="Entegre tamiri denendi, parça bekliyor..."
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                />
              </div>

              {/* Spare Parts & Cost Section */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-850/30 space-y-3">
                <div className="font-bold text-xs text-slate-700 dark:text-slate-300 flex justify-between items-center">
                  <span>YEDEK PARÇA VE İŞÇİLİK</span>
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, spareParts: [...prev.spareParts, { name: '', price: '' }] }))}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <PlusCircle size={12}/> Parça Ekle
                  </button>
                </div>
                
                {formData.spareParts.map((part, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Parça Adı (Örn: Orijinal Ekran)" 
                      value={part.name}
                      onChange={(e) => {
                        const newParts = [...formData.spareParts];
                        newParts[index].name = e.target.value;
                        setFormData(prev => ({ ...prev, spareParts: newParts }));
                      }}
                      className="flex-1 p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                    />
                    <input 
                      type="number" 
                      placeholder="Fiyat" 
                      value={part.price}
                      onChange={(e) => {
                        const newParts = [...formData.spareParts];
                        newParts[index].price = e.target.value;
                        setFormData(prev => ({ ...prev, spareParts: newParts }));
                      }}
                      className="w-24 p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const newParts = [...formData.spareParts];
                        newParts.splice(index, 1);
                        setFormData(prev => ({ ...prev, spareParts: newParts }));
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <MinusCircle size={14}/>
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">İşçilik Ücreti</label>
                    <input
                      type="number"
                      value={formData.laborCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, laborCost: e.target.value }))}
                      placeholder="TL"
                      className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Ara Toplam Masraf</label>
                    <div className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-100 dark:bg-slate-950 font-bold text-slate-800 dark:text-white">
                      {(formData.spareParts.reduce((a,b) => a + (Number(b.price)||0), 0) + (Number(formData.laborCost)||0)) > 0 
                        ? (formData.spareParts.reduce((a,b) => a + (Number(b.price)||0), 0) + (Number(formData.laborCost)||0)).toLocaleString('tr-TR') + ' TL'
                        : <span className="text-slate-400 font-normal">veya Manuel Tutar</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Genel Servis Masrafı (Manuel Girmek İçin)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="Parça/İşçilik girilmezse burası baz alınır"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Servis Durumu</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                >
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="Tamirde">Tamirde</option>
                  <option value="Hazır">Hazır</option>
                  <option value="Teslim Edildi">Teslim Edildi</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
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
