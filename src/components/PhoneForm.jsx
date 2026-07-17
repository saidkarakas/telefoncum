import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { usePhone, BRAND_MODELS } from '../context/PhoneContext';
import BarcodeScanner from './BarcodeScanner';
import { ScanLine } from 'lucide-react';

export default function PhoneForm() {
  const [scannerField, setScannerField] = useState(null);
  const {
    showAddEditModal,
    setShowAddEditModal,
    showSellModal,
    setShowSellModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingPhone,
    sellingPhone,
    formData,
    setFormData,
    sellData,
    setSellData,
    formError,
    setFormError,
    handleSavePhone,
    handlePhotoUpload,
    handleBoughtContactSelect,
    handleSaveSale,
    handleSellContactSelect,
    handleConfirmDelete,
    customers,
    suppliers
  } = usePhone();

  return (
    <>
      {/* 1. ADD / EDIT PHONE MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-850 dark:text-white uppercase tracking-wider">
                {editingPhone ? 'Cihaz Düzenle' : 'Yeni Telefon Ekle'}
              </h3>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSavePhone} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION A: TELEFON BİLGİLERİ */}
              <div className="space-y-4">
                <h4 className="font-bold text-indigo-650 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-950/50 pb-1.5 uppercase text-[10px]">
                  Telefon Detayları
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Brand */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Marka *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Örn: Apple, Samsung"
                      list="brands-list"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <datalist id="brands-list">
                      {Object.keys(BRAND_MODELS).map(b => (
                        <option key={b} value={b} />
                      ))}
                      <option value="Huawei" />
                      <option value="OnePlus" />
                      <option value="Oppo" />
                      <option value="Realme" />
                      <option value="Vivo" />
                      <option value="General Mobile" />
                      <option value="Reeder" />
                    </datalist>
                  </div>

                  {/* Model */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Model *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Örn: iPhone 14 Pro"
                      list="models-list"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <datalist id="models-list">
                      {(() => {
                        const matchedKey = Object.keys(BRAND_MODELS).find(
                          k => k.toLowerCase() === (formData.brand || '').trim().toLowerCase()
                        );
                        return matchedKey 
                          ? BRAND_MODELS[matchedKey].map(m => <option key={m} value={m} />)
                          : null;
                      })()}
                    </datalist>
                  </div>

                  {/* Storage */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Depolama</label>
                    <select
                      value={formData.storage}
                      onChange={(e) => setFormData(prev => ({ ...prev, storage: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="64 GB">64 GB</option>
                      <option value="128 GB">128 GB</option>
                      <option value="256 GB">256 GB</option>
                      <option value="512 GB">512 GB</option>
                      <option value="1 TB">1 TB</option>
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Renk</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="Örn: Derin Mor"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Battery Health */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Pil Sağlığı (%)</label>
                    <input
                      type="number"
                      value={formData.batteryHealth}
                      onChange={(e) => setFormData(prev => ({ ...prev, batteryHealth: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Serial Number */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Seri Numarası</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      placeholder="S/N girin"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Cihaz Durumu</label>
                    <select
                      value={formData.status}
                      disabled={formData.status === 'Satıldı'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Stokta">Stokta</option>
                      <option value="Satışta">Satışta</option>
                      <option value="Tamirde">Tamirde</option>
                      <option value="Rezerve">Rezerve</option>
                      <option value="Hurda / Parçalandı">Hurda / Parçalandı</option>
                      {formData.status === 'Satıldı' && <option value="Satıldı">Satıldı</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* IMEI 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">IMEI 1 *</label>
                      <div className="flex gap-2 items-center">
                        {formData.imei1 && formData.imei1.length === 15 && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.imei1);
                              window.open("https://www.turkiye.gov.tr/imei-sorgulama", "_blank");
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            title="IMEI 1 Kopyala ve e-Devlet'te Aç"
                          >
                            📋 BTK'da Sorgula
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setScannerField('imei1')}
                          className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                          title="Kameradan Tara"
                        >
                          <ScanLine size={12} /> Tara
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formData.imei1}
                      onChange={(e) => setFormData(prev => ({ ...prev, imei1: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      placeholder="15 Haneli IMEI Girin"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* IMEI 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">IMEI 2 (Varsa)</label>
                      <div className="flex gap-2 items-center">
                        {formData.imei2 && formData.imei2.length === 15 && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.imei2);
                              window.open("https://www.turkiye.gov.tr/imei-sorgulama", "_blank");
                            }}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            title="IMEI 2 Kopyala ve e-Devlet'te Aç"
                          >
                            📋 BTK'da Sorgula
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setScannerField('imei2')}
                          className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                          title="Kameradan Tara"
                        >
                          <ScanLine size={12} /> Tara
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formData.imei2}
                      onChange={(e) => setFormData(prev => ({ ...prev, imei2: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      placeholder="15 Haneli IMEI 2 Girin"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* CHECKBOXES (FaceID, Box, etc.) */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 py-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.faceId}
                      onChange={(e) => setFormData(prev => ({ ...prev, faceId: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">Face ID Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.touchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, touchId: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">Touch ID Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trueTone}
                      onChange={(e) => setFormData(prev => ({ ...prev, trueTone: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">True Tone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasBox}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasBox: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">Kutusu Var</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasInvoice}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasInvoice: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">Faturası Var</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWarranty}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasWarranty: e.target.checked }))}
                      className="rounded border-slate-355 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350 select-none">Garantisi Var</span>
                  </label>
                </div>

                {/* Changed Parts Section */}
                <div className="space-y-2">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide block">Değişen Parçalar</label>
                  <div className="flex flex-wrap gap-2">
                    {['Ekran', 'Batarya', 'Arka Kapak', 'Kasa', 'Ön Kamera', 'Arka Kamera', 'Kamera Camı', 'Şarj Soketi', 'Ahize / Hoparlör', 'Anakart'].map(part => {
                      const isSelected = (formData.changedParts || []).includes(part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => {
                            const currentParts = formData.changedParts || [];
                            const newParts = currentParts.includes(part)
                              ? currentParts.filter(p => p !== part)
                              : [...currentParts, part];
                            setFormData(prev => ({ ...prev, changedParts: newParts }));
                          }}
                          className={`px-3 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-600 border-amber-300 dark:bg-amber-550/25 dark:text-amber-400 dark:border-amber-900/40 font-semibold'
                              : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}{part}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Custom changed part input */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      id="custom-part-input"
                      placeholder="Diğer değişen parça ekle..."
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] w-full max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val) {
                            const currentParts = formData.changedParts || [];
                            if (!currentParts.includes(val)) {
                              setFormData(prev => ({ ...prev, changedParts: [...currentParts, val] }));
                            }
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('custom-part-input');
                        const val = input.value.trim();
                        if (val) {
                          const currentParts = formData.changedParts || [];
                          if (!currentParts.includes(val)) {
                            setFormData(prev => ({ ...prev, changedParts: [...currentParts, val] }));
                          }
                          input.value = '';
                        }
                      }}
                      className="px-3 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-[11px] font-semibold cursor-pointer"
                    >
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Açıklama / Cihaz Notu</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Arıza durumu, kasa kozmetiği veya özel durumlar..."
                    rows="2"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Photo Upload and Previews */}
                <div className="space-y-2">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide block">Cihaz Fotoğrafları (Maks. 10)</label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-550 dark:text-slate-400 cursor-pointer text-xs font-semibold select-none flex items-center gap-1.5">
                      📷 Fotoğraf Seç
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                    <span className="text-[10px] text-slate-455 dark:text-slate-500">En fazla 10 adet kozmetik veya fatura görseli.</span>
                  </div>

                  {formData.photos && formData.photos.length > 0 && (
                    <div className="flex gap-2.5 mt-2">
                      {formData.photos.map((pic, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                          <img src={pic} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="absolute top-0.5 right-0.5 p-1 bg-red-500 hover:bg-red-750 text-white rounded-full cursor-pointer flex items-center justify-center transition shadow"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: ALIŞ BİLGİLERİ */}
              <div className="space-y-4">
                <h4 className="font-bold text-indigo-650 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-950/50 pb-1.5 uppercase text-[10px]">
                  Alış & Tedarikçi Bilgileri
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select supplier/customer from db */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Tedarikçi Seç (Kayıtlı Kişiler)</label>
                    <select
                      value={formData.boughtFromId}
                      onChange={(e) => handleBoughtContactSelect(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Manuel Giriş (Aşağıya Yazın)</option>
                      <optgroup label="Tedarikçiler">
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.phone})</option>)}
                      </optgroup>
                      <optgroup label="Müşteriler (Takas vb.)">
                        {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}
                      </optgroup>
                    </select>
                  </div>

                  {/* Name (if manual) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Kimden Alındı (Ad Soyad)</label>
                    <input
                      type="text"
                      value={formData.boughtFromName}
                      onChange={(e) => setFormData(prev => ({ ...prev, boughtFromName: e.target.value }))}
                      placeholder="Manuel Tedarikçi Ad Soyad"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Tedarikçi Telefon</label>
                    <input
                      type="text"
                      value={formData.purchaseContactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseContactPhone: e.target.value }))}
                      placeholder="Telefon numarası"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Purchase Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Alış Tarihi</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Purchase Price */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide flex justify-between">
                      <span>Alış Fiyatı *</span>
                      {(() => {
                        if (formData.brand && formData.model) {
                          const phones = require('../db/services/phoneService').phoneService.getAll();
                          const pastMatches = phones.filter(p => p.brand === formData.brand && p.model === formData.model && p.purchasePrice && p.id !== editingPhone?.id);
                          if (pastMatches.length > 0) {
                            const avgPrice = Math.round(pastMatches.reduce((acc, p) => acc + Number(p.purchasePrice), 0) / pastMatches.length);
                            return (
                              <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                                💡 AI Önerisi: ~{avgPrice.toLocaleString('tr-TR')} ₺
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                        placeholder="Alış Fiyatını TL cinsinden girin"
                        className="w-full p-2.5 pl-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-805 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                        required
                      />
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">₺</span>
                    </div>
                  </div>

                  {/* Payment Type */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Ödeme Türü</label>
                    <select
                      value={formData.purchasePaymentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePaymentType: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Nakit">Nakit</option>
                      <option value="Havale">Havale</option>
                      <option value="Kart">Kredi Kartı</option>
                    </select>
                  </div>
                </div>

                {/* Purchase Note */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Alış Notu</label>
                  <textarea
                    value={formData.purchaseNote}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseNote: e.target.value }))}
                    placeholder="Alış ile ilgili notlar..."
                    rows="2"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 text-xs font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSavePhone}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-xs cursor-pointer shadow-md shadow-indigo-600/10"
              >
                Kaydet
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. SELL PHONE MODAL */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-800 rounded-2xl shadow-xl animate-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5">
                <span className="text-emerald-500">✔</span> Cihaz Satışı Yapılıyor
              </h3>
              <button onClick={() => setShowSellModal(false)} className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="p-5 space-y-4 text-xs">
              {/* Info text */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {sellingPhone?.brand} {sellingPhone?.model}
                </div>
                <div className="text-[10px] text-slate-450 mt-1">
                  Maliyet: <strong>{sellingPhone?.totalCost} TL</strong>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-1.5">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Select Customer */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide block">Kayıtlı Müşteri Seç</label>
                <select
                  value={sellData.soldToId}
                  onChange={(e) => handleSellContactSelect(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-808 dark:text-white focus:outline-none"
                >
                  <option value="">Manuel Müşteri Girişi</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}
                </select>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide block">Kime Satıldı (Müşteri Ad Soyad) *</label>
                <input
                  type="text"
                  value={sellData.soldToName}
                  onChange={(e) => setSellData(prev => ({ ...prev, soldToName: e.target.value }))}
                  placeholder="Müşteri Adı Soyadı"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white"
                  required
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide block">Müşteri Telefon Numarası</label>
                <input
                  type="text"
                  value={sellData.salesContactPhone}
                  onChange={(e) => setSellData(prev => ({ ...prev, salesContactPhone: e.target.value }))}
                  placeholder="Telefon numarası"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Sales Price */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Satış Fiyatı *</span>
                    {(() => {
                      if (sellingPhone?.brand && sellingPhone?.model) {
                        const phones = require('../db/services/phoneService').phoneService.getAll();
                        const pastMatches = phones.filter(p => p.brand === sellingPhone.brand && p.model === sellingPhone.model && p.salesPrice && p.id !== sellingPhone.id);
                        if (pastMatches.length > 0) {
                          const avgPrice = Math.round(pastMatches.reduce((acc, p) => acc + Number(p.salesPrice), 0) / pastMatches.length);
                          return (
                            <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                              💡 AI Önerisi: ~{avgPrice.toLocaleString('tr-TR')} ₺
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sellData.salesPrice}
                      onChange={(e) => setSellData(prev => ({ ...prev, salesPrice: e.target.value }))}
                      placeholder="Satış Fiyatı"
                      className="w-full p-2.5 pl-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-900 dark:text-white font-bold text-xs"
                      required
                    />
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold">₺</span>
                  </div>
                </div>

                {/* Payment Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide block">Ödeme Türü</label>
                  <select
                    value={sellData.salesPaymentType}
                    onChange={(e) => setSellData(prev => ({ ...prev, salesPaymentType: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value="Nakit">Nakit</option>
                    <option value="Havale">Havale</option>
                    <option value="Kart">Kredi Kartı</option>
                  </select>
                </div>
              </div>

              {/* Profit preview info box */}
              {sellData.salesPrice && sellingPhone && (
                <div className={`p-2.5 rounded-lg border font-bold text-center flex items-center justify-between ${
                  Number(sellData.salesPrice) - sellingPhone.totalCost >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 border-emerald-200/50'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-450 border-red-200/50'
                }`}>
                  <span>Tahmini Kar:</span>
                  <span>
                    {(Number(sellData.salesPrice) - sellingPhone.totalCost).toLocaleString('tr-TR')} TL
                  </span>
                </div>
              )}

              {/* Sales Note */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide block">Satış Notu</label>
                <textarea
                  value={sellData.salesNote}
                  onChange={(e) => setSellData(prev => ({ ...prev, salesNote: e.target.value }))}
                  placeholder="Fatura detayları, takas notları..."
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl font-semibold cursor-pointer"
                >
                  Satışı Tamamla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CONFIRM DELETE DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-100 text-xs">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-2 flex items-center gap-1.5">
              <AlertCircle className="text-red-500" size={18} />
              Cihazı Silmek İstiyor musunuz?
            </h3>
            <p className="text-slate-550 dark:text-slate-400 mb-4">
              Bu telefonu stok listesinden tamamen silecektir. Bu işlem geri alınamaz. 
              (İlgili tamir ve masraf kayıtları da silinecektir.)
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl font-semibold cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BARCODE SCANNER MODAL */}
      {scannerField && (
        <BarcodeScanner
          onScan={(data) => {
            setFormData(prev => ({ ...prev, [scannerField]: data.replace(/\D/g, '').slice(0, 15) }));
            setScannerField(null);
          }}
          onClose={() => setScannerField(null)}
        />
      )}
    </>
  );
}
