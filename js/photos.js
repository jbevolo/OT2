/**
 * @file photos.js
 * @description Manejo de fotos: compresión, previews, selección de cámara,
 * upload a Storage y eliminación de fotos específicas.
 */

import { supabaseClient } from './supabase.js';
import { state } from './state.js';
import { DOM, normalizeFotos } from './dom.js';
import { showNotification } from './notify.js';

/**
 * Comprime una imagen para storage optimizado.
 * Resolución máxima: 1920px. Peso objetivo: < 1MB con calidad progresiva (0.85 → 0.4).
 * @param {File} file - Archivo de imagen del input del usuario
 * @returns {Promise<Blob>} Blob de la imagen comprimida en formato JPEG
 */
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resolución HD Premium (1920px máx) para conservar nitidez y detalles mecánicos
        const MAX_DIM = 1920;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compresión inteligente iterativa para garantizar peso < 1MB con máxima fidelidad
        let quality = 0.85;

        function attemptCompress() {
          canvas.toBlob((blob) => {
            // Si el archivo pesa menos de 1MB o la calidad llegó al límite (0.4), finalizamos
            if (blob.size < 1024 * 1024 || quality <= 0.4) {
              resolve(blob);
            } else {
              quality -= 0.05;
              attemptCompress();
            }
          }, 'image/jpeg', quality);
        }

        attemptCompress();
      };
    };
  });
}

/**
 * Sube fotos al bucket 'photos' de Supabase Storage y devuelve sus URLs públicas.
 * Patrón reutilizado por saveOrder (con prefijo por defecto) y por la sección
 * "añadir más fotos" (con prefijo 'extra_'). Evita duplicación de código.
 * @async
 * @param {Array<{blob: Blob, name: string}>} photos - Fotos a subir
 * @param {string} [prefix=''] - Prefijo opcional para el nombre del archivo
 * @returns {Promise<string[]>} URLs públicas de las fotos subidas
 */
export async function uploadPhotos(photos, prefix = '') {
  const fotoUrls = [];
  for (const foto of photos) {
    const fileName = `${prefix}${Date.now()}_${foto.name}`;
    const { data, error: uploadError } = await supabaseClient.storage
      .from('photos')
      .upload(`${state.currentUser.id}/${fileName}`, foto.blob);

    if (uploadError) {
      console.error('Error subiendo foto:', uploadError);
      throw new Error('Error en Storage: ' + uploadError.message + ". Verifica que el bucket 'photos' exista y sea público.");
    }

    if (data) {
      const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(data.path);
      fotoUrls.push(publicUrl);
    }
  }
  return fotoUrls;
}

/**
 * Procesa los archivos seleccionados de cualquier input de fotos.
 * Comprime y agrega al estado (máx 5).
 * @async
 * @param {FileList} files - Archivos seleccionados del input
 */
export async function processSelectedFiles(files) {
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (state.selectedFotosFiles.length >= 5) break;
    const compressedBlob = await compressImage(file);
    state.selectedFotosFiles.push({ blob: compressedBlob, name: file.name });
  }
  renderFotosPreview();
}

/**
 * Renderiza las miniaturas de preview de fotos seleccionadas.
 */
export function renderFotosPreview() {
  DOM.fotosPreview.innerHTML = '';
  state.selectedFotosFiles.forEach((foto, i) => {
    const div = document.createElement('div');
    div.className = 'relative h-12 w-full';
    div.innerHTML = `<img src="${URL.createObjectURL(foto.blob)}" class="h-full w-full object-cover rounded"><button type="button" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px]" onclick="removeFoto(${i})">&times;</button>`;
    DOM.fotosPreview.appendChild(div);
  });
}

/**
 * Quita una foto de la selección pendiente (formulario de nueva orden).
 * @param {number} i - Índice de la foto en selectedFotosFiles
 */
export function removeFoto(i) {
  state.selectedFotosFiles.splice(i, 1);
  renderFotosPreview();
}

window.removeFoto = removeFoto;

/**
 * Abre el modal de selección de cámara/fuente de fotos.
 */
export function openCameraSelectModal() {
  if (DOM.cameraSelectModal) DOM.cameraSelectModal.classList.remove('hidden');
}

/**
 * Cierra el modal de selección de cámara.
 */
export function closeCameraSelectModal() {
  if (DOM.cameraSelectModal) DOM.cameraSelectModal.classList.add('hidden');
}

/**
 * Configura la funcionalidad de añadir fotos adicionales a una orden.
 * Al finalizar, invoca el callback onDone para refrescar las órdenes.
 * @param {Object} order - Objeto orden al que se añadirán fotos
 * @param {Function} [onDone] - Callback ejecutado tras subir y actualizar la BD
 */
export function setupAddMorePhotos(order, onDone) {
  const preview = DOM.addMorePreview;
  const uploadBtn = DOM.uploadMoreBtn;
  const openModalBtn = DOM.openAddMoreCameraModal;

  const inputBack = DOM.addMoreInputBack;
  const inputFront = DOM.addMoreInputFront;
  const inputGallery = DOM.addMoreInputGallery;

  state.morePhotosToUpload = [];
  preview.innerHTML = '';
  uploadBtn.classList.add('hidden');

  // Procesa archivos seleccionados para esta orden
  async function processAddMoreFiles(files) {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const compressed = await compressImage(file);
      state.morePhotosToUpload.push({ blob: compressed, name: file.name });
    }
    renderMorePhotosPreview();
  }

  // Abre el modal de selección de cámara con inputs temporales
  if (openModalBtn) {
    openModalBtn.onclick = () => {
      openCameraSelectModal();
      setupCameraModalForAddMore(inputBack, inputFront, inputGallery, processAddMoreFiles);
    };
  }

  function renderMorePhotosPreview() {
    preview.innerHTML = '';
    state.morePhotosToUpload.forEach((foto) => {
      const div = document.createElement('div');
      div.className = 'relative h-12 w-full';
      div.innerHTML = `<img src="${URL.createObjectURL(foto.blob)}" class="h-full w-full object-cover rounded">`;
      preview.appendChild(div);
    });
    if (state.morePhotosToUpload.length > 0) uploadBtn.classList.remove('hidden');
    else uploadBtn.classList.add('hidden');
  }

  uploadBtn.onclick = async () => {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Subiendo...`;

    try {
      const newUrls = await uploadPhotos(state.morePhotosToUpload, 'extra_');
      const currentFotos = normalizeFotos(order.fotos);
      const updatedFotos = [...currentFotos, ...newUrls];

      const { error } = await supabaseClient
        .from('work_orders')
        .update({ fotos: updatedFotos })
        .eq('id', order.id);

      if (error) throw error;

      showNotification('Fotos añadidas con éxito.');
      DOM.viewOrderModal.classList.add('hidden');
      if (typeof onDone === 'function') onDone();
    } catch (err) {
      showNotification('Error: ' + err.message);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = 'Confirmar Subida';
    }
  };
}

/**
 * Configura el modal de cámara para la sección de "añadir más fotos".
 * Asocia los botones del modal con los inputs específicos de esta sección.
 * @param {HTMLInputElement} inputBack - Input de cámara trasera
 * @param {HTMLInputElement} inputFront - Input de cámara frontal
 * @param {HTMLInputElement} inputGallery - Input de galería
 * @param {Function} processFiles - Función para procesar archivos seleccionados
 */
export function setupCameraModalForAddMore(inputBack, inputFront, inputGallery, processFiles) {
  const backBtn = DOM.cameraBackBtn;
  const frontBtn = DOM.cameraFrontBtn;
  const galleryBtn = DOM.cameraGalleryBtn;
  const cancelBtn = DOM.cameraCancelBtn;

  // Guardar event listeners originales
  const originalBackClick = backBtn?.onclick;
  const originalFrontClick = frontBtn?.onclick;
  const originalGalleryClick = galleryBtn?.onclick;
  const originalCancelClick = cancelBtn?.onclick;

  // Configurar nuevos event listeners
  if (backBtn) {
    backBtn.onclick = () => {
      closeCameraSelectModal();
      inputBack.click();
    };
  }
  if (frontBtn) {
    frontBtn.onclick = () => {
      closeCameraSelectModal();
      inputFront.click();
    };
  }
  if (galleryBtn) {
    galleryBtn.onclick = () => {
      closeCameraSelectModal();
      inputGallery.click();
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = closeCameraSelectModal;
  }

  // Event listeners para cuando se seleccionan fotos (se auto-remueven)
  const handleBackChange = async (e) => {
    await processFiles(e.target.files);
    e.target.value = '';
    inputBack.removeEventListener('change', handleBackChange);
  };
  const handleFrontChange = async (e) => {
    await processFiles(e.target.files);
    e.target.value = '';
    inputFront.removeEventListener('change', handleFrontChange);
  };
  const handleGalleryChange = async (e) => {
    await processFiles(e.target.files);
    e.target.value = '';
    inputGallery.removeEventListener('change', handleGalleryChange);
  };

  inputBack.addEventListener('change', handleBackChange);
  inputFront.addEventListener('change', handleFrontChange);
  inputGallery.addEventListener('change', handleGalleryChange);
}

/**
 * Elimina una foto específica de una orden.
 * Flujo: 1) Actualiza array en BD, 2) Elimina archivo de Storage.
 * El callback onDone refresca las órdenes tras el éxito.
 * @async
 * @param {string} orderId - UUID de la orden
 * @param {string} photoUrl - URL pública de la foto a eliminar
 * @param {number} index - Índice de la foto en el array (archivo de respaldo)
 * @param {Function} [onDone] - Callback ejecutado al terminar
 */
export async function deleteSpecificPhoto(orderId, photoUrl, index, onDone) {
  showNotification('¿Estás seguro de que deseas eliminar esta foto permanentemente?', true, async () => {
    try {
      // 1. Obtener la orden actualizada
      const { data: order } = await supabaseClient.from('work_orders').select('fotos').eq('id', orderId).single();
      if (!order) return;

      const updatedFotos = normalizeFotos(order.fotos).filter((f) => f !== photoUrl);

      // 2. Borrar de la Base de Datos
      const { error: dbError } = await supabaseClient
        .from('work_orders')
        .update({ fotos: updatedFotos })
        .eq('id', orderId);

      if (dbError) throw dbError;

      // 3. Borrar del Storage (opcional pero recomendado)
      try {
        const pathParts = photoUrl.split('/photos/')[1];
        if (pathParts) {
          const filePath = decodeURIComponent(pathParts);
          await supabaseClient.storage.from('photos').remove([filePath]);
        }
      } catch (storageErr) {
        console.error('Error al borrar de storage:', storageErr);
      }

      showNotification('Foto eliminada correctamente.');
      DOM.viewOrderModal.classList.add('hidden');
      if (typeof onDone === 'function') onDone();
    } catch (err) {
      showNotification('Error: ' + err.message);
    }
  });
}

// Visible para compatibilidad con el código que aún la referencia globalmente.
window.deleteSpecificPhoto = deleteSpecificPhoto;

// --- EVENT LISTENERS: FOTOS (formulario principal) ---

if (DOM.openCameraModal) {
  DOM.openCameraModal.addEventListener('click', openCameraSelectModal);
}

// Los botones del modal se asignan vía onclick para evitar doble ejecución
// cuando setupCameraModalForAddMore los reasigna.
if (DOM.cameraBackBtn) {
  DOM.cameraBackBtn.onclick = () => {
    closeCameraSelectModal();
    DOM.fotosInputBack.click();
  };
}
if (DOM.cameraFrontBtn) {
  DOM.cameraFrontBtn.onclick = () => {
    closeCameraSelectModal();
    DOM.fotosInputFront.click();
  };
}
if (DOM.cameraGalleryBtn) {
  DOM.cameraGalleryBtn.onclick = () => {
    closeCameraSelectModal();
    DOM.fotosInputGallery.click();
  };
}
if (DOM.cameraCancelBtn) {
  DOM.cameraCancelBtn.onclick = closeCameraSelectModal;
}

// Selección de fotos desde cualquier input del formulario principal
DOM.fotosInputBack.addEventListener('change', async (e) => {
  await processSelectedFiles(e.target.files);
  e.target.value = '';
});
DOM.fotosInputFront.addEventListener('change', async (e) => {
  await processSelectedFiles(e.target.files);
  e.target.value = '';
});
DOM.fotosInputGallery.addEventListener('change', async (e) => {
  await processSelectedFiles(e.target.files);
  e.target.value = '';
});

// Cerrar modal al hacer clic fuera del contenido
if (DOM.cameraSelectModal) {
  DOM.cameraSelectModal.addEventListener('click', (e) => {
    if (e.target.id === 'camera-select-modal') closeCameraSelectModal();
  });
}