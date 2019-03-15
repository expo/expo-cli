import crypto from 'crypto';
import { Encoder as Base32Encoder } from 'base32.js';

export default function generateBundleIdentifier(teamId) {
  return `dev.expo.client.${base32(sha(teamId))}`;
}

function sha(data) {
  let hash = crypto.createHash('sha224');
  return hash.update(data).digest();
}

function base32(buffer) {
  let encoder = new Base32Encoder({
    type: 'rfc4648',
    lc: true /* lowercase */,
  });
  return encoder.write(buffer).finalize();
}
