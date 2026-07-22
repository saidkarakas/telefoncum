-- ========================================================
-- TELEFON YÖNETİM SİSTEMİ (TYS) - SUPABASE VERİTABANI ŞEMASI
-- ========================================================
-- Bu SQL betiği, Supabase üzerinde TYS projesi için gerekli olan
-- `tys_data` tablosunu ve yetkilendirme (RLS) politikalarını oluşturur.

-- 1. `tys_data` Ana Tablosunun Oluşturulması
CREATE TABLE IF NOT EXISTS public.tys_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_owner_key UNIQUE (owner_id, key)
);

-- 2. Dizinler (Performance Indexes)
CREATE INDEX IF NOT EXISTS idx_tys_data_owner_id ON public.tys_data(owner_id);
CREATE INDEX IF NOT EXISTS idx_tys_data_key ON public.tys_data(key);
CREATE INDEX IF NOT EXISTS idx_tys_data_owner_key ON public.tys_data(owner_id, key);

-- 3. Row Level Security (RLS) Yetki Kuralları
ALTER TABLE public.tys_data ENABLE ROW LEVEL SECURITY;

-- Okuma Politikası (Kullanıcı Sadece Kendi Verisini Görebilir)
CREATE POLICY "Users can read their own tys_data"
ON public.tys_data
FOR SELECT
USING (auth.uid() = owner_id);

-- Ekleme Politikası (Kullanıcı Sadece Kendi Verisini Ekleyebilir)
CREATE POLICY "Users can insert their own tys_data"
ON public.tys_data
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Güncelleme Politikası (Kullanıcı Sadece Kendi Verisini Güncelleyebilir)
CREATE POLICY "Users can update their own tys_data"
ON public.tys_data
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Silme Politikası (Kullanıcı Sadece Kendi Verisini Silebilir)
CREATE POLICY "Users can delete their own tys_data"
ON public.tys_data
FOR DELETE
USING (auth.uid() = owner_id);

-- 4. Supabase Realtime (Canlı Senkronizasyon) Yayınına Ekleme
ALTER PUBLICATION supabase_realtime ADD TABLE public.tys_data;
