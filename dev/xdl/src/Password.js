let crypto = require('crypto');
let salt = 'EXPONENT!';

function hashPassword(cleartextPassword) {
  return crypto.createHash('md5').update(salt + cleartextPassword).digest('hex');
}

module.exports = {
  hashPassword,
};
