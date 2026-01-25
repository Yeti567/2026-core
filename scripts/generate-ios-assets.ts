/**
 * Generate iOS-specific PWA assets (icons and splash screens)
 * 
 * Usage: npx tsx scripts/generate-ios-assets.ts
 * 
 * Prerequisites:
 * - npm install sharp (as devDependency)
 * - Source icon at public/logo.png (512x512 or larger recommended)
 */

import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');
const splashDir = path.join(publicDir, 'splash');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// iOS App Icons (all required sizes)
const iosIconSizes = [
  57, 60, 72, 76, 114, 120, 144, 152, 180
];

// PWA Icon sizes
const pwaIconSizes = [
  72, 96, 128, 144, 152, 192, 384, 512
];

// iOS Splash Screen sizes (width x height)
const iosSplashSizes = [
  // iPhone 15 Pro Max, 15 Plus, 14 Pro Max
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796' },
  { width: 2796, height: 1290, name: 'apple-splash-2796-1290' },
  
  // iPhone 15 Pro, 15, 14 Pro
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556' },
  { width: 2556, height: 1179, name: 'apple-splash-2556-1179' },
  
  // iPhone 14, 13, 12
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532' },
  { width: 2532, height: 1170, name: 'apple-splash-2532-1170' },
  
  // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778' },
  { width: 2778, height: 1284, name: 'apple-splash-2778-1284' },
  
  // iPhone 13 Mini, 12 Mini, 11 Pro, XS, X
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436' },
  { width: 2436, height: 1125, name: 'apple-splash-2436-1125' },
  
  // iPhone 11, XR
  { width: 828, height: 1792, name: 'apple-splash-828-1792' },
  { width: 1792, height: 828, name: 'apple-splash-1792-828' },
  
  // iPhone 11 Pro Max, XS Max
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688' },
  { width: 2688, height: 1242, name: 'apple-splash-2688-1242' },
  
  // iPhone SE, 8, 7, 6s
  { width: 750, height: 1334, name: 'apple-splash-750-1334' },
  { width: 1334, height: 750, name: 'apple-splash-1334-750' },
  
  // iPhone 8 Plus, 7 Plus, 6s Plus
  { width: 1242, height: 2208, name: 'apple-splash-1242-2208' },
  { width: 2208, height: 1242, name: 'apple-splash-2208-1242' },
  
  // iPad Pro 12.9"
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732' },
  { width: 2732, height: 2048, name: 'apple-splash-2732-2048' },
  
  // iPad Pro 11"
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388' },
  { width: 2388, height: 1668, name: 'apple-splash-2388-1668' },
  
  // iPad Air, iPad 10.9"
  { width: 1640, height: 2360, name: 'apple-splash-1640-2360' },
  { width: 2360, height: 1640, name: 'apple-splash-2360-1640' },
  
  // iPad 9th gen
  { width: 1620, height: 2160, name: 'apple-splash-1620-2160' },
  { width: 2160, height: 1620, name: 'apple-splash-2160-1620' },
  
  // iPad Mini 6th gen
  { width: 1488, height: 2266, name: 'apple-splash-1488-2266' },
  { width: 2266, height: 1488, name: 'apple-splash-2266-1488' },
  
  // iPad 9.7"
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048' },
  { width: 2048, height: 1536, name: 'apple-splash-2048-1536' },
];

async function generateAssets() {
  // Dynamic import for sharp
  const sharp = (await import('sharp')).default;
  
  const sourceLogoPath = path.join(publicDir, 'logo.png');
  const sourceSvgPath = path.join(publicDir, 'icons', 'icon-512x512.svg');
  
  // Check for source file
  let sourceFile: string;
  if (fs.existsSync(sourceLogoPath)) {
    sourceFile = sourceLogoPath;
    console.log('Using source: public/logo.png');
  } else if (fs.existsSync(sourceSvgPath)) {
    sourceFile = sourceSvgPath;
    console.log('Using source: public/icons/icon-512x512.svg');
  } else {
    console.log('⚠️  No source logo found. Creating placeholder icons...');
    await createPlaceholderIcons(sharp);
    return;
  }
  
  console.log('\n📱 Generating iOS App Icons...');
  for (const size of iosIconSizes) {
    const outputPath = path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`);
    await sharp(sourceFile)
      .resize(size, size, { fit: 'cover', background: { r: 0, g: 102, b: 204, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ apple-touch-icon-${size}x${size}.png`);
  }
  
  // Also create default apple-touch-icon.png (180x180)
  await sharp(sourceFile)
    .resize(180, 180, { fit: 'cover', background: { r: 0, g: 102, b: 204, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log(`  ✓ apple-touch-icon.png (180x180)`);
  
  console.log('\n🖼️  Generating PWA Icons...');
  for (const size of pwaIconSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(sourceFile)
      .resize(size, size, { fit: 'cover', background: { r: 0, g: 102, b: 204, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }
  
  // Generate favicon
  await sharp(sourceFile)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log(`  ✓ favicon-32x32.png`);
  
  console.log('\n🌊 Generating iOS Splash Screens...');
  console.log('  (This may take a while...)\n');
  
  for (const splash of iosSplashSizes) {
    const outputPath = path.join(splashDir, `${splash.name}.jpg`);
    
    // Create a splash screen with centered logo
    const logoSize = Math.min(splash.width, splash.height) * 0.3;
    const logo = await sharp(sourceFile)
      .resize(Math.round(logoSize), Math.round(logoSize), { fit: 'contain' })
      .toBuffer();
    
    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 0, g: 102, b: 204, alpha: 1 } // #0066CC
      }
    })
      .composite([
        {
          input: logo,
          gravity: 'center'
        }
      ])
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    console.log(`  ✓ ${splash.name}.jpg (${splash.width}x${splash.height})`);
  }
  
  console.log('\n✅ All iOS assets generated successfully!');
  console.log(`\nGenerated files:`);
  console.log(`  - ${iosIconSizes.length + 1} iOS App Icons`);
  console.log(`  - ${pwaIconSizes.length} PWA Icons`);
  console.log(`  - ${iosSplashSizes.length} Splash Screens`);
}

async function createPlaceholderIcons(sharp: typeof import('sharp').default) {
  const brandColor = { r: 0, g: 102, b: 204, alpha: 1 }; // #0066CC
  
  console.log('\n📱 Creating placeholder iOS App Icons...');
  for (const size of iosIconSizes) {
    const outputPath = path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: brandColor
      }
    })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ apple-touch-icon-${size}x${size}.png`);
  }
  
  // Default apple-touch-icon
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: brandColor
    }
  })
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log(`  ✓ apple-touch-icon.png (180x180)`);
  
  console.log('\n🖼️  Creating placeholder PWA Icons...');
  for (const size of pwaIconSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: brandColor
      }
    })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }
  
  console.log('\n🌊 Creating placeholder Splash Screens...');
  for (const splash of iosSplashSizes) {
    const outputPath = path.join(splashDir, `${splash.name}.jpg`);
    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: brandColor
      }
    })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✓ ${splash.name}.jpg`);
  }
  
  console.log('\n✅ Placeholder assets created.');
  console.log('   Replace public/logo.png with your actual logo and re-run this script.');
}

// Run the generator
generateAssets().catch(console.error);
