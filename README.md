# 📱 GigaTeknoloji - Telefon Alım-Satım & Teknik Servis Yönetim Sistemi

Bu proje, cep telefonu mağazaları ve teknik servisler için özel olarak geliştirilmiş; stok takibi, cari yönetim, tamir süreçleri, gelir-gider analizi ve detaylı finansal raporlama yapabilen modern, responsive ve premium tasarımlı bir web uygulamasıdır.

---

## ✨ Öne Çıkan Özellikler

* **📊 Canlı Yönetim Paneli (Dashboard):** Günlük alış-satış durumları, kasa bakiyesi, stoktaki cihaz maliyetleri ve uzun süredir stokta bekleyen cihazlar için akıllı bildirimler.
* **📱 Akıllı Stok & Katalog Yönetimi:** Gelişmiş marka ve model kataloğu (Apple, Samsung, Xiaomi otomasyon önerileri ile). Hafıza, RAM ve renk varyasyonlarına göre detaylı kayıt.
* **📸 Cihaz Kozmetik Galerisi:** Her telefon için 10 adede kadar görsel yükleme (fatura, kozmetik çizik vb.). Yerel depolama dostu **HTML5 Canvas Sıkıştırma** altyapısı sayesinde resimleri otomatik küçültür ve veritabanını şişirmez.
* **🔧 Değişen Parça İşaretleyici:** Ekran, batarya, kasa gibi değişen parçaları görsel etiketlerle kolayca seçme ve özel parça ekleme paneli.
* **📋 Hızlı BTK IMEI Sorgulama:** IMEI numaralarını tek tıkla kopyalayıp resmi e-Devlet IMEI sorgulama sayfasına yönlendiren entegre kontrol butonu.
* **🛠️ Teknik Servis (Tamir) Takibi:** Giriş tarihi, müşteriye verilen teslimat söz tarihi, arıza tanımı, işlem detayları ve teknisyen atamalarıyla tam servis kontrolü.
* **🧾 Cari Hesap & İletişim Rehberi:** Müşteri ve tedarikçilerin borç/alacak durumları, telefon bilgileri ve işlem geçmişleri.
* **💰 Genel Gider Yönetimi:** Dükkan kira, elektrik, kargo gibi genel giderlerinin ve cihaz masraflarının anlık kasadan düşülmesi.
* **📈 Etkileşimli Grafikler ve Raporlar:** SVG tabanlı Ciro/Net Kâr dual-bar grafiği, marka bazlı kâr dağılımı (Donut Grafik) ve gider kategorileri analizi.
* **🌙 Modern Arayüz ve Karanlık Mod:** Figma tarzında tasarlanmış sürgülü gece/gündüz modu düğmesi ve üst düzey görsel tasarım.
* **🖨️ Yazıcı ve Ekstre Desteği:** Termal fiş yazıcıları ve standart yazıcılar için optimize edilmiş fatura, cihaz ekstresi ve teknik servis çıktısı şablonları.

---

## 🛠️ Teknolojiler

* **Arayüz:** React (Hooks, Context, Web APIs)
* **Derleyici ve Sunucu:** Vite + HMR
* **Stil:** Tailwind CSS v4 (Modern ve yüksek performanslı)
* **Veritabanı (Çift Modlu):** 
  * **Lokal Mod:** Tarayıcı tabanlı LocalStorage (İnternetsiz/çevrimdışı kullanım).
  * **Bulut Modu:** Supabase (PostgreSQL) entegrasyonu ile cihazlar arası anlık senkronizasyon.

---

## 🚀 Başlangıç ve Kurulum

### Gereksinimler
Uygulamayı çalıştırmak için bilgisayarınızda **Node.js** yüklü olmalıdır.

1. Projeyi bilgisayarınıza indirin ve klasörün içinde terminali açın.
2. Gerekli paketleri kurun:
   ```bash
   npm install
   ```
3. Uygulamayı geliştirme modunda başlatın:
   ```bash
   npm run dev
   ```
4. Tarayıcınızda `http://localhost:5173` adresine giderek sistemi kullanmaya başlayabilirsiniz.
* **Giriş Bilgileri:** Kullanıcı Adı: `admin` | Şifre: `12345` veya `admin`

---

## 🌐 Müşteriye Kurulum ve Bulut Veritabanı (Supabase) Entegrasyonu

Bu yazılımı bir dükkana/müşteriye satacağınızda, verilerin bilgisayar, telefon ve tabletler arasında anlık eşitlenmesi için şu adımları izleyin:

### Adım 1: Supabase Projesi Oluşturma
1. [supabase.com](https://supabase.com) adresine girin ve ücretsiz bir hesap açın.
2. **New Project** diyerek dükkanın adını taşıyan bir proje oluşturun ve veritabanı şifresi belirleyin.

### Adım 2: Tablo Kurulumu
1. Supabase panelinde sol menüdeki **SQL Editor** sayfasına gidin.
2. **New Query** butonuna basarak aşağıdaki SQL kodunu yapıştırın ve **Run** tuşuna basın:

```sql
-- tys_data tablosunu oluştur
create table tys_data (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Herkese okuma ve yazma izni ver (Güvenlik Politikası)
alter table tys_data enable row level security;
create policy "Allow public read" on tys_data for select using (true);
create policy "Allow public insert" on tys_data for insert with check (true);
create policy "Allow public update" on tys_data for update using (true);
```

### Adım 3: Uygulamaya Bağlama
1. Proje klasöründeki `.env` dosyasını açın.
2. Supabase projenizin ayarlarından (**Project Settings -> API**) kopyalayacağınız **Project URL** ve **Anon Key** bilgilerini bu dosyaya yazın:
   ```env
   VITE_SUPABASE_URL=https://proje-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh......
   ```
3. Dosyayı kaydedin. Sistem artık bu veritabanı üzerinden dükkandaki tüm cihazlarda anlık senkronize çalışacaktır!

---

## 🔒 Güvenlik Notu

`.env` dosyası gizli veritabanı anahtarlarını barındırdığı için `.gitignore` dosyasına eklenmiştir. Projeyi GitHub'a yüklerken veya paylaşırken `.env` dosyasının yüklenmediğinden emin olunuz. Her dükkan kurulumunda dükkana özel ayrı bir `.env` dosyası oluşturulmalıdır.
