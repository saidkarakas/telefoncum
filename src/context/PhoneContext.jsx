import React, { createContext, useContext, useState, useEffect } from 'react';
import { phoneService } from '../db/services/phoneService';
import { customerService } from '../db/services/customerService';
import { supplierService } from '../db/services/supplierService';
import { exportToCSV, exportToExcel } from '../utils/exporter';

const PhoneContext = createContext();

export const BRAND_MODELS = {
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

export const PhoneProvider = ({ children, globalSearchQuery, activePage }) => {
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Active items
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
    boughtFromId: '', boughtFromName: '', purchaseContactPhone: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '', purchasePaymentType: 'Nakit', purchaseNote: '',
    cashAmount: '', bankTransferAmount: '', cardAmount: '', veresiyeAmount: '', installmentAmount: ''
  });

  // Form States (Sell)
  const [sellData, setSellData] = useState({
    soldToId: '', soldToName: '', salesContactPhone: '',
    salesDate: new Date().toISOString().split('T')[0],
    salesPrice: '', salesPaymentType: 'Nakit', salesNote: '',
    downPayment: '', installmentCount: 3, firstInstallmentDate: '',
    cashAmount: '', bankTransferAmount: '', cardAmount: '', veresiyeAmount: '', installmentAmount: ''
  });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    brand: '', status: '', minPrice: '', maxPrice: '',
    purchaseDateStart: '', purchaseDateEnd: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'purchaseDate', direction: 'desc' });
  const [formError, setFormError] = useState('');

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

  // Handle Sort Request
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
  const brands = [...new Set(phones.map(p => p.brand))].filter(Boolean);

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
      purchasePrice: '', purchasePaymentType: 'Nakit', purchaseNote: '',
      cashAmount: '', bankTransferAmount: '', cardAmount: '', veresiyeAmount: '', installmentAmount: ''
    });
    setFormError('');
    setShowAddEditModal(true);
  };

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

  const handleSavePhone = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setFormError('');

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
      setIsSaving(true);
      await phoneService.save({
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        batteryHealth: Number(formData.batteryHealth)
      });
      setShowAddEditModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Cihaz kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBoughtContactSelect = (contactId) => {
    if (!contactId) {
      setFormData(prev => ({ ...prev, boughtFromId: '', boughtFromName: '', purchaseContactPhone: '' }));
      return;
    }

    const supplier = suppliers.find(s => s.id === contactId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        boughtFromId: supplier.id,
        boughtFromName: supplier.fullName || supplier.name,
        purchaseContactPhone: supplier.phone
      }));
      return;
    }

    const customer = customers.find(c => c.id === contactId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        boughtFromId: customer.id,
        boughtFromName: customer.fullName || customer.name,
        purchaseContactPhone: customer.phone
      }));
    }
  };

  const handleSellClick = (phone) => {
    setSellingPhone(phone);
    const today = new Date().toISOString().split('T')[0];
    const defaultNextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSellData({
      soldToId: '', soldToName: '', salesContactPhone: '',
      salesDate: today,
      salesPrice: phone.purchasePrice * 1.25,
      salesPaymentType: 'Nakit', salesNote: '',
      downPayment: 0, installmentCount: 3,
      firstInstallmentDate: defaultNextMonth,
      cashAmount: '', bankTransferAmount: '', cardAmount: '', veresiyeAmount: '', installmentAmount: ''
    });
    setFormError('');
    setShowSellModal(true);
  };

  const handleSaveSale = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setFormError('');

    if (!sellData.salesPrice || Number(sellData.salesPrice) <= 0) {
      setFormError('Lütfen geçerli bir satış fiyatı girin.');
      return;
    }

    try {
      setIsSaving(true);
      await phoneService.sell(sellingPhone.id, {
        ...sellData,
        phoneModel: `${sellingPhone.brand} ${sellingPhone.model}`
      });
      setShowSellModal(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Satış işlemi tamamlanamadı.');
    } finally {
      setIsSaving(false);
    }
  };

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
        soldToName: customer.fullName || customer.name,
        salesContactPhone: customer.phone
      }));
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingPhoneId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingPhoneId && !isSaving) {
      try {
        setIsSaving(true);
        await phoneService.delete(deletingPhoneId);
        setShowDeleteConfirm(false);
        setDeletingPhoneId(null);
        loadData();
      } catch (err) {
        alert(err.message || "Telefon silinemedi.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const triggerExportCSV = () => {
    const headers = ['Marka', 'Model', 'Depolama', 'Renk', 'IMEI 1', 'Alış Fiyatı', 'Toplam Masraf', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Bekleme (Gün)'];
    const rows = sortedAndFilteredPhones.map(p => [
      p.brand, p.model, p.storage, p.color, p.imei1, p.purchasePrice, p.totalExpenses, p.totalCost, p.salesPrice || 0, p.profit || 0, p.status, p.daysInStock
    ]);
    exportToCSV(rows, headers, 'telefon_stok_listesi.csv');
  };

  const triggerExportExcel = () => {
    const headers = ['Marka', 'Model', 'Depolama', 'Renk', 'IMEI 1', 'Alış Fiyatı', 'Toplam Masraf', 'Maliyet', 'Satış Fiyatı', 'Kar', 'Durum', 'Bekleme (Gün)'];
    const rows = sortedAndFilteredPhones.map(p => [
      p.brand, p.model, p.storage, p.color, p.imei1, p.purchasePrice, p.totalExpenses, p.totalCost, p.salesPrice || 0, p.profit || 0, p.status, p.daysInStock
    ]);
    exportToExcel(rows, headers, 'telefon_stok_listesi.xls');
  };

  return (
    <PhoneContext.Provider value={{
      phones, customers, suppliers,
      showAddEditModal, setShowAddEditModal,
      showSellModal, setShowSellModal,
      showDeleteConfirm, setShowDeleteConfirm,
      isSaving,
      editingPhone, setEditingPhone,
      sellingPhone, setSellingPhone,
      deletingPhoneId, setDeletingPhoneId,
      formData, setFormData,
      sellData, setSellData,
      showFilters, setShowFilters,
      filters, setFilters,
      sortConfig, setSortConfig,
      formError, setFormError,
      loadData,
      requestSort,
      sortedAndFilteredPhones,
      brands,
      handleEditClick,
      handleAddClick,
      handlePhotoUpload,
      handleSavePhone,
      handleBoughtContactSelect,
      handleSellClick,
      handleSaveSale,
      handleSellContactSelect,
      handleDeleteClick,
      handleConfirmDelete,
      triggerExportCSV,
      triggerExportExcel
    }}>
      {children}
    </PhoneContext.Provider>
  );
};

export const usePhone = () => {
  const context = useContext(PhoneContext);
  if (!context) {
    throw new Error('usePhone must be used within a PhoneProvider');
  }
  return context;
};
