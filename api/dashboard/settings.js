const { salons, findSalonBySlug } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');

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

module.exports = async (req, res) => {
  const session = requireSalon(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
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
    } catch (err) {
      console.error('[settings GET] error:', err);
      return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
    }
  }

  if (req.method === 'PATCH') {
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

    try {
      const salonRecord = await findSalonBySlug(session.slug);
      if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

      await salons.update([{ id: salonRecord.id, fields: updates }]);

      return res.status(200).json({ ok: true, updated: Object.keys(updates) });
    } catch (err) {
      console.error('[settings PATCH] error:', err);
      return res.status(500).json({ ok: false, error: 'Erreur serveur : ' + (err.message || 'unknown') });
    }
  }

  return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
};
