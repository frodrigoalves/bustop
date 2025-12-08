-- =====================================================
-- ROLE-BASED ACCESS CONTROL SYSTEM
-- Restricts sensitive data access to authorized personnel only
-- =====================================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles (will use function)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 3. Create SECURITY DEFINER function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Helper function to check if user is admin or analyst
CREATE OR REPLACE FUNCTION public.is_authorized_personnel(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role IN ('admin', 'analyst')
    )
$$;

-- 4. Update RLS policies to use role-based access

-- TESTEMUNHAS: Only admin/analyst can view witness data
DROP POLICY IF EXISTS "Authenticated users can view witnesses" ON public.testemunhas;
DROP POLICY IF EXISTS "Authenticated users can update witnesses" ON public.testemunhas;
DROP POLICY IF EXISTS "Authenticated users can delete witnesses" ON public.testemunhas;

CREATE POLICY "Authorized personnel can view witnesses"
ON public.testemunhas
FOR SELECT
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can update witnesses"
ON public.testemunhas
FOR UPDATE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can delete witnesses"
ON public.testemunhas
FOR DELETE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

-- SINISTROS: Only admin/analyst can view/modify incidents
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.sinistros;
DROP POLICY IF EXISTS "Authenticated users can update incidents" ON public.sinistros;
DROP POLICY IF EXISTS "Authenticated users can delete incidents" ON public.sinistros;

CREATE POLICY "Authorized personnel can view incidents"
ON public.sinistros
FOR SELECT
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can update incidents"
ON public.sinistros
FOR UPDATE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can delete incidents"
ON public.sinistros
FOR DELETE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

-- VEICULOS_ENVOLVIDOS: Only admin/analyst can view/modify vehicles
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.veiculos_envolvidos;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.veiculos_envolvidos;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.veiculos_envolvidos;

CREATE POLICY "Authorized personnel can view vehicles"
ON public.veiculos_envolvidos
FOR SELECT
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can update vehicles"
ON public.veiculos_envolvidos
FOR UPDATE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can delete vehicles"
ON public.veiculos_envolvidos
FOR DELETE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

-- IMAGENS: Only admin/analyst can view/modify images
DROP POLICY IF EXISTS "Authenticated users can view images" ON public.imagens;
DROP POLICY IF EXISTS "Authenticated users can update images" ON public.imagens;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON public.imagens;

CREATE POLICY "Authorized personnel can view images"
ON public.imagens
FOR SELECT
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can update images"
ON public.imagens
FOR UPDATE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can delete images"
ON public.imagens
FOR DELETE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

-- DOCUMENTOS_COMPLEMENTARES: Only admin/analyst can view/modify documents
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documentos_complementares;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documentos_complementares;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documentos_complementares;

CREATE POLICY "Authorized personnel can view documents"
ON public.documentos_complementares
FOR SELECT
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can update documents"
ON public.documentos_complementares
FOR UPDATE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));

CREATE POLICY "Authorized personnel can delete documents"
ON public.documentos_complementares
FOR DELETE
TO authenticated
USING (public.is_authorized_personnel(auth.uid()));