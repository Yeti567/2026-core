/**
 * Convert SVG icons to PNG format for COR Pathways PWA
 * 
 * Run: npx tsx scripts/convert-icons-to-png.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const iconsDir = path.join(process.cwd(), 'public', 'icons');
const publicDir = path.join(process.cwd(), 'public');

async function convertSvgToPng(svgPath: string, pngPath: string, size?: number) {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    let pipeline = sharp(svgBuffer);
    
    if (size) {
      pipeline = pipeline.resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 102, b: 204, alpha: 1 } // #0066CC
      });
    }
    
    await pipeline.png().toFile(pngPath);
    console.log(`  ✓ Converted ${path.basename(pngPath)}`);
  } catch (error) {
    console.error(`  ✗ Error converting ${path.basename(svgPath)}:`, error);
  }
}

async function generatePlaceholderScreenshot(
  outputPath: string, 
  width: number, 
  height: number,
  label: string
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0077DD"/>
          <stop offset="100%" style="stop-color:#004499"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <text x="${width/2}" y="${height/2 - 30}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.08}" font-weight="bold" fill="white" text-anchor="middle">COR Pathways</text>
      <text x="${width/2}" y="${height/2 + 30}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.04}" fill="rgba(255,255,255,0.7)" text-anchor="middle">${label}</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  console.log(`  ✓ Generated ${path.basename(outputPath)}`);
}

async function main() {
  console.log('🔄 Converting COR Pathways icons to PNG...\n');

  // Ensure directories exist
  const screenshotsDir = path.join(publicDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Get all SVG files in icons directory
  const svgFiles = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));

  for (const svgFile of svgFiles) {
    const svgPath = path.join(iconsDir, svgFile);
    const pngFile = svgFile.replace('.svg', '.png');
    const pngPath = path.join(iconsDir, pngFile);
    
    // Extract size from filename if present
    const sizeMatch = svgFile.match(/(\d+)x(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
    
    await convertSvgToPng(svgPath, pngPath, size);
  }

  // Convert favicon.svg to favicon.png
  const faviconSvg = path.join(publicDir, 'favicon.svg');
  const faviconPng = path.join(publicDir, 'favicon.png');
  
  if (fs.existsSync(faviconSvg)) {
    await convertSvgToPng(faviconSvg, faviconPng, 32);
  }

  // Generate placeholder screenshots
  console.log('\n📸 Generating placeholder screenshots...\n');
  
  await generatePlaceholderScreenshot(
    path.join(screenshotsDir, 'mobile-1.png'),
    540, 720,
    'Mobile Dashboard'
  );
  
  await generatePlaceholderScreenshot(
    path.join(screenshotsDir, 'desktop-1.png'),
    1920, 1080,
    'Desktop Dashboard'
  );

  console.log('\n✅ All icons and screenshots generated!');
  console.log('\n📝 Notes:');
  console.log('   - Replace placeholder screenshots with actual app screenshots');
  console.log('   - For a proper favicon.ico, use https://realfavicongenerator.net/');
}

main().catch(console.error);
