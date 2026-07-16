import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const STORAGE_KEYS = {
  PHONES: 'tys_phones',
  CUSTOMERS: 'tys_customers',
  SUPPLIERS: 'tys_suppliers',
  TRANSACTIONS: 'tys_transactions',
  EXPENSES: 'tys_expenses',
  REPAIRS: 'tys_repairs',
  SETTINGS: 'tys_settings',
  AUTH: 'tys_auth_session'
};

// Helper: Get item from LocalStorage
export const getJson = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

// Helper: Sync data to Supabase in the background
export const syncToCloud = async (key, data) => {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from('tys_data')
      .upsert({ key, value: data, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error(`Supabase sync error for ${key}:`, error);
    }
  } catch (err) {
    console.error("Supabase sync network error:", err);
  }
};

// Helper: Save item to LocalStorage and trigger sync to cloud
export const saveJson = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  syncToCloud(key, data);
};

// Helper: Secure SHA-256 Password Hasher using native browser SubtleCrypto
export const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper: Calculate phone costs, profits and aging
export const calculatePhoneCosts = (phone) => {
  const purchasePrice = Number(phone.purchasePrice || 0);
  const totalExpenses = (phone.expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalCost = purchasePrice + totalExpenses;
  const salesPrice = Number(phone.salesPrice || 0);
  const profit = phone.status === 'Satıldı' ? salesPrice - totalCost : 0;
  
  // Calculate days in stock
  const purchaseDate = new Date(phone.purchaseDate);
  const endDate = phone.status === 'Satıldı' ? new Date(phone.salesDate) : new Date();
  const diffTime = Math.abs(endDate - purchaseDate);
  const daysInStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 0;

  return {
    totalExpenses,
    totalCost,
    profit,
    daysInStock
  };
};

// Initialize DB and seed demo data if empty
export const initDb = (force = false) => {
  if (!force && localStorage.getItem(STORAGE_KEYS.PHONES)) {
    return; // Already initialized
  }

  // 1. Settings
  const defaultSettings = {
    businessName: 'GigaTeknoloji Telefon Alım Satım',
    logo: '',
    currency: 'TL',
    theme: 'dark'
  };
  saveJson(STORAGE_KEYS.SETTINGS, defaultSettings);

  // 2. Customers
  const demoCustomers = [
    {
      id: 'cust-1',
      fullName: 'Ahmet Yılmaz',
      phone: '0555 123 4567',
      address: 'Kadıköy, İstanbul',
      note: 'Sürekli müşteri, nakit alım yapar.'
    },
    {
      id: 'cust-2',
      fullName: 'Mehmet Demir',
      phone: '0532 987 6543',
      address: 'Çankaya, Ankara',
      note: 'Toptan alıcı, havale kullanır.'
    },
    {
      id: 'cust-3',
      fullName: 'Ayşe Kaya',
      phone: '0544 321 0987',
      address: 'Bornova, İzmir',
      note: 'Eski telefonunu takas etti.'
    }
  ];
  saveJson(STORAGE_KEYS.CUSTOMERS, demoCustomers);

  // 3. Suppliers
  const demoSuppliers = [
    {
      id: 'supp-1',
      fullName: 'Mega İthalat Sanayi',
      phone: '0212 555 0101',
      address: 'Eminönü, İstanbul',
      note: 'Yurtdışı cihaz tedarikçisi.'
    },
    {
      id: 'supp-2',
      fullName: 'Caner Spot İletişim',
      phone: '0533 111 2233',
      address: 'Yıldırım, Bursa',
      note: 'Yenilenmiş (Refurbished) cihazlar.'
    }
  ];
  saveJson(STORAGE_KEYS.SUPPLIERS, demoSuppliers);

  // 4. Phones
  const now = new Date();
  const dateDaysAgo = (days) => {
    const d = new Date();
    d.setDate(now.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const demoPhones = [
    {
      id: 'phone-1',
      brand: 'Apple',
      model: 'iPhone 14 Pro',
      storage: '256 GB',
      ram: '6 GB',
      color: 'Deep Purple',
      imei1: '354897102345678',
      imei2: '354897102345679',
      serialNumber: 'DX3GY789Q01L',
      batteryHealth: 88,
      faceId: true,
      touchId: false,
      trueTone: true,
      hasBox: true,
      hasInvoice: true,
      hasWarranty: true,
      description: 'Ekranı orjinal değişti. Kozmetik 9/10.',
      status: 'Satışta', // Stokta, Satışta, Tamirde, Rezerve, Satıldı
      photos: [],
      changedParts: ['Ekran'],
      boughtFromId: 'supp-1',
      boughtFromName: 'Mega İthalat Sanayi',
      purchaseContactPhone: '0212 555 0101',
      purchaseDate: dateDaysAgo(15),
      purchasePrice: 42000,
      purchasePaymentType: 'Havale',
      purchaseNote: 'Faturalı ithalat.',
      expenses: [
        { id: 'exp-1-1', name: 'Ekran Değişimi', amount: 3500, date: dateDaysAgo(14) },
        { id: 'exp-1-2', name: 'Kargo', amount: 150, date: dateDaysAgo(14) }
      ],
      soldToId: '',
      soldToName: '',
      salesContactPhone: '',
      salesDate: '',
      salesPrice: 0,
      salesPaymentType: '',
      salesNote: ''
    },
    {
      id: 'phone-2',
      brand: 'Apple',
      model: 'iPhone 13',
      storage: '128 GB',
      ram: '4 GB',
      color: 'Midnight',
      imei1: '352847109234857',
      imei2: '',
      serialNumber: 'F17G89A2K987',
      batteryHealth: 92,
      faceId: true,
      touchId: false,
      trueTone: true,
      hasBox: true,
      hasInvoice: false,
      hasWarranty: false,
      description: 'Hatasız, temiz cihaz.',
      status: 'Stokta',
      photos: [],
      boughtFromId: 'cust-3',
      boughtFromName: 'Ayşe Kaya',
      purchaseContactPhone: '0544 321 0987',
      purchaseDate: dateDaysAgo(4),
      purchasePrice: 24000,
      purchasePaymentType: 'Nakit',
      purchaseNote: 'Takasla alındı.',
      expenses: [],
      soldToId: '',
      soldToName: '',
      salesContactPhone: '',
      salesDate: '',
      salesPrice: 0,
      salesPaymentType: '',
      salesNote: ''
    },
    {
      id: 'phone-3',
      brand: 'Samsung',
      model: 'Galaxy S23 Ultra',
      storage: '512 GB',
      ram: '12 GB',
      color: 'Green',
      imei1: '359871109988776',
      imei2: '359871109988777',
      serialNumber: 'R5CW301X9ZA',
      batteryHealth: 95,
      faceId: false,
      touchId: true,
      trueTone: false,
      hasBox: true,
      hasInvoice: true,
      hasWarranty: true,
      description: 'Kamera lensinde hafif çizik var, arka kapak değişecek.',
      status: 'Tamirde',
      photos: [],
      changedParts: ['Arka Kapak'],
      boughtFromId: 'supp-2',
      boughtFromName: 'Caner Spot İletişim',
      purchaseContactPhone: '0533 111 2233',
      purchaseDate: dateDaysAgo(20),
      purchasePrice: 32000,
      purchasePaymentType: 'Havale',
      purchaseNote: 'Arka kapak çatlak geldi.',
      expenses: [],
      soldToId: '',
      soldToName: '',
      salesContactPhone: '',
      salesDate: '',
      salesPrice: 0,
      salesPaymentType: '',
      salesNote: ''
    }
  ];
  saveJson(STORAGE_KEYS.PHONES, demoPhones);

  // 5. Expenses
  const demoExpenses = [
    {
      id: 'exp-1',
      category: 'Kira',
      amount: 15000,
      date: dateDaysAgo(10),
      description: 'Haziran ayı dükkan kira bedeli'
    },
    {
      id: 'exp-2',
      category: 'Elektrik',
      amount: 2450,
      date: dateDaysAgo(8),
      description: 'Elektrik faturası'
    },
    {
      id: 'exp-3',
      category: 'Malzeme',
      amount: 3200,
      date: dateDaysAgo(5),
      description: 'Yapıştırıcı, temizlik jeli, tiner ve sarf malzeme alımı'
    }
  ];
  saveJson(STORAGE_KEYS.EXPENSES, demoExpenses);

  // 6. Transactions
  const demoTransactions = [
    {
      id: 'tr-1',
      contactId: 'supp-1',
      contactType: 'supplier',
      type: 'odeme', // odeme (biz ödedik), tahsilat (aldık)
      amount: 12000,
      date: dateDaysAgo(15),
      description: 'İthalat ödemesi peşinatı'
    },
    {
      id: 'tr-2',
      contactId: 'cust-1',
      contactType: 'customer',
      type: 'tahsilat',
      amount: 5000,
      date: dateDaysAgo(12),
      description: 'Eski borç tahsilatı'
    }
  ];
  saveJson(STORAGE_KEYS.TRANSACTIONS, demoTransactions);

  // 7. Repairs
  const demoRepairs = [
    {
      id: 'rep-1',
      customerName: 'Selin Yurt',
      customerPhone: '0505 444 3322',
      phoneId: 'phone-3',
      phoneDescription: 'Samsung Galaxy S23 Ultra (Stok Cihazı)',
      defect: 'Kamera lens çizik, arka kapak kırık',
      actionTaken: 'Arka kapak orjinaliyle değiştirildi.',
      cost: 1800,
      status: 'Tamirde'
    },
    {
      id: 'rep-2',
      customerName: 'Aslı Yener',
      customerPhone: '0533 888 9900',
      phoneId: '',
      phoneDescription: 'Xiaomi Redmi Note 10 (Müşteri Cihazı - Aslı Hn)',
      defect: 'Sıvı teması',
      actionTaken: 'Anakart temizliği ve oksit giderme yapıldı fakat işlemci arızalı, iade edilecek.',
      cost: 0,
      status: 'Bekliyor'
    }
  ];
  saveJson(STORAGE_KEYS.REPAIRS, demoRepairs);

  // 8. Auth session (default admin user: admin@telefoncum.com / 123456)
  const defaultAuth = {
    username: 'admin@telefoncum.com',
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // SHA-256 of '123456'
    isLoggedIn: false
  };
  
  const existingUserStr = localStorage.getItem('tys_admin_user');
  if (existingUserStr) {
    try {
      const existingUser = JSON.parse(existingUserStr);
      // Eski MD5 veya sadece 'admin' olan verileri yeni asenkron SHA-256 standardına dönüştür
      if (existingUser.username === 'admin' || (existingUser.passwordHash && existingUser.passwordHash.length === 32)) {
        localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
      }
    } catch (e) {
      localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
    }
  } else {
    localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
  }
};
