import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle, 
  Download, 
  Printer, 
  X, 
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  DollarSign
} from 'lucide-react';
import { phoneService, customerService, supplierService } from '../db/storage';
import { exportToCSV, exportToExcel, printDataList } from '../utils/exporter';

const BRAND_MODELS = {
  'Apple': [
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 mini', 'iPhone 13',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 mini', 'iPhone 12',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
    'iPhone SE (2022)', 'iPhone SE (2020)', 'iPhone 6S Plus', 'iPhone 6S'
  ],
  'Samsung': [
    'Galaxy Z Fold 6', 'Galaxy Z Flip 6', 'Galaxy Z Fold 5', 'Galaxy Z Flip 5', 'Galaxy Z Fold 4', 'Galaxy Z Flip 4',
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
    'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21', 'Galaxy S21 FE',
    'Galaxy S20 Ultra', 'Galaxy S20+', 'Galaxy S20', 'Galaxy S20 FE',
    'Galaxy S10+', 'Galaxy S10', 'Galaxy S10e', 'Galaxy S10 Lite',
    'Galaxy S9+', 'Galaxy S9', 'Galaxy S8+', 'Galaxy S8',
    'Galaxy Note 20 Ultra', 'Galaxy Note 20', 'Galaxy Note 10+', 'Galaxy Note 10', 'Galaxy Note 9',
    'Galaxy A73 5G', 'Galaxy A72', 'Galaxy A71', 'Galaxy A70',
    'Galaxy A55 5G', 'Galaxy A54 5G', 'Galaxy A53 5G', 'Galaxy A52s 5G', 'Galaxy A52', 'Galaxy A51', 'Galaxy A50',
    'Galaxy A35 5G', 'Galaxy A34 5G', 'Galaxy A33 5G', 'Galaxy A32', 'Galaxy A31', 'Galaxy A30s', 'Galaxy A30',
    'Galaxy A25 5G', 'Galaxy A24', 'Galaxy A23', 'Galaxy A22', 'Galaxy A21s',
    'Galaxy A15 5G', 'Galaxy A15', 'Galaxy A14', 'Galaxy A13', 'Galaxy A12', 'Galaxy A11', 'Galaxy A10s',
    'Galaxy A05s', 'Galaxy A05', 'Galaxy A04s', 'Galaxy A04', 'Galaxy A03s', 'Galaxy A03',
    'Galaxy M54 5G', 'Galaxy M53 5G', 'Galaxy M52 5G', 'Galaxy M51', 'Galaxy M34 5G', 'Galaxy M33 5G', 'Galaxy M31', 'Galaxy M23 5G', 'Galaxy M14 5G'
  ],
  'Xiaomi': [
    'Xiaomi 14 Ultra', 'Xiaomi 14', 'Xiaomi 14T Pro', 'Xiaomi 14T',
    'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 13 Lite', 'Xiaomi 13T Pro', 'Xiaomi 13T',
    'Xiaomi 12T Pro', 'Xiaomi 12T', 'Xiaomi 12 Pro', 'Xiaomi 12', 'Xiaomi 12 Lite',
    'Xiaomi 11T Pro', 'Xiaomi 11T', 'Xiaomi 11 Lite 5G NE', 'Mi 11 Lite', 'Mi 10T Pro', 'Mi 10T', 'Mi Note 10 Lite',
    'Redmi Note 13 Pro+ 5G', 'Redmi Note 13 Pro 5G', 'Redmi Note 13 Pro', 'Redmi Note 13 5G', 'Redmi Note 13',
    'Redmi Note 12 Pro+ 5G', 'Redmi Note 12 Pro', 'Redmi Note 12S', 'Redmi Note 12',
    'Redmi Note 11 Pro+ 5G', 'Redmi Note 11 Pro', 'Redmi Note 11S', 'Redmi Note 11',
    'Redmi Note 10 Pro', 'Redmi Note 10S', 'Redmi Note 10',
    'Redmi Note 9 Pro', 'Redmi Note 9S', 'Redmi Note 9', 'Redmi Note 8 Pro', 'Redmi Note 8', 'Redmi Note 7',
    'Redmi 13C', 'Redmi 12', 'Redmi 12C', 'Redmi 10', 'Redmi 9T', 'Redmi 9C', 'Redmi 9A',
    'Poco F6 Pro', 'Poco F6', 'Poco F5 Pro', 'Poco F5', 'Poco F4 GT', 'Poco F4', 'Poco F3',
    'Poco X6 Pro', 'Poco X6', 'Poco X5 Pro', 'Poco X5', 'Poco X4 Pro 5G', 'Poco X4 GT', 'Poco X3 Pro', 'Poco X3 NFC',
    'Poco M6 Pro', 'Poco M6', 'Poco M4 Pro', 'Poco M4 5G'
  ]
};

export default function PhoneManager({ 
  globalSearchQuery, 
  setSelectedPhoneId, 
  setOpenPhoneDetail,
  activePage // Used to re-render
}) {
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Active selected item
  const [editingPhone, setEditingPhone] = useState(null);
  const [sellingPhone, setSellingPhone] = useState(null);
  const [deletingPhoneId, setDeletingPhoneId] = useState(null);

  // Form States (Add/Edit)
  const [formData, setFormData] = useState({
    brand: '', model: '', storage: '128 GB', ram: '', color: '',
    imei1: '', imei2: '', serialNumber: '', batteryHealth: 90,
    faceId: false, touchId: false, trueTone: false,
    hasBox: false, hasInvoice: false, hasWarranty: false,
    description: '', status: 'Stokta', photos: [],
    changedParts: [],
    // Bought
    boughtFromId: '', boughtFromName: '', purchaseContactPhone: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '', purchasePaymentType: 'Nakit', purchaseNote: ''
  });

  // Form States (Sell)
  const [sellData, setSellData] = useState({
    soldToId: '', soldToName: '', salesContactPhone: '',
    salesDate: new Date().toISOString().split('T')[0],
    salesPrice: '', salesPaymentType: 'Nakit', salesNote: ''
  });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '', status: '', minPrice: '', maxPrice: '',
    purchaseDateStart: '', purchaseDateEnd: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'purchaseDate', direction: 'desc' });

  // Error/Success Message
  const [formError, setFormError] = useState('');

  // Initial Load
  const loadData = () => {
    setPhones(phoneService.getAll());
    setCustomers(customerService.getAll());
    setSuppliers(supplierService.getAll());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('tys_db_update', loadData);
    return () => window.removeEventListener('tys_db_update', loadData);
  }, [activePage]);

  // Handle Sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper: Sort columns
  const getSortedPhones = (filteredList) => {
    const sortableItems = [...filteredList];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        // Handle nested numeric / date comparison
        if (sortConfig.key === 'waitingDays') {
          valA = a.daysInStock;
          valB = b.daysInStock;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  };

  // Quick Global Search Filter + Advanced Filter
  const getFilteredPhones = () => {
    let list = phones;

    // Global Search
    if (globalSearchQuery && globalSearchQuery.trim() !== '') {
      const q = globalSearchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.imei1 && p.imei1.includes(q)) ||
        (p.imei2 && p.imei2.includes(q)) ||
        (p.serialNumber && p.serialNumber.toLowerCase().includes(q)) ||
        (p.boughtFromName && p.boughtFromName.toLowerCase().includes(q)) ||
        (p.soldToName && p.soldToName.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Advanced Filters
    if (filters.brand) {
      list = list.filter(p => p.brand.toLowerCase() === filters.brand.toLowerCase());
    }
    if (filters.status) {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.minPrice) {
      list = list.filter(p => p.purchasePrice >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      list = list.filter(p => p.purchasePrice <= Number(filters.maxPrice));
    }
    if (filters.purchaseDateStart) {
      list = list.filter(p => p.purchaseDate >= filters.purchaseDateStart);
    }
    if (filters.purchaseDateEnd) {
      list = list.filter(p => p.purchaseDate <= filters.purchaseDateEnd);
    }

    return list;
  };

  const filteredPhones = getFilteredPhones();
  const sortedAndFilteredPhones = getSortedPhones(filteredPhones);

  // Unique Brands for Filter Select
  const brands = [...new Set(phones.map(p => p.brand))].filter(Boolean);

  // Edit Button Trigger
  const handleEditClick = (phone) => {
    setEditingPhone(phone);
    setFormData({
      ...phone,
      purchasePrice: phone.purchasePrice || '',
      batteryHealth: phone.batteryHealth || 90,
      changedParts: phone.changedParts || []
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  // Add Button Trigger
  const handleAddClick = () => {
    setEditingPhone(null);
    setFormData({
      brand: '', model: '', storage: '128 GB', ram: '', color: '',
      imei1: '', imei2: '', serialNumber: '', batteryHealth: 90,
      faceId: false, touchId: false, trueTone: false,
      hasBox: false, hasInvoice: false, hasWarranty: false,
      description: '', status: 'Stokta', photos: [],
      changedParts: [],
      boughtFromId: '', boughtFromName: '', purchaseContactPhone: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '', purchasePaymentType: 'Nakit', purchaseNote: ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

  // Handle photo selection and base64 canvas compression
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const currentPhotos = formData.photos || [];
    const limit = 10 - currentPhotos.length;
    if (limit <= 0) {
      alert("En fazla 10 adet cihaz fotoğrafı ekleyebilirsiniz.");
      return;
    }

    const filesToProcess = files.slice(0, limit);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          setFormData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), dataUrl]
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Save Add/Edit Form
  const handleSavePhone = (e) => {
    e.preventDefault();
    setFormError('');

    // Basic Validation
    if (!formData.brand.trim() || !formData.model.trim()) {
      setFormError('Marka ve Model bilgileri zorunludur.');
      return;
    }
    if (!formData.imei1 || formData.imei1.length < 15) {
      setFormError('Lütfen en az 15 haneli IMEI 1 numarasını girin.');
      return;
    }
    if (!formData.purchasePrice || Number(formData.purchasePrice) <= 0) {
      setFormError('Alış Fiyatı sıfırdan büyük bir sayı olmalıdır.');
      return;
    }

    try {
      phoneService.save({
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        batteryHealth: Number(formData.batteryHealth)
      });
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Cihaz kaydedilirken bir hata oluştu.');
    }
  };

  // Contact Selected Auto-Fill (Add/Edit)
  const handleBoughtContactSelect = (contactId) => {
    if (!contactId) {
      setFormData(prev => ({
        ...prev,
        boughtFromId: '',
        boughtFromName: '',
        purchaseContactPhone: ''
      }));
      return;
    }

    // Try finding in suppliers first, then customers
    const supplier = suppliers.find(s => s.id === contactId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        boughtFromId: supplier.id,
        boughtFromName: supplier.fullName,
        purchaseContactPhone: supplier.phone
      }));
      return;
    }

    const customer = customers.find(c => c.id === contactId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        boughtFromId: customer.id,
        boughtFromName: customer.fullName,
        purchaseContactPhone: customer.phone
      }));
    }
  };

  // Sell Button Trigger
  const handleSellClick = (phone) => {
    setSellingPhone(phone);
    setSellData({
      soldToId: '',
      soldToName: '',
      salesContactPhone: '',
      salesDate: new Date().toISOString().split('T')[0],
      salesPrice: phone.purchasePrice * 1.25, // Auto fill 25% profit suggestion
      salesPaymentType: 'Nakit',
      salesNote: ''
    });
    setFormError('');
    setShowSellModal(true);
  };

  // Save Sell Process
  const handleSaveSale = (e) => {
    e.preventDefault();
    setFormError('');

    if (!sellData.salesPrice || Number(sellData.salesPrice) <= 0) {
      setFormError('Lütfen geçerli bir satış fiyatı girin.');
      return;
    }

    try {
      phoneService.sell(sellingPhone.id, {
        ...sellData,
        phoneModel: `${sellingPhone.brand} ${sellingPhone.model}`
      });
      setShowSellModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Satış işlemi tamamlanamadı.');
    }
  };

  // Sell Contact Auto-Fill
  const handleSellContactSelect = (customerId) => {
    if (!customerId) {
      setSellData(prev => ({ ...prev, soldToId: '', soldToName: '', salesContactPhone: '' }));
      return;
    }
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSellData(prev => ({
        ...prev,
        soldToId: customer.id,
        soldToName: customer.fullName,
        salesContactPhone: customer.phone
      }));
    }
  };

  // Delete Action Trigger
  const handleDeleteClick = (id) => {
    setDeletingPhoneId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (deletingPhoneId) {
      phoneService.delete(deletingPhoneId);
      setShowDeleteConfirm(false);
      setDeletingPhoneId(null);
      loadData();
    }
  };

  // Export CSV
  const triggerExportCSV = () => {
    const headers = ['Marka', 'Model', 'Depolama', 'Renk', 'IMEI 1', 'Alış Fiyatı', 'Toplam Masraf', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Bekleme (Gün)'];
    const rows = sortedAndFilteredPhones.map(p => [
      p.brand, p.model, p.storage, p.color, p.imei1, p.purchasePrice, p.totalExpenses, p.totalCost, p.salesPrice || 0, p.profit || 0, p.status, p.daysInStock
    ]);
    exportToCSV(rows, headers, 'telefon_stok_listesi.csv');
  };

  // Export Excel
  const triggerExportExcel = () => {
    const headers = ['Marka', 'Model', 'Depolama', 'Renk', 'IMEI 1', 'Alış Fiyatı', 'Toplam Masraf', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Bekleme (Gün)'];
    const rows = sortedAndFilteredPhones.map(p => [
      p.brand, p.model, p.storage, p.color, p.imei1, p.purchasePrice, p.totalExpenses, p.totalCost, p.salesPrice || 0, p.profit || 0, p.status, p.daysInStock
    ]);
    exportToExcel(rows, headers, 'telefon_stok_listesi.xls');
  };

  // Print PDF List
  const triggerPrintList = () => {
    const headers = ['Model', 'IMEI 1', 'Alış Fiyatı', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Bekleme'];
    const rows = sortedAndFilteredPhones.map(p => [
      `${p.brand} ${p.model} (${p.storage})`,
      p.imei1,
      `${p.purchasePrice} TL`,
      `${p.totalCost} TL`,
      p.salesPrice ? `${p.salesPrice} TL` : '-',
      p.status === 'Satıldı' ? `${p.profit} TL` : '-',
      p.status,
      `${p.daysInStock} Gün`
    ]);
    printDataList('Telefon Stok ve Arşiv Listesi', headers, rows);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Stokta': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      'Satışta': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
      'Tamirde': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
      'Rezerve': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
      'Satıldı': 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-800/40'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Stokta']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* ACTION HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          
          {/* Add Phone Button */}
          <button
            onClick={handleAddClick}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus size={16} />
            Telefon Ekle
          </button>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showFilters || Object.values(filters).some(x => x !== '')
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filtreler
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerExportExcel}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="Excel Dışa Aktar"
          >
            <FileSpreadsheet size={16} />
          </button>
          <button
            onClick={triggerExportCSV}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="CSV Dışa Aktar"
          >
            <FileCode size={16} />
          </button>
          <button
            onClick={triggerPrintList}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600 cursor-pointer"
            title="Yazdır / PDF"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER BOX PANEL */}
      {showFilters && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-2 md:grid-cols-6 gap-3 text-xs shadow-sm no-print">
          
          {/* Brand */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Marka</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Tümü</option>
              <option value="Stokta">Stokta</option>
              <option value="Satışta">Satışta</option>
              <option value="Tamirde">Tamirde</option>
              <option value="Rezerve">Rezerve</option>
              <option value="Satıldı">Satıldı (Arşiv)</option>
            </select>
          </div>

          {/* Min Price */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Min. Alış</label>
            <input
              type="number"
              placeholder="0 TL"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Max Price */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Max. Alış</label>
            <input
              type="number"
              placeholder="100.000+"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Alış Başlangıç</label>
            <input
              type="date"
              value={filters.purchaseDateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateStart: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">Alış Bitiş</label>
            <input
              type="date"
              value={filters.purchaseDateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateEnd: e.target.value }))}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Clear Filters */}
          <div className="col-span-2 md:col-span-6 flex justify-end">
            <button
              onClick={() => setFilters({ brand: '', status: '', minPrice: '', maxPrice: '', purchaseDateStart: '', purchaseDateEnd: '' })}
              className="text-[11px] font-semibold text-red-500 hover:underline cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}

      {/* STOCKS TABLE LISTING */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider select-none">
                <th onClick={() => requestSort('brand')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Marka / Model</th>
                <th onClick={() => requestSort('imei1')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">IMEI / Seri No</th>
                <th onClick={() => requestSort('purchasePrice')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Alış Tutarı</th>
                <th onClick={() => requestSort('totalExpenses')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Yap. Masraf</th>
                <th onClick={() => requestSort('totalCost')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Maliyet</th>
                <th onClick={() => requestSort('salesPrice')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Satış Fiyatı</th>
                <th onClick={() => requestSort('profit')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Kar / Zarar</th>
                <th onClick={() => requestSort('status')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-center">Durum</th>
                <th onClick={() => requestSort('waitingDays')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-center">Bekleme</th>
                <th className="p-4 py-3.5 text-center no-print">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sortedAndFilteredPhones.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400 font-medium">
                    Kayıtlı telefon bulunamadı. Stok ekleyerek başlayabilirsiniz.
                  </td>
                </tr>
              ) : (
                sortedAndFilteredPhones.map((phone) => (
                  <tr 
                    key={phone.id}
                    onClick={() => {
                      setSelectedPhoneId(phone.id);
                      setOpenPhoneDetail(true);
                    }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors cursor-pointer"
                  >
                    {/* Brand / Model */}
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      <div>{phone.brand} {phone.model}</div>
                      <div className="text-[10px] text-slate-450 font-normal">
                        {phone.storage}
                        {phone.ram ? ` / ${phone.ram}` : ''}
                        {phone.color ? ` / ${phone.color}` : ''}
                      </div>
                      {phone.changedParts && phone.changedParts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 font-normal">
                          {phone.changedParts.map((part, index) => (
                            <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 dark:border-amber-900/30">
                              {part}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* IMEI / S/N */}
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div>1: {phone.imei1}</div>
                      {phone.imei2 && <div className="text-[10px]">2: {phone.imei2}</div>}
                      {phone.serialNumber && <div className="text-[10px] text-indigo-500 font-medium">S/N: {phone.serialNumber}</div>}
                    </td>
                    {/* Purchase Price */}
                    <td className="p-4 text-right text-slate-700 dark:text-slate-350">
                      {phone.purchasePrice.toLocaleString('tr-TR')} TL
                    </td>
                    {/* Expenses */}
                    <td className="p-4 text-right text-slate-500">
                      {phone.totalExpenses > 0 ? (
                        <span className="text-amber-600 font-semibold">{phone.totalExpenses.toLocaleString('tr-TR')} TL</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {/* Total Cost */}
                    <td className="p-4 text-right font-bold text-slate-850 dark:text-white">
                      {phone.totalCost.toLocaleString('tr-TR')} TL
                    </td>
                    {/* Sales Price */}
                    <td className="p-4 text-right text-slate-800 dark:text-slate-200 font-medium">
                      {phone.status === 'Satıldı' ? (
                        <span>{phone.salesPrice.toLocaleString('tr-TR')} TL</span>
                      ) : (
                        <span className="text-slate-450 italic">-</span>
                      )}
                    </td>
                    {/* Profit */}
                    <td className="p-4 text-right font-bold">
                      {phone.status === 'Satıldı' ? (
                        <span className={phone.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                          {phone.profit >= 0 ? '+' : ''}{phone.profit.toLocaleString('tr-TR')} TL
                        </span>
                      ) : (
                        <span className="text-slate-450">-</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="p-4 text-center">
                      {getStatusBadge(phone.status)}
                    </td>
                    {/* Waiting days */}
                    <td className="p-4 text-center">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        phone.status === 'Satıldı'
                          ? 'text-slate-450' 
                          : phone.daysInStock > 30 
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                            : 'text-slate-500'
                      }`}>
                        {phone.daysInStock} Gün
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="p-4 text-center space-x-1 whitespace-nowrap no-print" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Detail View */}
                      <button
                        onClick={() => {
                          setSelectedPhoneId(phone.id);
                          setOpenPhoneDetail(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        title="Detaylar"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Edit (only if not sold) */}
                      {phone.status !== 'Satıldı' && (
                        <>
                          <button
                            onClick={() => handleEditClick(phone)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-500 hover:text-amber-600 transition cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 size={13} />
                          </button>
                          
                          <button
                            onClick={() => handleSellClick(phone)}
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                            title="Satıldı Yap"
                          >
                            <CheckCircle size={13} />
                          </button>
                        </>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteClick(phone.id)}
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Battery Health */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Pil Sağlığı (%)</label>
                    <input
                      type="number"
                      value={formData.batteryHealth}
                      onChange={(e) => setFormData(prev => ({ ...prev, batteryHealth: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Cihaz Durumu</label>
                    <select
                      value={formData.status}
                      disabled={formData.status === 'Satıldı'} // Can't un-sell phone without correct transaction reverse flow
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Stokta">Stokta</option>
                      <option value="Satışta">Satışta</option>
                      <option value="Tamirde">Tamirde</option>
                      <option value="Rezerve">Rezerve</option>
                      {formData.status === 'Satıldı' && <option value="Satıldı">Satıldı</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* IMEI 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">IMEI 1 *</label>
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
                    </div>
                    <input
                      type="text"
                      value={formData.imei1}
                      onChange={(e) => setFormData(prev => ({ ...prev, imei1: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      placeholder="15 Haneli IMEI Girin"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* IMEI 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-500 uppercase tracking-wide">IMEI 2 (Varsa)</label>
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
                    </div>
                    <input
                      type="text"
                      value={formData.imei2}
                      onChange={(e) => setFormData(prev => ({ ...prev, imei2: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      placeholder="15 Haneli IMEI 2 Girin"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">Face ID Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.touchId}
                      onChange={(e) => setFormData(prev => ({ ...prev, touchId: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">Touch ID Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trueTone}
                      onChange={(e) => setFormData(prev => ({ ...prev, trueTone: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">True Tone</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasBox}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasBox: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">Kutusu Var</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasInvoice}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasInvoice: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">Faturası Var</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasWarranty}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasWarranty: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-650"
                    />
                    <span className="text-slate-650 dark:text-slate-350">Garantisi Var</span>
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
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500 text-[11px] w-full max-w-xs"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                    <span className="text-[10px] text-slate-450">En fazla 10 adet kozmetik veya fatura görseli.</span>
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
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Purchase Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Alış Tarihi</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Purchase Price */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 uppercase tracking-wide">Alış Fiyatı *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                        placeholder="Alış Fiyatını TL cinsinden girin"
                        className="w-full p-2.5 pl-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-indigo-500"
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
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl animate-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5">
                <span className="text-emerald-500">✔</span> Cihaz Satışı Yapılıyor
              </h3>
              <button onClick={() => setShowSellModal(false)} className="text-slate-400 hover:text-slate-600">
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
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Kayıtlı Müşteri Seç</label>
                <select
                  value={sellData.soldToId}
                  onChange={(e) => handleSellContactSelect(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Manuel Müşteri Girişi</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}
                </select>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Kime Satıldı (Müşteri Ad Soyad) *</label>
                <input
                  type="text"
                  value={sellData.soldToName}
                  onChange={(e) => setSellData(prev => ({ ...prev, soldToName: e.target.value }))}
                  placeholder="Müşteri Adı Soyadı"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                  required
                />
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Müşteri Telefon Numarası</label>
                <input
                  type="text"
                  value={sellData.salesContactPhone}
                  onChange={(e) => setSellData(prev => ({ ...prev, salesContactPhone: e.target.value }))}
                  placeholder="Telefon numarası"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Sales Price */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Satış Fiyatı *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sellData.salesPrice}
                      onChange={(e) => setSellData(prev => ({ ...prev, salesPrice: e.target.value }))}
                      placeholder="Satış Fiyatı"
                      className="w-full p-2.5 pl-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent font-bold text-slate-900 dark:text-white"
                      required
                    />
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold">₺</span>
                  </div>
                </div>

                {/* Payment Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 uppercase tracking-wide">Ödeme Türü</label>
                  <select
                    value={sellData.salesPaymentType}
                    onChange={(e) => setSellData(prev => ({ ...prev, salesPaymentType: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
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
                <label className="font-semibold text-slate-500 uppercase tracking-wide">Satış Notu</label>
                <textarea
                  value={sellData.salesNote}
                  onChange={(e) => setSellData(prev => ({ ...prev, salesNote: e.target.value }))}
                  placeholder="Fatura detayları, takas notları..."
                  rows="2"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
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

    </div>
  );
}
