/**
 * Loads an image from a source URL and returns its ImageData
 * @param {string} src - The source URL of the image
 * @returns {Promise<ImageData>} The image data
 */
export async function loadImage(src) {
  const imgBlob = await fetch(src).then((resp) => resp.blob());
  const img = await createImageBitmap(imgBlob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/**
 * Updates the preview image with the current buffer data
 * @param {number} buffer - The buffer pointer
 * @param {number} width - The image width
 * @param {number} height - The image height
 * @param {HTMLImageElement} preview - The preview image element
 * @param {Object} Module - The WebAssembly module
 */
export function updatePreview(buffer, width, height, preview, Module) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const newImageData = new ImageData(
    new Uint8ClampedArray(Module.HEAPU8.subarray(buffer, buffer + width * height * 4)),
    width,
    height
  );
  ctx.putImageData(newImageData, 0, 0);
  preview.src = canvas.toDataURL();
}

/**
 * Resets the image to its original state
 * @param {number} currentBuffer - The current buffer pointer
 * @param {ImageData} originalImageData - The original image data
 * @param {Object} Module - The WebAssembly module
 * @param {HTMLImageElement} preview - The preview image element
 * @returns {Object} The updated state
 */
export function resetImage(currentBuffer, originalImageData, Module, preview) {
  if (!currentBuffer || !originalImageData) return null;
  
  // Reset buffer to original image
  Module.HEAPU8.set(originalImageData.data, currentBuffer);
  const currentImageData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );
  
  // Update preview
  updatePreview(currentBuffer, currentImageData.width, currentImageData.height, preview, Module);
  
  return {
    currentImageData,
    selectedFilter: null,
    adjustmentValues: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      highlights: 0,
      shadows: 0
    }
  };
}

/**
 * Resets the application to its initial upload state
 * @param {Object} state - The current application state
 * @param {Object} api - The WebAssembly API
 * @param {Object} elements - The UI elements
 * @returns {Object} The reset state
 */
export function resetToUploadState(state, api, elements) {
  const { preview, dropArea, topBar } = elements;
  
  // Reset UI elements
  preview.style.display = 'none';
  dropArea.style.display = 'flex';
  topBar.style.display = 'none';
  
  // Reset image data
  if (state.currentBuffer) {
    api.destroy_buffer(state.currentBuffer);
  }
  
  return {
    currentBuffer: null,
    currentImageData: null,
    originalImageData: null,
    selectedFilter: null,
    adjustmentValues: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      highlights: 0,
      shadows: 0
    }
  };
}

/**
 * Exports the current image with the specified scale
 * @param {number} currentBuffer - The current buffer pointer
 * @param {ImageData} currentImageData - The current image data
 * @param {number} scale - The scale factor for export
 * @param {Object} api - The WebAssembly API
 * @param {Object} Module - The WebAssembly module
 */
export function exportImage(currentBuffer, currentImageData, scale, api, Module) {
  if (!currentBuffer || !currentImageData) return;
  
  // Apply quality scaling
  const scaledBuffer = api.apply_quality_scale(
    currentBuffer,
    currentImageData.width,
    currentImageData.height,
    scale
  );
  
  // Create canvas with scaled dimensions
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(currentImageData.width * scale);
  canvas.height = Math.round(currentImageData.height * scale);
  const ctx = canvas.getContext('2d');
  
  // Draw scaled image data
  const scaledImageData = new ImageData(
    new Uint8ClampedArray(Module.HEAPU8.subarray(scaledBuffer, scaledBuffer + canvas.width * canvas.height * 4)),
    canvas.width,
    canvas.height
  );
  ctx.putImageData(scaledImageData, 0, 0);
  
  // Create download link
  const link = document.createElement('a');
  link.download = 'edited_image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  // Clean up
  api.destroy_buffer(scaledBuffer);
}

/**
 * Handles a file upload, processes the image, and updates the UI
 * @param {File} file - The uploaded file
 * @returns {Promise<number>} The buffer pointer
 */
export async function handleFile(file, preview, dropArea, topBar, api, Module) {
  const imageUrl = URL.createObjectURL(file);
  preview.src = imageUrl;
  preview.style.display = 'block';
  dropArea.style.display = 'none';
  topBar.style.display = 'flex';
  
  const imageData = await loadImage(imageUrl);
  const originalImageData = imageData;
  const currentImageData = imageData;
  const buffer = api.create_buffer(imageData.width, imageData.height);
  Module.HEAPU8.set(imageData.data, buffer);
  
  // Reset selected filter
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('selected'));
  
  // Reset all adjustments
  const adjustmentValues = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    highlights: 0,
    shadows: 0
  };
  document.querySelectorAll('.slider').forEach(slider => slider.value = 0);
  
  URL.revokeObjectURL(imageUrl);
  return { buffer, originalImageData, currentImageData, adjustmentValues };
} 