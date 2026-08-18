/**
 * @file dashboard.js
 * @description Dashboard de estadísticas del taller. Página separada
 * (dashboard.html) con acceso restringido a usuarios admin (tabla
 * supabase.admin_users). Reutiliza helpers de dom.js/state.js pero con
 * selectores propios del dashboard (no toca el DOM del index.html).
 */

import { supabaseClient } from './supabase.js';
import { ORDER_STATUSES, statusBadgeClass } from './state.js';
import { escapeHtml, formatFecha } from './dom.js';

/** Atajo local para obtener elementos del dashboard */
const $ = (id) => document.getElementById(id);

/** Todas las órdenes cargadas (filtros se aplican en memoria) */
let allOrders = [];

/** Última lista filtrada (para recargar la tabla con "Mostrar más") */
let listaFiltrada = [];

/** Cantidad de filas visibles en la tabla de órdenes recientes */
let limiteVisible = 50;

/** Nombre interno de la pantalla visible (auth-dash | denied-dash | panel-dash) */
function mostrarPantalla(nombre) {
  ['auth-dash', 'denied-dash', 'panel-dash'].forEach((id) => {
    $(id).classList.toggle('hidden', id !== nombre);
  });
}

/** @type {number|null} Timeout del toast para auto-ocultar */
let toastTimeout = null;

/**
 * Muestra un toast (mensaje en la esquina inferior derecha).
 * @param {string} msg - Mensaje a mostrar
 * @param {string} tipo - 'error' (rojo, valor por defecto) | 'ok' (verde)
 */
function showToast(msg, tipo = 'error') {
  const toast = $('dash-toast');
  const esError = tipo !== 'ok';
  toast.textContent = msg;
  toast.classList.remove('bg-red-600', 'bg-green-600');
  toast.classList.add(esError ? 'bg-red-600' : 'bg-green-600');
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/**
 * Formatea un monto como moneda argentina. '—' si está vacío o inválido.
 * @param {*} valor - Valor numérico a formatear
 * @returns {string}
 */
function formatearMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return '$ ' + Number(valor).toLocaleString('es-AR');
}

/**
 * Recarga las órdenes y recalcula KPIs + tabla según los filtros activos.
 * @async
 */
async function cargarDashboard() {
  const { data, error } = await supabaseClient
    .from('work_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Error cargando datos del dashboard.');
    return;
  }
  allOrders = data || [];
  aplicarFiltros();
}

/**
 * Aplica filtros (estado + rango de fechas sobre created_at) y recalcula
 * los KPIs y la tabla de últimas órdenes activas.
 */
function aplicarFiltros() {
  const estado = $('dash-filtro-estado').value;
  const desde = $('dash-fecha-desde').value;
  const hasta = $('dash-fecha-hasta').value;
  const desdeTime = desde ? new Date(desde + 'T00:00:00').getTime() : null;
  const hastaTime = hasta ? new Date(hasta + 'T23:59:59.999').getTime() : null;

  let lista = allOrders;
  if (estado) lista = lista.filter((o) => o.status === estado);
  if (desdeTime || hastaTime) {
    lista = lista.filter((o) => {
      const t = new Date(o.created_at).getTime();
      if (!isFinite(t)) return false;
      if (desdeTime && t < desdeTime) return false;
      if (hastaTime && t > hastaTime) return false;
      return true;
    });
  }

  limiteVisible = 50;
  listaFiltrada = lista;
  calcularKPIs(lista);
  renderTablaActivas(lista);
}

/**
 * Calcula y actualiza los 7 KPIs del dashboard a partir de la lista filtrada.
 * @param {Array<Object>} lista - Órdenes filtradas
 */
function calcularKPIs(lista) {
  const contar = (pred) => lista.filter(pred).length;
  const finalizadas = lista.filter((o) => o.status === 'Finalizada');
  const ingresos = finalizadas.reduce((acc, o) => acc + (Number(o.monto_cobrado) || 0), 0);

  $('kpi-total').textContent = lista.length;
  $('kpi-activas').textContent = contar((o) => o.status !== 'Finalizada');
  $('kpi-espera').textContent = contar((o) => o.status === 'En espera de repuesto');
  $('kpi-reparacion').textContent = contar((o) => o.status === 'En reparación');
  $('kpi-listas').textContent = contar((o) => o.status === 'Lista para entregar');
  $('kpi-finalizadas').textContent = finalizadas.length;
  $('kpi-ingresos').textContent = formatearMoneda(ingresos);
}

/**
 * Genera el HTML de un select de estado con estilos de badge según el estado
 * actual de la orden. Incluye el estado de la fila como opción por si es un
 * valor heredado que ya no existe en ORDER_STATUSES.
 * @param {string} status - Estado actual de la orden
 * @returns {string} HTML del select
 */
function statusSelectHtml(status) {
  const opciones = ORDER_STATUSES.map((s) => {
    const sel = s.value === status ? ' selected' : '';
    return `<option value="${escapeHtml(s.value)}"${sel}>${escapeHtml(s.label)}</option>`;
  }).join('');
  const heredado =
    ORDER_STATUSES.some((s) => s.value === status)
      ? ''
      : `<option value="${escapeHtml(status)}" selected>${escapeHtml(status)}</option>`;
  return (
    '<select class="dash-status-select px-2 py-1 rounded-full text-xs font-semibold ' +
    statusBadgeClass(status) +
    ' border border-transparent cursor-pointer">' +
    opciones +
    heredado +
    '</select>'
  );
}

/**
 * Muestra u oculta el botón "Mostrar más" según queden filas por cargar.
 * @param {number} total - Cantidad de filas en la lista filtrada
 */
function toggleBotonMostrarMas(total) {
  $('btn-mostrar-mas').classList.toggle('hidden', total <= limiteVisible);
}

/**
 * Renderiza las órdenes recientes (todas las de la lista filtrada, sean
 * activas o Finalizada) limitadas a `limiteVisible`, con select de estado.
 * @param {Array<Object>} lista - Órdenes filtradas
 */
function renderTablaActivas(lista) {
  const tbody = $('tbody-ultimas');
  const visibles = lista.slice(0, limiteVisible);

  tbody.innerHTML = '';
  if (visibles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-gray-500">No hay órdenes con los filtros seleccionados.</td></tr>`;
    toggleBotonMostrarMas(lista.length);
    return;
  }

  visibles.forEach((o) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3 font-bold">#${escapeHtml(o.order_number)}</td>
      <td class="px-4 py-3">${escapeHtml(formatFecha(o.fecha))}</td>
      <td class="px-4 py-3">${escapeHtml(o.nombre)}</td>
      <td class="px-4 py-3">${escapeHtml(o.vehiculo)}</td>
      <td class="px-4 py-3"><span class="bg-gray-200 px-2 py-1 rounded font-mono text-xs font-bold">${escapeHtml(o.dominio)}</span></td>
      <td class="px-4 py-3">${statusSelectHtml(o.status)}</td>
      <td class="px-4 py-3">${formatearMoneda(o.monto_cobrado)}</td>
    `;
    const select = tr.querySelector('.dash-status-select');
    select.addEventListener('change', async (e) => {
      e.stopPropagation();
      const nuevoEstado = select.value;
      select.disabled = true;
      const { error } = await supabaseClient
        .from('work_orders')
        .update({ status: nuevoEstado })
        .eq('id', o.id);
      select.disabled = false;
      if (error) {
        select.value = o.status;
        showToast('Error al actualizar el estado: ' + error.message, 'error');
        return;
      }
      showToast(`Estado actualizado a ${nuevoEstado}.`, 'ok');
      cargarDashboard();
    });
    tbody.appendChild(tr);
  });

  toggleBotonMostrarMas(lista.length);
}

/**
 * Punto de entrada del dashboard: verifica sesión y permisos de admin.
 * Sin sesión → login. Con sesión pero sin permiso → acceso denegado.
 * Admin → panel + carga de datos.
 * @async
 */
export async function initDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    mostrarPantalla('auth-dash');
    return;
  }

  const { data: isAdmin, error } = await supabaseClient.rpc('is_dashboard_admin');
  if (error || !isAdmin) {
    console.error('Error verificando permisos de dashboard:', error);
    mostrarPantalla('denied-dash');
    return;
  }

  $('dash-user-display').textContent = `Sesión iniciada como: ${session.user.email}`;
  mostrarPantalla('panel-dash');
  cargarDashboard();
}

// --- POPULACIÓN DE OPCIONES Y EVENT LISTENERS: DASHBOARD ---

// Select de filtro por estado a partir de ORDER_STATUSES
const filtroEstado = $('dash-filtro-estado');
filtroEstado.innerHTML =
  '<option value="">Todos los estados</option>' +
  ORDER_STATUSES.map((s) => `<option value="${escapeHtml(s.value)}">${escapeHtml(s.label)}</option>`).join('');

// Los filtros se recalculan automáticamente al cambiar
filtroEstado.addEventListener('change', aplicarFiltros);
$('dash-fecha-desde').addEventListener('change', aplicarFiltros);
$('dash-fecha-hasta').addEventListener('change', aplicarFiltros);

// Carga 50 filas más desde la lista filtrada actual
$('btn-mostrar-mas').addEventListener('click', () => {
  limiteVisible += 50;
  renderTablaActivas(listaFiltrada);
});

// Login del dashboard (sin registro)
$('dash-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('dash-email').value.trim();
  const password = $('dash-password').value.trim();

  if (!email || !password) {
    showToast('Por favor, ingresa correo y contraseña.');
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) showToast('Error: ' + error.message);
  else initDashboard();
});

// Salir: vuelve a la pantalla de login del dashboard
$('dash-logout-btn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  mostrarPantalla('auth-dash');
});

// --- INICIALIZACIÓN ---
initDashboard();