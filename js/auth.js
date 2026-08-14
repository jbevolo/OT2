/**
 * @file auth.js
 * @description Autenticación: checkUser, login, register, logout.
 * Incluye los event listeners del formulario de autenticación.
 */

import { supabaseClient } from './supabase.js';
import { setCurrentUser } from './state.js';
import { DOM } from './dom.js';
import { showNotification } from './notify.js';
import { fetchOrders } from './orders.js';

/**
 * Verifica si hay una sesión activa de Supabase.
 * Autenticado: muestra la app y carga las órdenes.
 * No autenticado: muestra el formulario de login.
 * @async
 * @returns {Promise<void>}
 */
export async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) {
    setCurrentUser(user);
    DOM.userDisplay.textContent = `Sesión iniciada como: ${user.email}`;
    DOM.authContainer.classList.add('hidden');
    DOM.appContainer.classList.remove('hidden');
    fetchOrders();
  } else {
    setCurrentUser(null);
    DOM.authContainer.classList.remove('hidden');
    DOM.appContainer.classList.add('hidden');
  }
}

/**
 * Login con email y contraseña vía Supabase Auth.
 * @async
 * @returns {Promise<void>}
 */
export async function login() {
  const email = DOM.emailInput.value.trim();
  const password = DOM.passwordInput.value.trim();

  if (!email || !password) {
    showNotification('Por favor, ingresa correo y contraseña.');
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) showNotification('Error: ' + error.message);
  else checkUser();
}

/**
 * Registro de nueva cuenta vía Supabase Auth.
 * Envía email de confirmación antes de permitir el login.
 * @async
 * @returns {Promise<void>}
 */
export async function register() {
  const email = DOM.emailInput.value.trim();
  const password = DOM.passwordInput.value.trim();

  if (!email || !password) {
    showNotification('Por favor, ingresa correo y contraseña para crear la cuenta.');
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    showNotification('Error: ' + error.message);
  } else {
    showNotification('¡Registro iniciado! Revisa tu correo electrónico para confirmar tu cuenta y poder entrar.');
  }
}

/**
 * Logout: cierra sesión en Supabase y vuelve a la pantalla de login.
 * @async
 * @returns {Promise<void>}
 */
export async function logout() {
  await supabaseClient.auth.signOut();
  checkUser();
}

// --- EVENT LISTENERS: AUTENTICACIÓN ---

DOM.loginBtn.addEventListener('click', login);

DOM.registerBtn.addEventListener('click', register);

// Enter en campo contraseña -> ejecuta login automáticamente
DOM.passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    DOM.loginBtn.click();
  }
});

// Enter en campo email -> mueve foco al campo contraseña
DOM.emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    DOM.passwordInput.focus();
  }
});

// Previene submit nativo del form de auth (evita recarga de página)
DOM.authForm.addEventListener('submit', (e) => {
  e.preventDefault();
});

DOM.logoutBtn.addEventListener('click', logout);