const { clearSession } = require('../_lib/session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }
  clearSession(res);
  return res.status(200).json({ ok: true });
};
