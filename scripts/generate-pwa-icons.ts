/**
 * PWA Icon Generator Script for COR Pathways
 * 
 * Generates PNG icons for the PWA manifest with the COR Pathways branding.
 * 
 * Run: npx tsx scripts/generate-pwa-icons.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Icon sizes needed for PWA
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
const SHORTCUT_ICONS = ['form', 'hazard', 'docs'];

// Brand colors - COR Pathways Blue
const PRIMARY_COLOR = '#0066CC';
const BACKGROUND_COLOR = '#0066CC';
const TEXT_COLOR = '#ffffff';

/**
 * Generates an SVG icon with the COR Pathways logo (shield with checkmark)
 */
function generateSVGIcon(size: number, maskable = false): string {
  const padding = maskable ? size * 0.1 : 0;
  const innerSize = size - (padding * 2);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = maskable ? 0 : size * 0.15;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0077DD;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#004499;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${radius}" ry="${radius}"/>
  
  <!-- Shield icon -->
  <g transform="translate(${centerX}, ${centerY})">
    <!-- Shield shape -->
    <path d="M0,${-innerSize * 0.32} 
             L${innerSize * 0.28},${-innerSize * 0.2}
             L${innerSize * 0.28},${innerSize * 0.08}
             C${innerSize * 0.28},${innerSize * 0.22} 0,${innerSize * 0.36} 0,${innerSize * 0.36}
             C0,${innerSize * 0.36} ${-innerSize * 0.28},${innerSize * 0.22} ${-innerSize * 0.28},${innerSize * 0.08}
             L${-innerSize * 0.28},${-innerSize * 0.2}
             Z" 
          fill="rgba(255,255,255,0.15)" 
          stroke="${TEXT_COLOR}" 
          stroke-width="${size * 0.02}"
          stroke-linejoin="round"/>
    
    <!-- Checkmark -->
    <path d="M${-innerSize * 0.1},${innerSize * 0.02} 
             L${-innerSize * 0.02},${innerSize * 0.12} 
             L${innerSize * 0.14},${-innerSize * 0.08}" 
          fill="none" 
          stroke="${TEXT_COLOR}" 
          stroke-width="${size * 0.035}"
          stroke-linecap="round"
          stroke-linejoin="round"/>
  </g>
</svg>`;
}

/**
 * Generates shortcut icon SVGs
 */
function generateShortcutIcon(type: 'form' | 'hazard' | 'docs', size: number): string {
  const icons: Record<string, string> = {
    form: `
      <rect x="${size * 0.25}" y="${size * 0.2}" width="${size * 0.5}" height="${size * 0.6}" rx="${size * 0.04}" fill="white"/>
      <line x1="${size * 0.35}" y1="${size * 0.35}" x2="${size * 0.65}" y2="${size * 0.35}" stroke="#0066CC" stroke-width="${size * 0.04}" stroke-linecap="round"/>
      <line x1="${size * 0.35}" y1="${size * 0.48}" x2="${size * 0.65}" y2="${size * 0.48}" stroke="#0066CC" stroke-width="${size * 0.04}" stroke-linecap="round"/>
      <line x1="${size * 0.35}" y1="${size * 0.61}" x2="${size * 0.55}" y2="${size * 0.61}" stroke="#0066CC" stroke-width="${size * 0.04}" stroke-linecap="round"/>
    `,
    hazard: `
      <polygon points="${size * 0.5},${size * 0.2} ${size * 0.8},${size * 0.75} ${size * 0.2},${size * 0.75}" fill="white"/>
      <text x="${size * 0.5}" y="${size * 0.62}" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="#0066CC" text-anchor="middle">!</text>
    `,
    docs: `
      <rect x="${size * 0.22}" y="${size * 0.18}" width="${size * 0.45}" height="${size * 0.55}" rx="${size * 0.03}" fill="white"/>
      <rect x="${size * 0.32}" y="${size * 0.28}" width="${size * 0.45}" height="${size * 0.55}" rx="${size * 0.03}" fill="rgba(255,255,255,0.8)" stroke="white" stroke-width="${size * 0.02}"/>
      <line x1="${size * 0.4}" y1="${size * 0.42}" x2="${size * 0.68}" y2="${size * 0.42}" stroke="#0066CC" stroke-width="${size * 0.03}" stroke-linecap="round"/>
      <line x1="${size * 0.4}" y1="${size * 0.54}" x2="${size * 0.68}" y2="${size * 0.54}" stroke="#0066CC" stroke-width="${size * 0.03}" stroke-linecap="round"/>
      <line x1="${size * 0.4}" y1="${size * 0.66}" x2="${size * 0.58}" y2="${size * 0.66}" stroke="#0066CC" stroke-width="${size * 0.03}" stroke-linecap="round"/>
    `,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0077DD" />
      <stop offset="100%" style="stop-color:#004499" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  ${icons[type]}
</svg>`;
}

/**
 * Generates Apple touch icon
 */
function generateAppleTouchIcon(size: number): string {
  return generateSVGIcon(size, false);
}

// Main execution
async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  const iconsDir = path.join(publicDir, 'icons');
  const splashDir = path.join(publicDir, 'splash');
  const screenshotsDir = path.join(publicDir, 'screenshots');

  // Ensure directories exist
  [iconsDir, splashDir, screenshotsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('🎨 Generating COR Pathways PWA icons...\n');

  // Generate main icons
  for (const size of ICON_SIZES) {
    const svg = generateSVGIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(svgPath, svg);
    console.log(`  ✓ Generated icon-${size}x${size}.svg`);
  }

  // Generate Apple touch icon
  const appleIcon = generateAppleTouchIcon(180);
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleIcon);
  console.log('  ✓ Generated apple-touch-icon.svg');

  // Generate shortcut icons
  for (const type of SHORTCUT_ICONS) {
    const svg = generateShortcutIcon(type as 'form' | 'hazard' | 'docs', 96);
    fs.writeFileSync(path.join(iconsDir, `shortcut-${type}.svg`), svg);
    console.log(`  ✓ Generated shortcut-${type}.svg`);
  }

  // Generate favicon
  const favicon = generateSVGIcon(32);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), favicon);
  console.log('  ✓ Generated favicon.svg');

  console.log('\n✅ All SVG icons generated!');
  console.log('\n📝 Next step: Run "npx tsx scripts/convert-icons-to-png.ts" to convert to PNG');
}

main().catch(console.error);
