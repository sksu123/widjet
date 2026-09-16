const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function convertImage() {
  const inputPath = 'C:/Users/user/.gemini/antigravity/brain/52dc6cd2-2325-46c5-b806-fbbc278a1090/app_icon_option2_1787717901327.jpg';
  const outPng = 'd:/widget/resources/icon.png';
  const outIco = 'd:/widget/resources/icon.ico';

  console.log('Loading image with Jimp...');
  const img = await Jimp.read(inputPath);
  
  console.log('Resizing to 256x256...');
  img.resize({ w: 256, h: 256 });
  
  console.log('Saving PNG...');
  await img.write(outPng);

  console.log('Creating ICO file from PNG...');
  const pngData = fs.readFileSync(outPng);
  
  // Create ICO header
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type=ICO
  header.writeUInt16LE(1, 4); // count=1
  
  header.writeUInt8(0, 6); // width=256
  header.writeUInt8(0, 7); // height=256
  header.writeUInt8(0, 8); // colors
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bpp
  header.writeUInt32LE(pngData.length, 14); // size
  header.writeUInt32LE(22, 18); // offset
  
  const icoData = Buffer.concat([header, pngData]);
  fs.writeFileSync(outIco, icoData);
  
  console.log('Successfully created resources/icon.png and resources/icon.ico');
}

convertImage().catch(e => console.error(e));
