/**
 * From https://github.com/akabekobeko/npm-icon-gen/blob/master/src/lib/ico.ts
 * Needed more customization to optimize generating favicons
 */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

/** Image file informations. */
type ImageInfo = {
  /** Image size (width/height). */
  size: number;
  /** Path of an image file. */
  filePath: string;
};

/**
 * Filter by size to the specified image informations.
 * @param images Image file informations.
 * @param sizes  Required sizes.
 * @return Filtered image informations.
 */
const filterImagesBySizes = (images: ImageInfo[], sizes: number[]) => {
  return images
    .filter(image => {
      return sizes.some(size => {
        return image.size === size;
      });
    })
    .sort((a, b) => {
      return a.size - b.size;
    });
};

/** Options of `generateICO`. */
export type ICOOptions = {
  /** Name of an output file. */
  name?: string;
  /** Structure of an image sizes. */
  sizes?: number[];
};

/** Sizes required for the ICO file. */
export const REQUIRED_IMAGE_SIZES = [16, 24, 32, 48, 64, 128, 256];

/** Default name of ICO file. */
const DEFAULT_FILE_NAME = 'app';

/** File extension of ICO file. */
const FILE_EXTENSION = '.ico';

/** Size of the file header. */
const FILE_HEADER_SIZE = 6;

/** Size of the icon directory. */
const ICO_DIRECTORY_SIZE = 16;

/** Size of the `BITMAPINFOHEADER`. */
const BITMAPINFOHEADER_SIZE = 40;

/** Color mode of `BITMAPINFOHEADER`.*/
const BI_RGB = 0;

/** BPP (Bit Per Pixel) for Alpha PNG (RGB = 4). */
const BPP_ALPHA = 4;

/**
 * Convert a PNG of the byte array to the DIB (Device Independent Bitmap) format.
 * PNG in color RGBA (and more), the coordinate structure is the Top/Left to Bottom/Right.
 * DIB in color BGRA, the coordinate structure is the Bottom/Left to Top/Right.
 * @param src Target image.
 * @param width The width of the image.
 * @param height The height of the image.
 * @param bpp The bit per pixel of the image.
 * @return Converted image
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 */
const convertPNGtoDIB = (src: Buffer, width: number, height: number, bpp: number) => {
  const cols = width * bpp;
  const rows = height * cols;
  const rowEnd = rows - cols;
  const dest = Buffer.alloc(src.length);

  for (let row = 0; row < rows; row += cols) {
    for (let col = 0; col < cols; col += bpp) {
      // RGBA: Top/Left -> Bottom/Right
      let pos = row + col;
      const r = src.readUInt8(pos);
      const g = src.readUInt8(pos + 1);
      const b = src.readUInt8(pos + 2);
      const a = src.readUInt8(pos + 3);

      // BGRA: Right/Left -> Top/Right
      pos = rowEnd - row + col;
      dest.writeUInt8(b, pos);
      dest.writeUInt8(g, pos + 1);
      dest.writeUInt8(r, pos + 2);
      dest.writeUInt8(a, pos + 3);
    }
  }

  return dest;
};

/**
 * Create the BITMAPINFOHEADER.
 * @param png PNG image.
 * @param compression Compression mode
 * @return BITMAPINFOHEADER data.
 * @see https://msdn.microsoft.com/ja-jp/library/windows/desktop/dd183376%28v=vs.85%29.aspx
 */
const createBitmapInfoHeader = (png: PNG, compression: number) => {
  const b = Buffer.alloc(BITMAPINFOHEADER_SIZE);
  b.writeUInt32LE(BITMAPINFOHEADER_SIZE, 0); // 4 DWORD biSize
  b.writeInt32LE(png.width, 4); // 4 LONG  biWidth
  b.writeInt32LE(png.height * 2, 8); // 4 LONG  biHeight
  b.writeUInt16LE(1, 12); // 2 WORD  biPlanes
  b.writeUInt16LE(BPP_ALPHA * 8, 14); // 2 WORD  biBitCount
  b.writeUInt32LE(compression, 16); // 4 DWORD biCompression
  b.writeUInt32LE(png.data.length, 20); // 4 DWORD biSizeImage
  b.writeInt32LE(0, 24); // 4 LONG  biXPelsPerMeter
  b.writeInt32LE(0, 28); // 4 LONG  biYPelsPerMeter
  b.writeUInt32LE(0, 32); // 4 DWORD biClrUsed
  b.writeUInt32LE(0, 36); // 4 DWORD biClrImportant

  return b;
};

/**
 * Create the Icon entry.
 * @param png PNG image.
 * @param offset The offset of directory data from the beginning of the ICO/CUR file
 * @return Directory data.
 *
 * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
 */
const createDirectory = (png: PNG, offset: number) => {
  const b = Buffer.alloc(ICO_DIRECTORY_SIZE);
  const size = png.data.length + BITMAPINFOHEADER_SIZE;
  const width = png.width >= 256 ? 0 : png.width;
  const height = png.height >= 256 ? 0 : png.height;
  const bpp = BPP_ALPHA * 8;

  b.writeUInt8(width, 0); // 1 BYTE  Image width
  b.writeUInt8(height, 1); // 1 BYTE  Image height
  b.writeUInt8(0, 2); // 1 BYTE  Colors
  b.writeUInt8(0, 3); // 1 BYTE  Reserved
  b.writeUInt16LE(1, 4); // 2 WORD  Color planes
  b.writeUInt16LE(bpp, 6); // 2 WORD  Bit per pixel
  b.writeUInt32LE(size, 8); // 4 DWORD Bitmap (DIB) size
  b.writeUInt32LE(offset, 12); // 4 DWORD Offset

  return b;
};

/**
 * Create the ICO file header.
 * @param count Specifies number of images in the file.
 * @return Header data.
 * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
 */
const createFileHeader = (count: number) => {
  const b = Buffer.alloc(FILE_HEADER_SIZE);
  b.writeUInt16LE(0, 0); // 2 WORD Reserved
  b.writeUInt16LE(1, 2); // 2 WORD Type
  b.writeUInt16LE(count, 4); // 2 WORD Image count

  return b;
};

/**
 * Read PNG data from image files.
 * @param images Information of image files.
 * @param sizes Target size of image.
 * @returns PNG data.
 */
const readPNGs = (images: ImageInfo[], sizes: number[]): PNG[] => {
  const targets = filterImagesBySizes(images, sizes);
  return targets.map(image => {
    const data = fs.readFileSync(image.filePath);
    return PNG.sync.read(data);
  });
};

/**
 * Write ICO directory information to the stream.
 * @param pngs PNG data.
 * @param stream Stream to write.
 */
const writeDirectories = (pngs: PNG[], stream: fs.WriteStream) => {
  let offset = FILE_HEADER_SIZE + ICO_DIRECTORY_SIZE * pngs.length;
  for (const png of pngs) {
    const directory = createDirectory(png, offset);
    stream.write(directory, 'binary');
    offset += png.data.length + BITMAPINFOHEADER_SIZE;
  }
};

/**
 * Write PNG data to the stream.
 * @param pngs PNG data.
 * @param stream Stream to write.
 */
const writePNGs = (pngs: PNG[], stream: fs.WriteStream) => {
  for (const png of pngs) {
    const header = createBitmapInfoHeader(png, BI_RGB);
    stream.write(header, 'binary');

    const dib = convertPNGtoDIB(png.data, png.width, png.height, BPP_ALPHA);
    stream.write(dib, 'binary');
  }
};

/**
 * Generate the ICO file from a PNG images.
 * @param images File informations..
 * @param dir Output destination the path of directory.
 * @param options Options.
 * @return Path of the generated ICO file.
 */
const generateICO = async (
  images: ImageInfo[],
  dir: string,
  options: ICOOptions
): Promise<string> => {
  const opt = {
    name: options.name && options.name !== '' ? options.name : DEFAULT_FILE_NAME,
    sizes: options.sizes && options.sizes.length > 0 ? options.sizes : REQUIRED_IMAGE_SIZES,
  };

  const pngs = readPNGs(images, opt.sizes);
  if (pngs.length === 0) {
    throw new Error('There was no PNG file matching the specified size.');
  }

  const dest = path.join(dir, opt.name + FILE_EXTENSION);
  const stream = fs.createWriteStream(dest);
  stream.write(createFileHeader(pngs.length), 'binary');

  writeDirectories(pngs, stream);
  writePNGs(pngs, stream);
  stream.end();

  return dest;
};

export default generateICO;
