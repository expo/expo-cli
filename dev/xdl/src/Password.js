/**
 * @flow
 */

import crypto from 'crypto';

const salt = 'EXPONENT!';

export function hashPassword(cleartextPassword: string) {
  return crypto.createHash('md5').update(salt + cleartextPassword).digest('hex');
}
