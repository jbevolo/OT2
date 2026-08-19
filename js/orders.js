/**
 * @file orders.js
 * @description CRUD de órdenes de trabajo: fetch, render, paginación,
 * búsqueda, guardado, vista detalle, finalización y eliminación.
 */

import { supabaseClient } from './supabase.js';
import { state, setAllOrders, setCurrentPage, setFilteredOrders, setStatusFilter, setEditingOrderId, statusBadgeClass, ORDER_STATUSES, FORM_MODE, ORDERS_PER_PAGE } from './state.js';
import { DOM, escapeHtml, normalizeFotos } from './dom.js';
import { showNotification } from './notify.js';
import { shareViaWhatsApp, openLightbox } from './share.js';
import { setupAddMorePhotos, deleteSpecificPhoto, uploadPhotos, renderFotosPreview } from './photos.js';
import { printWorkOrder } from './print.js';

/**
 * Obtiene todas las órdenes de trabajo del usuario desde Supabase.
 * Actualiza el estado, renderiza la tabla y establece el siguiente número.
 * @async
 */
export async function fetchOrders() {
  const { data, error } = await supabaseClient
    .from('work_orders')
    .select('*')
    .order('order_number', { ascending: false });

  if (error) {
    console.error(error);
    showNotification('Error cargando órdenes.');
  } else {
    setAllOrders(data);
    // Resetear paginación y filtros al cargar datos frescos
    setCurrentPage(1);
    setFilteredOrders(null);
    setStatusFilter(null);
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.statusFilter) DOM.statusFilter.value = '';

    renderOrders();
    setNextOrderNumber();
  }
}

/**
 * Calcula las órdenes a mostrar combinando los filtros activos:
 * búsqueda (state.filteredOrders) AND estado (state.statusFilter).
 * @returns {Array<Object>} Órdenes resultantes de aplicar todos los filtros
 */
export function applyFilters() {
  let list = state.filteredOrders !== null ? state.filteredOrders : state.allOrders;
  if (state.statusFilter !== null) {
    list = list.filter((order) => order.status === state.statusFilter);
  }
  return list;
}

/**
 * Renderiza la tabla de órdenes en el DOM con paginación.
 * @param {Array<Object>} [orders] - Órdenes a mostrar (usa el estado si no se provee)
 */
export function renderOrders(orders) {
  // Determinar qué órdenes usar
  const sourceOrders = orders || applyFilters();

  // Calcular paginación
  const totalOrders = sourceOrders.length;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  // Ajustar currentPage si es necesario
  if (state.currentPage > totalPages && totalPages > 0) {
    state.currentPage = totalPages;
  }
  if (state.currentPage < 1) state.currentPage = 1;

  const start = (state.currentPage - 1) * ORDERS_PER_PAGE;
  const end = start + ORDERS_PER_PAGE;
  const pageOrders = sourceOrders.slice(start, end);

  DOM.tableBody.innerHTML = '';

  if (totalOrders === 0) {
    const hasActiveFilter = state.filteredOrders !== null || state.statusFilter !== null;
    const message = hasActiveFilter ? 'No se encontraron órdenes con ese criterio.' : 'No hay órdenes registradas.';
    DOM.tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-gray-500">${message}</td></tr>`;
    renderPagination(0, 0);
    return;
  }

  pageOrders.forEach((order) => {
    const tr = document.createElement('tr');
    const statusColor = statusBadgeClass(order.status);
    const hasFotos = normalizeFotos(order.fotos).length > 0;

    tr.innerHTML = `
      <td class="px-4 py-4 font-bold">#${escapeHtml(order.order_number)}</td>
      <td class="px-4 py-4">${escapeHtml(order.fecha)}</td>
      <td class="px-4 py-4">${escapeHtml(order.nombre)}</td>
      <td class="px-4 py-4">${escapeHtml(order.vehiculo)}</td>
      <td class="px-4 py-4"><span class="bg-gray-200 px-2 py-1 rounded font-mono text-xs font-bold">${escapeHtml(order.dominio)}</span></td>
      <td class="px-4 py-4 text-center">
        ${hasFotos ? `<i class="fas fa-camera text-indigo-500" title="${escapeHtml(normalizeFotos(order.fotos).length)} fotos"></i>` : `<span class="text-gray-300">-</span>`}
      </td>
      <td class="px-4 py-4"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColor}">${escapeHtml(order.status)}</span></td>
      <td class="px-4 py-4 text-sm">
        <div class="flex items-center space-x-3">
          <button class="edit-btn text-indigo-600 hover:text-indigo-900" title="Editar"><i class="fas fa-pencil-alt fa-lg"></i></button>
          <button class="view-btn text-blue-600 hover:text-blue-900" title="Ver Detalles"><i class="fas fa-eye fa-lg"></i></button>
          <button class="whatsapp-btn text-green-500 hover:text-green-700" title="Enviar por WhatsApp"><i class="fab fa-whatsapp fa-lg"></i></button>
          ${order.status !== 'Finalizada' ? `<button class="complete-btn text-green-600 hover:text-green-900" title="Finalizar"><i class="fas fa-check-circle fa-lg"></i></button>` : ''}
          <button class="print-btn text-indigo-600 hover:text-indigo-900" title="Imprimir"><i class="fas fa-print fa-lg"></i></button>
          <button class="delete-btn text-red-600 hover:text-red-900" title="Eliminar"><i class="fas fa-trash fa-lg"></i></button>
        </div>
      </td>
    `;

    tr.querySelector('.edit-btn').onclick = () => startEditOrder(order);
    tr.querySelector('.view-btn').onclick = () => viewOrder(order);
    tr.querySelector('.whatsapp-btn').onclick = () => shareViaWhatsApp(order);
    if (order.status !== 'Finalizada') {
      tr.querySelector('.complete-btn').onclick = () => openCompleteModal(order);
    }
    tr.querySelector('.print-btn').onclick = () => printWorkOrder(order);
    tr.querySelector('.delete-btn').onclick = () => deleteOrder(order.id, order.order_number);
    DOM.tableBody.appendChild(tr);
  });

  renderPagination(totalOrders, totalPages);
}

/**
 * Renderiza los controles de paginación debajo de la tabla.
 * @param {number} totalOrders - Total de órdenes (filtradas o todas)
 * @param {number} totalPages - Total de páginas calculadas
 */
export function renderPagination(totalOrders, totalPages) {
  const container = DOM.paginationControls;
  if (!container) return;

  if (totalOrders === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const start = (state.currentPage - 1) * ORDERS_PER_PAGE + 1;
  const end = Math.min(state.currentPage * ORDERS_PER_PAGE, totalOrders);

  const isFirstPage = state.currentPage === 1;
  const isLastPage = state.currentPage === totalPages;

  container.innerHTML = `
    <div class="flex justify-between items-center">
      <div class="text-sm text-gray-600">
        Mostrando <span class="font-bold">${start}</span> - <span class="font-bold">${end}</span> de <span class="font-bold">${totalOrders}</span> órdenes
        ${state.filteredOrders !== null || state.statusFilter !== null ? ' (filtradas)' : ''}
      </div>
      <div class="flex items-center space-x-2">
        <button id="prev-page-btn"
          class="px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isFirstPage ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}"
          ${isFirstPage ? 'disabled' : ''}>
          <i class="fas fa-chevron-left mr-1"></i> Anterior
        </button>
        <span class="px-3 py-2 text-sm font-medium text-gray-700">
          Página ${state.currentPage} de ${totalPages}
        </span>
        <button id="next-page-btn"
          class="px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isLastPage ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}"
          ${isLastPage ? 'disabled' : ''}>
          Siguiente <i class="fas fa-chevron-right ml-1"></i>
        </button>
      </div>
    </div>
  `;

  // Event listeners para navegación
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn && !isFirstPage) {
    prevBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
  }
  if (nextBtn && !isLastPage) {
    nextBtn.addEventListener('click', () => goToPage(state.currentPage + 1));
  }
}

/**
 * Navega a una página específica y re-renderiza la tabla.
 * @param {number} page - Número de página a mostrar
 */
export function goToPage(page) {
  state.currentPage = page;
  renderOrders();
  // Scroll suave hacia la tabla
  if (DOM.dbContainer) DOM.dbContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Filtra las órdenes por texto de búsqueda (número, cliente, vehículo, dominio, teléfono).
 * @param {string} query - Texto de búsqueda
 */
export function filterOrders(query) {
  const searchTerm = query.trim().toLowerCase();

  if (!searchTerm) {
    // Si el campo está vacío, mostrar todas las órdenes
    setFilteredOrders(null);
    setCurrentPage(1);
    renderOrders();
    return;
  }

  // Filtrar órdenes que contengan el término en cualquier campo relevante
  setFilteredOrders(
    state.allOrders.filter((order) => {
      const orderNum = String(order.order_number).toLowerCase();
      const nombre = (order.nombre || '').toLowerCase();
      const vehiculo = (order.vehiculo || '').toLowerCase();
      const dominio = (order.dominio || '').toLowerCase();
      const telefono = (order.telefono || '').toLowerCase();

      return (
        orderNum.includes(searchTerm) ||
        nombre.includes(searchTerm) ||
        vehiculo.includes(searchTerm) ||
        dominio.includes(searchTerm) ||
        telefono.includes(searchTerm)
      );
    })
  );

  // Resetear a primera página con los resultados filtrados
  setCurrentPage(1);
  renderOrders();
}

/**
 * Calcula y establece el siguiente número de orden disponible.
 */
export function setNextOrderNumber() {
  const maxOrder = state.allOrders.reduce((max, o) => Math.max(max, Number(o.order_number) || 0), 0);
  DOM.orderNumberInput.value = maxOrder + 1;
}

/**
 * Maneja el envío del formulario de orden de trabajo.
 * Modo CREATE: sube fotos y hace INSERT con status 'Abierta'.
 * Modo EDIT: hace UPDATE .eq('id', state.editingOrderId) preservando fotos
 * y user_id existentes. El estado se toma del select #status-edit; los campos
 * de finalización (monto/forma de pago/notas) solo se envían si el estado
 * elegido es 'Finalizada' (si no, se conservan los valores previos en la BD).
 * @async
 * @param {Event} e - Evento submit del formulario
 */
export async function saveOrder(e) {
  e.preventDefault();
  const isEditing = state.editingOrderId !== null;
  const saveBtn = DOM.saveBtn;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;

  try {
    // 1. Subir fotos a Supabase Storage (solo al crear; en edición se agregan
    //    desde el modal de detalle con "Añadir más fotos")
    let fotoUrls = [];
    if (!isEditing) {
      fotoUrls = await uploadPhotos(state.selectedFotosFiles);
    }

    // 2. Datos comunes del formulario
    const orderData = {
      order_number: parseInt(DOM.orderNumberInput.value),
      fecha: DOM.fechaInput.value,
      nombre: DOM.nombreInput.value,
      telefono: DOM.telefonoInput.value,
      vehiculo: DOM.vehiculoInput.value,
      dominio: DOM.dominioInput.value.toUpperCase(),
      novedades: DOM.novedadesInput.value,
      garantia: DOM.garantiaInput.checked,
      oblea: DOM.obleaInput.checked,
      ph: DOM.phInput.checked,
      nv: DOM.nvInput.checked,
      retencion: DOM.retencionInput.checked,
      mangueras: DOM.manguerasInput.checked,
    };

    let error;
    if (isEditing) {
      // Conservar fotos/user_id: no se incluyen en el UPDATE.
      // El estado se toma del select del form; los campos de finalización solo
      // se envían si el estado elegido es 'Finalizada'.
      orderData.status = DOM.statusEditSelect.value;
      if (orderData.status === 'Finalizada') {
        orderData.monto_cobrado = DOM.montoEditInput.value === '' ? null : parseFloat(DOM.montoEditInput.value);
        orderData.forma_pago = DOM.formaPagoEditInput.value;
        orderData.notas_extra = DOM.notasExtraEditInput.value;
      }
      const { error: updErr } = await supabaseClient
        .from('work_orders')
        .update(orderData)
        .eq('id', state.editingOrderId);
      error = updErr;
    } else {
      const newOrder = {
        ...orderData,
        user_id: state.currentUser.id,
        fotos: fotoUrls,
        status: 'Abierta',
      };
      const { error: insErr } = await supabaseClient.from('work_orders').insert([newOrder]);
      error = insErr;
    }

    if (error) throw error;

    if (isEditing) {
      showNotification(`Orden #${orderData.order_number} actualizada.`);
      resetFormToCreate();
    } else {
      showNotification('Orden guardada online correctamente.');
      DOM.workOrderForm.reset();
      state.selectedFotosFiles = [];
      renderFotosPreview();
    }
    fetchOrders();
  } catch (err) {
    console.error(err);
    showNotification('Error al guardar: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = isEditing
      ? `<i class="fas fa-cloud-upload-alt mr-2"></i> Actualizar Orden`
      : `<i class="fas fa-cloud-upload-alt mr-2"></i> Guardar en la Nube`;
  }
}

/**
 * Cambia el formulario al modo edición de una orden y lo rellena.
 * El título pasa a "Editar Orden #N" y el botón de guardar a "Actualizar Orden".
 * @param {Object} order - Objeto orden a editar
 */
export function startEditOrder(order) {
  setEditingOrderId(order.id);
  fillFormForEdit(order);

  DOM.formTitle.textContent = `Editar Orden #${order.order_number}`;
  DOM.cancelEditBtn.classList.remove('hidden');
  DOM.statusEditField.classList.remove('hidden');
  syncFinalizacionFieldsWithStatus();
  setSaveBtnLabel(FORM_MODE.EDIT);

  // En edición no se suben fotos nuevas desde el formulario
  state.selectedFotosFiles = [];
  renderFotosPreview();

  DOM.workOrderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Rellena todos los campos editables del formulario con los datos de la orden.
 * Si la orden estaba Finalizada carga monto/forma de pago/notas; si no, los deja
 * vacíos (el guardado preserva los valores previos en la BD).
 * @param {Object} order - Objeto orden a editar
 */
function fillFormForEdit(order) {
  DOM.orderNumberInput.value = order.order_number;
  DOM.fechaInput.value = order.fecha || '';
  DOM.nombreInput.value = order.nombre || '';
  DOM.telefonoInput.value = order.telefono || '';
  DOM.vehiculoInput.value = order.vehiculo || '';
  DOM.dominioInput.value = order.dominio || '';
  DOM.novedadesInput.value = order.novedades || '';
  DOM.garantiaInput.checked = !!order.garantia;
  DOM.obleaInput.checked = !!order.oblea;
  DOM.phInput.checked = !!order.ph;
  DOM.nvInput.checked = !!order.nv;
  DOM.retencionInput.checked = !!order.retencion;
  DOM.manguerasInput.checked = !!order.mangueras;
  DOM.statusEditSelect.value = order.status;

  if (order.status === 'Finalizada') {
    DOM.montoEditInput.value = order.monto_cobrado != null ? order.monto_cobrado : '';
    DOM.formaPagoEditInput.value = order.forma_pago || '';
    DOM.notasExtraEditInput.value = order.notas_extra || '';
  } else {
    DOM.montoEditInput.value = '';
    DOM.formaPagoEditInput.value = '';
    DOM.notasExtraEditInput.value = '';
  }
}

/**
 * Vuelve el formulario al modo creación: limpia campos, oculta controles de
 * edición y restablece el título y el botón de guardar.
 */
export function resetFormToCreate() {
  setEditingOrderId(null);
  DOM.workOrderForm.reset();
  DOM.formTitle.textContent = 'Nueva Orden';
  DOM.cancelEditBtn.classList.add('hidden');
  DOM.statusEditField.classList.add('hidden');
  DOM.statusEditSelect.value = 'Abierta';
  DOM.finalizacionFields.classList.add('hidden');
  state.selectedFotosFiles = [];
  renderFotosPreview();
  setSaveBtnLabel(FORM_MODE.CREATE);
  setNextOrderNumber();
}

/**
 * Actualiza el texto/icono del botón de guardar según el modo del formulario.
 * @param {string} mode - Modo del formulario (FORM_MODE.CREATE o FORM_MODE.EDIT)
 */
function setSaveBtnLabel(mode) {
  DOM.saveBtn.innerHTML =
    mode === FORM_MODE.EDIT
      ? `<i class="fas fa-cloud-upload-alt mr-2"></i> Actualizar Orden`
      : `<i class="fas fa-cloud-upload-alt mr-2"></i> Guardar en la Nube`;
}

/**
 * Elimina una orden de trabajo de Supabase con confirmación.
 * @async
 * @param {string} id - UUID de la orden en Supabase
 * @param {number} num - Número de orden (para mostrar en confirmación)
 */
export async function deleteOrder(id, num) {
  showNotification(`¿Eliminar orden #${num} de la nube?`, true, async () => {
    const { error } = await supabaseClient.from('work_orders').delete().eq('id', id);
    if (error) showNotification('Error al eliminar.');
    else fetchOrders();
  });
}

/**
 * Abre el modal de detalle completo de una orden.
 * Los botones de borrado de fotos se asignan por closure (no onclick inline),
 * evitando que URLs con comillas rompan el HTML.
 * @param {Object} order - Objeto orden completo desde Supabase
 */
export function viewOrder(order) {
  const modal = DOM.viewOrderModal;
  const content = DOM.viewOrderContent;
  const fotos = normalizeFotos(order.fotos);

  content.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><p class="text-xs text-gray-500">N° Orden</p><p class="font-bold text-lg">#${escapeHtml(order.order_number)}</p></div>
      <div><p class="text-xs text-gray-500">Fecha</p><p class="font-bold text-lg">${escapeHtml(order.fecha)}</p></div>
      <div><p class="text-xs text-gray-500">Cliente</p><p class="font-bold text-lg">${escapeHtml(order.nombre)}</p></div>
      <div><p class="text-xs text-gray-500">Teléfono</p><p class="font-bold text-lg"><a href="tel:${escapeHtml(order.telefono)}" class="text-indigo-600">${escapeHtml(order.telefono) || 'N/A'}</a></p></div>
      <div><p class="text-xs text-gray-500">Vehículo</p><p class="font-bold text-lg">${escapeHtml(order.vehiculo)} (${escapeHtml(order.dominio)})</p></div>
      <div class="col-span-2"><p class="text-xs text-gray-500">Novedades / Trabajos</p><p class="p-3 bg-gray-50 rounded-lg mt-1 border">${escapeHtml(order.novedades).replace(/\n/g, '<br>')}</p></div>

      <div class="col-span-2 grid grid-cols-3 gap-2 mt-2 bg-gray-50 p-2 rounded border">
        <div class="text-xs ${order.garantia ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.garantia ? 'fa-check-square' : 'fa-square'} mr-1"></i> Garantía</div>
        <div class="text-xs ${order.oblea ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.oblea ? 'fa-check-square' : 'fa-square'} mr-1"></i> Oblea</div>
        <div class="text-xs ${order.ph ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.ph ? 'fa-check-square' : 'fa-square'} mr-1"></i> PH</div>
        <div class="text-xs ${order.nv ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.nv ? 'fa-check-square' : 'fa-square'} mr-1"></i> NV</div>
        <div class="text-xs ${order.retencion ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.retencion ? 'fa-check-square' : 'fa-square'} mr-1"></i> Retención</div>
        <div class="text-xs ${order.mangueras ? 'text-indigo-600 font-bold' : 'text-gray-400'}"><i class="fas ${order.mangueras ? 'fa-check-square' : 'fa-square'} mr-1"></i> Mangueras</div>
      </div>
    </div>
  `;

  // Galería de fotos: botones de borrado por closure para evitar XSS por URL
  if (fotos.length > 0) {
    const section = document.createElement('div');
    section.className = 'col-span-2 pt-4 border-t mt-4';
    section.innerHTML = '<h3 class="text-sm font-bold text-gray-700 mb-2">Galería de Fotos</h3>';

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-3';

    fotos.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'relative aspect-square overflow-hidden rounded-lg border shadow-sm group';
      div.innerHTML = `
        <img src="${escapeHtml(f)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 cursor-zoom-in">
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all pointer-events-none"></div>
        <button class="delete-foto-btn absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Borrar Foto">
          <i class="fas fa-trash-alt text-xs"></i>
        </button>
      `;
      div.querySelector('img').onclick = (e) => openLightbox(f, e);
      div.querySelector('.delete-foto-btn').onclick = () => deleteSpecificPhoto(order.id, f, i, () => fetchOrders());
      grid.appendChild(div);
    });

    section.appendChild(grid);
    content.appendChild(section);
  }

  // Detalles de finalización (si aplica)
  if (order.status === 'Finalizada') {
    const section = document.createElement('div');
    section.className = 'col-span-2 pt-4 border-t mt-4';
    section.innerHTML = `
      <h3 class="text-sm font-bold text-green-700">Detalles de Finalización</h3>
      <div class="grid grid-cols-2 gap-4 mt-2">
        <div><p class="text-xs text-gray-500">Monto Cobrado</p><p class="font-bold text-lg text-green-700">$ ${escapeHtml(order.monto_cobrado)}</p></div>
        <div><p class="text-xs text-gray-500">Forma de Pago</p><p class="font-bold text-lg text-indigo-700">${escapeHtml(order.forma_pago) || 'No especificada'}</p></div>
        ${order.notas_extra ? `<div class="col-span-2"><p class="text-xs text-gray-500">Notas Adicionales</p><p class="p-3 bg-green-50 text-green-900 rounded-lg mt-1 border border-green-100 text-sm leading-relaxed">${escapeHtml(order.notas_extra)}</p></div>` : ''}
      </div>
    `;
    content.appendChild(section);
  }

  // Preparar sección de añadir más fotos
  const addSection = DOM.addPhotosSection;
  if (order.status !== 'Finalizada') {
    addSection.classList.remove('hidden');
    setupAddMorePhotos(order, () => fetchOrders());
  } else {
    addSection.classList.add('hidden');
  }

  modal.classList.remove('hidden');

  // Configurar botón de WhatsApp en el modal
  DOM.viewWhatsappBtn.onclick = () => shareViaWhatsApp(order);

  // Cambio de estado desde el modal: visible siempre (permite salir de Finalizada)
  DOM.viewStatusSelect.value = order.status;
  DOM.viewStatusSaveBtn.onclick = async () => {
    const newStatus = DOM.viewStatusSelect.value;
    DOM.viewStatusSaveBtn.disabled = true;
    const { error } = await supabaseClient
      .from('work_orders')
      .update({ status: newStatus })
      .eq('id', order.id);
    DOM.viewStatusSaveBtn.disabled = false;
    if (error) {
      showNotification('Error al actualizar el estado: ' + error.message);
      return;
    }
    showNotification(`Estado actualizado a ${newStatus}.`);
    // Refrescar el modal con el nuevo estado (recalcula secciones y el select)
    viewOrder({ ...order, status: newStatus });
    fetchOrders();
  };
}

/**
 * Abre el modal de finalización de orden de trabajo.
 * @param {Object} order - Objeto orden a finalizar
 */
export function openCompleteModal(order) {
  DOM.completeOrderId.value = order.id;
  DOM.montoCobradoInput.value = order.monto_cobrado || '';
  DOM.formaPagoInput.value = order.forma_pago || '';
  DOM.notasExtraInput.value = order.notas_extra || '';
  DOM.completeOrderModal.classList.remove('hidden');
}

/**
 * Submit del form de finalización: actualiza la orden con estado 'Finalizada',
 * monto cobrado, forma de pago y notas adicionales.
 * @async
 * @param {Event} e - Evento submit
 */
export async function finalizar(e) {
  e.preventDefault();
  const id = DOM.completeOrderId.value;
  const monto = DOM.montoCobradoInput.value;
  const formaPago = DOM.formaPagoInput.value;
  const notas = DOM.notasExtraInput.value;
  const submitBtn = DOM.completeSubmitBtn;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...`;

  const { error } = await supabaseClient
    .from('work_orders')
    .update({
      status: 'Finalizada',
      monto_cobrado: parseFloat(monto),
      forma_pago: formaPago,
      notas_extra: notas,
    })
    .eq('id', id);

  if (error) {
    showNotification('Error al actualizar: ' + error.message);
  } else {
    showNotification('Orden finalizada correctamente.');
    DOM.completeOrderModal.classList.add('hidden');
    fetchOrders();
  }
  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Guardar Finalización';
}

// --- EVENT LISTENERS: ÓRDENES ---

DOM.workOrderForm.addEventListener('submit', saveOrder);

DOM.completeOrderForm.addEventListener('submit', finalizar);

// Población del select de filtro por estado a partir de ORDER_STATUSES
if (DOM.statusFilter) {
  DOM.statusFilter.innerHTML =
    '<option value="">Todos los estados</option>' +
    ORDER_STATUSES.map((s) => `<option value="${escapeHtml(s.value)}">${escapeHtml(s.label)}</option>`).join('');
}

// Población de los selects de cambio de estado (form de edición y modal de detalle)
const statusOptions = ORDER_STATUSES
  .map((s) => `<option value="${escapeHtml(s.value)}">${escapeHtml(s.label)}</option>`)
  .join('');
if (DOM.statusEditSelect) DOM.statusEditSelect.innerHTML = statusOptions;
if (DOM.viewStatusSelect) DOM.viewStatusSelect.innerHTML = statusOptions;

/**
 * Muestra/oculta los campos de finalización del form según el estado elegido.
 * Pasa a depender de la selección actual (no del estado original de la orden),
 * permitiendo llevar una orden a Finalizada desde la edición.
 */
function syncFinalizacionFieldsWithStatus() {
  DOM.finalizacionFields.classList.toggle('hidden', DOM.statusEditSelect.value !== 'Finalizada');
}

// Toggle coherente al cambiar el estado en el formulario de edición
if (DOM.statusEditSelect) {
  DOM.statusEditSelect.addEventListener('change', syncFinalizacionFieldsWithStatus);
}

// Filtro por estado: complementario a la búsqueda (se combinan en applyFilters)
if (DOM.statusFilter) {
  DOM.statusFilter.addEventListener('change', (e) => {
    setStatusFilter(e.target.value === '' ? null : e.target.value);
    setCurrentPage(1);
    renderOrders();
  });
}

// Cancelar edición: vuelve el form a modo creación y recarga las órdenes
if (DOM.cancelEditBtn) {
  DOM.cancelEditBtn.addEventListener('click', () => {
    resetFormToCreate();
    fetchOrders();
  });
}

// Búsqueda en tiempo real con debounce de 300ms
let searchTimeout = null;
DOM.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filterOrders(e.target.value);
  }, 300);
});