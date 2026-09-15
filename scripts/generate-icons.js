import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width (4), height (4), bit depth (1), color type (1 = 6: RGBA), compression (1), filter (1), interlace (1)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data: filter byte (0) per row followed by RGBA pixels
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(rowLen * height);

  // Draw an indigo rounded box with a simple golden key pattern
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Background: indigo #4f46e5 (79, 70, 229) with rounded corners
      const cornerDist = Math.max(
        Math.hypot(x - 3, y - 3),
        Math.hypot(x - (width - 4), y - 3),
        Math.hypot(x - 3, y - (height - 4)),
        Math.hypot(x - (width - 4), y - (height - 4))
      );
      
      const isKeyHead = Math.hypot(x - width * 0.38, y - height * 0.5) < (width * 0.22);
      const isKeyHole = Math.hypot(x - width * 0.38, y - height * 0.5) < (width * 0.10);
      const isKeyShaft = (x >= width * 0.38 && x <= width * 0.78) && (Math.abs(y - height * 0.5) <= Math.max(1, width * 0.05));
      const isKeyTooth1 = (x >= width * 0.65 && x <= width * 0.72) && (y >= height * 0.5 && y <= height * 0.68);
      const isKeyTooth2 = (x >= width * 0.74 && x <= width * 0.78) && (y >= height * 0.5 && y <= height * 0.64);
      
      const isKey = (isKeyHead && !isKeyHole) || isKeyShaft || isKeyTooth1 || isKeyTooth2;

      if (isKey) {
        rawData[pxOffset] = 250;     // Golden / white accent
        rawData[pxOffset + 1] = 204;
        rawData[pxOffset + 2] = 21;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = 79;      // Indigo
        rawData[pxOffset + 1] = 70;
        rawData[pxOffset + 2] = 229;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const idatData = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const iconsDir = path.resolve('public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const buf = createPNG(size, size, 79, 70, 229);
  fs.writeFileSync(path.join(iconsDir, `${size}.png`), buf);
  console.log(`Generated ${size}.png`);
});
