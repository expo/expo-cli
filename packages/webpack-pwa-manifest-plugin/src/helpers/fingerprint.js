import crypto from 'crypto';

export default function(input) {
  return crypto
    .createHash('md5')
    .update(input)
    .digest('hex');
}
