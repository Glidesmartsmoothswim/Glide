// Genera le icone PWA dal logo GLIDE (onde concentriche) via sharp.
// Uso: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

const INK = "#0B1220";
const NAVY = "#203979";
const BLU = "#0E5EAB";
const TEAL = "#0B7A6E";
const TURCHESE = "#00FFE6";

/** SVG del logo. `scale` restringe le onde (per la variante maskable). */
function svg(size, scale = 1) {
  const c = size / 2;
  const r = (base) => base * (size / 100) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <circle cx="${c}" cy="${c}" r="${r(42)}" fill="none" stroke="${NAVY}" stroke-width="${r(4)}" opacity="0.5"/>
  <circle cx="${c}" cy="${c}" r="${r(31)}" fill="none" stroke="${BLU}" stroke-width="${r(4)}" opacity="0.7"/>
  <circle cx="${c}" cy="${c}" r="${r(20)}" fill="none" stroke="${TEAL}" stroke-width="${r(4)}" opacity="0.9"/>
  <circle cx="${c}" cy="${c}" r="${r(8)}" fill="${TURCHESE}"/>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, scale: 0.66 }, // safe zone
  { file: "apple-touch-icon.png", size: 180, scale: 1 },
];

await mkdir(outDir, { recursive: true });
for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.scale)))
    .png()
    .toFile(join(outDir, t.file));
  console.log("✓", t.file);
}
console.log("Icone generate in public/icons/");
