/**
 * Makes an element draggable within the preview bounds
 * @param {HTMLElement} element - The element to make draggable
 * @param {HTMLImageElement} preview - The preview image element
 */
export function makeDraggable(element, preview) {
  let startX, startY, initialX, initialY;
  const previewRect = preview.getBoundingClientRect();
  
  function dragStart(e) {
    startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    initialX = element.offsetLeft;
    initialY = element.offsetTop;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  }
  
  function drag(e) {
    e.preventDefault();
    const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const y = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
    
    const dx = x - startX;
    const dy = y - startY;
    
    // Calculate new position
    let newX = initialX + dx;
    let newY = initialY + dy;
    
    // Constrain to preview bounds
    newX = Math.max(previewRect.left, Math.min(newX, previewRect.right - element.offsetWidth));
    newY = Math.max(previewRect.top, Math.min(newY, previewRect.bottom - element.offsetHeight));
    
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }
  
  function dragEnd() {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchend', dragEnd);
  }
  
  element.addEventListener('mousedown', dragStart);
  element.addEventListener('touchstart', dragStart);
}

/**
 * Makes an element resizable while maintaining aspect ratio
 * @param {HTMLElement} element - The element to make resizable
 * @param {HTMLImageElement} preview - The preview image element
 * @param {boolean} isCropping - Whether cropping is currently active
 */
export function makeResizable(element, preview, isCropping) {
  const resizer = element.querySelector('.resizer');
  let startX, startY, startWidth, startHeight;
  let isResizing = false;
  
  function resizeStart(e) {
    if (!isCropping) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = element.offsetWidth;
    startHeight = element.offsetHeight;
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', resizeEnd);
  }
  
  function resize(e) {
    if (!isResizing || !isCropping) return;
    e.preventDefault();
    e.stopPropagation();
    
    const previewRect = preview.getBoundingClientRect();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Calculate new size maintaining aspect ratio
    const newSize = Math.max(100, Math.min(startWidth + dx, startHeight + dy));
    
    // Keep within preview bounds
    const maxSize = Math.min(previewRect.width, previewRect.height) - 20;
    const finalSize = Math.min(newSize, maxSize);
    
    element.style.width = `${finalSize}px`;
    element.style.height = `${finalSize}px`;
  }
  
  function resizeEnd(e) {
    if (!isCropping) return;
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', resizeEnd);
  }
  
  resizer.addEventListener('mousedown', resizeStart);
}

/**
 * Starts the cropping process
 * @param {string} shape - The shape of the crop area ('square' or 'round')
 * @param {Object} state - The current application state
 * @param {HTMLElement} cropOverlay - The crop overlay element
 * @param {HTMLElement} cropArea - The crop area element
 * @param {HTMLImageElement} preview - The preview image element
 * @returns {Object} Updated state
 */
export function startCrop(shape, state, cropOverlay, cropArea, preview) {
  if (!state.currentBuffer) return state;
  
  const newState = {
    ...state,
    isCropping: true,
    currentCropShape: shape
  };
  
  cropOverlay.style.display = 'flex';
  cropArea.className = `crop-area ${shape}`;
  
  // Center crop area initially
  const previewRect = preview.getBoundingClientRect();
  cropArea.style.left = `${previewRect.left + (previewRect.width - 200) / 2}px`;
  cropArea.style.top = `${previewRect.top + (previewRect.height - 200) / 2}px`;
  
  makeDraggable(cropArea, preview);
  makeResizable(cropArea, preview, true);
  
  return newState;
}

/**
 * Applies the crop to the image
 * @param {Object} state - The current application state
 * @param {HTMLElement} cropOverlay - The crop overlay element
 * @param {HTMLElement} cropArea - The crop area element
 * @param {HTMLImageElement} preview - The preview image element
 * @param {Object} api - The WebAssembly API
 * @param {Object} Module - The WebAssembly module
 * @returns {Object} Updated state
 */
export function applyCrop(state, cropOverlay, cropArea, preview, api, Module) {
  if (!state.isCropping || !state.currentBuffer) return state;
  
  const previewRect = preview.getBoundingClientRect();
  const cropRect = cropArea.getBoundingClientRect();
  
  // Calculate relative positions
  let x = (cropRect.left - previewRect.left) / previewRect.width * state.currentImageData.width;
  let y = (cropRect.top - previewRect.top) / previewRect.height * state.currentImageData.height;
  let width = (cropRect.width / previewRect.width) * state.currentImageData.width;
  let height = (cropRect.height / previewRect.height) * state.currentImageData.height;
  
  // Ensure coordinates are within bounds
  x = Math.max(0, Math.min(x, state.currentImageData.width - width));
  y = Math.max(0, Math.min(y, state.currentImageData.height - height));
  
  // Round dimensions
  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  
  // Create new buffer for cropped image
  const newBuffer = api.create_buffer(roundedWidth, roundedHeight);
  
  // Apply crop to current buffer
  api.apply_crop(state.currentBuffer, state.currentImageData.width, state.currentImageData.height, 
                 Math.round(x), Math.round(y), roundedWidth, roundedHeight, 
                 state.currentCropShape === 'round');
  
  // Create new ImageData with cropped dimensions
  const croppedImageData = new ImageData(
    new Uint8ClampedArray(Module.HEAPU8.subarray(state.currentBuffer, state.currentBuffer + roundedWidth * roundedHeight * 4)),
    roundedWidth,
    roundedHeight
  );
  
  // Copy the cropped data to the new buffer
  Module.HEAPU8.set(croppedImageData.data, newBuffer);
  
  // Clean up old buffer
  api.destroy_buffer(state.currentBuffer);
  
  // Reset crop UI
  cropOverlay.style.display = 'none';
  
  return {
    ...state,
    currentBuffer: newBuffer,
    originalImageData: croppedImageData,
    currentImageData: croppedImageData,
    isCropping: false
  };
} 