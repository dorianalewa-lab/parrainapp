const { parsePhoneNumberFromString } = require('libphonenumber-js');

function validatePrenom(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return null;
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(trimmed)) return null;
  return trimmed;
}

function validatePhone(raw, defaultCountry = 'CH') {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/\s/g, '');
  try {
    const phone = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (!phone || !phone.isValid()) return null;
    return phone.number;
  } catch {
    return null;
  }
}

function validateSlug(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,50}$/.test(cleaned)) return null;
  return cleaned;
}

module.exports = { validatePrenom, validatePhone, validateSlug };
