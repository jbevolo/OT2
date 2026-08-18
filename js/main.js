/**
 * @file main.js
 * @description Punto de entrada de la aplicación.
 * Importa e inicializa todos los módulos y maneja el routing por ?id=.
 *
 * - Si hay ?id= en la URL: muestra la vista pública del cliente (sin auth).
 * - Si no: verifica sesión activa y muestra el panel administrativo.
 */

import './config.js';
import './supabase.js';
import './dom.js';
import './state.js';
import './notify.js';
import './auth.js';
import './orders.js';
import './photos.js';
import './share.js';
import './publicView.js';
import './print.js';
import './backup.js';
import './export.js';
import { checkUser } from './auth.js';
import { showPublicOrderView } from './publicView.js';

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

const urlParams = new URLSearchParams(window.location.search);
const orderIdParam = urlParams.get('id');

if (orderIdParam) {
  showPublicOrderView(orderIdParam);
} else {
  checkUser();
  document.getElementById('fecha').valueAsDate = new Date();
}

// --- REGISTRO DEL SERVICE WORKER ---

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then(() => console.log('App lista para usar offline'))
      .catch((err) => console.log('Error en PWA:', err));
  });
}