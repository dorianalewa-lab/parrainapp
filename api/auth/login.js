const bcrypt = require('bcryptjs');
const { findSalonBySlug } = require('../_lib/airtable');
const { issueSession } = require('../_lib/session');
const { rateLimit, getClientIp } = require('../_lib/ratelimit');
const { validateSlug } = require('../_lib/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`login:${ip}`, { max: 10, windowMs: 5 * 60_000 })) {
    return res.status(429).json({ ok: false, error: 'Trop de tentatives. Attends quelques minutes.' });
  }

  const body = req.body || {};
  const slug = validateSlug(body.slug);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!slug || !password) {
    return res.status(400).json({ ok: false, error: 'Identifiants invalides.' });
  }

  try {
    const salonRecord = await findSalonBySlug(slug);

    const dummyHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8B2q7C3.NxKvXQjZ2hK1QxQOxQxQxQ';
    const storedHash = salonRecord?.get('password_hash') || dummyHash;
    const ok = await bcrypt.compare(password, storedHash);

    if (!salonRecord || !ok) {
      return res.status(401).json({ ok: false, error: 'Slug ou mot de passe incorrect.' });
    }

    issueSession(res, {
      salonId: salonRecord.id,
      slug: salonRecord.get('slug'),
      nom: salonRecord.get('nom') || salonRecord.get('slug'),
    });

    return res.status(200).json({
      ok: true,
      salon: {
        slug: salonRecord.get('slug'),
        nom: salonRecord.get('nom') || salonRecord.get('slug'),
      },
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
