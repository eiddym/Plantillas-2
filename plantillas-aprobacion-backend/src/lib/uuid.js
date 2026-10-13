const crypto = require('crypto');

const uuid = {
  v4: () => crypto.randomUUID(),
};

module.exports = uuid;
