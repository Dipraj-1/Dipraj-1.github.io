import { wallpapers, getWallpaper } from './wallpapers.js';
import { drawPattern, exportWallpaper, PALETTES, PATTERN_LABELS, DESKTOP_W, DESKTOP_H, MOBILE_W, MOBILE_H } from './engine.js?v=2.4';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const wp = getWallpaper(id);

if (!wp) {
  window.location.href = '../index.html';
}

// Render fullscreen canvas
const canvas = document.getElementById('wallpaperCanvas');
canvas.width = 1920;
canvas.height = 1080;
drawPattern(canvas.getContext('2d'), 1920, 1080, wp.pattern, wp.palette, wp.seed, wp.inverted);
document.title = `wall-gen — ${wp.name}`;

// Bar info
document.getElementById('barTitle').textContent = wp.name;
document.getElementById('metaRes').textContent = '3840×2160';
document.getElementById('metaPattern').textContent = PATTERN_LABELS[wp.pattern];
document.getElementById('metaPaletteName').textContent = PALETTES[wp.palette].name;

// Download dropdown toggle
const btnDownload = document.getElementById('btnDownload');
const dropdown = document.getElementById('downloadDropdown');

btnDownload.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  dropdown.classList.remove('open');
});

document.getElementById('btnDownloadDesktop').addEventListener('click', () => {
  exportWallpaper(DESKTOP_W, DESKTOP_H, wp.pattern, wp.palette, wp.seed, wp.inverted, `wallgen-${wp.id}-desktop.png`);
  dropdown.classList.remove('open');
});

document.getElementById('btnDownloadMobile').addEventListener('click', () => {
  exportWallpaper(MOBILE_W, MOBILE_H, wp.pattern, wp.palette, wp.seed, wp.inverted, `wallgen-${wp.id}-mobile.png`);
  dropdown.classList.remove('open');
});

// File complete
