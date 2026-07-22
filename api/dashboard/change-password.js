const bcrypt = require('bcryptjs');
const { salons, findSalonBySlug } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');
const { rateLimit, getClientIp } = require('../_lib/ratelimit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const session = requireSalon(req, res);
  if (!session) return;

  const ip = getClientIp(req);
  if (!rateLimit(`change-pw:${ip}`, { max: 5, windowMs: 15 * 60_000 })) {
    return res.status(429).json({ ok: false, error: 'Trop de tentatives. Attends quelques minutes.' });
  }

  const body = req.body || {};
  const current = typeof body.current_password === 'string' ? body.current_password : '';
  const next = typeof body.new_password === 'string' ? body.new_password : '';

  if (!current) return res.status(400).json({ ok: false, error: 'Mot de passe actuel requis.' });
  if (next.length < 8) return res.status(400).json({ ok: false, error: 'Nouveau mot de passe trop court (8 chars min).' });
  if (next === current) return res.status(400).json({ ok: false, error: 'Le nouveau mot de passe doit être différent.' });

  try {
    const salonRecord = await findSalonBySlug(session.slug);
    if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

    const storedHash = salonRecord.get('password_hash');
    const ok = await bcrypt.compare(current, storedHash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Mot de passe actuel incorrect.' });

    const newHash = await bcrypt.hash(next, 12);
    await salons.update([{ id: salonRecord.id, fields: { password_hash: newHash } }]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[change-password] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
