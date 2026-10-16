const fs = require('fs');
const path = require('path');

const pngPath = path.resolve(__dirname, '../public/assets/mk-logo-256.png');
const icoPath = path.resolve(__dirname, '../public/assets/icon.ico');

const pngBuffer = fs.readFileSync(pngPath);
const pngSize = pngBuffer.length;

// 6 bytes header + 16 bytes directory entry + pngBuffer
const icoBuffer = Buffer.alloc(22 + pngSize);

// Header
icoBuffer.writeUInt16LE(0, 0);      // Reserved
icoBuffer.writeUInt16LE(1, 2);      // Image type: 1 = ICO
icoBuffer.writeUInt16LE(1, 4);      // Number of images: 1

// Directory Entry
icoBuffer.writeUInt8(0, 6);         // Width: 0 = 256px
icoBuffer.writeUInt8(0, 7);         // Height: 0 = 256px
icoBuffer.writeUInt8(0, 8);         // Color count
icoBuffer.writeUInt8(0, 9);         // Reserved
icoBuffer.writeUInt16LE(1, 10);     // Color planes
icoBuffer.writeUInt16LE(32, 12);    // Bits per pixel
icoBuffer.writeUInt32LE(pngSize, 14); // Image data size in bytes
icoBuffer.writeUInt32LE(22, 18);    // Offset of image data (22)

// Copy PNG data
pngBuffer.copy(icoBuffer, 22);

fs.writeFileSync(icoPath, icoBuffer);
console.log('Successfully generated Windows icon.ico (' + icoBuffer.length + ' bytes) at:', icoPath);
