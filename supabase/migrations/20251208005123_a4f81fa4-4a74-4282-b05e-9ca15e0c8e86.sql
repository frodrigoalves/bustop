-- =====================================================
-- SECURE RLS POLICIES FOR ALL TABLES
-- Allows public INSERT, restricts all other operations to authenticated users
-- =====================================================

-- 1. SINISTROS TABLE
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all access to sinistros" ON public.sinistros;

-- Allow anyone to INSERT (public incident form)
CREATE POLICY "Public can submit incidents" 
ON public.sinistros 
FOR INSERT 
WITH CHECK (true);

-- Only authenticated users can SELECT
CREATE POLICY "Authenticated users can view incidents" 
ON public.sinistros 
FOR SELECT 
TO authenticated 
USING (true);

-- Only authenticated users can UPDATE
CREATE POLICY "Authenticated users can update incidents" 
ON public.sinistros 
FOR UPDATE 
TO authenticated 
USING (true);

-- Only authenticated users can DELETE
CREATE POLICY "Authenticated users can delete incidents" 
ON public.sinistros 
FOR DELETE 
TO authenticated 
USING (true);

-- 2. TESTEMUNHAS TABLE
DROP POLICY IF EXISTS "Allow all access to testemunhas" ON public.testemunhas;

CREATE POLICY "Public can add witnesses" 
ON public.testemunhas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view witnesses" 
ON public.testemunhas 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update witnesses" 
ON public.testemunhas 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete witnesses" 
ON public.testemunhas 
FOR DELETE 
TO authenticated 
USING (true);

-- 3. IMAGENS TABLE
DROP POLICY IF EXISTS "Allow all access to imagens" ON public.imagens;

CREATE POLICY "Public can upload images" 
ON public.imagens 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view images" 
ON public.imagens 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update images" 
ON public.imagens 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete images" 
ON public.imagens 
FOR DELETE 
TO authenticated 
USING (true);

-- 4. DOCUMENTOS_COMPLEMENTARES TABLE
DROP POLICY IF EXISTS "Allow all access to documentos_complementares" ON public.documentos_complementares;

CREATE POLICY "Public can upload documents" 
ON public.documentos_complementares 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view documents" 
ON public.documentos_complementares 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update documents" 
ON public.documentos_complementares 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete documents" 
ON public.documentos_complementares 
FOR DELETE 
TO authenticated 
USING (true);

-- 5. VEICULOS_ENVOLVIDOS TABLE
DROP POLICY IF EXISTS "Allow public insert on veiculos_envolvidos" ON public.veiculos_envolvidos;
DROP POLICY IF EXISTS "Allow public read on veiculos_envolvidos" ON public.veiculos_envolvidos;

CREATE POLICY "Public can add vehicles" 
ON public.veiculos_envolvidos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view vehicles" 
ON public.veiculos_envolvidos 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update vehicles" 
ON public.veiculos_envolvidos 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete vehicles" 
ON public.veiculos_envolvidos 
FOR DELETE 
TO authenticated 
USING (true);