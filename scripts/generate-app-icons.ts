/**
 * Generate App Icons from Voicely Logo
 *
 * This script extracts the bird from the logo and creates all required
 * app icon sizes for PWA and mobile platforms.
 *
 * Usage: npx tsx scripts/generate-app-icons.ts
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_LOGO = path.join(__dirname, "../src/assets/voicely-logo.png");
const OUTPUT_DIR = path.join(__dirname, "../public");

// Icon sizes needed for PWA and mobile
const ICON_SIZES = [
  { name: "icon-192x192.png", size: 192 }, // PWA standard
  { name: "icon-512x512.png", size: 512 }, // PWA standard (splash)
  { name: "apple-touch-icon.png", size: 180 }, // iOS home screen
  { name: "icon-152x152.png", size: 152 }, // iPad
  { name: "icon-144x144.png", size: 144 }, // Android
  { name: "icon-96x96.png", size: 96 }, // Android
  { name: "icon-72x72.png", size: 72 }, // Android
  { name: "icon-48x48.png", size: 48 }, // Android
  { name: "favicon-32x32.png", size: 32 }, // Browser tab
  { name: "favicon-16x16.png", size: 16 }, // Browser tab (small)
];

async function generateIcons() {
  console.log("🎨 Generating app icons from Voicely logo...\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load the original logo
  const image = sharp(INPUT_LOGO);
  const metadata = await image.metadata();

  console.log(`📷 Original logo: ${metadata.width}x${metadata.height}`);

  // The bird is on the left side of the logo
  // Based on the 1250x1250 image, the bird body is roughly:
  // Need to crop just the bird without any text on the right
  // Make a tighter crop to only include the bird

  const cropLeft = 60;
  const cropTop = 190;
  const cropWidth = 410; // Tighter crop - only bird
  const cropHeight = 570; // Avoid underline decoration

  console.log(`✂️  Cropping bird area: ${cropWidth}x${cropHeight} from (${cropLeft}, ${cropTop})`);

  // Create a cropped version of just the bird
  const birdBuffer = await sharp(INPUT_LOGO)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .toBuffer();

  // Generate each icon size
  for (const { name, size } of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);

    await sharp(birdBuffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .png()
      .toFile(outputPath);

    console.log(`   ✅ Created: ${name} (${size}x${size})`);
  }

  console.log("\n🎉 All icons generated successfully!");
  console.log("\n📋 Next steps:");
  console.log("   1. Add manifest.json to public folder");
  console.log("   2. Update index.html with PWA meta tags");
  console.log("   3. Test on mobile devices");
}

generateIcons().catch((error) => {
  console.error("Error generating icons:", error);
  process.exit(1);
});
