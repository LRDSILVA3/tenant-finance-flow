-- Migration: Add size_or_variant and image_url to products and order_items + Supabase Storage Bucket 'products'
-- Date: 2026-10-01

-- 1. Adicionar colunas na tabela public.products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS size_or_variant TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Adicionar coluna na tabela public.order_items para histórico imutável
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS size_or_variant TEXT;

-- 3. Configurar Bucket de Storage 'products' no Supabase para imagens de produtos
DO $$
BEGIN
  -- Cria o bucket 'products' caso não exista
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora se storage não estiver habilitado diretamente no ambiente local
    NULL;
END $$;

-- 4. Políticas de RLS para o bucket de produtos (se storage.objects existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    -- Leitura pública das imagens de produtos
    DROP POLICY IF EXISTS "Public Read on products bucket" ON storage.objects;
    CREATE POLICY "Public Read on products bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'products');

    -- Upload de imagens
    DROP POLICY IF EXISTS "Allow upload to products bucket" ON storage.objects;
    CREATE POLICY "Allow upload to products bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'products');

    -- Atualização de imagens
    DROP POLICY IF EXISTS "Allow update in products bucket" ON storage.objects;
    CREATE POLICY "Allow update in products bucket"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'products');

    -- Exclusão de imagens
    DROP POLICY IF EXISTS "Allow delete in products bucket" ON storage.objects;
    CREATE POLICY "Allow delete in products bucket"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'products');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
