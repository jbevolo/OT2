/**
 * @file publicView.js
 * @description Vista pública de una orden para clientes (sin autenticación).
 * Se activa con el parámetro ?id=<orden> en la URL.
 */

import { supabaseClient } from './supabase.js';
import { DOM, $, escapeHtml, formatFecha, normalizeFotos } from './dom.js';
import { openLightbox } from './share.js';

/**
 * Muestra la vista pública de una orden para el cliente.
 * No requiere autenticación.
 * @async
 * @param {string} orderId - UUID de la orden a consultar
 */
export async function showPublicOrderView(orderId) {
  // Ocultar contenedores de la app privada
  DOM.authContainer.classList.add('hidden');
  DOM.appContainer.classList.add('hidden');

  DOM.publicContainer.classList.remove('hidden');

  try {
    // Consultar la orden a Supabase por ID mediante RPC segura.
    // La función get_public_order (ver supabase/rls_policies.sql) devuelve
    // SOLO las columnas públicas del cliente y solo para el id pedido;
    // la tabla work_orders nunca queda expuesta al rol anon.
    const { data: order, error } = await supabaseClient
      .rpc('get_public_order', { p_id: orderId });

    if (error) throw error;

    if (!order) {
      showPublicError('No se encontró la orden de trabajo especificada.');
      return;
    }

    // Rellenar datos en la vista pública
    DOM.pubOrderNumber.textContent = `Orden #${order.order_number}`;

    const statusEl = DOM.pubOrderStatus;
    statusEl.textContent = order.status;
    if (order.status === 'Finalizada') {
      statusEl.className = 'px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm bg-green-100 text-green-800 border border-green-200';
      DOM.pubFinalizacionSection.classList.remove('hidden');
      DOM.pubMonto.textContent = `$ ${order.monto_cobrado}`;
      DOM.pubFormaPago.textContent = order.forma_pago || 'No especificada';
      if (order.notas_extra) {
        DOM.pubNotasContainer.classList.remove('hidden');
        DOM.pubNotas.textContent = order.notas_extra;
      } else {
        DOM.pubNotasContainer.classList.add('hidden');
      }
    } else {
      statusEl.className = 'px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm bg-amber-100 text-amber-800 border border-amber-200';
      DOM.pubFinalizacionSection.classList.add('hidden');
    }

    DOM.pubVehiculo.textContent = order.vehiculo;
    DOM.pubDominio.textContent = order.dominio;
    DOM.pubCliente.textContent = order.nombre;
    DOM.pubFecha.textContent = formatFecha(order.fecha);
    DOM.pubTrabajos.innerHTML = escapeHtml(order.novedades).replace(/\n/g, '<br>');

    // Actualizar checks de adicionales
    updatePubCheck('pub-garantia', order.garantia, 'Garantía');
    updatePubCheck('pub-oblea', order.oblea, 'Oblea');
    updatePubCheck('pub-ph', order.ph, 'PH');
    updatePubCheck('pub-nv', order.nv, 'NV');
    updatePubCheck('pub-retencion', order.retencion, 'Retención');
    updatePubCheck('pub-mangueras', order.mangueras, 'Mangueras');

    // Fotos del trabajo
    const galeriaSec = DOM.pubGaleriaSection;
    const galeria = DOM.pubGaleria;
    galeria.innerHTML = '';

    const fotos = normalizeFotos(order.fotos);
    if (fotos.length > 0) {
      galeriaSec.classList.remove('hidden');
      fotos.forEach((f) => {
        const div = document.createElement('div');
        div.className = 'relative aspect-square overflow-hidden rounded-xl border border-gray-100 shadow-sm group cursor-zoom-in';
        div.onclick = (e) => openLightbox(f, e);
        div.innerHTML = `
          <img src="${escapeHtml(f)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all"></div>
        `;
        galeria.appendChild(div);
      });
    } else {
      galeriaSec.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error cargando orden pública:', err);
    showPublicError(
      `No se pudo cargar la orden. Asegúrate de tener conexión a Internet o de que la orden exista.<br><br><span class="text-xs text-gray-400">Detalles: ${escapeHtml(err.message)}</span>`
    );
  }
}

/**
 * Actualiza el estado visual de un checkbox en la vista pública.
 * @param {string} id - ID del elemento DOM a actualizar
 * @param {boolean} value - Valor del check (true/false)
 * @param {string} label - Texto descriptivo del check
 */
export function updatePubCheck(id, value, label) {
  const el = $(id);
  if (value) {
    el.className = 'flex items-center text-sm text-indigo-700 font-bold';
    el.innerHTML = `<i class="fas fa-check-circle text-indigo-600 mr-2"></i> ${label}`;
  } else {
    el.className = 'flex items-center text-sm text-gray-400 font-normal';
    el.innerHTML = `<i class="far fa-circle mr-2 text-gray-300"></i> ${label}`;
  }
}

/**
 * Muestra pantalla de error en la vista pública del cliente.
 * @param {string} msg - Mensaje de error a mostrar (admite HTML; los valores
 * dinámicos deben estar previamente escapados con escapeHtml)
 */
export function showPublicError(msg) {
  DOM.publicContainer.innerHTML = `
    <div class="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center space-y-4">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 text-2xl mb-2">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h2 class="text-xl font-bold text-gray-800">Error de Acceso</h2>
      <p class="text-gray-600 leading-relaxed">${msg}</p>
      <a href="index.html" class="inline-block mt-4 bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm">
        Ir al Inicio
      </a>
    </div>
  `;
}