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
  ArrowRightLeft
} from 'lucide-react';
import { repairService, phoneService } from '../db/storage';

export default function RepairManager({ activePage, globalSearchQuery }) {
  const [repairs, setRepairs] = useState([]);
  const [phones, setPhones] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(''); // All, Bekliyor, Tamirde, Hazır, Teslim Edildi

  // Form State
  const [formData, setFormData] = useState({
    phoneId: '', phoneDescription: '', defect: '', actionTaken: '', cost: '', status: 'Bekliyor'
  });

  const [formError, setFormError] = useState('');

  const loadData = () => {
    setRepairs(repairService.getAll());
    // Only fetch phones not sold, or phone in repair to link
    setPhones(phoneService.getAll().filter(p => p.status !== 'Satıldı'));
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
    setFormData({
      phoneId: '', phoneDescription: '', defect: '', actionTaken: '', cost: '', status: 'Bekliyor'
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleEditClick = (repair) => {
    setEditingRepair(repair);
    setFormData({
      phoneId: repair.phoneId || '',
      phoneDescription: repair.phoneDescription || '',
      defect: repair.defect || '',
      actionTaken: repair.actionTaken || '',
      cost: repair.cost || '',
      status: repair.status || 'Bekliyor'
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
      repairService.save(editingRepair ? { ...editingRepair, ...formData } : formData);
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

            <form onSubmit={handleSaveRepair} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-1">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Link to Inventory Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Envanterdeki Telefona Bağla (İsteğe Bağlı)</label>
                <select
                  value={formData.phoneId}
                  onChange={(e) => handlePhoneSelect(e.target.value)}
                  disabled={editingRepair} // Disable edit link changes to avoid database sync mess
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                >
                  <option value="">Envanter Dışı (Müşteri Getirdi)</option>
                  {phones.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} ({p.storage} - Alış: {p.purchasePrice} TL)</option>
                  ))}
                </select>
              </div>

              {/* Device Text Description (Required if manual) */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Cihaz Açıklaması *</label>
                <input
                  type="text"
                  value={formData.phoneDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneDescription: e.target.value }))}
                  disabled={!!formData.phoneId} // Readonly if linked to inventory
                  placeholder="Örn: iPhone Xs Max (Can Yıldız)"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-950"
                  required={!formData.phoneId}
                />
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

              <div className="grid grid-cols-2 gap-3">
                {/* Cost */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Servis Masrafı / Maliyeti</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="Masraf tutarı TL"
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  />
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
