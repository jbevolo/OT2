/**
 * @file supabase.js
 * @description Cliente de Supabase inicializado. Supabase se carga por CDN
 * como script clásico, así que el cliente se obtiene desde window.supabase.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const { createClient } = window.supabase;

/** @type {SupabaseClient} Cliente de Supabase listo para usar en toda la app */
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);