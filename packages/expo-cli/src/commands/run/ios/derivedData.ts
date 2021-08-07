// Copyright (c) 2021-present Expo

import crypto from 'crypto';
import path from 'path';

function divmod(a: bigint, b: bigint) {
  return [a / b, a % b];
}

function hexDigestToUint8Array(hexDigest: string) {
  const bytes = new Uint8Array(hexDigest.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexDigest.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function stride(from: number, to: number, by: number) {
  const result = [];
  for (let i = from; i < to; i += by) {
    result.push(i);
  }
  return result;
}

function toUInt64(a: Uint8Array) {
  const H = 0x100000000,
    D = 1000000000;
  const h = a[3] + a[2] * 0x100 + a[1] * 0x10000 + a[0] * 0x1000000;
  const l = a[7] + a[6] * 0x100 + a[5] * 0x10000 + a[4] * 0x1000000;

  const hd = Math.floor((h * H) / D + l / D);
  const ld = ((((h % D) * (H % D)) % D) + l) % D;
  const ldStr = ld + '';
  return BigInt((hd !== 0 ? hd + '0'.repeat(9 - ldStr.length) : '') + ldStr);
}

function convertToString(_n: Uint8Array) {
  let n = toUInt64(_n);
  // Restrict to alphabet
  // Alphabet starts at 97
  const offset = BigInt(97);
  // Alphabet has 26 characters
  const range = BigInt(26);
  let result = '';
  let r;
  for (let _ = 0; _ < 14; _++) {
    [n, r] = divmod(n, range);
    // Apply in reverse order
    result = String.fromCharCode(Number(r + offset)) + result;
  }
  return result;
}

// format: `>QQ`
function unpackQQ(digest: Uint8Array) {
  return stride(0, digest.length, 8).map(a => {
    return digest.slice(a, Math.min(a + 8, digest.length));
  });
}

export function createDerivedDataHash(path: string) {
  // Compute md5 hash of the path
  const digest = hexDigestToUint8Array(crypto.createHash('md5').update(path).digest('hex'));
  const [a, b] = unpackQQ(digest);
  return convertToString(a) + convertToString(b);
}

/**
 * Create the DerivedData build folder path for the project path
 *
 * @parameter path to a `.xcworkspace` or an `.xcodeproj` directory
 *
 */
export function getFolderWithHash(projectFilePath: string) {
  const _path = path.resolve(projectFilePath);
  const projectName = path.basename(_path).replace('.xcworkspace', '').replace('.xcodeproj', '');
  const hash = createDerivedDataHash(_path);
  return `${projectName}-${hash}`;
}
