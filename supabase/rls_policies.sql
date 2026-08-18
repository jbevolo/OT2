-- =====================================================================
-- Gestión de Taller OT — Políticas RLS y función de vista pública
-- Ejecutar en Supabase Dashboard → SQL Editor (una sola vez).
-- El orden importa: primero RLS + políticas, luego la función RPC.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Habilitar Row Level Security en la tabla de órdenes
-- ---------------------------------------------------------------------
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Políticas del panel administrativo (rol authenticated)
--    Cada usuario SOLO ve/edita/borra sus propias órdenes.
-- ---------------------------------------------------------------------

-- Ver solo órdenes propias
CREATE POLICY "admin_select_own" ON public.work_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Crear órdenes propias
CREATE POLICY "admin_insert_own" ON public.work_orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Editar órdenes propias (finalizar, fotos, etc.)
CREATE POLICY "admin_update_own" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Borrar órdenes propias
CREATE POLICY "admin_delete_own" ON public.work_orders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Función RPC para la vista pública del cliente (rol anon)
--    NUNCA se expone la tabla work_orders al anon. La función solo
--    devuelve las columnas públicas y únicamente para el id solicitado.
--    SECURITY DEFINER: corre con permisos del owner (postgres) y omite
--    RLS SOLO dentro de esta función acotada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_order(p_id uuid)
RETURNS TABLE (
  order_number   integer,
  status         text,
  fecha          text,
  nombre         text,
  vehiculo       text,
  dominio        text,
  novedades      text,
  garantia       boolean,
  oblea          boolean,
  ph             boolean,
  nv             boolean,
  retencion      boolean,
  mangueras      boolean,
  fotos          jsonb,
  monto_cobrado  numeric,
  forma_pago     text,
  notas_extra    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.order_number,
    w.status,
    w.fecha,
    w.nombre,
    w.vehiculo,
    w.dominio,
    w.novedades,
    w.garantia,
    w.oblea,
    w.ph,
    w.nv,
    w.retencion,
    w.mangueras,
    w.fotos,
    w.monto_cobrado,
    w.forma_pago,
    w.notas_extra
  FROM public.work_orders w
  WHERE w.id = p_id
  LIMIT 1;
END;
$$;

-- Permitir que el rol anon ejecute la función (solo esta función,
-- nunca la tabla directamente).
GRANT EXECUTE ON FUNCTION public.get_public_order(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. (Opcional) Revocar privilegios directos de la tabla al anon,
--    por si antes existían políticas permisivas.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.work_orders FROM anon;
