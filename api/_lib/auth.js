const { readSession } = require('./session');

function requireSalon(req, res) {
  const session = readSession(req);
  if (!session || !session.salonId || !session.slug) {
    res.status(401).json({ ok: false, error: 'Non authentifié.' });
    return null;
  }
  return session;
}

module.exports = { requireSalon };
