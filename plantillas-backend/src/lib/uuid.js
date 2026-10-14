const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

uuid.v4 = () => crypto.randomUUID();
uuid.v1 = () => crypto.randomUUID();

module.exports = uuid;
