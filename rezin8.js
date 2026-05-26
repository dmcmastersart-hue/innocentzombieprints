/**
 * REZIN8 Labs - Premium 3D Print Resin Calculator Engine
 * Adapted for InnocentZombiePrints Integration
 * Core Application Logic, STL Parser, and Three.js 3D Viewer
 */

// Application State
let fileQueue = [];
let activeFileIndex = null;
let appSettings = {
  bottleCapacity: 1.0,   // Liters
  costPerBottle: 30.00,  // USD
  overhead: 20,          // % combined overhead (0 - 100)
  calibrationProfile: 'Lychee Default',
  calibrationFactor: 1.0 // multiplier for raw volume
};

// Three.js Global Variables
let scene, camera, renderer, controls;
let currentMesh = null;
let currentBBoxHelper = null;
let gridHelper = null;
let buildPlate = null;

// Load settings from LocalStorage
function loadSettings() {
  const saved = localStorage.getItem('rezin8_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appSettings = { ...appSettings, ...parsed };
      
      // Update inputs in UI
      document.getElementById('resin-cost').value = appSettings.costPerBottle.toFixed(2);
      document.getElementById('resin-capacity').value = appSettings.bottleCapacity.toFixed(2);
      document.getElementById('slider-overhead').value = appSettings.overhead;
      document.getElementById('val-overhead').textContent = `${appSettings.overhead}%`;
      
      updateCalibrationIndicator();
    } catch (e) {
      console.error("Error parsing saved settings", e);
    }
  }
}

// Save settings to LocalStorage
function saveSettings() {
  localStorage.setItem('rezin8_settings', JSON.stringify(appSettings));
  updateCalibrationIndicator();
}

// Update calibration indicators in headers and wizards
function updateCalibrationIndicator() {
  const indicator = document.getElementById('calib-indicator');
  const headerIndicator = document.getElementById('header-calib-indicator');
  const profileName = document.getElementById('calib-profile-name');
  
  if (appSettings.calibrationFactor !== 1.0) {
    const text = `Calibrated (${appSettings.calibrationFactor.toFixed(2)}x)`;
    
    if (indicator) {
      indicator.style.display = 'flex';
      indicator.innerHTML = `<i data-lucide="check-circle-2"></i> ${text}`;
    }
    
    if (headerIndicator) {
      headerIndicator.style.display = 'flex';
    }
    if (profileName) {
      profileName.textContent = `Lychee Calibrated (${appSettings.calibrationFactor.toFixed(2)}x)`;
    }
  } else {
    if (indicator) indicator.style.display = 'none';
    if (headerIndicator) headerIndicator.style.display = 'none';
  }
  lucide.createIcons();
}

// Global UI Toast alerts
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle-2';
  else if (type === 'error') icon = 'alert-triangle';
  else if (type === 'warning') icon = 'alert-circle';
  
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  
  // Animate slide-in
  setTimeout(() => toast.classList.add('active'), 50);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------------------------------------------
// STL Parser Algorithms (Binary & ASCII)
// ----------------------------------------------------

// Binary STL detector
function isBinarySTL(buffer) {
  if (buffer.byteLength < 84) return false;
  
  // Read triangles count at byte 80
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  
  // Binary format check: size = 84 + (triangles * 50)
  const expectedSize = 84 + numTriangles * 50;
  
  // Allow 2 bytes of padding/extra EOF metadata
  return Math.abs(expectedSize - buffer.byteLength) <= 2;
}

// High-speed Binary parser
function parseBinarySTL(buffer) {
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  
  const vertices = new Float32Array(numTriangles * 9);
  let offset = 84;
  let vOffset = 0;
  
  for (let i = 0; i < numTriangles; i++) {
    // Skip normal coordinates (first 3 floats / 12 bytes)
    
    // Vertex 1
    vertices[vOffset++] = view.getFloat32(offset + 12, true);
    vertices[vOffset++] = view.getFloat32(offset + 16, true);
    vertices[vOffset++] = view.getFloat32(offset + 20, true);
    
    // Vertex 2
    vertices[vOffset++] = view.getFloat32(offset + 24, true);
    vertices[vOffset++] = view.getFloat32(offset + 28, true);
    vertices[vOffset++] = view.getFloat32(offset + 32, true);
    
    // Vertex 3
    vertices[vOffset++] = view.getFloat32(offset + 36, true);
    vertices[vOffset++] = view.getFloat32(offset + 40, true);
    vertices[vOffset++] = view.getFloat32(offset + 44, true);
    
    offset += 50;
  }
  
  return vertices;
}

// Ultra high-speed index-based ASCII parser
function parseAsciiSTL(text) {
  const vertices = [];
  let index = 0;
  const len = text.length;
  
  // Loop and locate the word "vertex" which represents face points
  while (true) {
    index = text.indexOf("vertex", index);
    if (index === -1) break;
    
    index += 6; // step past "vertex"
    
    // Extract three numeric coordinates (X, Y, Z)
    let coordinatesRead = 0;
    while (coordinatesRead < 3 && index < len) {
      // Skip whitespaces
      while (index < len && text.charCodeAt(index) <= 32) {
        index++;
      }
      if (index >= len) break;
      
      const start = index;
      // Read until next whitespace
      while (index < len && text.charCodeAt(index) > 32) {
        index++;
      }
      const token = text.substring(start, index);
      const value = parseFloat(token);
      if (!isNaN(value)) {
        vertices.push(value);
        coordinatesRead++;
      }
    }
  }
  
  return new Float32Array(vertices);
}

// Mathematical calculations for Volume, Bounding Box, Surface Area
function calculateMeshStats(vertices) {
  let totalVolume = 0;
  let totalArea = 0;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  const numCoords = vertices.length;
  
  for (let i = 0; i < numCoords; i += 9) {
    const x1 = vertices[i],     y1 = vertices[i+1],   z1 = vertices[i+2];
    const x2 = vertices[i+3],   y2 = vertices[i+4],   z2 = vertices[i+5];
    const x3 = vertices[i+6],   y3 = vertices[i+7],   z3 = vertices[i+8];
    
    // Track Min/Max bounds for Bounding Box
    if (x1 < minX) minX = x1; if (x1 > maxX) maxX = x1;
    if (x2 < minX) minX = x2; if (x2 > maxX) maxX = x2;
    if (x3 < minX) minX = x3; if (x3 > maxX) maxX = x3;
    
    if (y1 < minY) minY = y1; if (y1 > maxY) maxY = y1;
    if (y2 < minY) minY = y2; if (y2 > maxY) maxY = y2;
    if (y3 < minY) minY = y3; if (y3 > maxY) maxY = y3;
    
    if (z1 < minZ) minZ = z1; if (z1 > maxZ) maxZ = z1;
    if (z2 < minZ) minZ = z2; if (z2 > maxZ) maxZ = z2;
    if (z3 < minZ) minZ = z3; if (z3 > maxZ) maxZ = z3;
    
    // Signed Volume of Tetrahedron: divergence theorem applied
    const signedVolume = (
      -x3 * y2 * z1 +
       x2 * y3 * z1 +
       x3 * y1 * z2 -
       x1 * y3 * z2 -
       x2 * y1 * z3 +
       x1 * y2 * z3
    ) / 6.0;
    
    totalVolume += signedVolume;
    
    // Triangle Area: 0.5 * |(v2 - v1) x (v3 - v1)|
    const ax = x2 - x1, ay = y2 - y1, az = z2 - z1;
    const bx = x3 - x1, by = y3 - y1, bz = z3 - z1;
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const area = 0.5 * Math.sqrt(cx*cx + cy*cy + cz*cz);
    
    totalArea += area;
  }
  
  // Volume is computed in mm³. 1000 mm³ = 1 cm³ = 1 mL
  const volumeMl = Math.abs(totalVolume) / 1000.0;
  
  return {
    volume: volumeMl, // mL
    surfaceArea: totalArea / 100.0, // cm²
    boundingBox: {
      width: maxX - minX,  // mm
      height: maxY - minY, // mm
      depth: maxZ - minZ,  // mm
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    }
  };
}

// ----------------------------------------------------
// Three.js Interactive 3D Canvas System
// ----------------------------------------------------

// State for 3D engine active status
let is3dActive = true;

function init3DViewer() {
  if (!is3dActive) return;
  
  const container = document.getElementById('canvas-container');
  if (!container) return;
  
  // If already initialized, reuse it and do not re-initialize!
  if (renderer && scene && camera) {
    return;
  }
  
  // Clean up any stray canvas elements in the container to prevent duplicates
  const strayCanvases = container.querySelectorAll('canvas');
  strayCanvases.forEach(c => c.remove());
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Scene Setup
  scene = new THREE.Scene();
  scene.background = null; // Let CSS radial gradients bleed through
  
  // Camera Setup (Standard Perspective)
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(100, 100, 100);
  
  // Renderer Setup (WebGL with transparent canvas & antialiasing)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  
  // Controls Setup (OrbitControls without damping for snappier 0% idle CPU)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; 
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevents camera going below build plate
  controls.minDistance = 10;
  controls.maxDistance = 400;
  
  // Render on demand: only draw frames when controls shift! (Huge CPU saving)
  controls.addEventListener('change', requestRender);
  
  // Natural Studio Lighting Setup (Zero color tints, realistic highlights/shadows)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45); 
  scene.add(ambientLight);
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.75); 
  mainLight.position.set(150, 250, 100);
  scene.add(mainLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35); 
  fillLight.position.set(-150, 100, -100);
  scene.add(fillLight); 
  
  // Build Plate Grid (SLA Bed Grid)
  buildPlate = new THREE.Group();
  
  gridHelper = new THREE.GridHelper(160, 32, 0x06b6d4, 0x1f2330);
  gridHelper.position.y = 0;
  buildPlate.add(gridHelper);
  
  // Solid build plate rim/border for premium look
  const rimGeo = new THREE.BoxGeometry(162, 2, 162);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x12141c,
    roughness: 0.8,
    metalness: 0.5,
    transparent: true,
    opacity: 0.5
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = -1.05;
  buildPlate.add(rimMesh);
  
  scene.add(buildPlate);
  
  // Resize Handler
  window.addEventListener('resize', onWindowResize);
  
  // Single initial render frame draw
  requestRender();
}

// Render on demand trigger
function requestRender() {
  if (is3dActive && renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onWindowResize() {
  if (!is3dActive || !renderer || !camera) return;
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  requestRender();
}

// Function to load parsed vertices into the 3D canvas and render
function renderSTLOnBuildPlate(vertices) {
  if (!is3dActive) return; // Skip WebGL if engine is off
  
  // Clear any existing mesh & box helper
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    if (Array.isArray(currentMesh.material)) {
      currentMesh.material.forEach(m => m.dispose());
    } else {
      currentMesh.material.dispose();
    }
  }
  if (currentBBoxHelper) {
    scene.remove(currentBBoxHelper);
    currentBBoxHelper.geometry.dispose();
    currentBBoxHelper.material.dispose();
  }
  
  // 1. Construct Geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  
  // Center mesh coordinates around origin (0, 0, 0)
  geometry.center();
  
  // 2. Matte White Prototyping Resin Material
  const resinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3f4f6,          // Gorgeous opaque matte white resin
    roughness: 0.45,          // Soft plastic roughness
    metalness: 0.05,          
    side: THREE.DoubleSide
  });
  
  currentMesh = new THREE.Mesh(geometry, resinMaterial);
  
  // Rotate the Mesh itself instead of mutating the underlying vertex array
  // in-place, which would cause cumulative rotations when switching models.
  currentMesh.rotation.x = -Math.PI / 2;
  
  // 3. Offset mesh so the bottom sits exactly on top of the build grid (Y = 0)
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  
  // Since raw STL is Z-up, the vertical height before X-rotation is in the Z dimension
  const height = bbox.max.z - bbox.min.z;
  
  currentMesh.position.set(0, height / 2, 0);
  scene.add(currentMesh);
  
  // 4. Bounding Box Helper (glowing boundary cage)
  currentBBoxHelper = new THREE.BoxHelper(currentMesh, 0xec4899); // neon pink/magenta cage
  currentBBoxHelper.material.transparent = true;
  currentBBoxHelper.material.opacity = 0.45;
  scene.add(currentBBoxHelper);
  
  // 5. Autocalibrate camera and focus on model center
  zoomToFitMesh();
}

function zoomToFitMesh() {
  if (!is3dActive || !currentMesh || !controls || !camera) return;
  
  currentMesh.geometry.computeBoundingSphere();
  const sphere = currentMesh.geometry.boundingSphere;
  const center = new THREE.Vector3().copy(sphere.center);
  
  // Apply position offset (since mesh sits elevated on grid)
  center.y += currentMesh.position.y;
  
  const radius = sphere.radius;
  
  // Re-aim OrbitControls target
  controls.target.copy(center);
  
  // Reposition Camera to frame sphere perfectly
  const fitOffset = 1.35;
  const fovRad = (camera.fov * Math.PI) / 180;
  let cameraDist = radius / Math.sin(fovRad / 2);
  
  // Factor in margins
  cameraDist *= fitOffset;
  
  // Place camera along an aesthetic isometric vector
  camera.position.set(center.x + cameraDist * 0.7, center.y + cameraDist * 0.5, center.z + cameraDist * 0.7);
  camera.lookAt(center);
  
  controls.update();
  requestRender(); 
}

// Power management for 3D WebGL engine
function toggle3DEngine(active) {
  is3dActive = active;
  const btn = document.getElementById('btn-toggle-3d');
  const placeholder = document.getElementById('viewer-placeholder');
  const ctrlGroup = document.getElementById('viewer-controls');
  
  if (active) {
    if (btn) {
      btn.textContent = "ON";
      btn.classList.add('active');
    }
    if (placeholder) placeholder.style.display = 'none';
    if (ctrlGroup) ctrlGroup.style.display = 'flex';
    
    init3DViewer();
    if (activeFileIndex !== null && fileQueue[activeFileIndex]) {
      // Re-trigger render
      renderSTLOnBuildPlate(fileQueue[activeFileIndex].vertices);
    }
    showToast("3D Engine activated.", "success");
  } else {
    if (btn) {
      btn.textContent = "OFF";
      btn.classList.remove('active');
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (ctrlGroup) ctrlGroup.style.display = 'none';
    
    // Unbind resize listener to avoid duplicates safely
    try {
      window.removeEventListener('resize', onWindowResize);
    } catch (e) {
      console.warn("Error removing resize listener", e);
    }
    
    // Shut down Three.js, dispose controls, and release context safely
    try {
      if (controls) {
        controls.removeEventListener('change', requestRender);
        controls.dispose();
      }
    } catch (e) {
      console.warn("Error disposing OrbitControls", e);
    }
    controls = null;
    
    try {
      if (currentMesh) {
        if (scene) scene.remove(currentMesh);
        if (currentMesh.geometry) currentMesh.geometry.dispose();
        if (currentMesh.material) {
          if (Array.isArray(currentMesh.material)) {
            currentMesh.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
          } else if (typeof currentMesh.material.dispose === 'function') {
            currentMesh.material.dispose();
          }
        }
      }
    } catch (e) {
      console.warn("Error disposing currentMesh", e);
    }
    currentMesh = null;
    
    try {
      if (currentBBoxHelper) {
        if (scene) scene.remove(currentBBoxHelper);
        if (currentBBoxHelper.geometry) currentBBoxHelper.geometry.dispose();
        if (currentBBoxHelper.material) {
          if (Array.isArray(currentBBoxHelper.material)) {
            currentBBoxHelper.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
          } else if (typeof currentBBoxHelper.material.dispose === 'function') {
            currentBBoxHelper.material.dispose();
          }
        }
      }
    } catch (e) {
      console.warn("Error disposing bounding box helper", e);
    }
    currentBBoxHelper = null;
    
    try {
      if (gridHelper && typeof gridHelper.dispose === 'function') {
        gridHelper.dispose();
      }
    } catch (e) {
      console.warn("Error disposing grid helper", e);
    }
    gridHelper = null;
    
    try {
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && typeof renderer.domElement.remove === 'function') {
          renderer.domElement.remove();
        }
      }
    } catch (e) {
      console.error("Error destroying renderer", e);
    }
    renderer = null;
    
    scene = null;
    camera = null;
    buildPlate = null;
    
    showToast("3D Engine deactivated to save CPU.", "info");
  }
  
  // Save toggle state with safety checks
  try {
    const saved = localStorage.getItem('rezin8_settings') ? JSON.parse(localStorage.getItem('rezin8_settings')) : {};
    saved.is3dActive = active;
    localStorage.setItem('rezin8_settings', JSON.stringify(saved));
  } catch (e) {
    console.warn("Error saving 3D active state to localStorage", e);
  }
}

// ----------------------------------------------------
// Core Calculation & State Engine
// ----------------------------------------------------

function recalculateAll() {
  let projectVol = 0;
  let projectWeight = 0;
  let projectCost = 0;
  
  const density = 1.0; 
  const costPerBottle = parseFloat(document.getElementById('resin-cost').value) || 30.00;
  const bottleCapacity = parseFloat(document.getElementById('resin-capacity').value) || 1.0; 
  const overheadInput = document.getElementById('slider-overhead');
  const overheadFactor = (overheadInput ? parseFloat(overheadInput.value) : 20) / 100.0;
  const calibFactor = appSettings.calibrationFactor;
  
  // Save updated capacity & cost
  appSettings.bottleCapacity = bottleCapacity;
  appSettings.costPerBottle = costPerBottle;
  appSettings.overhead = Math.round(overheadFactor * 100);
  
  const costPerMl = costPerBottle / (bottleCapacity * 1000.0);
  
  let totalModelVolume = 0;
  let totalOverheadVolume = 0;

  // Process queue files
  fileQueue.forEach((file, index) => {
    // 1. Raw volume calibrated against Lychee
    const baseVolume = file.stats.volume * calibFactor;
    
    // 2. Combined Supports & Loss Overhead calculation
    const overheadVolume = baseVolume * overheadFactor;
    
    // 3. Dynamic aggregate
    const totalVolume = baseVolume + overheadVolume;
    const totalWeight = totalVolume * density;
    const totalCost = totalVolume * costPerMl;
    
    // Store localized results
    file.results = {
      baseVolume,
      overheadVolume,
      totalVolume,
      totalWeight,
      totalCost
    };
    
    // Update individual DOM card stat
    const card = document.getElementById(`file-card-${index}`);
    if (card) {
      card.querySelector('.card-volume').textContent = `${totalVolume.toFixed(2)} mL`;
      card.querySelector('.card-cost').textContent = `$${totalCost.toFixed(2)}`;
    }
    
    // Accumulate project totals
    projectVol += totalVolume;
    projectWeight += totalWeight;
    projectCost += totalCost;
    
    totalModelVolume += baseVolume;
    totalOverheadVolume += overheadVolume;
  });
  
  // Update Project Dashboard
  document.getElementById('total-volume').innerHTML = `${projectVol.toFixed(2)} <span style="font-size:14px; font-weight:500;">mL</span>`;
  document.getElementById('total-weight').innerHTML = `${projectWeight.toFixed(2)} <span style="font-size:14px; font-weight:500;">g</span>`;
  document.getElementById('total-cost').textContent = `$${projectCost.toFixed(2)}`;
  
  // Update Distribution Ratio Graph
  if (projectVol > 0) {
    const modelPct = (totalModelVolume / projectVol) * 100;
    const overheadPct = (totalOverheadVolume / projectVol) * 100;
    
    document.getElementById('bar-model').style.width = `${modelPct}%`;
    document.getElementById('bar-overhead').style.width = `${overheadPct}%`;
    
    document.getElementById('breakdown-percentage').textContent = 
      `Model: ${modelPct.toFixed(0)}% | Overhead: ${overheadPct.toFixed(0)}%`;
      
    document.getElementById('legend-model').textContent = `${totalModelVolume.toFixed(1)} mL`;
    document.getElementById('legend-overhead').textContent = `${totalOverheadVolume.toFixed(1)} mL`;
  } else {
    document.getElementById('bar-model').style.width = `100%`;
    document.getElementById('bar-overhead').style.width = `0%`;
    document.getElementById('breakdown-percentage').textContent = `Model: 100% | Overhead: 0%`;
    document.getElementById('legend-model').textContent = `0.0 mL`;
    document.getElementById('legend-overhead').textContent = `0.0 mL`;
  }
}

// Queue file manager
function selectFileInQueue(index) {
  if (index === activeFileIndex) return;
  
  activeFileIndex = index;
  
  // Update queue card selection borders
  document.querySelectorAll('.file-card').forEach((card, i) => {
    if (i === index) card.classList.add('active');
    else card.classList.remove('active');
  });
  
  const file = fileQueue[index];
  
  // Render model on 3D canvas
  renderSTLOnBuildPlate(file.vertices);
  
  // Update Physical size info card
  document.getElementById('bounds-overlay').style.display = 'flex';
  document.getElementById('bound-x').textContent = `${file.stats.boundingBox.width.toFixed(1)} mm`;
  document.getElementById('bound-y').textContent = `${file.stats.boundingBox.depth.toFixed(1)} mm`;
  document.getElementById('bound-z').textContent = `${file.stats.boundingBox.height.toFixed(1)} mm`;
}

function removeFileFromQueue(event, index) {
  event.stopPropagation(); // prevent card selection trigger
  
  // Remove file and update indices
  fileQueue.splice(index, 1);
  
  // Clear Active selection triggers if queue gets modified
  if (fileQueue.length === 0) {
    activeFileIndex = null;
    if (currentMesh) scene.remove(currentMesh);
    if (currentBBoxHelper) scene.remove(currentBBoxHelper);
    currentMesh = null;
    currentBBoxHelper = null;
    document.getElementById('bounds-overlay').style.display = 'none';
    document.getElementById('queue-empty-state').style.display = 'flex';
    document.getElementById('clear-queue-btn').style.display = 'none';
  } else {
    // If deleted the active selection, reset selection to first item
    if (activeFileIndex === index) {
      activeFileIndex = null;
      selectFileInQueue(0);
    } else if (activeFileIndex > index) {
      activeFileIndex--;
    }
  }
  
  renderQueueList();
  recalculateAll();
  updateCalibrationDropdown();
  showToast("Model removed from queue.", "info");
}

function clearAllQueue() {
  fileQueue = [];
  activeFileIndex = null;
  
  // Reset Three.js elements
  if (currentMesh) scene.remove(currentMesh);
  if (currentBBoxHelper) scene.remove(currentBBoxHelper);
  currentMesh = null;
  currentBBoxHelper = null;
  
  document.getElementById('bounds-overlay').style.display = 'none';
  document.getElementById('queue-empty-state').style.display = 'flex';
  document.getElementById('clear-queue-btn').style.display = 'none';
  
  renderQueueList();
  recalculateAll();
  updateCalibrationDropdown();
  showToast("Project queue cleared.", "info");
}

// Render queue list in container HTML
function renderQueueList() {
  const list = document.getElementById('file-list');
  if (!list) return;
  
  // Remove all child file-cards except empty state
  const cards = list.querySelectorAll('.file-card');
  cards.forEach(card => card.remove());
  
  const countBadge = document.getElementById('queue-count');
  if (countBadge) {
    countBadge.textContent = `${fileQueue.length} File${fileQueue.length === 1 ? '' : 's'}`;
  }
  
  if (fileQueue.length === 0) {
    document.getElementById('queue-empty-state').style.display = 'flex';
    document.getElementById('clear-queue-btn').style.display = 'none';
    return;
  }
  
  document.getElementById('queue-empty-state').style.display = 'none';
  document.getElementById('clear-queue-btn').style.display = 'inline-flex';
  
  fileQueue.forEach((file, index) => {
    const card = document.createElement('div');
    card.id = `file-card-${index}`;
    card.className = `file-card ${index === activeFileIndex ? 'active' : ''}`;
    card.onclick = () => selectFileInQueue(index);
    
    // Human readable size helper
    const kb = file.size / 1024;
    const mb = kb / 1024;
    const sizeStr = mb > 1 ? `${mb.toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
    
    card.innerHTML = `
      <div class="card-icon">
        <i data-lucide="box"></i>
      </div>
      <div class="card-info">
        <div class="card-name" title="${file.name}">${file.name}</div>
        <div class="card-meta">
          <span><i data-lucide="hard-drive" style="width:11px;height:11px;"></i> ${sizeStr}</span>
          <span><i data-lucide="scale" style="width:11px;height:11px;"></i> X:${file.stats.boundingBox.width.toFixed(0)} Y:${file.stats.boundingBox.depth.toFixed(0)} Z:${file.stats.boundingBox.height.toFixed(0)}</span>
        </div>
      </div>
      <div class="card-actions">
        <div class="card-stat">
          <div class="card-volume">0.00 mL</div>
          <div class="card-cost">$0.00</div>
        </div>
        <button class="btn-delete" onclick="removeFileFromQueue(event, ${index})" title="Delete model">
          <i data-lucide="x"></i>
        </button>
      </div>
    `;
    
    list.appendChild(card);
  });
  
  lucide.createIcons();
}

// Read multiple files
async function handleFileSelection(files) {
  if (files.length === 0) return;
  
  let stlFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.stl'));
  
  if (stlFiles.length === 0) {
    showToast("Invalid format. Please drag or upload standard STL files.", "error");
    return;
  }
  
  // Show spinner / load indicator
  showToast(`Processing ${stlFiles.length} file${stlFiles.length > 1 ? 's' : ''}...`, "info");
  
  for (let file of stlFiles) {
    try {
      const parsedData = await parseSingleSTLFile(file);
      
      fileQueue.push(parsedData);
      showToast(`Parsed: ${file.name}`, "success");
    } catch (err) {
      console.error(err);
      showToast(`Error parsing ${file.name}: ${err.message}`, "error");
    }
  }
  
  // Update view
  renderQueueList();
  recalculateAll();
  updateCalibrationDropdown();
  
  // Highlight newly added items
  if (activeFileIndex === null && fileQueue.length > 0) {
    selectFileInQueue(0);
  }
}

// Wrap FileReader in promise
function parseSingleSTLFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const buffer = e.target.result;
        
        const isBin = isBinarySTL(buffer);
        let vertices;
        
        if (isBin) {
          vertices = parseBinarySTL(buffer);
        } else {
          // Convert arrayBuffer to string
          const decoder = new TextDecoder("utf-8");
          const text = decoder.decode(buffer);
          vertices = parseAsciiSTL(text);
        }
        
        if (vertices.length === 0 || vertices.length % 9 !== 0) {
          throw new Error("Invalid STL file. Contains zero vertices.");
        }
        
        const stats = calculateMeshStats(vertices);
        
        resolve({
          name: file.name,
          size: file.size,
          vertices: vertices,
          stats: stats
        });
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("File load failed. Check permissions."));
    reader.readAsArrayBuffer(file);
  });
}

// ----------------------------------------------------
// Lychee Slicer Calibration Modal
// ----------------------------------------------------

function openCalibrationModal() {
  const modal = document.getElementById('calib-modal');
  modal.classList.add('active');
  updateCalibrationDropdown();
  triggerModalCalculation();
}

function closeCalibrationModal() {
  const modal = document.getElementById('calib-modal');
  modal.classList.remove('active');
}

function updateCalibrationDropdown() {
  const select = document.getElementById('calib-model-select');
  if (!select) return;
  select.innerHTML = '';
  
  if (fileQueue.length === 0) {
    select.innerHTML = '<option value="">-- No models loaded --</option>';
    document.getElementById('calib-raw-volume').value = "0.00";
    return;
  }
  
  fileQueue.forEach((file, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = file.name;
    if (index === activeFileIndex) opt.selected = true;
    select.appendChild(opt);
  });
}

function triggerModalCalculation() {
  const select = document.getElementById('calib-model-select');
  if (!select) return;
  const index = parseInt(select.value);
  
  if (isNaN(index) || !fileQueue[index]) {
    document.getElementById('calib-raw-volume').value = "0.00";
    document.getElementById('calib-math-results').style.display = 'none';
    return;
  }
  
  const file = fileQueue[index];
  
  // Show raw parsed volume
  document.getElementById('calib-raw-volume').value = file.stats.volume.toFixed(2);
  
  const slicerVol = parseFloat(document.getElementById('calib-slicer-volume').value);
  
  if (isNaN(slicerVol) || slicerVol <= 0) {
    document.getElementById('calib-math-results').style.display = 'none';
    return;
  }
  
  // Math: Multiplier ratio
  const ratio = slicerVol / file.stats.volume;
  const overhead = (ratio - 1) * 100;
  
  document.getElementById('math-ratio').textContent = `${ratio.toFixed(3)}x`;
  
  const overheadEl = document.getElementById('math-overhead');
  if (overhead >= 0) {
    overheadEl.textContent = `+${overhead.toFixed(1)}%`;
    overheadEl.style.color = 'var(--accent-yellow)';
  } else {
    overheadEl.textContent = `${overhead.toFixed(1)}%`;
    overheadEl.style.color = 'var(--accent-green)';
  }
  
  document.getElementById('math-multiplier').textContent = `${ratio.toFixed(3)}x`;
  document.getElementById('calib-math-results').style.display = 'flex';
}

function applyCalibration() {
  const select = document.getElementById('calib-model-select');
  if (!select) return;
  const index = parseInt(select.value);
  
  if (isNaN(index) || !fileQueue[index]) {
    showToast("Please select a valid reference model first.", "warning");
    return;
  }
  
  const slicerVol = parseFloat(document.getElementById('calib-slicer-volume').value);
  if (isNaN(slicerVol) || slicerVol <= 0) {
    showToast("Please enter a valid Lychee slicer volume.", "warning");
    return;
  }
  
  const rawVol = fileQueue[index].stats.volume;
  const factor = slicerVol / rawVol;
  
  appSettings.calibrationFactor = factor;
  appSettings.calibrationProfile = 'Lychee Calibrated';
  
  saveSettings();
  recalculateAll();
  closeCalibrationModal();
  showToast(`Lychee Slicer calibration applied: ${factor.toFixed(2)}x`, "success");
}

function resetCalibration() {
  appSettings.calibrationFactor = 1.0;
  appSettings.calibrationProfile = 'Lychee Default';
  
  document.getElementById('calib-slicer-volume').value = '';
  
  saveSettings();
  recalculateAll();
  closeCalibrationModal();
  showToast("Calibration reset to default (1.00x).", "info");
}

// ----------------------------------------------------
// Project Exports & Reports
// ----------------------------------------------------

function exportProjectJSON() {
  if (fileQueue.length === 0) {
    showToast("No data to export. Add models to project first.", "warning");
    return;
  }
  
  // Consolidate settings and items
  const data = {
    appName: "REZIN8 Labs",
    exportedAt: new Date().toISOString(),
    settings: {
      bottleCapacityL: appSettings.bottleCapacity,
      costPerBottle: appSettings.costPerBottle,
      overheadPct: appSettings.overhead,
      lycheeMultiplier: appSettings.calibrationFactor
    },
    projectQueue: fileQueue.map(file => ({
      name: file.name,
      physicalBounds: {
        width_x: file.stats.boundingBox.width,
        depth_y: file.stats.boundingBox.depth,
        height_z: file.stats.boundingBox.height
      },
      surfaceArea_cm2: file.stats.surfaceArea,
      baseVolume_mL: file.stats.volume,
      calibratedBaseVolume_mL: file.results.baseVolume,
      overheadVolume_mL: file.results.overheadVolume,
      totalVolume_mL: file.results.totalVolume,
      totalWeight_g: file.results.totalWeight,
      estimatedCost: file.results.totalCost
    }))
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rezin8-estimate-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("JSON file exported successfully.");
}

function exportProjectCSV() {
  if (fileQueue.length === 0) {
    showToast("No data to export. Add models to project first.", "warning");
    return;
  }
  
  const density = 1.0;
  const costPerBottle = parseFloat(document.getElementById('resin-cost').value) || 30.00;
  const bottleCapacity = parseFloat(document.getElementById('resin-capacity').value) || 1.0;
  const overheadInput = document.getElementById('slider-overhead');
  const overheadPct = overheadInput ? parseInt(overheadInput.value) : 20;
  const calibFactor = appSettings.calibrationFactor;
  
  // Compile spreadsheet rows
  let csv = [
    `"REZIN8 Labs Cost Estimate Report - ${new Date().toLocaleDateString()}"`,
    `"Lychee Slicer Calibration: ${calibFactor.toFixed(3)}x"`,
    `"Support & Loss Overhead: ${overheadPct}%"`,
    `"Resin Bottle Cost: $${costPerBottle.toFixed(2)} per ${bottleCapacity.toFixed(2)}L"`,
    "",
    `"Model Name","Width (mm)","Depth (mm)","Height (mm)","Surface Area (cm2)","Base Volume (mL)","Calibrated Volume (mL)","Overhead Volume (mL)","Total Volume (mL)","Total Weight (g)","Estimated Cost ($)"`
  ];
  
  let totalBaseVol = 0;
  let totalCalVol = 0;
  let totalOverheadVol = 0;
  let totalVol = 0;
  let totalWeight = 0;
  let totalCost = 0;
  
  fileQueue.forEach(file => {
    const name = file.name.replace(/"/g, '""'); // escape double quotes
    const width = file.stats.boundingBox.width.toFixed(1);
    const depth = file.stats.boundingBox.depth.toFixed(1);
    const height = file.stats.boundingBox.height.toFixed(1);
    const area = file.stats.surfaceArea.toFixed(1);
    const rawVol = file.stats.volume.toFixed(2);
    
    const baseVol = file.results.baseVolume.toFixed(2);
    const overheadVol = file.results.overheadVolume.toFixed(2);
    const total = file.results.totalVolume.toFixed(2);
    const weight = file.results.totalWeight.toFixed(2);
    const cost = file.results.totalCost.toFixed(2);
    
    totalBaseVol += file.stats.volume;
    totalCalVol += file.results.baseVolume;
    totalOverheadVol += file.results.overheadVolume;
    totalVol += file.results.totalVolume;
    totalWeight += file.results.totalWeight;
    totalCost += file.results.totalCost;
    
    csv.push(`"${name}",${width},${depth},${height},${area},${rawVol},${baseVol},${overheadVol},${total},${weight},${cost}`);
  });
  
  csv.push("");
  csv.push(`"Project Totals","","","","",${totalBaseVol.toFixed(2)},${totalCalVol.toFixed(2)},${totalOverheadVol.toFixed(2)},${totalVol.toFixed(2)},${totalWeight.toFixed(2)},${totalCost.toFixed(2)}`);
  
  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rezin8-estimate-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Excel spreadsheet (.csv) exported successfully.");
}

function generatePrintablePDFReport() {
  if (fileQueue.length === 0) {
    showToast("No data to generate report.", "warning");
    return;
  }
  
  // Dynamic generation of printed summary window
  const printWindow = window.open('', '_blank');
  
  let totalVol = 0;
  let totalWeight = 0;
  let totalCost = 0;
  
  let tableRows = '';
  fileQueue.forEach((file) => {
    totalVol += file.results.totalVolume;
    totalWeight += file.results.totalWeight;
    totalCost += file.results.totalCost;
    
    tableRows += `
      <tr>
        <td style="font-weight:600; padding:10px; border-bottom:1px solid #ddd;">${file.name}</td>
        <td style="text-align:center; padding:10px; border-bottom:1px solid #ddd;">
          ${file.stats.boundingBox.width.toFixed(0)} x ${file.stats.boundingBox.depth.toFixed(0)} x ${file.stats.boundingBox.height.toFixed(0)} mm
        </td>
        <td style="text-align:right; font-family:monospace; padding:10px; border-bottom:1px solid #ddd;">${file.results.baseVolume.toFixed(2)} mL</td>
        <td style="text-align:right; font-family:monospace; padding:10px; border-bottom:1px solid #ddd;">${file.results.overheadVolume.toFixed(2)} mL</td>
        <td style="text-align:right; font-family:monospace; padding:10px; border-bottom:1px solid #ddd;">${file.results.totalVolume.toFixed(2)} mL</td>
        <td style="text-align:right; font-family:monospace; padding:10px; border-bottom:1px solid #ddd;">${file.results.totalWeight.toFixed(2)} g</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold; padding:10px; border-bottom:1px solid #ddd; color:#1b5e20;">$${file.results.totalCost.toFixed(2)}</td>
      </tr>
    `;
  });
  
  const html = `
    <html>
      <head>
        <title>REZIN8 Labs - 3D Print Resin Estimate Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
          .header-box { border-bottom: 2px solid #00b0ff; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 28px; font-weight: 800; color: #12141c; margin: 0; }
          .sub { font-size: 14px; color: #666; margin: 4px 0 0 0; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #f7f9fa; border-radius: 8px; border: 1px solid #e1e4e6; }
          .meta-table td { padding: 12px 16px; font-size: 14px; }
          .meta-table td.label { font-weight: bold; color: #555; width: 180px; }
          .table-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #12141c; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .data-table th { background-color: #12141c; color: white; padding: 12px 10px; font-size: 13px; text-transform: uppercase; font-weight: bold; text-align: left; }
          .data-table th.right { text-align: right; }
          .summary-banner { background: #e0f7fa; border: 1px solid #b2ebf2; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; }
          .summary-card { text-align: center; flex: 1; }
          .summary-card:not(:last-child) { border-right: 1px solid #b2ebf2; }
          .sum-label { font-size: 12px; font-weight: bold; color: #00838f; text-transform: uppercase; margin-bottom: 6px; }
          .sum-val { font-size: 24px; font-weight: 800; color: #006064; font-family: monospace; }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="background:#00b0ff; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">Print Estimate</button>
        </div>
        <div class="header-box">
          <div>
            <h1 class="title">REZIN8 LABS REPORT</h1>
            <p class="sub">High-Fidelity 3D Print Resin Cost Calculations</p>
          </div>
          <div style="text-align:right; font-size:12px; color:#777;">
            Date Generated: ${new Date().toLocaleDateString()}<br>
            Time Generated: ${new Date().toLocaleTimeString()}
          </div>
        </div>
        
        <div class="table-title">Calculation Parameters</div>
        <table class="meta-table">
          <tr>
            <td class="label">Resin Density:</td>
            <td>1.00 g/mL (Fixed)</td>
            <td class="label">Support & Loss:</td>
            <td>${appSettings.overhead}%</td>
          </tr>
          <tr>
            <td class="label">Resin Bottle Cost:</td>
            <td>$${appSettings.costPerBottle.toFixed(2)}</td>
            <td class="label">Bottle Capacity:</td>
            <td>${appSettings.bottleCapacity.toFixed(2)} Liters</td>
          </tr>
          <tr>
            <td class="label">Lychee Calibration:</td>
            <td colspan="3">${appSettings.calibrationFactor.toFixed(3)}x multiplier (${appSettings.calibrationProfile})</td>
          </tr>
        </table>
        
        <div class="table-title">Model Specifications</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="padding-left:10px;">Model Name</th>
              <th style="text-align:center;">Bounding Box</th>
              <th class="right">Base Vol</th>
              <th class="right">Support & Loss</th>
              <th class="right">Total Vol</th>
              <th class="right">Total Weight</th>
              <th class="right" style="padding-right:10px;">Estimated Cost</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary-banner">
          <div class="summary-card">
            <div class="sum-label">Aggregate Volume</div>
            <div class="sum-val">${totalVol.toFixed(2)} mL</div>
          </div>
          <div class="summary-card">
            <div class="sum-label">Aggregate Weight</div>
            <div class="sum-val">${totalWeight.toFixed(2)} g</div>
          </div>
          <div class="summary-card">
            <div class="sum-label">Aggregate Cost</div>
            <div class="sum-val" style="color:#2e7d32;">$${totalCost.toFixed(2)}</div>
          </div>
        </div>
        
        <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
          Generated with REZIN8 Labs STL Estimator. Results are calibrated approximations. Vat temperature, hollowing parameters, and specific support designs will affect actual prints.
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  showToast("Report opened in print-ready tab.");
}

// ----------------------------------------------------
// UI Bindings & Initialization
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Load local settings
  loadSettings();
  
  // Setup icons
  lucide.createIcons();
  
  // Load 3D engine toggle state
  const savedSettings = localStorage.getItem('rezin8_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      if (parsed.is3dActive !== undefined) {
        is3dActive = parsed.is3dActive;
      }
    } catch(e) {}
  }
  
  // Init 3D Viewer
  if (is3dActive) {
    init3DViewer();
  } else {
    toggle3DEngine(false);
  }
  
  // 3D Engine ON/OFF toggle click handlers
  const toggle3dBtn = document.getElementById('btn-toggle-3d');
  if (toggle3dBtn) {
    toggle3dBtn.addEventListener('click', () => {
      toggle3DEngine(!is3dActive);
    });
  }
  
  const activate3dBtn = document.getElementById('btn-activate-3d');
  if (activate3dBtn) {
    activate3dBtn.addEventListener('click', () => {
      toggle3DEngine(true);
    });
  }
  
  // Drag & Drop event bindings
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleFileSelection(e.dataTransfer.files);
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelection(e.target.files);
    });
  }
  
  // Parameter changes binding
  const resCap = document.getElementById('resin-capacity');
  if (resCap) {
    resCap.addEventListener('input', () => {
      recalculateAll();
      saveSettings();
    });
  }
  
  const resCost = document.getElementById('resin-cost');
  if (resCost) {
    resCost.addEventListener('input', () => {
      recalculateAll();
      saveSettings();
    });
  }
  
  const overheadSlider = document.getElementById('slider-overhead');
  if (overheadSlider) {
    overheadSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('val-overhead').textContent = `${val}%`;
      appSettings.overhead = val;
      recalculateAll();
      saveSettings();
    });
  }
  
  // Calibration event bindings
  const openCalBtn = document.getElementById('btn-open-calibration');
  if (openCalBtn) openCalBtn.addEventListener('click', openCalibrationModal);
  
  const closeCalBtn = document.getElementById('btn-close-modal');
  if (closeCalBtn) closeCalBtn.addEventListener('click', closeCalibrationModal);
  
  const calSelect = document.getElementById('calib-model-select');
  if (calSelect) calSelect.addEventListener('change', triggerModalCalculation);
  
  const calSlicerVol = document.getElementById('calib-slicer-volume');
  if (calSlicerVol) calSlicerVol.addEventListener('input', triggerModalCalculation);
  
  const applyCalBtn = document.getElementById('btn-apply-calibration');
  if (applyCalBtn) applyCalBtn.addEventListener('click', applyCalibration);
  
  const resetCalBtn = document.getElementById('btn-reset-calibration');
  if (resetCalBtn) resetCalBtn.addEventListener('click', resetCalibration);
  
  // Close modal when clicking outside
  const calModal = document.getElementById('calib-modal');
  if (calModal) {
    calModal.addEventListener('click', (e) => {
      if (e.target === calModal) {
        closeCalibrationModal();
      }
    });
  }
  
  // Zoom & grid triggers
  const zoomFitBtn = document.getElementById('btn-zoom-fit');
  if (zoomFitBtn) zoomFitBtn.addEventListener('click', zoomToFitMesh);
  
  const toggleGridBtn = document.getElementById('btn-toggle-grid');
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
      if (!buildPlate) return;
      buildPlate.visible = !buildPlate.visible;
      const btn = document.getElementById('btn-toggle-grid');
      if (buildPlate.visible) {
        btn.style.borderColor = 'hsla(180, 100%, 50%, 0.15)';
        btn.style.color = 'var(--text-primary)';
        showToast("Build plate grid visible.", "info");
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.color = 'var(--text-muted)';
        showToast("Build plate grid hidden.", "info");
      }
      requestRender();
    });
  }
  
  // Clear Queue
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  if (clearQueueBtn) clearQueueBtn.addEventListener('click', clearAllQueue);
  
  // Logo focus fit
  const logo = document.getElementById('app-logo');
  if (logo) {
    logo.addEventListener('click', () => {
      if (currentMesh) zoomToFitMesh();
    });
  }
  
  // Export event bindings
  const exportDataBtn = document.getElementById('btn-export-data');
  const exportMenu = document.getElementById('export-menu');
  const exportExcelBtn = document.getElementById('btn-export-excel');
  const exportJsonBtn = document.getElementById('btn-export-json');
  
  if (exportDataBtn && exportMenu) {
    exportDataBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('active');
    });
    
    // Close menu when clicking document
    document.addEventListener('click', (e) => {
      if (exportMenu.classList.contains('active') && !exportMenu.contains(e.target) && e.target !== exportDataBtn) {
        exportMenu.classList.remove('active');
      }
    });
  }
  
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      exportProjectCSV();
      if (exportMenu) exportMenu.classList.remove('active');
    });
  }
  
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportProjectJSON();
      if (exportMenu) exportMenu.classList.remove('active');
    });
  }
  
  const exportReportBtn = document.getElementById('btn-export-report');
  if (exportReportBtn) exportReportBtn.addEventListener('click', generatePrintablePDFReport);
});
