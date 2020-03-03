import crypto from 'crypto';
// @ts-ignore: Not typed
import { Encoder as Base32Encoder } from 'base32.js';

export default function generateBundleIdentifier(teamId: string): string {
  return `dev.expo.client.${base32(sha(teamId))}`;
}

function sha(data: crypto.BinaryLike): Buffer {
  const hash = crypto.createHash('sha224');
  return hash.update(data).digest();
}

function base32(buffer: Buffer): number[] {
  const encoder = new Base32Encoder({
    type: 'rfc4648',
    lc: true /* lowercase */,
  });
  return encoder.write(buffer).finalize();
}
