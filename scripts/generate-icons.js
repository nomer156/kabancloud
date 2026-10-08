import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  
  <!-- Rounded Base -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4" />
  
  <!-- Blueprint Grid lines subtle -->
  <path d="M 64 160 H 448 M 64 256 H 448 M 64 352 H 448 M 160 64 V 448 M 256 64 V 448 M 352 64 V 448" 
        stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.15" />

  <!-- Kanban Column 1 -->
  <rect x="80" y="100" width="100" height="312" rx="16" fill="url(#cardGrad)" opacity="0.7"/>
  <rect x="96" y="124" width="68" height="68" rx="12" fill="#38bdf8" fill-opacity="0.2" stroke="#38bdf8" stroke-width="2"/>
  <rect x="96" y="208" width="68" height="96" rx="12" fill="rgba(255,255,255,0.06)"/>

  <!-- Kanban Column 2 (Active with Glowing Card) -->
  <rect x="206" y="100" width="100" height="312" rx="16" fill="url(#cardGrad)" opacity="0.9"/>
  <rect x="222" y="124" width="68" height="110" rx="12" fill="url(#accent)"/>
  <circle cx="242" cy="150" r="10" fill="#ffffff" fill-opacity="0.9" />
  <line x1="260" y1="145" x2="278" y2="145" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
  <line x1="260" y1="155" x2="274" y2="155" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8" />
  <rect x="232" y="180" width="48" height="8" rx="4" fill="#ffffff" fill-opacity="0.4" />
  <rect x="232" y="196" width="34" height="8" rx="4" fill="#ffffff" fill-opacity="0.4" />
  <rect x="222" y="250" width="68" height="74" rx="12" fill="rgba(255,255,255,0.06)"/>

  <!-- Kanban Column 3 (Done) -->
  <rect x="332" y="100" width="100" height="312" rx="16" fill="url(#cardGrad)" opacity="0.7"/>
  <rect x="348" y="124" width="68" height="84" rx="12" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
  <path d="M 372 166 L 380 174 L 396 156" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="348" y="224" width="68" height="84" rx="12" fill="rgba(255,255,255,0.06)"/>
</svg>`;

const publicDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent, 'utf8');
console.log('SVG icons written successfully');
