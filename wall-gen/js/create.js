import { drawPattern, drawClockOverlay, exportWallpaper, drawVignette, getBgColor, PALETTES, PATTERNS, PATTERN_LABELS, DESKTOP_W, DESKTOP_H, MOBILE_W, MOBILE_H } from './engine.js?v=2.4';

let currentPattern = 0;
let currentPalette = 0;
let seed = Math.random() * 10000 | 0;
let inverted = false;

// Offscreen canvases for caching patterns
const offscreenDesktop = document.createElement('canvas');
offscreenDesktop.width = 640;
offscreenDesktop.height = 360;

const offscreenMobile = document.createElement('canvas');
offscreenMobile.width = 145;
offscreenMobile.height = 314;

let cacheValid = false;

// Setup Custom Palette in imported PALETTES array
function lerpColorHex(c1, c2, t) {
  const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
  const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const toHex = v => String(v.toString(16)).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateCustomColors(start, end) {
  const colors = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    colors.push(lerpColorHex(start, end, t));
  }
  return colors;
}

const CUSTOM_PALETTE_INDEX = PALETTES.length;
PALETTES.push({
  name: 'Custom',
  colors: generateCustomColors('#d0bcff', '#381e72')
});

function getGrading() {
  return {
    saturation: parseInt(document.getElementById('sliderSaturation').value),
    contrast: parseInt(document.getElementById('sliderContrast').value),
    brightness: parseInt(document.getElementById('sliderBrightness').value),
    vignette: parseInt(document.getElementById('sliderVignette').value),
  };
}

function applyFilteredCanvas(ctx, offscreenCanvas, w, h, grading) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.filter = `saturate(${grading.saturation}%) contrast(${grading.contrast}%) brightness(${grading.brightness}%)`;
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.restore();
  if (grading.vignette && grading.vignette > 0) {
    drawVignette(ctx, w, h, grading.vignette);
  }
}

function draw() {
  const dCanvas = document.getElementById('previewDesktop');
  const mCanvas = document.getElementById('previewMobile');
  const dCtx = dCanvas.getContext('2d');
  const mCtx = mCanvas.getContext('2d');

  if (!cacheValid) {
    drawPattern(offscreenDesktop.getContext('2d'), 640, 360, currentPattern, currentPalette, seed, inverted, { saturation: 100, contrast: 100, brightness: 100, vignette: 0 });
    drawPattern(offscreenMobile.getContext('2d'), 145, 314, currentPattern, currentPalette, seed, inverted, { saturation: 100, contrast: 100, brightness: 100, vignette: 0 });
    cacheValid = true;
  }

  const grading = getGrading();
  applyFilteredCanvas(dCtx, offscreenDesktop, 640, 360, grading);
  applyFilteredCanvas(mCtx, offscreenMobile, 145, 314, grading);
  
  drawClockOverlay(dCtx, 640, 360, 'desktop', currentPalette, inverted);
  drawClockOverlay(mCtx, 145, 314, 'mobile', currentPalette, inverted);
  
  updateAmbientBackground();
}

let renderPending = false;
function render() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    draw();
    renderPending = false;
  });
}

// Pattern grid
const grid = document.getElementById('styleGrid');
PATTERNS.forEach((_, i) => {
  const btn = document.createElement('button');
  btn.className = 'style-btn' + (i === currentPattern ? ' active' : '');
  btn.title = PATTERN_LABELS[i];
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 75;
  btn.appendChild(c);
  grid.appendChild(btn);
  drawPattern(c.getContext('2d'), 120, 75, i, 0, 42, false, {});
  btn.onclick = () => {
    currentPattern = i;
    grid.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    cacheValid = false;
    render();
  };
});

// Palette row
const row = document.getElementById('paletteRow');
PALETTES.forEach((pal, i) => {
  const swatch = document.createElement('button');
  swatch.className = 'palette-swatch' + (i === currentPalette ? ' active' : '');
  swatch.title = pal.name;
  
  // Custom multi-color linear gradient swatch backgrounds!
  if (pal.name === 'Custom') {
    swatch.classList.add('custom-gradient-swatch');
  } else {
    // Elegant three-color gradients inside palette swatches rather than solid colors!
    swatch.style.background = `linear-gradient(135deg, ${pal.colors[1]}, ${pal.colors[4]}, ${pal.colors[7]})`;
  }
  row.appendChild(swatch);

  swatch.onclick = () => {
    currentPalette = i;
    row.querySelectorAll('.palette-swatch').forEach(b => b.classList.remove('active'));
    swatch.classList.add('active');

    // Toggle custom gradient panel
    const panel = document.getElementById('customGradientPanel');
    if (pal.name === 'Custom') {
      panel.classList.add('visible');
    } else {
      panel.classList.remove('visible');
    }

    cacheValid = false;
    render();
  };
});

// Bind Custom Color Pickers
const customColorStart = document.getElementById('customColorStart');
const customColorEnd = document.getElementById('customColorEnd');

function updateCustomPalette() {
  PALETTES[CUSTOM_PALETTE_INDEX].colors = generateCustomColors(customColorStart.value, customColorEnd.value);
  
  if (currentPalette !== CUSTOM_PALETTE_INDEX) {
    currentPalette = CUSTOM_PALETTE_INDEX;
    row.querySelectorAll('.palette-swatch').forEach((swatch, idx) => {
      if (idx === CUSTOM_PALETTE_INDEX) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
    // Toggle custom gradient panel
    document.getElementById('customGradientPanel').classList.add('visible');
  }

  cacheValid = false;
  render();
}

customColorStart.addEventListener('input', updateCustomPalette);
customColorEnd.addEventListener('input', updateCustomPalette);

// Bind Color Grading Sliders
const sliders = [
  { id: 'sliderSaturation', valId: 'valSaturation', suffix: '%' },
  { id: 'sliderContrast', valId: 'valContrast', suffix: '%' },
  { id: 'sliderBrightness', valId: 'valBrightness', suffix: '%' },
  { id: 'sliderVignette', valId: 'valVignette', suffix: '%' }
];

sliders.forEach(slider => {
  const el = document.getElementById(slider.id);
  const valEl = document.getElementById(slider.valId);
  el.addEventListener('input', () => {
    valEl.textContent = el.value + slider.suffix;
    render();
  });
});

// Mode toggle
document.getElementById('btnDark').onclick = () => {
  inverted = false;
  document.getElementById('btnDark').classList.add('active');
  document.getElementById('btnLight').classList.remove('active');
  document.getElementById('themeDark').classList.add('active');
  document.getElementById('themeLight').classList.remove('active');
  cacheValid = false;
  render();
};

document.getElementById('btnLight').onclick = () => {
  inverted = true;
  document.getElementById('btnLight').classList.add('active');
  document.getElementById('btnDark').classList.remove('active');
  document.getElementById('themeLight').classList.add('active');
  document.getElementById('themeDark').classList.remove('active');
  cacheValid = false;
  render();
};

// Shuffle
document.getElementById('btnShuffle').onclick = () => {
  seed = Math.random() * 100000 | 0;
  cacheValid = false;
  render();
};

// Resolution options for downloads
const desktopResolutions = {
  '4k': { w: DESKTOP_W, h: DESKTOP_H, filename: 'wallgen-desktop-4k.png', name: '4K' },
  '2k': { w: 2560, h: 1440, filename: 'wallgen-desktop-2k.png', name: '2K' },
  'fhd': { w: 1920, h: 1080, filename: 'wallgen-desktop-fhd.png', name: 'FHD' }
};

const mobileResolutions = {
  '4k': { w: MOBILE_W, h: MOBILE_H, filename: 'wallgen-android-4k.png', name: '4K' },
  '2k': { w: 1080, h: 2340, filename: 'wallgen-android-2k.png', name: '2K' },
  'fhd': { w: 720, h: 1560, filename: 'wallgen-android-fhd.png', name: 'FHD' }
};

// Dropdown menu handlers
const desktopDropdown = document.getElementById('desktopDropdown');
const mobileDropdown = document.getElementById('mobileDropdown');
const btnDesktopToggle = document.getElementById('btnDesktopToggle');
const btnMobileToggle = document.getElementById('btnMobileToggle');

btnDesktopToggle.addEventListener('click', () => {
  desktopDropdown.classList.toggle('visible');
  btnDesktopToggle.classList.toggle('active');
  mobileDropdown.classList.remove('visible');
  btnMobileToggle.classList.remove('active');
});

btnMobileToggle.addEventListener('click', () => {
  mobileDropdown.classList.toggle('visible');
  btnMobileToggle.classList.toggle('active');
  desktopDropdown.classList.remove('visible');
  btnDesktopToggle.classList.remove('active');
});

// Desktop resolution selections
document.querySelectorAll('#desktopDropdown .dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const resolution = item.dataset.resolution;
    const config = desktopResolutions[resolution];
    exportWallpaper(config.w, config.h, currentPattern, currentPalette, seed, inverted, config.filename, getGrading());
    desktopDropdown.classList.remove('visible');
    btnDesktopToggle.classList.remove('active');
  });
});

// Mobile resolution selections
document.querySelectorAll('#mobileDropdown .dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const resolution = item.dataset.resolution;
    const config = mobileResolutions[resolution];
    exportWallpaper(config.w, config.h, currentPattern, currentPalette, seed, inverted, config.filename, getGrading());
    mobileDropdown.classList.remove('visible');
    btnMobileToggle.classList.remove('active');
  });
});

// Close dropdowns when clicking outside, and hide sidebar if clicking outside it
document.addEventListener('click', (e) => {
  if (!e.target.closest('.download-wrapper')) {
    desktopDropdown.classList.remove('visible');
    mobileDropdown.classList.remove('visible');
    btnDesktopToggle.classList.remove('active');
    btnMobileToggle.classList.remove('active');
  }
  
  // Hide sidebar if clicking outside sidebar, navbar, and dropdown wrappers
  if (!e.target.closest('.controls-panel') && !e.target.closest('nav') && !e.target.closest('.download-wrapper')) {
    if (sidebarVisible) {
      controlsPanel.classList.remove('visible');
      sidebarVisible = false;
    }
  }
});

// Fullscreen Visualizer
const fsVisualizer = document.getElementById('fullscreenVisualizer');
const fsCanvas = document.getElementById('fullscreenCanvas');
const btnCloseFullscreen = document.getElementById('btnCloseFullscreen');
const btnToggleClock = document.getElementById('btnToggleClock');

const previewDesktop = document.getElementById('previewDesktop');
const previewMobile = document.getElementById('previewMobile');

let showClock = true;

function redrawFullscreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fsCtx = fsCanvas.getContext('2d');
  const grading = getGrading();
  
  drawPattern(fsCtx, w, h, currentPattern, currentPalette, seed, inverted, grading);
  
  if (showClock) {
    // Draw clock overlay based on aspect ratio
    const type = w < 768 ? 'mobile' : 'desktop';
    drawClockOverlay(fsCtx, w, h, type, currentPalette, inverted);
  }
}

function openFullscreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  fsCanvas.width = w;
  fsCanvas.height = h;
  redrawFullscreen();
  fsVisualizer.classList.add('visible');
}

function closeFullscreen() {
  fsVisualizer.classList.remove('visible');
}

previewDesktop.addEventListener('click', openFullscreen);
previewMobile.addEventListener('click', openFullscreen);
btnCloseFullscreen.onclick = closeFullscreen;
btnToggleClock.onclick = () => {
  showClock = !showClock;
  redrawFullscreen();
};

function mixColors(c1, c2, t) {
  const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
  const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const toHex = v => String(v.toString(16)).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function updateAmbientBackground() {
  const pal = PALETTES[currentPalette];
  if (!pal || !pal.colors) return;
  
  const colors = pal.colors;
  const color1 = colors[Math.min(2, colors.length - 1)];
  const color2 = colors[Math.min(6, colors.length - 1)];
  
  const r = document.documentElement.style;
  r.setProperty('--ambient-1', color1);
  r.setProperty('--ambient-2', color2);
}

document.getElementById('themeDark').addEventListener('click', () => {
  inverted = false;
  document.getElementById('btnDark').classList.add('active');
  document.getElementById('btnLight').classList.remove('active');
  document.getElementById('themeDark').classList.add('active');
  document.getElementById('themeLight').classList.remove('active');
  cacheValid = false;
  render();
});
document.getElementById('themeLight').addEventListener('click', () => {
  inverted = true;
  document.getElementById('btnLight').classList.add('active');
  document.getElementById('btnDark').classList.remove('active');
  document.getElementById('themeLight').classList.add('active');
  document.getElementById('themeDark').classList.remove('active');
  cacheValid = false;
  render();
});

function ensureFontLoaded(callback) {
  if (!document.fonts || document.fonts.check('1em "Anurati"')) {
    callback();
    return;
  }

  document.fonts.load('1em "Anurati"').then(() => {
    callback();
  }).catch(() => {
    callback();
  });
}

const bootScreen = document.getElementById('boot-screen');
if (bootScreen) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      bootScreen.classList.add('hide');
    }, 1100);
  });
}

ensureFontLoaded(render);

// Floating navbar and sidebar hover detection
const nav = document.querySelector('nav');
const controlsPanel = document.querySelector('.controls-panel');
let navVisible = false;
let sidebarVisible = false;

document.addEventListener('mousemove', (e) => {
  if (window.innerWidth <= 1024) return; // Skip hover navbar/sidebar toggling on mobile/tablet viewports

  // Show navbar only when cursor is in top 80px
  if (e.clientY < 80) {
    if (!navVisible) {
      nav.style.transform = 'translateX(-50%) translateY(0)';
      nav.style.opacity = '1';
      nav.style.pointerEvents = 'auto';
      controlsPanel.classList.remove('expanded');
      navVisible = true;
    }
  } else {
    // Hide navbar when cursor moves down past 80px
    if (navVisible) {
      nav.style.transform = 'translateX(-50%) translateY(-130%)';
      nav.style.opacity = '0';
      nav.style.pointerEvents = 'none';
      controlsPanel.classList.add('expanded');
      navVisible = false;
    }
  }
  
  // Show sidebar when cursor is in right 80px
  const windowWidth = window.innerWidth;
  if (e.clientX > windowWidth - 80) {
    if (!sidebarVisible) {
      controlsPanel.classList.add('visible');
      sidebarVisible = true;
    }
  }
});

// Keep sidebar visible when hovering over it
controlsPanel.addEventListener('mouseenter', () => {
  if (window.innerWidth <= 1024) return; // Skip on mobile/tablet
  sidebarVisible = true;
  controlsPanel.classList.add('visible');
});

// Hide sidebar only when clicking outside
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 1024) return; // Skip on mobile/tablet

  // Check if click is outside the sidebar and not on navbar
  if (!e.target.closest('.download-wrapper') && !e.target.closest('.controls-panel') && !e.target.closest('nav')) {
    // Only hide if sidebar is visible
    if (sidebarVisible) {
      controlsPanel.classList.remove('visible');
      sidebarVisible = false;
    }
  }
});
