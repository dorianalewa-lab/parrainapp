const { parrains, escapeFormulaValue, findSalonBySlug } = require('./_lib/airtable');
const { sendSms } = require('./_lib/brevo');
const { validatePrenom, validatePhone, validateSlug } = require('./_lib/validation');
const { rateLimit, getClientIp } = require('./_lib/ratelimit');
const { generateShortId } = require('./_lib/shortid');

function renderSmsTemplate(template, vars) {
  return template
    .replace(/\{prenom\}/g, vars.prenom)
    .replace(/\{salon\}/g, vars.salon)
    .replace(/\{lien\}/g, vars.lien);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`lead:${ip}`, { max: 5, windowMs: 60_000 })) {
    return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessaie dans une minute.' });
  }

  const body = req.body || {};

  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const prenom = validatePrenom(body.prenom);
  const telephone = validatePhone(body.telephone);
  const slug = validateSlug(body.salon);
  const consent = body.consent === true || body.consent === 'true';

  if (!prenom) return res.status(400).json({ ok: false, error: 'Prénom invalide.' });
  if (!telephone) return res.status(400).json({ ok: false, error: 'Numéro de téléphone invalide.' });
  if (!slug) return res.status(400).json({ ok: false, error: 'Salon inconnu.' });
  if (!consent) return res.status(400).json({ ok: false, error: 'Consentement requis.' });

  try {
    const salonRecord = await findSalonBySlug(slug);
    if (!salonRecord) {
      return res.status(404).json({ ok: false, error: 'Ce salon n\'existe pas.' });
    }
    const salonNom = salonRecord.get('nom') || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const smsTemplate = salonRecord.get('sms_template_parrain') || null;

    const rowsForSalon = await parrains.select({
      filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(slug)}'`,
      pageSize: 100,
    }).all();

    const normalizePhone = p => (p || '').toString().replace(/[^+\d]/g, '');
    const targetPhone = normalizePhone(telephone);
    const duplicate = rowsForSalon.find(r => normalizePhone(r.get('telephone')) === targetPhone);

    if (duplicate) {
      return res.status(409).json({ ok: false, error: 'Tu es déjà inscrit pour ce salon.' });
    }

    const code_court = generateShortId(6);

    await parrains.create([{
      fields: {
        prenom,
        telephone,
        salon_slug: slug,
        code_court,
        consent_at: new Date().toISOString(),
        consent_ip: ip,
        source: 'qr_code',
      }
    }]);

    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const lien = `${baseUrl}/r/${code_court}`;

    const smsText = smsTemplate
      ? renderSmsTemplate(smsTemplate, { prenom, salon: salonNom, lien })
      : `Salut ${prenom} ! Voici ton lien de parrainage ${salonNom} : ${lien} Partage-le pour gagner ta recompense.`;

    try {
      await sendSms({ to: telephone, text: smsText });
    } catch (smsErr) {
      console.error('[lead] SMS failed but parrain was created:', smsErr);
      return res.status(200).json({
        ok: true,
        code_court,
        warning: 'Inscription enregistrée mais le SMS n\'a pas pu être envoyé.'
      });
    }

    return res.status(200).json({ ok: true, code_court });

  } catch (err) {
    console.error('[lead] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur. Réessaie dans quelques secondes.' });
  }
};
