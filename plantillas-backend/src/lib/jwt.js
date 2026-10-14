const jwt = require('jsonwebtoken');

function encode(payload, secret, options = {}) {
  const opts = { ...options };
  const clone = { ...payload };

  // jsonwebtoken no permite timestamps inválidos o no numéricos en payload
  if ('iat' in clone) {
    if (typeof clone.iat !== 'number' || Number.isNaN(clone.iat)) {
      delete clone.iat;
    }
  }
  if ('exp' in clone) {
    if (typeof clone.exp !== 'number' || Number.isNaN(clone.exp)) {
      delete clone.exp;
    }
  }

  return jwt.sign(clone, secret, opts);
}

function decode(token, secret, noVerify = false) {
  if (noVerify || !secret) {
    return jwt.decode(token);
  }
  return jwt.verify(token, secret);
}

module.exports = {
  encode,
  decode,
  sign: jwt.sign,
  verify: jwt.verify,
};
