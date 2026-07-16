import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  X, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  customerService, 
  supplierService, 
  getTransactionService, 
  phoneService 
} from '../db/storage';
import { printCariEkstre } from '../utils/exporter';

export default function CustomerSupplierManager({ activePage, globalSearchQuery }) {
  // Tabs: 'customers' | 'suppliers'
  const [activeTab, setActiveTab] = useState('customers');
  
  // Lists
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false); // Add payment/collection modal
  
  // Editing Contacts
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [transType, setTransType] = useState('tahsilat'); // tahsilat | odeme

  // Form States (Contact)
  const [contactForm, setContactForm] = useState({
    fullName: '', phone: '', address: '', note: ''
  });

  // Form States (Transaction)
  const [transForm, setTransForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], description: ''
  });

  const [formError, setFormError] = useState('');
  const [ledgerTransactions, setLedgerTransactions] = useState([]);

  // Load Data
  const loadData = () => {
    setCustomers(customerService.getAll());
    setSuppliers(supplierService.getAll());
  };

  useEffect(() => {
    loadData();
  }, [activePage, activeTab]);

  // Load Ledger Transactions
  const loadLedger = (contact) => {
    if (!contact) return;
    const transactions = getTransactionService().getByContactId(contact.id);
    setLedgerTransactions(transactions);
  };

  useEffect(() => {
    if (selectedContact) {
      loadLedger(selectedContact);
    }
  }, [selectedContact]);

  // Handle Search Filtering
  const getFilteredContacts = () => {
    const list = activeTab === 'customers' ? customers : suppliers;
    if (!globalSearchQuery || globalSearchQuery.trim() === '') return list;
    const q = globalSearchQuery.toLowerCase().trim();
    return list.filter(item => 
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.address && item.address.toLowerCase().includes(q)) ||
      (item.note && item.note.toLowerCase().includes(q))
    );
  };

  const filteredContacts = getFilteredContacts();

  // Add / Edit triggers
  const handleAddClick = () => {
    setEditingContact(null);
    setContactForm({ fullName: '', phone: '', address: '', note: '' });
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleEditClick = (contact) => {
    setEditingContact(contact);
    setContactForm({
      fullName: contact.fullName || '',
      phone: contact.phone || '',
      address: contact.address || '',
      note: contact.note || ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  // Save Contact
  const handleSaveContact = (e) => {
    e.preventDefault();
    setFormError('');

    if (!contactForm.fullName.trim()) {
      setFormError('İsim / Ünvan girmek zorunludur.');
      return;
    }

    const service = activeTab === 'customers' ? customerService : supplierService;
    
    try {
      service.save(editingContact ? { ...editingContact, ...contactForm } : contactForm);
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      setFormError('Kaydedilirken bir hata meydana geldi.');
    }
  };

  // Delete Contact
  const handleDeleteContact = (id) => {
    if (confirm('Bu kişiyi ve ona bağlı tüm cari hareketleri silmek istediğinize emin misiniz?')) {
      const service = activeTab === 'customers' ? customerService : supplierService;
      service.delete(id);
      loadData();
    }
  };

  // Ledger triggers
  const handleLedgerClick = (contact) => {
    // Reload contact to get updated totals
    const service = activeTab === 'customers' ? customerService : supplierService;
    const refreshed = service.getById(contact.id);
    setSelectedContact(refreshed);
    setShowLedgerModal(true);
  };

  // Trans trigger (Add payment/collection)
  const handleTransClick = (type) => {
    setTransType(type);
    setTransForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: type === 'tahsilat' ? 'Tahsilat Alındı' : 'Ödeme Yapıldı'
    });
    setFormError('');
    setShowTransModal(true);
  };

  // Save Transaction
  const handleSaveTransaction = (e) => {
    e.preventDefault();
    setFormError('');

    if (!transForm.amount || Number(transForm.amount) <= 0) {
      setFormError('Lütfen sıfırdan büyük geçerli bir tutar girin.');
      return;
    }

    try {
      const transactionService = getTransactionService();
      transactionService.save({
        contactId: selectedContact.id,
        contactType: activeTab === 'customers' ? 'customer' : 'supplier',
        type: transType, // tahsilat | odeme
        amount: Number(transForm.amount),
        date: transForm.date,
        description: transForm.description
      });

      // Reload
      setShowTransModal(false);
      
      // Update local state
      const service = activeTab === 'customers' ? customerService : supplierService;
      const refreshed = service.getById(selectedContact.id);
      setSelectedContact(refreshed);
      loadLedger(refreshed);
      loadData();
    } catch (err) {
      setFormError('Hareket kaydedilemedi.');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (trId) => {
    if (confirm('Bu ödeme/tahsilat hareketini silmek istediğinize emin misiniz?')) {
      const transactionService = getTransactionService();
      transactionService.delete(trId);
      
      // Reload
      const service = activeTab === 'customers' ? customerService : supplierService;
      const refreshed = service.getById(selectedContact.id);
      setSelectedContact(refreshed);
      loadLedger(refreshed);
      loadData();
    }
  };

  // Print Cari Ekstre PDF
  const triggerPrintCari = () => {
    const headers = ['Tarih', 'İşlem Açıklaması', 'Tür', 'Tutar'];
    const rows = ledgerTransactions.map(t => [
      new Date(t.date).toLocaleDateString('tr-TR'),
      t.description,
      t.type === 'tahsilat' ? 'Tahsilat (Giriş)' : 'Ödeme (Çıkış)',
      `${t.amount.toLocaleString('tr-TR')} TL`
    ]);
    printCariEkstre(selectedContact.fullName, activeTab, selectedContact, ledgerTransactions, headers, rows);
  };

  return (
    <div className="space-y-4">
      
      {/* TABS & ADD CONTACT BUTTON HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        
        {/* Tab triggers */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Müşteriler
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tedarikçiler
          </button>
        </div>

        {/* Add trigger */}
        <button
          onClick={handleAddClick}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 active:scale-[0.98] transition text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus size={16} />
          {activeTab === 'customers' ? 'Müşteri Ekle' : 'Tedarikçi Ekle'}
        </button>
      </div>

      {/* CONTACT LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                <th className="p-4 py-3.5">İsim / Ünvan</th>
                <th className="p-4 py-3.5">Telefon</th>
                <th className="p-4 py-3.5">Adres</th>
                <th className="p-4 py-3.5 text-right">
                  {activeTab === 'customers' ? 'Top. Satışımız' : 'Top. Alışımız'}
                </th>
                <th className="p-4 py-3.5 text-right text-red-500">Borç (Bize)</th>
                <th className="p-4 py-3.5 text-right text-emerald-500">Alacak (Ona)</th>
                <th className="p-4 py-3.5">Kişisel Not</th>
                <th className="p-4 py-3.5 text-center no-print">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                    Kayıt bulunamadı. Yeni bir cari ekleyerek başlayabilirsiniz.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                    
                    {/* Name */}
                    <td className="p-4 font-bold text-slate-850 dark:text-white">
                      {contact.fullName}
                    </td>

                    {/* Phone */}
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {contact.phone || '-'}
                    </td>

                    {/* Address */}
                    <td className="p-4 text-slate-500 max-w-[150px] truncate" title={contact.address}>
                      {contact.address || '-'}
                    </td>

                    {/* Total purchases/sales */}
                    <td className="p-4 text-right font-medium">
                      {activeTab === 'customers' ? (
                        <span>{contact.totalSales.toLocaleString('tr-TR')} TL</span>
                      ) : (
                        <span>{contact.totalPurchases.toLocaleString('tr-TR')} TL</span>
                      )}
                    </td>

                    {/* Debt */}
                    <td className="p-4 text-right font-bold text-red-500">
                      {contact.debt > 0 ? `${contact.debt.toLocaleString('tr-TR')} TL` : '-'}
                    </td>

                    {/* Credit */}
                    <td className="p-4 text-right font-bold text-emerald-500">
                      {contact.credit > 0 ? `${contact.credit.toLocaleString('tr-TR')} TL` : '-'}
                    </td>

                    {/* Note */}
                    <td className="p-4 text-slate-450 italic max-w-[120px] truncate" title={contact.note}>
                      {contact.note || '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center space-x-1 whitespace-nowrap no-print">
                      
                      {/* Open Current Account Ledger */}
                      <button
                        onClick={() => handleLedgerClick(contact)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-650 transition cursor-pointer font-semibold"
                        title="Cari Hesap Defteri"
                      >
                        <BookOpen size={13} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEditClick(contact)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-500 hover:text-amber-650 transition cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit3 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-650 transition cursor-pointer"
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

      {/* 1. ADD / EDIT CONTACT MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-100 text-xs">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold uppercase tracking-wider text-slate-850 dark:text-white">
                {editingContact ? 'Cari Hesap Düzenle' : (activeTab === 'customers' ? 'Yeni Müşteri Ekle' : 'Yeni Tedarikçi Ekle')}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-1">
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Ad Soyad / Ünvan *</label>
                <input
                  type="text"
                  value={contactForm.fullName}
                  onChange={(e) => setContactForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Kişi veya firma adını girin"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Telefon Numarası</label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Örn: 0555 123 4567"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Adres</label>
                <textarea
                  value={contactForm.address}
                  onChange={(e) => setContactForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Açık adres yazın"
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Not / Açıklama</label>
                <textarea
                  value={contactForm.note}
                  onChange={(e) => setContactForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Kişiye ait özel notlar..."
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                />
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold rounded-xl cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Kaydet
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. CARI LEDGER (CARI HESAP DEFTERİ) MODAL */}
      {showLedgerModal && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:bg-white">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 print:border-0 print:shadow-none print:max-h-full">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 no-print">
              <h3 className="font-bold uppercase tracking-wider text-xs text-slate-850 dark:text-white flex items-center gap-1.5">
                <BookOpen size={16} className="text-indigo-600" />
                Cari Hesap Detayı: {selectedContact.fullName}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={triggerPrintCari}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-650 cursor-pointer"
                  title="Yazdır / PDF Ekstre"
                >
                  <Printer size={16} />
                </button>
                <button 
                  onClick={() => setShowLedgerModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs print:overflow-visible print:p-0">
              
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Info Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Cari Sahibi Bilgileri</span>
                  <div className="font-bold text-sm text-slate-850 dark:text-white mt-1">{selectedContact.fullName}</div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">{selectedContact.phone || '-'}</div>
                  <div className="text-slate-500 mt-1 italic">{selectedContact.address || '-'}</div>
                </div>

                {/* Balance Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Toplam Karşılıklı İşlem</span>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-1">
                      {activeTab === 'customers' ? 'Toplam Satışımız: ' : 'Toplam Alışımız: '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {Number(selectedContact.totalSales || selectedContact.totalPurchases || 0).toLocaleString('tr-TR')} TL
                      </span>
                    </div>
                  </div>
                  {selectedContact.note && (
                    <div className="text-[10px] text-slate-450 border-t border-slate-200/50 dark:border-slate-800/50 pt-1 mt-1 truncate">
                      Not: {selectedContact.note}
                    </div>
                  )}
                </div>

                {/* Remaining Balance Card */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                  selectedContact.balance > 0 
                    ? 'bg-red-50/50 border-red-200/60 dark:bg-red-950/10 dark:border-red-950/30' 
                    : selectedContact.balance < 0 
                      ? 'bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/10 dark:border-emerald-950/30' 
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kalan Net Bakiye</span>
                    <span className={`text-xl font-extrabold block mt-1.5 ${
                      selectedContact.balance > 0 ? 'text-red-500' : selectedContact.balance < 0 ? 'text-emerald-500' : 'text-slate-650'
                    }`}>
                      {Math.abs(selectedContact.balance).toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {selectedContact.balance > 0 ? 'Bize borçlu.' : selectedContact.balance < 0 ? 'Biz ona borçluyuz.' : 'Hesap dengede.'}
                  </span>
                </div>
              </div>

              {/* Transactions Control Buttons */}
              <div className="flex gap-2 no-print">
                <button
                  onClick={() => handleTransClick('tahsilat')}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownLeft size={16} />
                  Tahsilat Al (Bize Para Girişi)
                </button>
                <button
                  onClick={() => handleTransClick('odeme')}
                  className="px-3.5 py-2.5 rounded-xl bg-red-650 hover:bg-red-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowUpRight size={16} />
                  Ödeme Yap (Ona Para Çıkışı)
                </button>
              </div>

              {/* Ledger Transactions History Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-850 dark:text-white uppercase tracking-wider">
                  Hesap Geçmiş Hareketleri
                </h4>
                
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="p-3">Tarih</th>
                        <th className="p-3">İşlem Açıklaması</th>
                        <th className="p-3">Hareket Türü</th>
                        <th className="p-3 text-right">Tutar</th>
                        <th className="p-3 text-center no-print">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {ledgerTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-slate-400">Herhangi bir hareket kaydı bulunmamaktadır.</td>
                        </tr>
                      ) : (
                        ledgerTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/25">
                            <td className="p-3 text-slate-500">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{t.description}</td>
                            <td className="p-3">
                              {t.type === 'tahsilat' ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/30">
                                  <ArrowDownLeft size={12} /> Tahsilat (Giriş)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-bold border border-red-100 dark:border-red-900/30">
                                  <ArrowUpRight size={12} /> Ödeme (Çıkış)
                                </span>
                              )}
                            </td>
                            <td className={`p-3 text-right font-bold text-sm ${t.type === 'tahsilat' ? 'text-emerald-600' : 'text-red-650'}`}>
                              {t.amount.toLocaleString('tr-TR')} TL
                            </td>
                            <td className="p-3 text-center no-print">
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                                title="İşlemi Sil"
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

            </div>
          </div>
        </div>
      )}

      {/* 3. ADD PAYMENT/COLLECTION TRANSACTION DIALOG */}
      {showTransModal && selectedContact && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-100 text-xs">
            
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-850 pb-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1">
                {transType === 'tahsilat' ? (
                  <span className="text-emerald-500 flex items-center gap-1"><ArrowDownLeft size={16} /> Tahsilat Makbuzu</span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1"><ArrowUpRight size={16} /> Ödeme Fişi</span>
                )}
              </h4>
              <button onClick={() => setShowTransModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-1">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Info target */}
              <div className="text-[11px] text-slate-500">
                Cari Hesap: <strong>{selectedContact.fullName}</strong>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">İşlem Tutarı *</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Tutar girin"
                    value={transForm.amount}
                    onChange={(e) => setTransForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2.5 pl-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent font-bold text-slate-900 dark:text-white"
                    required
                  />
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold">₺</span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">İşlem Tarihi</label>
                <input
                  type="date"
                  value={transForm.date}
                  onChange={(e) => setTransForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Açıklama / Detay *</label>
                <input
                  type="text"
                  placeholder="Örn: Elden ödeme, banka havalesi..."
                  value={transForm.description}
                  onChange={(e) => setTransForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className={`px-3.5 py-2 text-white font-semibold rounded-xl ${
                    transType === 'tahsilat' ? 'bg-emerald-650 hover:bg-emerald-700' : 'bg-red-650 hover:bg-red-700'
                  }`}
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
