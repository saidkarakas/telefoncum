import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Building,
  Coins,
  Lock
} from 'lucide-react';
import { settingsService } from '../db/services/settingsService';
import { initDb } from '../db/services/shared';

export default function SettingsPage({ activePage }) {
  const [settings, setSettings] = useState({
    businessName: '',
    logo: '',
    currency: 'TL',
    theme: 'dark'
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');


  useEffect(() => {
    const loadSettings = () => setSettings(settingsService.get());
    loadSettings();
    window.addEventListener('tys_db_update', loadSettings);
    return () => window.removeEventListener('tys_db_update', loadSettings);
  }, [activePage]);

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!settings.businessName.trim()) {
      setErrorMsg('İşletme adı boş olamaz.');
      return;
    }

    try {
      settingsService.save(settings);
      setSuccessMsg('Ayarlar başarıyla kaydedildi.');
      // Auto dismiss success
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Ayarlar kaydedilemedi.');
    }
  };

  // Export DB Backup JSON
  const handleBackup = () => {
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const dbJson = settingsService.exportDatabase();
      const blob = new Blob([dbJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `telefoncum-yedek-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setSuccessMsg('Veritabanı yedeği indirildi.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setErrorMsg('Yedek alınırken hata oluştu.');
    }
  };

  // Import DB Backup JSON
  const handleRestore = (e) => {
    setSuccessMsg('');
    setErrorMsg('');
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrorMsg('Yedek dosyası boyutu çok büyük (Maksimum 5 MB).');
      e.target.value = '';
      return;
    }

    const userConfirm = confirm("⚠️ UYARI: Yedek yükleme işlemi mevcut tüm verilerinizi (telefon stokları, tamir kayıtları, kasa hareketleri vb.) tamamen silecektir ve geri alınamaz. Devam etmek istediğinizden emin misiniz?");
    if (!userConfirm) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target.result;
        settingsService.importDatabase(json);
        setSuccessMsg('Veriler başarıyla içe aktarıldı. Sayfa yenileniyor...');
        setTimeout(() => {
          window.location.reload();
        }, 1550);
      } catch (err) {
        setErrorMsg(err.message || 'Yedek dosyası yüklenirken bir hata oluştu.');
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Reset to Demo Data
  const handleResetData = async () => {
    if (confirm('DİKKAT: Mevcut tüm telefon, müşteri, cari ve gider verileriniz silinecektir! Demo verilerine geri dönmek istediğinizden emin misiniz?')) {
      try {
        // localStorage.clear() YAPMIYORUZ çünkü Supabase oturum (şifre) token'ını da siliyor.
        // Şifre silinince de initDb() içindeki syncToCloud() "Kullanıcı giriş yapmamış" deyip buluttaki verileri SIFIRLAMIYOR!
        localStorage.removeItem('tys_audit_log'); // Logları sil
        
        setSuccessMsg('Veriler sıfırlanıyor, lütfen bekleyin...');
        await initDb(true); // Tüm tabloları [] olarak ezip buluta yollar ve bitmesini BEKLER!
        
        setSuccessMsg('Veriler sıfırlandı. Sayfa yenileniyor...');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (e) {
        setErrorMsg('Sıfırlama hatası oluştu.');
      }
    }
  };



  return (
    <div className="space-y-6 max-w-2xl mx-auto text-xs">
      
      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. GENERAL BUSINESS PROFILE SETTINGS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
          <Building size={16} className="text-indigo-650" />
          İşletme Profili Ayarları
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          
          {/* Business Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-500 uppercase tracking-wide">İşletme Adı / Logo Yazısı</label>
            <input
              type="text"
              value={settings.businessName}
              onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="GigaTeknoloji"
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent focus:ring-1 focus:ring-indigo-500 text-xs"
              required
            />
          </div>

          {/* Currency */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-500 uppercase tracking-wide">Sistem Para Birimi</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-xs"
            >
              <option value="TL">₺ (Türk Lirası)</option>
              <option value="USD">$ (Amerikan Doları)</option>
              <option value="EUR">€ (Euro)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer"
          >
            Ayarları Kaydet
          </button>
        </form>
      </div>

      {/* 2. BACKUP & RESTORE DATABASE TOOL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
          <Download size={16} className="text-teal-500" />
          Veritabanı Yedekleme & Geri Yükleme
        </h3>
        
        <p className="text-slate-500 text-[11px] leading-relaxed">
          Tüm verileriniz yerel tarayıcı belleğinde (LocalStorage) tutulduğu için tarayıcı temizliğinde kaybolabilir. 
          Güvenliğiniz için belirli aralıklarla sistem yedeğinizi bilgisayarınıza indirmeniz önerilir.
          <br/><strong className="text-amber-600">Uyarı:</strong> İndirilen JSON yedek dosyası şifreli DEĞİLDİR. Lütfen yedeğinizi güvenli bir ortamda saklayın.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          
          {/* Backup Button */}
          <button
            onClick={handleBackup}
            className="flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 rounded-xl font-bold cursor-pointer transition-all"
          >
            <Download size={16} />
            Veritabanını Yedekle (JSON)
          </button>

          {/* Restore Input/Button */}
          <div className="relative">
            <label className="flex items-center justify-center gap-2 p-3 bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/20 dark:hover:bg-teal-950/40 dark:text-teal-400 border border-teal-200 dark:border-teal-900/30 rounded-xl font-bold cursor-pointer transition-all">
              <Upload size={16} />
              Yedeği Geri Yükle (JSON)
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </label>
          </div>

        </div>
      </div>

      {/* 3. DANGER ZONE RESET DATA */}
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/40 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-red-650 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
          <AlertTriangle size={16} className="text-red-500" />
          Tehlikeli Alan (Danger Zone)
        </h3>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="font-bold text-slate-800 dark:text-white">Fabrika Ayarlarına Dön</div>
            <p className="text-[10px] text-slate-500 mt-1 max-w-sm leading-relaxed">
              Mevcut tüm telefon stoklarını, masrafları, giderleri ve cari hesapları sıfırlar. İlk kurulum demo verilerini yeniden yükler.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-semibold rounded-xl cursor-pointer flex items-center gap-1 shrink-0"
          >
            <RotateCcw size={14} />
            Verileri Sıfırla
          </button>
        </div>
      </div>


    </div>
  );
}
