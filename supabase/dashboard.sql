-- =====================================================================
-- Gestión de Taller OT — Dashboard: tabla de administradores y acceso
-- Ejecutar en Supabase Dashboard → SQL Editor (una sola vez).
-- El dashboard muestra estadísticas globales únicamente a usuarios cuyo
-- email figure en public.admin_users.
-- =====================================================================

-- Tabla de administradores del dashboard
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon;
REVOKE ALL ON public.admin_users FROM authenticated;

-- Función RPC de verificación de acceso al dashboard.
-- SECURITY DEFINER: corre con permisos del owner y solo lee admin_users.
-- La tabla nunca queda expuesta a los roles de la app.
CREATE OR REPLACE FUNCTION public.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

REVOKE ALL ON FUNCTION public.is_dashboard_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_dashboard_admin() TO authenticated;