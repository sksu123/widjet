const fs = require('fs');
const { Jimp } = require('jimp');

async function processIcon() {
  const inputPath = 'C:/Users/user/.gemini/antigravity/brain/52dc6cd2-2325-46c5-b806-fbbc278a1090/app_icon_option1_1787717882012.jpg';
  const outPng = 'd:/widget/resources/icon.png';
  const outIco = 'd:/widget/resources/icon.ico';

  console.log('Reading image...');
  const img = await Jimp.read(inputPath);
  
  // Find bounding box
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const edgeColor = img.getPixelColor(0, 0); // Assuming top-left is background color
  
  function colorDist(c1, c2) {
    const r1 = (c1 >> 24) & 255; const g1 = (c1 >> 16) & 255; const b1 = (c1 >> 8) & 255;
    const r2 = (c2 >> 24) & 255; const g2 = (c2 >> 16) & 255; const b2 = (c2 >> 8) & 255;
    return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
  }

  let minX = w, minY = h, maxX = 0, maxY = 0;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = img.getPixelColor(x, y);
      if (colorDist(col, edgeColor) > 20) { // Threshold
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Add a small margin back or clamp
  const bw = maxX - minX;
  const bh = maxY - minY;
  console.log(`Bounding box: ${minX}, ${minY} to ${maxX}, ${maxY} (${bw}x${bh})`);
  
  // If we couldn't find a good bounding box (maybe gradient background), fallback to 80% center
  if (bw < 100 || bh < 100 || bw > w * 0.95 || bh > h * 0.95) {
    console.log('Using default 70% center crop due to bad bbox');
    const cw = Math.floor(w * 0.7);
    const ch = Math.floor(h * 0.7);
    const cx = Math.floor((w - cw) / 2);
    const cy = Math.floor((h - ch) / 2);
    img.crop({ x: cx, y: cy, w: cw, h: ch });
  } else {
    // Crop exactly to bbox, maybe add 2% padding
    let pad = Math.floor(w * 0.02);
    let nx = Math.max(0, minX - pad);
    let ny = Math.max(0, minY - pad);
    let nw = Math.min(w - nx, bw + pad * 2);
    let nh = Math.min(h - ny, bh + pad * 2);
    img.crop({ x: nx, y: ny, w: nw, h: nh });
  }

  // Resize to 256x256
  console.log('Resizing to 256x256...');
  img.resize({ w: 256, h: 256 });
  
  // Create rounded corner mask
  console.log('Applying transparent rounded corners...');
  const radius = 56; // Standard iOS-like rounded corner radius for 256x256
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      let isCorner = false;
      let cx = 0, cy = 0;
      if (x < radius && y < radius) { isCorner = true; cx = radius; cy = radius; }
      else if (x > 255 - radius && y < radius) { isCorner = true; cx = 255 - radius; cy = radius; }
      else if (x < radius && y > 255 - radius) { isCorner = true; cx = radius; cy = 255 - radius; }
      else if (x > 255 - radius && y > 255 - radius) { isCorner = true; cx = 255 - radius; cy = 255 - radius; }
      
      if (isCorner) {
        const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
        const idx = (y * 256 + x) * 4;
        if (dist > radius) {
          img.bitmap.data[idx + 3] = 0; // completely transparent
        } else if (dist > radius - 1) {
          img.bitmap.data[idx + 3] = Math.floor(255 * (radius - dist)); // antialias
        }
      }
    }
  }

  console.log('Saving PNG...');
  await img.write(outPng);

  console.log('Creating ICO file from PNG...');
  const pngData = fs.readFileSync(outPng);
  
  // Create ICO header
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngData.length, 14);
  header.writeUInt32LE(22, 18);
  
  const icoData = Buffer.concat([header, pngData]);
  fs.writeFileSync(outIco, icoData);
  
  console.log('Successfully created resources/icon.png and resources/icon.ico');
}

processIcon().catch(e => console.error(e));
