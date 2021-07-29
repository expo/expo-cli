// Inspired by https://github.com/kevva/to-ico but reuses existing packages to keep bundle size small.
import { PNG as PngClass, PNGOptions } from 'pngjs';

const constants = {
  directorySize: 16,
  bitmapSize: 40,
  headerSize: 6,
  colorMode: 0,
};

function createHeader(header: number): Buffer {
  const buffer = Buffer.alloc(constants.headerSize);

  buffer.writeUInt16LE(0, 0);
  buffer.writeUInt16LE(1, 2);
  buffer.writeUInt16LE(header, 4);

  return buffer;
}

function createDirectory(data: PngClass, offset: number): Buffer {
  const buffer = Buffer.alloc(constants.directorySize);
  const size = data.data.length + constants.bitmapSize;
  const width = data.width === 256 ? 0 : data.width;
  const height = data.height === 256 ? 0 : data.height;
  // @ts-ignore: not on type
  const bpp = data.bpp * 8;

  buffer.writeUInt8(width, 0);
  buffer.writeUInt8(height, 1);
  buffer.writeUInt8(0, 2);
  buffer.writeUInt8(0, 3);
  buffer.writeUInt16LE(1, 4);
  buffer.writeUInt16LE(bpp, 6);
  buffer.writeUInt32LE(size, 8);
  buffer.writeUInt32LE(offset, 12);

  return buffer;
}

function createBitmap(data: PngClass, compression: number): Buffer {
  const buffer = Buffer.alloc(constants.bitmapSize);

  buffer.writeUInt32LE(constants.bitmapSize, 0);
  buffer.writeInt32LE(data.width, 4);
  buffer.writeInt32LE(data.height * 2, 8);
  buffer.writeUInt16LE(1, 12);
  // @ts-ignore
  buffer.writeUInt16LE(data.bpp * 8, 14);
  buffer.writeUInt32LE(compression, 16);
  buffer.writeUInt32LE(data.data.length, 20);
  buffer.writeInt32LE(0, 24);
  buffer.writeInt32LE(0, 28);
  buffer.writeUInt32LE(0, 32);
  buffer.writeUInt32LE(0, 36);

  return buffer;
}

function createDIB(data: Buffer, width: number, height: number, bpp: number): Buffer {
  const cols = width * bpp;
  const rows = height * cols;
  const end = rows - cols;
  const buffer = Buffer.alloc(data.length);

  for (let row = 0; row < rows; row += cols) {
    for (let col = 0; col < cols; col += bpp) {
      let pos = row + col;

      const r = data.readUInt8(pos);
      const g = data.readUInt8(pos + 1);
      const b = data.readUInt8(pos + 2);
      const a = data.readUInt8(pos + 3);

      pos = end - row + col;

      buffer.writeUInt8(b, pos);
      buffer.writeUInt8(g, pos + 1);
      buffer.writeUInt8(r, pos + 2);
      buffer.writeUInt8(a, pos + 3);
    }
  }

  return buffer;
}

function generateFromPNGs(pngs: PngClass[]): Buffer {
  const header = createHeader(pngs.length);
  const arr = [header];

  let len = header.length;
  let offset = constants.headerSize + constants.directorySize * pngs.length;

  for (const png of pngs) {
    const dir = createDirectory(png, offset);
    arr.push(dir);
    len += dir.length;
    offset += png.data.length + constants.bitmapSize;
  }

  for (const png of pngs) {
    const header = createBitmap(png, constants.colorMode);
    // @ts-ignore
    const dib = createDIB(png.data, png.width, png.height, png.bpp);
    arr.push(header, dib);
    len += header.length + dib.length;
  }

  return Buffer.concat(arr, len);
}

export async function generateAsync(buffers: Buffer[]): Promise<Buffer> {
  const pngs = await Promise.all(buffers.map(x => parsePngAsync(x)));
  return generateFromPNGs(pngs);
}

async function parsePngAsync(buffer: Buffer, options?: PNGOptions): Promise<PngClass> {
  return new Promise((resolve, reject) => {
    let png = new PngClass(options);

    png.on('metadata', data => {
      png = Object.assign(png, data);
    });

    png.on('error', reject);
    png.on('parsed', () => resolve(png));

    png.end(buffer);
  });
}
