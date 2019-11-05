import crypto, { BinaryLike } from 'crypto';

export function joinURI(...arr: string[]): string {
  const first = arr[0] || '';
  const join = arr.join('/');
  return normalizeURI(join[0] === '/' && first[0] !== '/' ? join.substring(1) : join);
}

function normalizeURI(uri: string): string {
  return uri.replace(/(:\/\/)|(\\+|\/{2,})+/g, match => (match === '://' ? '://' : '/'));
}

export function generateFingerprint(input: BinaryLike): string {
  return crypto
    .createHash('md5')
    .update(input)
    .digest('hex');
}

export const toNumber = (value: string | number): number => {
  if (typeof value === 'string') {
    return parseInt(value);
  }
  return value;
};

export function toSize(size: AnySize): ImageSize {
  let width: number;
  let height: number;
  if (Array.isArray(size)) {
    if (size.length) {
      // [0, 0] || [0]
      width = toNumber(size[0]);
      height = size.length > 1 ? toNumber(size[1]) : width;
    } else {
      throw new Error('Failed to parse size: ' + size);
    }
  } else if (typeof size === 'number') {
    // 0
    width = size;
    height = size;
  } else if (typeof size === 'string') {
    // '0x0'
    const dimensions = size.split('x');
    width = toNumber(dimensions[0]);
    height = toNumber(dimensions[1]);
  } else if (typeof size.width !== 'undefined' && typeof size.height !== 'undefined') {
    width = toNumber(size.width);
    height = toNumber(size.height);
  } else {
    throw new Error('Failed to parse size: ' + size);
  }
  return { width, height };
}

export interface ImageSize {
  width: number;
  height: number;
}
type SingleSize = string | number;

export type AnySize = ImageSize | SingleSize | SingleSize[];

export function toArray(i: any): any[] {
  if (i == null) return [];
  return i && !Array.isArray(i) ? [i] : i;
}
