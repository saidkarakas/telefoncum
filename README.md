# 📱 GigaTeknoloji - Telefon Alım-Satım & Teknik Servis Yönetim Sistemi

GigaTeknoloji Telefon Yönetim Sistemi (TYS), cep telefonu mağazaları, spot telefon alım-satım bayileri ve teknik servisler için özel olarak kurgulanmış **offline-first (çevrimdışı öncelikli)** ve **bulut senkronizasyonlu** yeni nesil bir dükkan otomasyon yazılımıdır. 

Bu yazılım; stok takibi, teknik servis işleyişi, cari hesaplar (tedarikçi/müşteri dengeleri), kasa defteri ve interaktif grafik raporlama modüllerini tek bir premium arayüz altında toplar.

---

## 🌟 Temel İşletme Değerleri (Bu Yazılım Ne Sağlar?)

* **❌ Sıfır Stok Kaybı:** Alınan, tamire gönderilen, rezerve edilen ve satılan tüm cihazların IMEI ve seri numarası bazlı takibi sayesinde stok kaçaklarını engeller.
* **⏱️ Hızlı Teknik Servis:** Müşterilere verilen "teslim sözü tarihi" ve teknisyen atamalarıyla servis süreçlerini hızlandırır, müşteri memnuniyetini artırır.
* **📊 Net Finansal Durum:** Telefona yapılan parça masrafları ile dükkan genel giderlerini (kira, fatura vb.) birleştirerek dükkanın **Net Kâr/Zarar** tablosunu anlık sunar.
* **💻 Çoklu Cihaz Desteği:** Supabase bulut entegrasyonu sayesinde dükkandaki ana bilgisayar, ustanın elindeki tablet ve satış temsilcisinin cep telefonu aynı veriyi eş zamanlı görür.

---

## 🚀 Modüller ve Detaylı Teknik Özellikler

### 1. 📊 Akıllı Kontrol Paneli (Dashboard)
* **Finansal Özet Kartları:** Stoktaki cihaz adedi, toplam stok maliyeti, kümülatif satış cirosu, toplam giderler ve net kâr durumu.
* **Kritik Uyarı Paneli (Alarmlar):** Stokta 30 günden fazla bekleyen ("yaşlanan") cihazları ve serviste 5 günden uzun süredir işlem bekleyen müşteri telefonlarını otomatik tespit eder.
* **Son Aktivite Akışları:** Son eklenen ve son satılan 5 cihazın detaylı listesi.

### 2. 📱 Stok ve Ürün Kataloğu Modülü
* **Gelişmiş Marka & Model Kataloğu:** Apple, Samsung ve Xiaomi markaları için yerleşik model önerileri (datalist). Cihaz eklerken marka seçildiğinde modeller otomatik listelenir.
* **Kozmetik Resim Galerisi (Maks. 10 Adet):** Cihazların çizik durumlarını veya faturalarını kaydetmek için 10 adede kadar görsel yükleme imkanı.
  * *Teknik Altyapı:* Yüklenen görseller **HTML5 Canvas** kullanılarak tarayıcıda otomatik sıkıştırılır (jpeg, 0.65 kalite), çözünürlüğü optimize edilir ve base64 formatında yerel depolamayı şişirmeden saklanır.
* **Değişen Parça Yönetimi:** Cihazların orijinal durumlarını doğrulamak için Ekran, Batarya, Kasa gibi parçaları tek tıkla işaretleme veya elle özel değişen parça ekleme paneli.
* **Özel IMEI Kontrolcüsü:** IMEI numaralarının yanında beliren buton ile kodu otomatik kopyalar ve resmi e-Devlet IMEI Sorgulama sayfasına (`turkiye.gov.tr/imei-sorgulama`) yönlendirir.

### 3. 🛠️ Teknik Servis (Tamir Takibi) Modülü
* **Arıza ve Cihaz Kaydı:** Müşteriden alınan telefonun detaylı arıza tanımı, tahmini maliyet ve teslimat söz tarihiyle kabulü.
* **Teknisyen & İşlem Yönetimi:** Cihazı tamir eden ustanın adı, yapılan müdahaleler ve güncel durum (Bekliyor, Tamirde, Hazır, Teslim Edildi).
* **Entegre Kasa Çıkışı:** Tamir tamamlanıp teslim edildiğinde, tahsil edilen servis ücreti otomatik olarak dükkan kasasına gelir olarak yazılır.

### 4. 👥 Cari Hesaplar ve Cari Kartlar
* **Müşteri & Tedarikçi Ayrımı:** Kişilerin dükkanla olan tüm ticari ilişkisini (satın alınan telefonlar, satılan cihazlar, elden ödemeler) tek bir ekranda toplar.
* **Otomatik Bakiye Hesaplama:** Kişinin borçlu (Borç) veya alacaklı (Alacak) durumunu tüm geçmiş hareketlerden saniyeler içinde hesaplar ve renk kodlu gösterir.

### 5. 💰 Genel Gider Defteri
* **Kategori Bazlı Gider Girişi:** Dükkan kira, elektrik, kargo, malzeme temini gibi giderleri tarih ve açıklama bazlı kaydeder.
* **Mali Tablo Entegrasyonu:** Bu giderler, raporlama sayfasında cihaz kârlarından otomatik düşülerek gerçek net kârı belirler.

### 6. 📈 Etkileşimli SVG Analiz Grafikleri
* **Son 6 Aylık Finansal Dağılım:** Her ay için Ciro (Mavi) ve Net Kâr (Yeşil) sütunlarını yan yana gösteren, üzerine gelindiğinde detaylı aylık özet açan interaktif bar grafik.
* **Marka Bazlı Kâr Dağılımı:** Hangi telefon markasından (Apple, Samsung, Xiaomi vb.) ne kadar kâr elde edildiğini yüzdelik paylarla gösteren dinamik SVG Donut Grafik.
* **Gider Analiz Barı:** Toplam gider bütçesinin kategorilere göre yüzde kaçlık paylara bölündüğünü gösteren dinamik ilerleme barları.

### 7. 🖨️ Yazıcı (Baskı) Şablonları
* Cihaz detay kartında yer alan **Yazdır** butonu ile A4 boyutunda şık bir "Cihaz Durum Belgesi" veya termal fiş yazıcıları (58mm/80mm) için uygun dükkan logolu makbuz tasarımları üretilir (`no-print` CSS kuralları ile optimize edilmiştir).

---

## 📁 Proje Klasör Yapısı

```text
├── public/                  # Statik varlıklar, PWA manifestosu ve Service Worker
│   ├── sw.js                # Çevrimdışı çalışmayı sağlayan service worker dosyası
│   └── manifest.json        # PWA yükleme ayarları
├── src/
│   ├── assets/              # Görseller ve SVG logolar
│   ├── components/          # Arayüz bileşenleri (Dashboard, PhoneManager vb.)
│   │   ├── Dashboard.jsx    # Ana panel ekranı
│   │   ├── PhoneManager.jsx # Stok listesi ve cihaz ekleme formu
│   │   ├── PhoneDetail.jsx  # Tıklanabilir detay modalı ve yazıcı şablonu
│   │   ├── RepairManager.jsx# Teknik servis yönetim paneli
│   │   ├── ExpenseManager.jsx# Gider kayıt arayüzü
│   │   ├── Reports.jsx      # SVG interaktif grafikler ve analiz ekranı
│   │   └── Settings.jsx     # Dükkan ayarları
│   ├── db/
│   │   ├── storage.js       # LocalStorage veri katmanı ve CRUD servisleri
│   │   └── supabaseClient.js# Supabase bağlantı istemcisi
│   ├── index.css            # Tailwind v4 stil tanımları ve @theme özelleştirmeleri
│   ├── main.jsx             # React başlangıç noktası
│   └── App.jsx              # Ana uygulama rotaları ve veritabanı dinleyicisi
├── .env                     # Gizli bağlantı anahtarları (Git'e yüklenmez)
├── .gitignore               # Dosya yoksayma kuralları (Örn: .env, node_modules)
├── vite.config.js           # Vite yapılandırma dosyası
└── package.json             # Bağımlılıklar ve çalıştırma komutları
```

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
   Ekranınızda yerel ağ IP'niz de dahil olmak üzere sunucu adresi görünecektir (Örn: `http://192.168.1.50:5173`).
4. Giriş şifresi: Kullanıcı adı `admin` | Şifre `12345` veya `admin`

---

## 🌐 Supabase Bulut Veritabanı ve Senkronizasyon Kurulumu (Geliştirici Rehberi)

Bu yazılımı bir dükkana/müşteriye satıp teslim edeceğiniz zaman, verilerin tüm cihazlarda (PC, Mobil) senkronize çalışması için şu veritabanı adımlarını izleyin:

### 1. Supabase Üzerinde Proje Açma
1. [supabase.com](https://supabase.com) adresine girip ücretsiz bir hesap oluşturun.
2. **New Project** butonuna basarak dükkanın ismini taşıyan bir proje başlatın.

### 2. SQL Tablo Kurulumu
1. Supabase panelinde sol menüdeki **SQL Editor** kısmına gidin.
2. **New Query** butonuna basın, aşağıdaki SQL kodunu yapıştırın ve sağ alttaki **Run** butonuna basın. Bu komut, uygulamanın esnek şemasını barındıracak `jsonb` tablosunu ve izinlerini kuracaktır:

```sql
-- 1. tys_data (Ana Veri) tablosunu oluştur
create table tys_data (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references auth.users(id) default auth.uid()
);

-- Satır Düzeyinde Güvenliği Aktif Et
alter table tys_data enable row level security;

-- Güvenli politikaları tanımla (Kullanıcılar sadece kendi verilerine erişebilir)
create policy "Kullanici kendi verisini okuyabilir" on tys_data for select using (auth.uid() = owner_id);
create policy "Kullanici kendi verisini ekleyebilir" on tys_data for insert with check (auth.uid() = owner_id);
create policy "Kullanici kendi verisini guncelleyebilir" on tys_data for update using (auth.uid() = owner_id);
create policy "Kullanici kendi verisini silebilir" on tys_data for delete using (auth.uid() = owner_id);

-- 2. tys_audit_log (İşlem Geçmişi) tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.tys_audit_log (
    id uuid default gen_random_uuid() primary key,
    owner_id uuid references auth.users(id) default auth.uid(),
    action text not null,
    entity_type text not null,
    entity_id text,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp with time zone default now()
);

ALTER TABLE public.tys_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanici islem gecmisini okuyabilir" ON public.tys_audit_log FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Kullanici islem gecmisine ekleme yapabilir" ON public.tys_audit_log FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- Silme veya güncelleme (update/delete) kasıtlı olarak engellenmiştir!
```

### 3. Yapılandırma Dosyasını Hazırlama (`.env`)
1. Uygulamanın ana dizininde bulunan `.env` dosyasını açın.
2. Supabase projenizin ayarlarından (**Project Settings -> API**) aldığınız **Project URL** ve **Anon Key** değerlerini yapıştırın:
   ```env
   VITE_SUPABASE_URL=https://sizin-proje-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Dosyayı kaydedin. Sistem artık bu veritabanı üzerinden dükkandaki tüm cihazlarda (internet bağlantısı olduğu sürece) anlık senkronize çalışacaktır!

---

## 🚀 Yayına Alma (Production Deploy)

Yazılım statik bir React uygulaması olduğu için herhangi bir sunucu maliyeti olmadan tamamen **ücretsiz** olarak yayına alınabilir:

### Seçenek A: Vercel / Netlify (Bulut Üzerinden Yayın)
1. Kodu GitHub hesabınıza pushlayın.
2. [Vercel](https://vercel.com) hesabınıza girip "Add New -> Project" diyerek GitHub deponuzu seçin.
3. **Environment Variables** (Çevre Değişkenleri) kısmına `.env` dosyasındaki iki değişkeni (`VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`) ekleyin.
4. **Deploy** butonuna basın. Yazılım dükkanın kullanımına hazır bir `https://dukkandinamikad.vercel.app` şeklinde yayına alınacaktır.

### Seçenek B: Localhost / Sunucu Derlemesi (Dükkan İçi PC)
Dükkandaki bilgisayarda lokal çalıştırmak isterseniz:
```bash
npm run build
```
komutunu çalıştırarak `dist` klasörü altında optimize edilmiş üretim dosyalarını alabilir ve herhangi bir yerel web sunucusu (IIS, Apache, Nginx) üzerinde dükkanın yerel ağına sunabilirsiniz.
