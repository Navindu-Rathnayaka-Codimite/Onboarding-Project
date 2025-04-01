import './style.css'
import { api } from './js/wasmApi.js';
import { handleFile, updatePreview, resetImage, exportImage, resetToUploadState } from './imageUtils.js';
import { startCrop, applyCrop } from './cropUtils.js';

document.querySelector('#app').innerHTML = `
  <div class="container">
    <nav class="sidebar">
      <h1>Tool Panel</h1>
      <div class="sidebar-content">
        <div class="menus">
          Filters
          <div class="filter-options">
            <button class="filter-btn" data-filter="monochrome">Monochrome</button>
            <button class="filter-btn" data-filter="bnw">B&W</button>
            <button class="filter-btn" data-filter="vivid">Vivid</button>
            <button class="filter-btn" data-filter="bright">Bright</button>
          </div>
        </div>
        <div class="menus">
          Adjustments
          <div class="adjustment-options">
            <div class="slider-group">
              <label>Brightness</label>
              <input type="range" min="-100" max="100" value="0" class="slider" data-adjustment="brightness">
              <div class="slider-zero"></div>
            </div>
            <div class="slider-group">
              <label>Contrast</label>
              <input type="range" min="-100" max="100" value="0" class="slider" data-adjustment="contrast">
              <div class="slider-zero"></div>
            </div>
            <div class="slider-group">
              <label>Saturation</label>
              <input type="range" min="-100" max="100" value="0" class="slider" data-adjustment="saturation">
              <div class="slider-zero"></div>
            </div>
            <div class="slider-group">
              <label>Highlights</label>
              <input type="range" min="-100" max="100" value="0" class="slider" data-adjustment="highlights">
              <div class="slider-zero"></div>
            </div>
            <div class="slider-group">
              <label>Shadows</label>
              <input type="range" min="-100" max="100" value="0" class="slider" data-adjustment="shadows">
              <div class="slider-zero"></div>
            </div>
          </div>
        </div>
        <div class="menus">
          Crop Tool
          <div class="crop-options">
            <button class="crop-btn" data-shape="square">Square Crop</button>
            <button class="crop-btn" data-shape="round">Round Crop</button>
          </div>
        </div>
      </div>
    </nav>
    <main class="content">
      <div class="topBar">
        <h2>Image Preview</h2>
        <span>
          <button id="resetBtn">Reset</button>
          <button id="exportBtn">Export</button>
          <button id="cancelBtn">Cancel</button>
        </span> 
      </div>
      <div id="dropArea">
        Upload your image here
        <input type="file" id="fileElem" accept="image/*" />
        <span id="dropText">or drag and drop it here</span>
      </div>
      <img src="#" alt="Image Preview" id="image-preview" style="display: none;" />
      <div id="cropOverlay" class="crop-overlay">
        <div id="cropArea" class="crop-area">
          <div class="resizer"></div>
        </div>
        <div class="crop-controls">
          <button id="applyCrop">Apply</button>
          <button id="cancelCrop">Cancel</button>
        </div>
      </div>
      <div id="exportModal" class="modal">
        <div class="modal-content">
          <h3>Export Quality</h3>
          <div class="export-options">
            <button data-scale="0.5">0.5x</button>
            <button data-scale="1">1x</button>
            <button data-scale="2">2x</button>
          </div>
          <div class="modal-buttons">
            <button id="downloadBtn">Export</button>
            <button id="closeModal">Cancel</button>
          </div>
        </div>
      </div>
    </main> 
  </div>
`

const dropArea = document.getElementById('dropArea');
const fileElem = document.getElementById('fileElem');
const preview = document.getElementById('image-preview');
const topBar = document.querySelector('.topBar');
const cropOverlay = document.getElementById('cropOverlay');
const cropArea = document.getElementById('cropArea');
const exportModal = document.getElementById('exportModal');
const exportBtn = document.getElementById('exportBtn');
let isCropping = false;
let currentCropShape = 'square';
let selectedScale = 1;

dropArea.addEventListener('click', (e) => {
  fileElem.click();
});

let currentBuffer = null;
let currentImageData = null;
let originalImageData = null;
let selectedFilter = null;
let adjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  highlights: 0,
  shadows: 0
};

function applyAllAdjustments() {
  if (!currentBuffer || !originalImageData) return;
  
  // Start with original or filtered image
  Module.HEAPU8.set(originalImageData.data, currentBuffer);
  
  // Apply selected filter if any
  if (selectedFilter) {
    api[`apply_${selectedFilter}`](currentBuffer, currentImageData.width, currentImageData.height);
  }
  
  // Apply all adjustments in sequence
  Object.entries(adjustmentValues).forEach(([adjustment, value]) => {
    if (value !== 0) {
      api[`apply_${adjustment}`](currentBuffer, currentImageData.width, currentImageData.height, value);
    }
  });
  
  updatePreview(currentBuffer, currentImageData.width, currentImageData.height, preview, Module);
}

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('active');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('active');
});

dropArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropArea.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const result = await handleFile(file, preview, dropArea, topBar, api, Module);
    currentBuffer = result.buffer;
    originalImageData = result.originalImageData;
    currentImageData = result.currentImageData;
    adjustmentValues = result.adjustmentValues;
  }
});

fileElem.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const result = await handleFile(file, preview, dropArea, topBar, api, Module);
    currentBuffer = result.buffer;
    originalImageData = result.originalImageData;
    currentImageData = result.currentImageData;
    adjustmentValues = result.adjustmentValues;
  }
});


document.querySelector('.filter-options').addEventListener('click', async (e) => {
  if (!e.target.matches('.filter-btn') || !currentBuffer) return;
  
  const filter = e.target.dataset.filter;
  
  if (selectedFilter === filter) {
    selectedFilter = null;
    e.target.classList.remove('selected');
  } else {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('selected'));
    selectedFilter = filter;
    e.target.classList.add('selected');
  }
  
  applyAllAdjustments();
});

document.querySelector('.adjustment-options').addEventListener('input', (e) => {
  if (!e.target.matches('.slider') || !currentBuffer) return;
  
  const adjustment = e.target.dataset.adjustment;
  adjustmentValues[adjustment] = parseInt(e.target.value);
  
  applyAllAdjustments();
});

// Add crop button handlers
document.querySelector('.crop-options').addEventListener('click', (e) => {
  if (!e.target.matches('.crop-btn')) return;
  const newState = startCrop(e.target.dataset.shape, {
    currentBuffer,
    isCropping,
    currentCropShape
  }, cropOverlay, cropArea, preview);
  isCropping = newState.isCropping;
  currentCropShape = newState.currentCropShape;
});

// Add crop control event listeners
document.getElementById('applyCrop').addEventListener('click', () => {
  const newState = applyCrop({
    currentBuffer,
    currentImageData,
    isCropping,
    currentCropShape
  }, cropOverlay, cropArea, preview, api, Module);
  
  currentBuffer = newState.currentBuffer;
  currentImageData = newState.currentImageData;
  originalImageData = newState.originalImageData;
  isCropping = newState.isCropping;
  
  updatePreview(currentBuffer, currentImageData.width, currentImageData.height, preview, Module);
});

document.getElementById('cancelCrop').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  cropOverlay.style.display = 'none';
  isCropping = false;
  // Reset to original image state
  if (currentBuffer && originalImageData) {
    applyAllAdjustments();
  }
});

// Replace the existing crop overlay click handler with this:
cropOverlay.addEventListener('click', (e) => {
  // Only handle clicks directly on the overlay background, not its children
  if (e.target === cropOverlay && 
      !cropArea.contains(e.target) && 
      !e.target.closest('.crop-controls')) {
    // Ignore clicks outside when cropping is active
    e.preventDefault();
    e.stopPropagation();
  }
});

// Add reset button event listener
document.getElementById('resetBtn').addEventListener('click', () => {
  const result = resetImage(currentBuffer, originalImageData, Module, preview);
  if (result) {
    currentImageData = result.currentImageData;
    selectedFilter = result.selectedFilter;
    adjustmentValues = result.adjustmentValues;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.slider').forEach(slider => slider.value = 0);
  }
});

// Add cancel button event listener
document.getElementById('cancelBtn').addEventListener('click', () => {
  const newState = resetToUploadState({
    currentBuffer,
    currentImageData,
    originalImageData,
    selectedFilter,
    adjustmentValues
  }, api, {
    preview,
    dropArea,
    topBar
  });
  
  // Update state
  currentBuffer = newState.currentBuffer;
  currentImageData = newState.currentImageData;
  originalImageData = newState.originalImageData;
  selectedFilter = newState.selectedFilter;
  adjustmentValues = newState.adjustmentValues;
  
  // Reset UI elements
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelectorAll('.slider').forEach(slider => slider.value = 0);
});

// Add event listeners
exportBtn.addEventListener('click', () => {
  exportModal.style.display = 'flex';
});

document.querySelector('.export-options').addEventListener('click', (e) => {
  if (!e.target.matches('button')) return;
  
  document.querySelectorAll('.export-options button').forEach(btn => 
    btn.classList.remove('selected'));
  e.target.classList.add('selected');
  selectedScale = parseFloat(e.target.dataset.scale);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  exportImage(currentBuffer, currentImageData, selectedScale, api, Module);
  exportModal.style.display = 'none';
});

document.getElementById('closeModal').addEventListener('click', () => {
  exportModal.style.display = 'none';
});

// Close modal when clicking outside
exportModal.addEventListener('click', (e) => {
  if (e.target === exportModal) {
    exportModal.style.display = 'none';
  }
});

