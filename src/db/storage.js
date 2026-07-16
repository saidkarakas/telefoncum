// LocalStorage Database Service for Phone Stock and Management System
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
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
const getJson = (key, defaultValue = []) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

// Helper: Sync data to Supabase in the background
const syncToCloud = async (key, data) => {
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
const saveJson = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  syncToCloud(key, data);
};

// Seed initial demo data if empty
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
      // Purchase Info
      boughtFromId: 'supp-1',
      boughtFromName: 'Mega İthalat Sanayi',
      purchaseContactPhone: '0212 555 0101',
      purchaseDate: dateDaysAgo(15),
      purchasePrice: 42000,
      purchasePaymentType: 'Havale', // Nakit, Havale, Kart
      purchaseNote: 'Faturalı ithalat.',
      // Expenses
      expenses: [
        { id: 'exp-1-1', name: 'Ekran Değişimi', amount: 3500, date: dateDaysAgo(14) },
        { id: 'exp-1-2', name: 'Kargo', amount: 150, date: dateDaysAgo(14) }
      ],
      // Sales Info (Empty initially)
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
      expenses: [
        { id: 'exp-3-1', name: 'Arka Kapak Orjinal', amount: 1200, date: dateDaysAgo(19) }
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
      id: 'phone-4',
      brand: 'Apple',
      model: 'iPhone 11',
      storage: '64 GB',
      ram: '4 GB',
      color: 'White',
      imei1: '351111109234857',
      imei2: '',
      serialNumber: 'C78F90A9KL83',
      batteryHealth: 81,
      faceId: true,
      touchId: false,
      trueTone: true,
      hasBox: false,
      hasInvoice: false,
      hasWarranty: false,
      description: 'Kozmetik 7/10. Satıldı.',
      status: 'Satıldı',
      photos: [],
      changedParts: ['Batarya'],
      boughtFromId: 'cust-1',
      boughtFromName: 'Ahmet Yılmaz',
      purchaseContactPhone: '0555 123 4567',
      purchaseDate: dateDaysAgo(30),
      purchasePrice: 11000,
      purchasePaymentType: 'Nakit',
      purchaseNote: 'Ahmet Yılmaz elden getirdi.',
      expenses: [
        { id: 'exp-4-1', name: 'Pil Değişimi', amount: 800, date: dateDaysAgo(29) },
        { id: 'exp-4-2', name: 'Kozmetik Temizlik', amount: 200, date: dateDaysAgo(29) }
      ],
      soldToId: 'cust-2',
      soldToName: 'Mehmet Demir',
      salesContactPhone: '0532 987 6543',
      salesDate: dateDaysAgo(10),
      salesPrice: 16500,
      salesPaymentType: 'Havale',
      salesNote: 'Mehmet beye kargolandı.'
    },
    {
      id: 'phone-5',
      brand: 'Xiaomi',
      model: 'Redmi Note 12 Pro',
      storage: '256 GB',
      ram: '8 GB',
      color: 'Blue',
      imei1: '862983058823192',
      imei2: '862983058823193',
      serialNumber: 'XIAO98127391',
      batteryHealth: 99,
      faceId: true,
      touchId: true,
      trueTone: false,
      hasBox: true,
      hasInvoice: true,
      hasWarranty: true,
      description: 'Kutulu, faturalı, garantili 2 aylık cihaz.',
      status: 'Satıldı',
      photos: [],
      boughtFromId: 'cust-2',
      boughtFromName: 'Mehmet Demir',
      purchaseContactPhone: '0532 987 6543',
      purchaseDate: dateDaysAgo(5),
      purchasePrice: 8500,
      purchasePaymentType: 'Havale',
      purchaseNote: 'Kutulu faturalı temiz cihaz.',
      expenses: [],
      soldToId: 'cust-1',
      soldToName: 'Ahmet Yılmaz',
      salesContactPhone: '0555 123 4567',
      salesDate: dateDaysAgo(2),
      salesPrice: 10800,
      salesPaymentType: 'Nakit',
      salesNote: 'Ahmet beye elden satıldı.'
    },
    {
      id: 'phone-6',
      brand: 'Apple',
      model: 'iPhone 12',
      storage: '128 GB',
      ram: '4 GB',
      color: 'Black',
      imei1: '358172938172938',
      imei2: '',
      serialNumber: 'G89HJK283L0S',
      batteryHealth: 85,
      faceId: true,
      touchId: false,
      trueTone: true,
      hasBox: true,
      hasInvoice: true,
      hasWarranty: false,
      description: 'Müşteri kapora bıraktı, ayrıldı.',
      status: 'Rezerve',
      photos: [],
      boughtFromId: 'supp-2',
      boughtFromName: 'Caner Spot İletişim',
      purchaseContactPhone: '0533 111 2233',
      purchaseDate: dateDaysAgo(40),
      purchasePrice: 18000,
      purchasePaymentType: 'Havale',
      purchaseNote: 'Toptan alımdan.',
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

  // 5. Cari Transactions
  const demoTransactions = [
    {
      id: 'tr-1',
      contactId: 'supp-1',
      contactType: 'supplier',
      type: 'odeme',
      amount: 42000,
      date: dateDaysAgo(15),
      description: 'iPhone 14 Pro alımı için ödeme'
    },
    {
      id: 'tr-2',
      contactId: 'cust-3',
      contactType: 'customer',
      type: 'odeme',
      amount: 24000,
      date: dateDaysAgo(4),
      description: 'iPhone 13 alımı için elden ödeme'
    },
    {
      id: 'tr-3',
      contactId: 'supp-2',
      contactType: 'supplier',
      type: 'odeme',
      amount: 40000,
      date: dateDaysAgo(18),
      description: 'Toptan telefon alımı kısmi ödeme'
    },
    {
      id: 'tr-4',
      contactId: 'cust-2',
      contactType: 'customer',
      type: 'tahsilat',
      amount: 15000,
      date: dateDaysAgo(10),
      description: 'iPhone 11 satışı tahsilat'
    },
    {
      id: 'tr-5',
      contactId: 'cust-2',
      contactType: 'customer',
      type: 'odeme',
      amount: 8500,
      date: dateDaysAgo(5),
      description: 'Redmi Note 12 Pro alım bedeli'
    },
    {
      id: 'tr-6',
      contactId: 'cust-1',
      contactType: 'customer',
      type: 'tahsilat',
      amount: 10800,
      date: dateDaysAgo(2),
      description: 'Redmi Note 12 Pro satışı elden tahsilat'
    },
    {
      id: 'tr-7',
      contactId: 'cust-1',
      contactType: 'customer',
      type: 'odeme',
      amount: 11000,
      date: dateDaysAgo(30),
      description: 'iPhone 11 satın alma bedeli'
    }
  ];
  saveJson(STORAGE_KEYS.TRANSACTIONS, demoTransactions);

  // 6. General Expenses
  const demoExpenses = [
    {
      id: 'gexp-1',
      category: 'Kira',
      amount: 12000,
      date: dateDaysAgo(28),
      description: 'Haziran ayı dükkan kirası'
    },
    {
      id: 'gexp-2',
      category: 'Elektrik',
      amount: 1450,
      date: dateDaysAgo(12),
      description: 'Dükkan elektrik faturası'
    },
    {
      id: 'gexp-3',
      category: 'İnternet',
      amount: 450,
      date: dateDaysAgo(10),
      description: 'Fiber internet faturası'
    },
    {
      id: 'gexp-4',
      category: 'Malzeme',
      amount: 600,
      date: dateDaysAgo(3),
      description: 'Temizlik malzemeleri ve çay/kahve alımı'
    }
  ];
  saveJson(STORAGE_KEYS.EXPENSES, demoExpenses);

  // 7. Repairs Board
  const demoRepairs = [
    {
      id: 'rep-1',
      phoneId: 'phone-3',
      phoneDescription: 'Samsung Galaxy S23 Ultra (Green)',
      defect: 'Arka kapak değişimi & Lens temizliği',
      actionTaken: 'Parça sipariş edildi, montaj bekleniyor.',
      cost: 1200,
      status: 'Tamirde'
    },
    {
      id: 'rep-2',
      phoneId: '',
      phoneDescription: 'iPhone 12 Mini (Müşteri Cihazı - Can Bey)',
      defect: 'Şarj soketi arızalı',
      actionTaken: 'Şarj soketi değiştirildi. Test edildi.',
      cost: 750,
      status: 'Hazır'
    },
    {
      id: 'rep-3',
      phoneId: '',
      phoneDescription: 'Xiaomi Redmi Note 10 (Müşteri Cihazı - Aslı Hn)',
      defect: 'Sıvı teması',
      actionTaken: 'Anakart temizliği ve oksit giderme yapıldı fakat işlemci arızalı, iade edilecek.',
      cost: 0,
      status: 'Bekliyor'
    }
  ];
  saveJson(STORAGE_KEYS.REPAIRS, demoRepairs);

  // 8. Auth session (admin / 123456)
  const defaultAuth = {
    username: 'admin',
    passwordHash: 'e10adc3949ba59abbe56e057f20f883e',
    isLoggedIn: false
  };
  if (!localStorage.getItem('tys_admin_user')) {
    localStorage.setItem('tys_admin_user', JSON.stringify(defaultAuth));
  }
};

// ==========================================
// CORE COMPUTED PROPERTIES FOR PHONES
// ==========================================
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

// ==========================================
// AUTHENTICATION MANAGEMENT
// ==========================================
export const authService = {
  login: (username, password, rememberMe) => {
    const userStr = localStorage.getItem('tys_admin_user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    
    if (username.toLowerCase() === user.username && (password === '123456' || password === 'admin')) {
      const session = {
        isLoggedIn: true,
        username: user.username,
        expires: rememberMe ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() : new Date(Date.now() + 2 * 60 * 60 * 1000).getTime()
      };
      saveJson(STORAGE_KEYS.AUTH, session);
      return true;
    }
    return false;
  },
  
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },
  
  checkSession: () => {
    const session = getJson(STORAGE_KEYS.AUTH, null);
    if (!session) return false;
    if (new Date().getTime() > session.expires) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      return false;
    }
    return true;
  }
};

// ==========================================
// PHONES CRUD
// ==========================================
export const phoneService = {
  getAll: () => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    return phones.map(phone => ({
      ...phone,
      ...calculatePhoneCosts(phone)
    }));
  },

  getById: (id) => {
    const phones = phoneService.getAll();
    return phones.find(p => p.id === id) || null;
  },

  save: (phoneData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    
    const duplicateImei = phones.find(p => p.id !== phoneData.id && (
      (phoneData.imei1 && (p.imei1 === phoneData.imei1 || p.imei2 === phoneData.imei1)) ||
      (phoneData.imei2 && (p.imei1 === phoneData.imei2 || p.imei2 === phoneData.imei2))
    ));
    
    if (duplicateImei) {
      throw new Error(`Bu IMEI numarası zaten kayıtlı: ${duplicateImei.brand} ${duplicateImei.model} (S/N: ${duplicateImei.serialNumber || 'Bilinmiyor'})`);
    }

    let updatedPhones;
    if (phoneData.id) {
      updatedPhones = phones.map(p => p.id === phoneData.id ? { ...p, ...phoneData } : p);
    } else {
      const newPhone = {
        ...phoneData,
        id: `phone-${Date.now()}`,
        expenses: phoneData.expenses || [],
        photos: phoneData.photos || [],
        status: phoneData.status || 'Stokta',
        salesPrice: phoneData.salesPrice || 0
      };
      updatedPhones = [...phones, newPhone];
    }
    
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  },

  delete: (id) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const filtered = phones.filter(p => p.id !== id);
    saveJson(STORAGE_KEYS.PHONES, filtered);
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const updatedRepairs = repairs.filter(r => r.phoneId !== id);
    saveJson(STORAGE_KEYS.REPAIRS, updatedRepairs);
    return true;
  },

  sell: (id, salesData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'Satıldı',
          soldToId: salesData.soldToId,
          soldToName: salesData.soldToName,
          salesContactPhone: salesData.salesContactPhone,
          salesDate: salesData.salesDate || new Date().toISOString().split('T')[0],
          salesPrice: Number(salesData.salesPrice || 0),
          salesPaymentType: salesData.salesPaymentType,
          salesNote: salesData.salesNote
        };
      }
      return p;
    });

    saveJson(STORAGE_KEYS.PHONES, updatedPhones);

    if (salesData.soldToId) {
      const transactionService = getTransactionService();
      transactionService.save({
        contactId: salesData.soldToId,
        contactType: 'customer',
        type: 'tahsilat',
        amount: Number(salesData.salesPrice),
        date: salesData.salesDate || new Date().toISOString().split('T')[0],
        description: `${salesData.phoneModel || 'Telefon'} Satış Bedeli`
      });
    }

    return true;
  },

  addExpense: (phoneId, expenseData) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === phoneId) {
        const newExpense = {
          id: `exp-${Date.now()}`,
          name: expenseData.name,
          amount: Number(expenseData.amount),
          date: expenseData.date || new Date().toISOString().split('T')[0]
        };
        return {
          ...p,
          expenses: [...(p.expenses || []), newExpense]
        };
      }
      return p;
    });
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  },

  deleteExpense: (phoneId, expenseId) => {
    const phones = getJson(STORAGE_KEYS.PHONES, []);
    const updatedPhones = phones.map(p => {
      if (p.id === phoneId) {
        return {
          ...p,
          expenses: (p.expenses || []).filter(e => e.id !== expenseId)
        };
      }
      return p;
    });
    saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    return true;
  }
};

// ==========================================
// CUSTOMERS CRUD
// ==========================================
export const customerService = {
  getAll: () => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    const phones = phoneService.getAll();
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return customers.map(c => {
      const customerPurchases = phones.filter(p => p.soldToId === c.id);
      const totalSalesToCustomer = customerPurchases.reduce((sum, p) => sum + p.salesPrice, 0);

      const customerSalesToUs = phones.filter(p => p.boughtFromId === c.id);
      const totalPurchasesFromCustomer = customerSalesToUs.reduce((sum, p) => sum + p.purchasePrice, 0);

      const contactTransactions = transactions.filter(t => t.contactId === c.id && t.contactType === 'customer');
      
      const wePaidToThem = contactTransactions.filter(t => t.type === 'odeme').reduce((sum, t) => sum + t.amount, 0);
      const theyPaidToUs = contactTransactions.filter(t => t.type === 'tahsilat').reduce((sum, t) => sum + t.amount, 0);
      
      const balance = (totalSalesToCustomer + wePaidToThem) - (totalPurchasesFromCustomer + theyPaidToUs);
      
      return {
        ...c,
        totalSales: totalSalesToCustomer,
        totalPurchases: totalPurchasesFromCustomer,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    const customers = customerService.getAll();
    return customers.find(c => c.id === id) || null;
  },

  save: (customerData) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    let updated;
    if (customerData.id) {
      updated = customers.map(c => c.id === customerData.id ? { ...c, ...customerData } : c);
    } else {
      updated = [...customers, { ...customerData, id: `cust-${Date.now()}` }];
    }
    saveJson(STORAGE_KEYS.CUSTOMERS, updated);
    return true;
  },

  delete: (id) => {
    const customers = getJson(STORAGE_KEYS.CUSTOMERS, []);
    saveJson(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};

// ==========================================
// SUPPLIERS CRUD
// ==========================================
export const supplierService = {
  getAll: () => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    const phones = phoneService.getAll();
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);

    return suppliers.map(s => {
      const supplierPhones = phones.filter(p => p.boughtFromId === s.id);
      const totalPurchasedValue = supplierPhones.reduce((sum, p) => sum + p.purchasePrice, 0);

      const contactTransactions = transactions.filter(t => t.contactId === s.id && t.contactType === 'supplier');
      const wePaidToThem = contactTransactions.filter(t => t.type === 'odeme').reduce((sum, t) => sum + t.amount, 0);
      const theyPaidToUs = contactTransactions.filter(t => t.type === 'tahsilat').reduce((sum, t) => sum + t.amount, 0);

      const balance = (totalPurchasedValue + theyPaidToUs) - wePaidToThem;

      return {
        ...s,
        totalPhones: supplierPhones.length,
        totalPurchases: totalPurchasedValue,
        debt: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0,
        balance
      };
    });
  },

  getById: (id) => {
    const suppliers = supplierService.getAll();
    return suppliers.find(s => s.id === id) || null;
  },

  save: (supplierData) => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    let updated;
    if (supplierData.id) {
      updated = suppliers.map(s => s.id === supplierData.id ? { ...s, ...supplierData } : s);
    } else {
      updated = [...suppliers, { ...supplierData, id: `supp-${Date.now()}` }];
    }
    saveJson(STORAGE_KEYS.SUPPLIERS, updated);
    return true;
  },

  delete: (id) => {
    const suppliers = getJson(STORAGE_KEYS.SUPPLIERS, []);
    saveJson(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.contactId !== id));
    return true;
  }
};

// ==========================================
// TRANSACTIONS (CARI HAREKETLER) CRUD
// ==========================================
export const getTransactionService = () => ({
  getAll: () => {
    return getJson(STORAGE_KEYS.TRANSACTIONS, []);
  },

  getByContactId: (contactId) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    return transactions
      .filter(t => t.contactId === contactId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  save: (transactionData) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    let updated;
    if (transactionData.id) {
      updated = transactions.map(t => t.id === transactionData.id ? { ...t, ...transactionData } : t);
    } else {
      const newTr = {
        ...transactionData,
        id: `tr-${Date.now()}`,
        date: transactionData.date || new Date().toISOString().split('T')[0]
      };
      updated = [newTr, ...transactions];
    }
    saveJson(STORAGE_KEYS.TRANSACTIONS, updated);
    return true;
  },

  delete: (id) => {
    const transactions = getJson(STORAGE_KEYS.TRANSACTIONS, []);
    saveJson(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
    return true;
  }
});

// ==========================================
// GENERAL EXPENSES CRUD
// ==========================================
export const expenseService = {
  getAll: () => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  save: (expenseData) => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    let updated;
    if (expenseData.id) {
      updated = expenses.map(e => e.id === expenseData.id ? { ...e, ...expenseData } : e);
    } else {
      const newExp = {
        ...expenseData,
        id: `gexp-${Date.now()}`,
        date: expenseData.date || new Date().toISOString().split('T')[0]
      };
      updated = [newExp, ...expenses];
    }
    saveJson(STORAGE_KEYS.EXPENSES, updated);
    return true;
  },

  delete: (id) => {
    const expenses = getJson(STORAGE_KEYS.EXPENSES, []);
    saveJson(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
    return true;
  }
};

// ==========================================
// REPAIRS BOARD CRUD
// ==========================================
export const repairService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.REPAIRS, []);
  },

  save: (repairData) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    let updated;
    if (repairData.id) {
      updated = repairs.map(r => r.id === repairData.id ? { ...r, ...repairData } : r);
      
      if (repairData.phoneId) {
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const updatedPhones = phones.map(p => {
          if (p.id === repairData.phoneId) {
            const existingExpIndex = p.expenses.findIndex(e => e.id === `rep-exp-${repairData.id}`);
            const updatedExpenses = [...(p.expenses || [])];
            
            const expObject = {
              id: `rep-exp-${repairData.id}`,
              name: `Tamir Gideri (${repairData.defect})`,
              amount: Number(repairData.cost || 0),
              date: new Date().toISOString().split('T')[0]
            };

            if (existingExpIndex > -1) {
              updatedExpenses[existingExpIndex] = expObject;
            } else {
              updatedExpenses.push(expObject);
            }
            
            return {
              ...p,
              status: repairData.status === 'Teslim Edildi' || repairData.status === 'Hazır' ? 'Stokta' : 'Tamirde',
              expenses: updatedExpenses
            };
          }
          return p;
        });
        saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }
    } else {
      const newRep = {
        ...repairData,
        id: `rep-${Date.now()}`
      };
      updated = [...repairs, newRep];
      
      if (repairData.phoneId) {
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const updatedPhones = phones.map(p => {
          if (p.id === repairData.phoneId) {
            const expObject = {
              id: `rep-exp-${newRep.id}`,
              name: `Tamir Gideri (${repairData.defect})`,
              amount: Number(repairData.cost || 0),
              date: new Date().toISOString().split('T')[0]
            };
            return {
              ...p,
              status: 'Tamirde',
              expenses: [...(p.expenses || []), expObject]
            };
          }
          return p;
        });
        saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }
    }
    saveJson(STORAGE_KEYS.REPAIRS, updated);
    return true;
  },

  delete: (id) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const repair = repairs.find(r => r.id === id);
    saveJson(STORAGE_KEYS.REPAIRS, repairs.filter(r => r.id !== id));
    
    if (repair && repair.phoneId) {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updatedPhones = phones.map(p => {
        if (p.id === repair.phoneId) {
          return {
            ...p,
            status: p.status === 'Tamirde' ? 'Stokta' : p.status,
            expenses: (p.expenses || []).filter(e => e.id !== `rep-exp-${id}`)
          };
        }
        return p;
      });
      saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    }
    return true;
  }
};

// ==========================================
// SYSTEM SETTINGS
// ==========================================
export const settingsService = {
  get: () => {
    return getJson(STORAGE_KEYS.SETTINGS, {
      businessName: 'Telefon Yönetim Sistemi',
      logo: '',
      currency: 'TL',
      theme: 'dark'
    });
  },

  save: (settingsData) => {
    saveJson(STORAGE_KEYS.SETTINGS, settingsData);
    return true;
  },

  exportDatabase: () => {
    const db = {};
    Object.keys(STORAGE_KEYS).forEach(k => {
      db[STORAGE_KEYS[k]] = localStorage.getItem(STORAGE_KEYS[k]);
    });
    db['tys_admin_user'] = localStorage.getItem('tys_admin_user');
    return JSON.stringify(db);
  },

  importDatabase: (jsonString) => {
    try {
      const db = JSON.parse(jsonString);
      Object.keys(db).forEach(k => {
        if (db[k] !== null) {
          localStorage.setItem(k, db[k]);
        }
      });
      return true;
    } catch (e) {
      throw new Error("Yedek dosyası geçersiz veya bozuk.");
    }
  }
};

// ==========================================
// REPORT & ANALYTICS SERVICE
// ==========================================
export const reportService = {
  getDashboardData: () => {
    const phones = phoneService.getAll();
    const repairs = repairService.getAll();
    const todayStr = new Date().toISOString().split('T')[0];

    const stockCount = phones.filter(p => p.status !== 'Satıldı').length;
    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);
    const totalSalesAmount = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const boughtToday = phones.filter(p => p.purchaseDate === todayStr).length;
    const soldToday = phones.filter(p => p.salesDate === todayStr).length;
    const inRepair = repairs.filter(r => r.status === 'Tamirde').length;
    const pendingRepairs = repairs.filter(r => r.status === 'Bekliyor').length;

    const sortedByDate = [...phones].sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    const recentAdded = sortedByDate.slice(0, 5);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');
    const recentSold = [...soldPhones].sort((a, b) => new Date(b.salesDate) - new Date(a.salesDate)).slice(0, 5);

    const waitingInStock = phones.filter(p => p.status !== 'Satıldı');
    const longWaiting = [...waitingInStock]
      .sort((a, b) => b.daysInStock - a.daysInStock)
      .slice(0, 5);

    return {
      cards: {
        stockCount,
        totalStockCost,
        totalSalesAmount,
        totalProfit,
        boughtToday,
        soldToday,
        inRepair,
        pendingRepairs
      },
      lists: {
        recentAdded,
        recentSold,
        longWaiting
      }
    };
  },

  getReportSummary: () => {
    const phones = phoneService.getAll();
    const gExpenses = expenseService.getAll();
    
    const totalPurchaseValue = phones.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalSalesValue = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.salesPrice, 0);
    const totalProfit = phones.filter(p => p.status === 'Satıldı').reduce((sum, p) => sum + p.profit, 0);
    
    const totalPhoneExpenses = phones.reduce((sum, p) => sum + p.totalExpenses, 0);
    const totalGeneralExpenses = gExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalPhoneExpenses + totalGeneralExpenses;

    const totalStockCost = phones.filter(p => p.status !== 'Satıldı').reduce((sum, p) => sum + p.totalCost, 0);

    const soldPhones = phones.filter(p => p.status === 'Satıldı');
    
    const brandCounts = {};
    const modelCounts = {};
    soldPhones.forEach(p => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      modelCounts[`${p.brand} ${p.model}`] = (modelCounts[`${p.brand} ${p.model}`] || 0) + 1;
    });

    let topBrand = 'N/A';
    let topBrandCount = 0;
    Object.keys(brandCounts).forEach(b => {
      if (brandCounts[b] > topBrandCount) {
        topBrandCount = brandCounts[b];
        topBrand = b;
      }
    });

    let topModel = 'N/A';
    let topModelCount = 0;
    Object.keys(modelCounts).forEach(m => {
      if (modelCounts[m] > topModelCount) {
        topModelCount = modelCounts[m];
        topModel = m;
      }
    });

    const monthlySales = {};
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
      monthlySales[key] = { count: 0, sales: 0, profit: 0 };
    }

    soldPhones.forEach(p => {
      const sDate = new Date(p.salesDate);
      const key = `${months[sDate.getMonth()]} ${sDate.getFullYear().toString().substr(-2)}`;
      if (monthlySales[key]) {
        monthlySales[key].count += 1;
        monthlySales[key].sales += p.salesPrice;
        monthlySales[key].profit += p.profit;
      }
    });

    const monthlySalesArray = Object.keys(monthlySales).map(k => ({
      month: k,
      count: monthlySales[k].count,
      sales: monthlySales[k].sales,
      profit: monthlySales[k].profit
    }));

    return {
      totalPurchaseValue,
      totalSalesValue,
      totalProfit,
      totalExpenses,
      totalGeneralExpenses,
      totalStockCost,
      topBrand: topBrandCount > 0 ? `${topBrand} (${topBrandCount} Adet)` : 'Satış Yok',
      topModel: topModelCount > 0 ? `${topModel} (${topModelCount} Adet)` : 'Satış Yok',
      monthlySales: monthlySalesArray
    };
  }
};
