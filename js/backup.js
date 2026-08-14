/**
 * @file backup.js
 * @description Backup y restauración de órdenes en archivos JSON.
 * Incluye validación de schema antes de restaurar (evita corromper la BD).
 */

import { supabaseClient } from './supabase.js';
import { state } from './state.js';
import { DOM } from './dom.js';
import { showNotification } from './notify.js';
import { fetchOrders } from './orders.js';

/** Campos mínimos que debe tener cada orden de un backup válido */
const REQUIRED_FIELDS = ['order_number', 'nombre', 'vehiculo', 'dominio', 'novedades', 'fecha', 'status'];

/**
 * Valida que un elemento del backup tenga los campos mínimos esperados.
 * @param {*} order - Elemento del array a validar
 * @returns {boolean}
 */
function isValidOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return false;
  return REQUIRED_FIELDS.every((f) => order[f] !== undefined && order[f] !== null && order[f] !== '');
}

/**
 * Botón Backup: exporta todas las órdenes como archivo JSON descargable.
 */
DOM.backupBtn.addEventListener('click', () => {
  if (state.allOrders.length === 0) return showNotification('No hay datos para exportar.');

  const jsonString = JSON.stringify(state.allOrders, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_online_workshop_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Backup exportado con éxito.');
});

/**
 * Botón Restore: abre selector de archivo para importar backup JSON.
 */
DOM.restoreBtn.addEventListener('click', () => DOM.restoreInput.click());

/**
 * Input de restore: lee el archivo JSON seleccionado, valida formato y schema,
 * y muestra confirmación antes de reemplazar datos en la nube.
 */
DOM.restoreInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');

      // Validación de schema: si el backup no tiene el formato esperado,
      // se muestra error y NO se toca la base de datos.
      if (!data.every(isValidOrder)) {
        showNotification('Error: El archivo no tiene el formato esperado de órdenes. Verifica que sea un backup válido.');
        DOM.restoreInput.value = '';
        return;
      }

      showNotification(
        '<b>¡Atención!</b> Estás a punto de reemplazar tus datos en la nube con los del archivo. Esta acción no se puede deshacer. <br><br> ¿Deseas continuar?',
        true,
        () => restoreToCloud(data)
      );
    } catch (err) {
      showNotification('Error: El archivo no es válido.');
    }
  };
  reader.readAsText(file);
  DOM.restoreInput.value = '';
});

/**
 * Restaura un backup de órdenes a Supabase.
 * Flujo: 1) Borra todas las órdenes actuales del usuario,
 * 2) Inserta las órdenes del archivo JSON.
 * @async
 * @param {Array<Object>} data - Array de órdenes desde el archivo JSON
 */
export async function restoreToCloud(data) {
  showNotification('Restaurando datos en la nube... Por favor espera.');
  try {
    // 1. Borrar órdenes actuales del usuario
    const { error: delError } = await supabaseClient
      .from('work_orders')
      .delete()
      .eq('user_id', state.currentUser.id);

    if (delError) throw delError;

    // 2. Preparar nuevos datos (limpiando IDs antiguos si es necesario)
    const newOrders = data.map((order) => {
      const { id, ...rest } = order; // Dejar que Supabase genere nuevos UUIDs
      return { ...rest, user_id: state.currentUser.id };
    });

    // 3. Insertar en lotes
    const { error: insError } = await supabaseClient.from('work_orders').insert(newOrders);

    if (insError) throw insError;

    showNotification('¡Restauración completada con éxito!');
    fetchOrders();
  } catch (err) {
    console.error(err);
    showNotification('Error durante la restauración: ' + err.message);
  }
}