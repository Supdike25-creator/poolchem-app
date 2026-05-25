import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public/chemdeck-mark.svg');
const outDir = join(root, 'public/icons');

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const brandBackground = '#0F4C81';

const renderIcon = async (size, outputName, { maskable = false } = {}) => {
  const logoSize = maskable ? Math.round(size * 0.62) : Math.round(size * 0.84);
  const logo = await sharp(svg).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskable ? brandBackground : { r: 248, g: 250, b: 252, alpha: 1 },
    },
  });

  const png = await canvas
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer();

  writeFileSync(join(outDir, outputName), png);
};

await renderIcon(192, 'icon-192.png');
await renderIcon(512, 'icon-512.png');
await renderIcon(180, 'apple-touch-icon.png');
await renderIcon(512, 'icon-maskable-512.png', { maskable: true });

console.log('Generated PWA icons in public/icons/');
