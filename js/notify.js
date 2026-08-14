/**
 * @file notify.js
 * @description Sistema de notificaciones modales (éxito/error/confirmación).
 * Comportamiento idéntico al modal original.
 */

import { DOM } from './dom.js';

/**
 * Muestra una notificación modal.
 * Modo simple: mensaje con botón OK.
 * Modo confirmación: mensaje con botones Confirmar/Cancelar.
 * @param {string} msg - Mensaje a mostrar (admite HTML)
 * @param {boolean} [isConfirm=false] - Si true, muestra botones de confirmación
 * @param {Function|null} [callback=null] - Función a ejecutar al confirmar
 */
export function showNotification(msg, isConfirm = false, callback = null) {
  const modal = DOM.notificationModal;
  const message = DOM.notificationMessage;
  const buttons = DOM.modalButtons;

  message.innerHTML = msg;
  modal.classList.remove('hidden');
  buttons.innerHTML = '';

  if (isConfirm) {
    const b1 = document.createElement('button');
    b1.className = 'bg-red-600 text-white px-4 py-2 rounded-lg mr-2';
    b1.textContent = 'Confirmar';
    b1.onclick = () => {
      if (typeof callback === 'function') callback();
      modal.classList.add('hidden');
    };
    const b2 = document.createElement('button');
    b2.className = 'bg-gray-300 px-4 py-2 rounded-lg';
    b2.textContent = 'Cancelar';
    b2.onclick = () => modal.classList.add('hidden');
    buttons.append(b1, b2);
  } else {
    const b = document.createElement('button');
    b.className = 'bg-indigo-600 text-white px-4 py-2 rounded-lg';
    b.textContent = 'OK';
    b.onclick = () => modal.classList.add('hidden');
    buttons.append(b);
  }
}