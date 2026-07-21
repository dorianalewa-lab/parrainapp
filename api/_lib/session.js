const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'parrainapp_session';
const MAX_AGE_SECONDS = 30 * 24 * 3600;

function parseCookies(header) {
  if (!header || typeof header !== 'string') return {};
  return Object.fromEntries(
    header.split(';').map(chunk => {
      const [k, ...rest] = chunk.trim().split('=');
      return [k, decodeURIComponent(rest.join('='))];
    })
  );
}

function isSecureRequest() {
  return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
}

function issueSession(res, payload) {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not configured');
  }
  const token = jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn: `${MAX_AGE_SECONDS}s` });
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ];
  if (isSecureRequest()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSession(res) {
  const parts = [
    `${COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ];
  if (isSecureRequest()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readSession(req) {
  if (!process.env.SESSION_SECRET) return null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.SESSION_SECRET);
  } catch {
    return null;
  }
}

module.exports = { issueSession, clearSession, readSession, COOKIE_NAME };
