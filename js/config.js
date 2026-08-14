/**
 * @file config.js
 * @description Configuración de Supabase (URL y clave pública anon).
 * La clave anon es segura para exponerse en frontend: RLS protege los datos.
 */

/** @constant {string} URL del proyecto Supabase */
export const SUPABASE_URL = 'https://ipddfmlhcsivjpkqsmcc.supabase.co';

/** @constant {string} Clave pública (anon) de Supabase */
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZGRmbWxoY3Npdmpwa3FzbWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzI4MDAsImV4cCI6MjA5NDI0ODgwMH0.3UfVW1WUtpV31Kb5Ay4p0IcCSB4SIiATS3LJNL0Bqg8';