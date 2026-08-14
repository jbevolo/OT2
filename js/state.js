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

  /** @type {Array<Object>} Fotos pendientes de la sección "añadir más" */
  morePhotosToUpload: [],
};

/** @type {number} Cantidad máxima de órdenes por página */
export const ORDERS_PER_PAGE = 50;

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