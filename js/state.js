/**
 * @file state.js
 * @description Estado global compartido entre módulos + setters simples.
 * Evita variables globales implícitas y centraliza la mutación de estado.
 */

export const state = {
  /** @type {Object|null} Usuario autenticado en Supabase */
  currentUser: null,

  /** @type {Array<Object>} Todas las órdenes del usuario */
  allOrders: [],

  /** @type {Array<Object>} Fotos seleccionadas para subir ({blob, name}) */
  selectedFotosFiles: [],

  /** @type {number} Página actual visible */
  currentPage: 1,

  /** @type {Array<Object>|null} Órdenes filtradas por búsqueda (null = todas) */
  filteredOrders: null,

  /** @type {string|null} Filtro de estado activo (null = todos los estados) */
  statusFilter: null,

  /** @type {string|null} ID de la orden en edición (null = modo creación) */
  editingOrderId: null,

  /** @type {Array<Object>} Fotos pendientes de la sección "añadir más" */
  morePhotosToUpload: [],
};

/** @type {number} Cantidad máxima de órdenes por página */
export const ORDERS_PER_PAGE = 50;

/** @type {Object} Modos del formulario de órdenes */
export const FORM_MODE = { CREATE: 'create', EDIT: 'edit' };

/**
 * Flujo de estados personalizados de una orden de trabajo.
 * value: valor guardado en BD. label: texto visible. color: clases Tailwind del badge.
 */
export const ORDER_STATUSES = [
  { value: 'Abierta', label: 'Abierta', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'En espera de repuesto', label: 'En espera de repuesto', color: 'bg-orange-100 text-orange-800' },
  { value: 'En reparación', label: 'En reparación', color: 'bg-blue-100 text-blue-800' },
  { value: 'Lista para entregar', label: 'Lista para entregar', color: 'bg-teal-100 text-teal-800' },
  { value: 'Finalizada', label: 'Finalizada', color: 'bg-green-100 text-green-800' }
];

/**
 * Devuelve las clases Tailwind del badge para un estado.
 * Estados legacy/desconocidos usan un gris por defecto.
 * @param {string} status - Estado de la orden
 * @returns {string}
 */
export function statusBadgeClass(status) {
  const match = ORDER_STATUSES.find((s) => s.value === status);
  return match ? match.color : 'bg-gray-100 text-gray-800';
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function setAllOrders(orders) {
  state.allOrders = orders;
}

export function setCurrentPage(page) {
  state.currentPage = page;
}

export function setFilteredOrders(orders) {
  state.filteredOrders = orders;
}

export function setStatusFilter(status) {
  state.statusFilter = status;
}

export function setEditingOrderId(id) {
  state.editingOrderId = id;
}