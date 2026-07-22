const bcrypt = require('bcryptjs');
const { salons, findSalonBySlug } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');
const { rateLimit, getClientIp } = require('../_lib/ratelimit');

const ALLOWED_FIELDS = {
  nom: {
    validate: v => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 80,
    normalize: v => v.trim(),
    error: 'Nom du salon invalide (1 à 80 caractères).',
  },
  booking_url: {
    validate: v => typeof v === 'string' && (v === '' || /^https?:\/\/.+/i.test(v.trim())),
    normalize: v => v.trim(),
    error: 'URL de RDV doit commencer par http(s):// ou être vide.',
  },
  panier_moyen_chf: {
    validate: v => Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 10000,
    normalize: v => Math.round(Number(v)),
    error: 'Panier moyen invalide (1 à 10000 CHF).',
  },
  pourcentage_reduc_filleul: {
    validate: v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100,
    normalize: v => Math.round(Number(v)),
    error: 'Pourcentage invalide (0 à 100).',
  },
  recompense_parrain_texte: {
    validate: v => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 100,
    normalize: v => v.trim(),
    error: 'Texte récompense invalide (1 à 100 caractères).',
  },
  sms_template_parrain: {
    validate: v => typeof v === 'string' && v.length <= 500 && (v === '' || v.includes('{lien}')),
    normalize: v => v.trim(),
    error: 'Template SMS parrain doit inclure {lien} ou être vide (max 500 caractères).',
  },
  sms_template_recompense: {
    validate: v => typeof v === 'string' && v.length <= 500,
    normalize: v => v.trim(),
    error: 'Template SMS récompense invalide (max 500 caractères).',
  },
};

async function handleGet(req, res, session) {
  const salonRecord = await findSalonBySlug(session.slug);
  if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

  return res.status(200).json({
    ok: true,
    salon: {
      slug: salonRecord.get('slug'),
      nom: salonRecord.get('nom') || '',
      booking_url: salonRecord.get('booking_url') || '',
      panier_moyen_chf: Number(salonRecord.get('panier_moyen_chf')) || 65,
      pourcentage_reduc_filleul: Number(salonRecord.get('pourcentage_reduc_filleul')) || 15,
      recompense_parrain_texte: salonRecord.get('recompense_parrain_texte') || '',
      sms_template_parrain: salonRecord.get('sms_template_parrain') || '',
      sms_template_recompense: salonRecord.get('sms_template_recompense') || '',
    },
  });
}

async function handlePatch(req, res, session) {
  const body = req.body || {};
  const updates = {};

  for (const [field, rules] of Object.entries(ALLOWED_FIELDS)) {
    if (body[field] === undefined) continue;
    if (!rules.validate(body[field])) {
      return res.status(400).json({ ok: false, error: rules.error });
    }
    updates[field] = rules.normalize(body[field]);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ ok: false, error: 'Aucun champ à mettre à jour.' });
  }

  const salonRecord = await findSalonBySlug(session.slug);
  if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

  await salons.update([{ id: salonRecord.id, fields: updates }]);
  return res.status(200).json({ ok: true, updated: Object.keys(updates) });
}

async function handlePasswordChange(req, res, session) {
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

  const salonRecord = await findSalonBySlug(session.slug);
  if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

  const storedHash = salonRecord.get('password_hash');
  const ok = await bcrypt.compare(current, storedHash);
  if (!ok) return res.status(401).json({ ok: false, error: 'Mot de passe actuel incorrect.' });

  const newHash = await bcrypt.hash(next, 12);
  await salons.update([{ id: salonRecord.id, fields: { password_hash: newHash } }]);

  return res.status(200).json({ ok: true });
}

module.exports = async (req, res) => {
  const session = requireSalon(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') return await handleGet(req, res, session);
    if (req.method === 'PATCH') return await handlePatch(req, res, session);
    if (req.method === 'POST' && (req.query.action === 'change-password' || (req.body && req.body.current_password))) {
      return await handlePasswordChange(req, res, session);
    }
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('[settings] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur : ' + (err.message || 'unknown') });
  }
};
