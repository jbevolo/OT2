/**
 * @file dom.js
 * @description Utilidades DOM: selectores centralizados, helpers de
 * visibilidad y funciones de saneamiento/escape de datos.
 */

/**
 * Atajo para document.getElementById.
 * @param {string} id - ID del elemento
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Muestra un elemento quitando la clase 'hidden'.
 * @param {HTMLElement|null} el
 */
export function show(el) {
  if (el) el.classList.remove('hidden');
}

/**
 * Oculta un elemento agregando la clase 'hidden'.
 * @param {HTMLElement|null} el
 */
export function hide(el) {
  if (el) el.classList.add('hidden');
}

/**
 * Escapa un valor para interpolación segura en HTML (prevención de XSS).
 * @param {*} value - Valor a escapar (se convierte a string)
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normaliza el campo 'fotos' de una orden.
 * Supabase puede devolverlo como array, como string único o ausente.
 * @param {*} fotos - Valor crudo del campo fotos
 * @returns {string[]} Siempre un array
 */
export function normalizeFotos(fotos) {
  if (Array.isArray(fotos)) return fotos;
  if (typeof fotos === 'string' && fotos) return [fotos];
  return [];
}

/**
 * Formatea una fecha (formato YYYY-MM-DD) a locale de Argentina.
 * Devuelve '—' si la fecha está vacía o es inválida (evita crashes).
 * @param {string} [fecha]
 * @returns {string}
 */
export function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR');
}

/**
 * Referencias centralizadas a todos los elementos del DOM que usa la app.
 * Se resuelven una sola vez al cargar el módulo.
 * @readonly
 * @type {Object<string, HTMLElement|null>}
 */
export const DOM = {
  authContainer: $('auth-container'),
  appContainer: $('app-container'),
  userDisplay: $('user-display'),
  tableBody: $('orders-table-body'),
  workOrderForm: $('work-order-form'),
  orderNumberInput: $('order-number'),
  fotosInputBack: $('fotos-input-back'),
  fotosInputFront: $('fotos-input-front'),
  fotosInputGallery: $('fotos-input-gallery'),
  fotosPreview: $('fotos-preview'),
  openCameraModal: $('open-camera-modal'),
  cameraSelectModal: $('camera-select-modal'),
  cameraBackBtn: $('camera-back-btn'),
  cameraFrontBtn: $('camera-front-btn'),
  cameraGalleryBtn: $('camera-gallery-btn'),
  cameraCancelBtn: $('camera-cancel-btn'),

  emailInput: $('email'),
  passwordInput: $('password'),
  loginBtn: $('login-btn'),
  registerBtn: $('register-btn'),
  authForm: $('auth-form'),
  logoutBtn: $('logout-btn'),

  searchInput: $('search-input'),
  statusFilter: $('status-filter'),
  paginationControls: $('pagination-controls'),
  dbContainer: $('db-container'),
  saveBtn: $('save-btn'),
  formTitle: $('form-title'),
  cancelEditBtn: $('cancel-edit-btn'),
  finalizacionFields: $('finalizacion-fields'),
  montoEditInput: $('monto-edit'),
  formaPagoEditInput: $('forma-pago-edit'),
  notasExtraEditInput: $('notas-extra-edit'),
  statusEditSelect: $('status-edit'),
  statusEditField: $('status-edit-field'),

  fechaInput: $('fecha'),
  nombreInput: $('nombre'),
  telefonoInput: $('telefono'),
  vehiculoInput: $('vehiculo'),
  dominioInput: $('dominio'),
  novedadesInput: $('novedades'),
  garantiaInput: $('garantia'),
  obleaInput: $('oblea'),
  phInput: $('ph'),
  nvInput: $('nv'),
  retencionInput: $('retencion'),
  manguerasInput: $('mangueras'),

  viewOrderModal: $('view-order-modal'),
  viewOrderContent: $('view-order-content'),
  viewWhatsappBtn: $('view-whatsapp-btn'),
  viewStatusSelect: $('view-status-select'),
  viewStatusSaveBtn: $('view-status-save-btn'),
  viewStatusSection: $('view-status-section'),
  addPhotosSection: $('add-photos-section'),
  addMoreInputBack: $('add-more-input-back'),
  addMoreInputFront: $('add-more-input-front'),
  addMoreInputGallery: $('add-more-input-gallery'),
  openAddMoreCameraModal: $('open-add-more-camera-modal'),
  addMorePreview: $('add-more-preview'),
  uploadMoreBtn: $('upload-more-btn'),

  lightboxModal: $('lightbox-modal'),
  lightboxImg: $('lightbox-img'),

  completeOrderModal: $('complete-order-modal'),
  completeOrderForm: $('complete-order-form'),
  completeOrderId: $('complete-order-id'),
  montoCobradoInput: $('monto-cobrado'),
  formaPagoInput: $('forma-pago'),
  notasExtraInput: $('notas-extra'),
  completeSubmitBtn: $('complete-submit-btn'),

  printDraftBtn: $('print-draft-btn'),

  backupBtn: $('backup-btn'),
  restoreBtn: $('restore-btn'),
  restoreInput: $('restore-input'),
  exportCsvBtn: $('export-csv-btn'),

  notificationModal: $('notification-modal'),
  notificationMessage: $('notification-message'),
  modalButtons: $('modal-buttons'),

  publicContainer: $('public-container'),
  pubOrderNumber: $('pub-order-number'),
  pubOrderStatus: $('pub-order-status'),
  pubVehiculo: $('pub-vehiculo'),
  pubDominio: $('pub-dominio'),
  pubCliente: $('pub-cliente'),
  pubFecha: $('pub-fecha'),
  pubTrabajos: $('pub-trabajos'),
  pubGarantia: $('pub-garantia'),
  pubOblea: $('pub-oblea'),
  pubPh: $('pub-ph'),
  pubNv: $('pub-nv'),
  pubRetencion: $('pub-retencion'),
  pubMangueras: $('pub-mangueras'),
  pubGaleriaSection: $('pub-galeria-section'),
  pubGaleria: $('pub-galeria'),
  pubFinalizacionSection: $('pub-finalizacion-section'),
  pubMonto: $('pub-monto'),
  pubFormaPago: $('pub-forma-pago'),
  pubNotasContainer: $('pub-notas-container'),
  pubNotas: $('pub-notas'),
};