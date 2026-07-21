const crypto = require('crypto');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function generateShortId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

module.exports = { generateShortId };
