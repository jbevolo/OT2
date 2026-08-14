/**
 * @file share.js
 * @description Compartir por WhatsApp y visor de imágenes (lightbox).
 */

import { DOM, normalizeFotos } from './dom.js';

/**
 * Genera un link de WhatsApp con el resumen de la orden.
 * Incluye el enlace al portal digital del cliente para ver fotos y detalles.
 * @param {Object} order - Objeto orden a compartir
 */
export function shareViaWhatsApp(order) {
  const phone = order.telefono ? order.telefono.replace(/\D/g, '') : '';
  const fotosArray = normalizeFotos(order.fotos);

  // Enlace al Portal Digital de la Orden
  const currentUrl = window.location.href.split('?')[0];
  const orderLink = `${currentUrl}?id=${order.id}`;

  let message = `🛠️ *ORDEN DE TRABAJO #${order.order_number}*\n\n`;
  message += `Hola *${order.nombre}*, te compartimos el estado y los detalles de tu vehículo *${order.vehiculo}* (${order.dominio}):\n\n`;
  message += `📌 *Estado:* ${order.status}\n`;
  message += `📝 *Trabajos:* ${order.novedades}\n\n`;

  if (order.status === 'Finalizada') {
    message += `💰 *Monto Cobrado:* $${order.monto_cobrado}\n`;
    if (order.forma_pago) message += `💳 *Forma de Pago:* ${order.forma_pago}\n`;
    if (order.notas_extra) message += `💬 *Notas:* ${order.notas_extra}\n\n`;
  }

  message += `📱 *Ver Orden Completa y Galería de Fotos (${fotosArray.length}):*\n`;
  message += `${orderLink}\n\n`;

  message += `_Enviado desde Gestión de Taller OT_`;

  const encodedMsg = encodeURIComponent(message);
  const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;
  window.open(waUrl, '_blank');
}

/**
 * Abre el visor de imágenes en pantalla completa (lightbox).
 * Se cierra haciendo clic en el fondo o en el botón X.
 * @param {string} url - URL de la imagen a mostrar
 * @param {Event} [e] - Evento click (opcional, para stopPropagation)
 */
export function openLightbox(url, e) {
  const lb = DOM.lightboxModal;
  const img = DOM.lightboxImg;
  img.src = url;
  lb.classList.remove('hidden');
  if (e) e.stopPropagation();
}

// Visible para onclick inline que aún referencia la función globalmente.
window.openLightbox = openLightbox;