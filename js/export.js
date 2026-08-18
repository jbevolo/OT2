/**
 * @file export.js
 * @description Exportación de órdenes a CSV compatible con Excel.
 * Usa separador ';' y BOM UTF-8 para que los acentos se vean correctamente.
 */

import { DOM, normalizeFotos } from './dom.js';
import { showNotification } from './notify.js';
import { applyFilters } from './orders.js';

/** Columnas del CSV en orden de exportación */
const CSV_COLUMNS = [
  'N° Orden', 'Fecha', 'Cliente', 'Teléfono', 'Vehículo', 'Dominio', 'Trabajos',
  'Estado', 'Garantía', 'Oblea', 'PH', 'NV', 'Retención', 'Mangueras',
  'Cantidad Fotos', 'Monto', 'Forma de Pago', 'Notas',
];

/**
 * Escapa un valor para CSV: lo envuelve en comillas y duplica las comillas
 * internas. Los saltos de línea quedan protegidos dentro de las comillas.
 * @param {*} value - Valor a escapar
 * @returns {string}
 */
function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return '"' + str.replace(/"/g, '""') + '"';
}

/**
 * Exporta las órdenes actualmente visibles (según filtros activos) a un archivo
 * CSV. Si hay filtro de estado o búsqueda, exporta solo esos resultados; si no,
 * exporta todas las órdenes. Descarga como ordenes_YYYY-MM-DD.csv.
 */
export function exportOrdersCSV() {
  const orders = applyFilters();
  if (orders.length === 0) {
    showNotification('No hay órdenes para exportar.');
    return;
  }

  // Fila de encabezados + una fila por orden
  const rows = [CSV_COLUMNS.map(csvEscape).join(';')];
  orders.forEach((order) => {
    const fotosCount = normalizeFotos(order.fotos).length;
    rows.push(
      [
        order.order_number,
        order.fecha,
        order.nombre,
        order.telefono,
        order.vehiculo,
        order.dominio,
        order.novedades,
        order.status,
        order.garantia ? 'SÍ' : 'NO',
        order.oblea ? 'SÍ' : 'NO',
        order.ph ? 'SÍ' : 'NO',
        order.nv ? 'SÍ' : 'NO',
        order.retencion ? 'SÍ' : 'NO',
        order.mangueras ? 'SÍ' : 'NO',
        fotosCount,
        order.monto_cobrado,
        order.forma_pago,
        order.notas_extra,
      ].map(csvEscape).join(';')
    );
  });

  const csv = '\ufeff' + rows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `ordenes_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('CSV exportado con éxito.');
}

DOM.exportCsvBtn.addEventListener('click', exportOrdersCSV);