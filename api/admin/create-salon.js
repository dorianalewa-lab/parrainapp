const bcrypt = require('bcryptjs');
const { salons, findSalonBySlug } = require('../_lib/airtable');
const { validateSlug } = require('../_lib/validation');
const { rateLimit, getClientIp } = require('../_lib/ratelimit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`admin-create:${ip}`, { max: 10, windowMs: 5 * 60_000 })) {
    return res.status(429).json({ ok: false, error: 'Trop de tentatives.' });
  }

  const body = req.body || {};

  if (!process.env.MASTER_PASSWORD || body.master_password !== process.env.MASTER_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Master password incorrect.' });
  }

  const slug = validateSlug(body.slug);
  const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const booking_url = typeof body.booking_url === 'string' ? body.booking_url.trim() : '';
  const panier_moyen_chf = Number.isFinite(Number(body.panier_moyen_chf)) ? Math.round(Number(body.panier_moyen_chf)) : 65;
  const pourcentage_reduc_filleul = Number.isFinite(Number(body.pourcentage_reduc_filleul)) ? Math.round(Number(body.pourcentage_reduc_filleul)) : 15;
  const recompense_parrain_texte = typeof body.recompense_parrain_texte === 'string' && body.recompense_parrain_texte.trim()
    ? body.recompense_parrain_texte.trim() : 'une récompense';

  if (!slug) return res.status(400).json({ ok: false, error: 'Slug invalide (a-z, 0-9, -).' });
  if (!nom || nom.length > 80) return res.status(400).json({ ok: false, error: 'Nom du salon invalide.' });
  if (password.length < 8) return res.status(400).json({ ok: false, error: 'Mot de passe trop court (8 caractères min).' });
  if (booking_url && !/^https?:\/\//i.test(booking_url)) {
    return res.status(400).json({ ok: false, error: 'booking_url doit commencer par http(s)://' });
  }

  try {
    const existing = await findSalonBySlug(slug);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Un salon avec ce slug existe déjà.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const fields = {
      slug,
      nom,
      password_hash,
      panier_moyen_chf,
      pourcentage_reduc_filleul,
      recompense_parrain_texte,
    };
    if (booking_url) fields.booking_url = booking_url;

    const created = await salons.create([{ fields }]);

    return res.status(200).json({
      ok: true,
      salon: {
        id: created[0].id,
        slug,
        nom,
      },
    });
  } catch (err) {
    console.error('[admin/create-salon] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur : ' + (err.message || 'unknown') });
  }
};
