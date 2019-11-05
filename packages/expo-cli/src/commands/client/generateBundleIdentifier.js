import { Encoder as Base32Encoder } from 'base32.js';
import crypto from 'crypto';

export default function generateBundleIdentifier(teamId) {
  return `dev.expo.client.${base32(sha(teamId))}`;
}

function sha(data) {
  const hash = crypto.createHash('sha224');
  return hash.update(data).digest();
}

function base32(buffer) {
  const encoder = new Base32Encoder({
    type: 'rfc4648',
    lc: true /* lowercase */,
  });
  return encoder.write(buffer).finalize();
}
