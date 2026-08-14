/**
 * @file print.js
 * @description Impresión de órdenes de trabajo con formato de documento oficial.
 */

import { DOM, escapeHtml, formatFecha } from './dom.js';
import { showNotification } from './notify.js';

/**
 * Genera una ventana de impresión con formato de documento oficial.
 * Usa Tailwind CSS para los estilos.
 * @param {Object} order - Objeto orden a imprimir
 */
export function printWorkOrder(order) {
  const printWindow = window.open('', '_blank', 'height=600,width=800');
  printWindow.document.write('<html><head><title>Orden de Trabajo</title><script src="https://cdn.tailwindcss.com"><\/script><style>body{font-family:sans-serif} @media print{body{-webkit-print-color-adjust:exact}}</style></head><body><div id="print-area">');
  printWindow.document.write(`
    <div class="p-8">
      <div class="flex justify-between items-start mb-6 pb-4 border-b">
        <div><h1 class="text-2xl font-bold">ORDEN DE TRABAJO</h1><p class="text-gray-600">Taller Mecánico (Online)</p></div>
        <div class="text-right"><p class="font-bold text-xl">Orden N°: ${escapeHtml(order.order_number)}</p><p>Fecha: ${formatFecha(order.fecha)}</p></div>
      </div>
      <div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
        <div><strong class="block text-gray-500">Cliente:</strong> <span class="text-lg">${escapeHtml(order.nombre)}</span></div>
        <div><strong class="block text-gray-500">Teléfono:</strong> <span class="text-lg">${escapeHtml(order.telefono) || 'N/A'}</span></div>
        <div><strong class="block text-gray-500">Vehículo:</strong> <span class="text-lg">${escapeHtml(order.vehiculo)}</span></div>
        <div><strong class="block text-gray-500">Dominio:</strong> <span class="text-lg font-mono p-1 bg-gray-200 rounded">${escapeHtml(order.dominio)}</span></div>
      </div>
      <h2 class="text-lg font-bold mb-2">Novedades y Trabajos a Realizar</h2>
      <div class="p-4 border bg-gray-50 rounded-md min-h-[150px] mb-6"><p>${escapeHtml(order.novedades).replace(/\n/g, '<br>')}</p></div>

      <div class="grid grid-cols-3 gap-4 mb-6 p-4 border rounded bg-gray-50">
        <div><strong class="text-gray-500">Garantía:</strong> ${order.garantia ? 'SÍ' : 'NO'}</div>
        <div><strong class="text-gray-500">Oblea:</strong> ${order.oblea ? 'SÍ' : 'NO'}</div>
        <div><strong class="text-gray-500">PH:</strong> ${order.ph ? 'SÍ' : 'NO'}</div>
        <div><strong class="text-gray-500">NV:</strong> ${order.nv ? 'SÍ' : 'NO'}</div>
        <div><strong class="text-gray-500">Retención:</strong> ${order.retencion ? 'SÍ' : 'NO'}</div>
        <div><strong class="text-gray-500">Mangueras:</strong> ${order.mangueras ? 'SÍ' : 'NO'}</div>
      </div>

      <div class="grid grid-cols-2 gap-16 pt-16 mt-8 border-t">
        <div class="text-center"><p class="border-t-2 border-gray-400 pt-2">Firma del Cliente</p></div>
        <div class="text-center"><p class="border-t-2 border-gray-400 pt-2">Firma del Taller</p></div>
      </div>
    </div>`);
  printWindow.document.write('</div></body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// --- EVENT LISTENER: IMPRESIÓN DE BORRADOR ---

/**
 * Botón "Imprimir Borrador": genera vista de impresión con los datos
 * actualmente ingresados en el formulario (sin guardar en BD).
 */
DOM.printDraftBtn.addEventListener('click', () => {
  const draft = {
    order_number: DOM.orderNumberInput.value ? `${DOM.orderNumberInput.value} (Borrador)` : 'Borrador',
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
  if (!draft.fecha || !draft.nombre || !draft.vehiculo || !draft.dominio) {
    showNotification('Complete los campos básicos para imprimir un borrador.');
    return;
  }
  printWorkOrder(draft);
});