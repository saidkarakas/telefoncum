# 📱 GigaTeknoloji - Telefon Alım-Satım, Takas & Teknik Servis Yönetim Sistemi (TYS)

GigaTeknoloji Telefon Yönetim Sistemi (TYS), cep telefonu mağazaları, spot telefon alım-satım bayileri ve teknik servisler için özel olarak kurgulanmış **offline-first (çevrimdışı öncelikli)** ve **bulut senkronizasyonlu** yeni nesil bir dükkan otomasyon yazılımıdır. 

Bu yazılım; stok takibi, takas sözleşmeleri, taksit & veresiye yönetimi, yedek parça envanteri, teknik servis işleyişi, cari hesaplar (tedarikçi/müşteri dengeleri), kasa defteri ve interaktif grafik raporlama modüllerini tek bir premium arayüz altında toplar.

---

## 🌟 Temel İşletme Değerleri (Bu Yazılım Ne Sağlar?)

* **❌ Sıfır Stok Kaybı:** Alınan, tamire gönderilen, takasa giren, rezerve edilen ve satılan tüm cihazların IMEI ve seri numarası bazlı takibi sayesinde stok kaçaklarını engeller.
* **🔁 Güvenli Takas Yönetimi:** Takasa alınan cihazların stok maliyeti, verilen cihazın satış fiyatı ve oluşan takas farkını ayrı ayrı yönetir; resmi hukuki metin içeren Takas Sözleşmesi çıktısı üretir.
* **💳 Taksit & Veresiye Takibi:** Vadeli satışlarda taksit planı oluşturur, yuvarlama farklarını son taksite yansıtır, geciken taksitleri Dashboard uyarısıyla bildirir.
* **📦 Parça Stok & Tamir Envanteri:** Ekran, batarya, kamera gibi tamir parçalarının stok adetlerini tutar, tamir yapıldığında stoktan düşer ve tamir kârını hesaplar.
* **⏱️ Hızlı Teknik Servis:** Müşterilere verilen teslim tarihi, cihaz şifre gizliliği ve teknisyen kopyasıyla servis süreçlerini hızlandırır.
* **📊 Net Finansal Durum:** Telefona yapılan masraflar, parça maliyetleri ve dükkan genel giderlerini (kira, fatura vb.) birleştirerek dükkanın **Net Kâr/Zarar** tablosunu anlık sunar.
* **💻 Çoklu Cihaz Desteği:** Supabase bulut entegrasyonu sayesinde dükkandaki ana bilgisayar, ustanın elindeki tablet ve satış temsilcisinin cep telefonu aynı veriyi eş zamanlı görür.

---

## 🚀 Modüller ve Detaylı Teknik Özellikler

### 1. 📊 Akıllı Kontrol Paneli (Dashboard)
* **Finansal Özet Kartları:** Stoktaki cihaz adedi, toplam stok maliyeti, kümülatif satış cirosu, toplam giderler, geciken taksitler, kritik parça stokları ve net kâr durumu.
* **Kritik Uyarı Paneli (Alarmlar):** Stokta 30 günden fazla bekleyen ("yaşlanan") cihazları ve serviste 5 günden uzun süredir işlem bekleyen müşteri telefonlarını otomatik tespit eder.
* **Son Aktivite Akışları:** Son eklenen ve son satılan cihazların detaylı listesi.

### 2. 📱 Stok ve Ürün Kataloğu Modülü
* **Gelişmiş Marka & Model Kataloğu:** Apple, Samsung, Xiaomi vb. markalar için yerleşik model önerileri (datalist). Cihaz eklerken marka seçildiğinde modeller otomatik listelenir.
* **Stok Durumları:** `Stokta`, `Rezerve`, `Satıldı`, `Takasta Alındı`, `Serviste`, `İade`, `Hurda`.
* **Kozmetik Resim Galerisi (Maks. 10 Adet):** Cihazların çizik durumlarını veya faturalarını kaydetmek için 10 adede kadar görsel yükleme imkanı (tarayıcıda otomatik sıkıştırma).
* **Değişen Parça Yönetimi:** Cihazların orijinal durumlarını doğrulamak için Ekran, Batarya, Kasa gibi parçaları işaretleme paneli.
* **Özel IMEI Kontrolcüsü & Barkod Taraması:** Kamera tatarak IMEI alma ve e-Devlet IMEI Sorgulama sayfasına (`turkiye.gov.tr/imei-sorgulama`) yönlendirme.

### 3. 🔁 Takaslar ve Takas Sözleşmesi Modülü
* **Bağımsız Finansal Değerleme:** Satılan telefonun satış bedeli, alınan telefonun stok giriş maliyeti ve müşteri/işletme takas farkını hesaplar.
* **Müşteri Kaydı:** Takasa getirilen cihazın sahibi otomatik rehbere müşteri olarak eklenir veya mevcut müşteriye bağlanır.
* **Resmi Takas Sözleşmesi:** Hukuki taahhüt metni, cihaz kozmetik/pil durumları ve taraf imzalarını içeren resmi A4 / Fiş baskısı üretir.

### 4. 💳 Taksit & Veresiye Yönetimi
* **Otomatik Taksit Bölüşümü:** Satış fiyatından peşinat düşüldükten sonra kalan tutarı eşit taksitlere böler; kuruş küsuratını son taksite ekler.
* **Taksit Ödemesi:** Kısmi ödeme ve tam taksit ödemesi alarak bakiye ve gecikme durumunu anında günceller.

### 5. 📦 Parça Stok Yönetimi
* **Parça Kataloğu & Barkod:** Ekran, batarya, şarj soketi vb. parçaların stok takibi, kritik stok seviyesi (minStock) ve barkod ile hızlı arama.
* **Stok Hareket Logları:** Manuel stok giriş/çıkışlarını ve tamirde kullanılan parçaları denetim günlüğü olarak kaydeder.

### 6. 🛠️ Teknik Servis (Tamir Takibi) Modülü
* **Stoklu Parça Kullanımı:** Servis kaydında kullanılan parçalar dükkan stok envanterinden seçilebilir veya serbest metin olarak girilebilir.
* **Arıza ve Cihaz Kaydı:** Müşteriden alınan telefonun arıza tanımı, şifre gizleme mantığı (teknisyen çıktısında şifre görünür, müşteri fişinde gizlenir) ve teslim süreci.

### 7. 👥 Cari Hesaplar ve Cari Kartlar
* **Tek Finansal Kaynak İlkesi:** Cihaz satışları (`sale_debt`), alışları (`purchase_debt`), takas farkları, tahsilatlar (`collection`) ve ödemeler (`payment`) tek defter üzerinden yönetilir.
* **Geriye Dönük Uyumluluk:** Eski kayıtlarda cari hareket bulunmuyorsa telefon kayıtları fallback olarak bakiyeye yansıtılır (çift hesaplama engellenmiştir).

---

## 🧪 Testler ve Doğrulama

Sistem Vitest altyapısıyla modüler olarak test edilmektedir:

```bash
# Tüm testleri çalıştırma
npm test
```

Test Dosyaları:
* `src/tests/contactService.test.js` - Cari bakiye ve rehber eşleştirme testleri
* `src/tests/installmentService.test.js` - Taksit bölüşümü, kuruş yuvarlama ve ödeme testleri
* `src/tests/tradeInService.test.js` - Takas finansal hesabı ve stok giriş testleri
* `src/tests/partService.test.js` - Parça stok CRUD ve kritik stok testleri
* `src/tests/repairStockIntegration.test.js` - Tamirde kullanılan parçaların stok düşüm entegrasyonu
* `src/tests/backupCompatibility.test.js` - Yedek alma ve yeni veri anahtarları uyumluluğu
* `src/utils/security.test.js` - XSS temizleme ve XSS koruma testleri

---

## ⚙️ Kurulum ve Çalıştırma

Bilgisayarınızda **Node.js** yüklü olduğundan emin olun.

1. Projeyi bir klasöre çıkartın ve terminali açın:
   ```bash
   cd "telefon-yonetim-sistemi"
   ```
2. Gerekli bağımlılıkları indirin:
   ```bash
   npm install
   ```
3. Yerel geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
4. Derleme (Production Build) testi:
   ```bash
   npm run build
   ```
5. Giriş şifresi: Kullanıcı adı `admin` | Şifre `12345` veya `admin`

---

## 🌐 Supabase Bulut Veritabanı ve Senkronizasyon Kurulumu

Supabase SQL kurulum betiği `supabase/schema.sql` dosyasında yer almaktadır. Supabase Dashboard -> SQL Editor alanından bu dosyayı çalıştırarak veritabanınızı saniyeler içinde kurabilirsiniz.
