const { base, parrains, salons, filleuls, findSalonBySlug } = require('../_lib/airtable');
const { sendSms } = require('../_lib/brevo');
const { requireSalon } = require('../_lib/auth');
const { validatePrenom } = require('../_lib/validation');

const prestationsTable = base('Prestations');

function renderTemplate(template, vars) {
  return template
    .replace(/\{prenom\}/g, vars.prenom)
    .replace(/\{prenom_filleul\}/g, vars.prenom_filleul)
    .replace(/\{recompense\}/g, vars.recompense)
    .replace(/\{salon\}/g, vars.salon);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const session = requireSalon(req, res);
  if (!session) return;

  const body = req.body || {};
  const parrainId = typeof body.parrain_id === 'string' ? body.parrain_id.trim() : '';
  const prestationId = typeof body.prestation_id === 'string' ? body.prestation_id.trim() : '';
  const rawPrenom = typeof body.prenom_filleul === 'string' ? body.prenom_filleul.trim() : '';
  const prenomFilleul = rawPrenom ? (validatePrenom(rawPrenom) || null) : 'Anonyme';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : '';

  if (!parrainId) return res.status(400).json({ ok: false, error: 'parrain_id manquant.' });
  if (rawPrenom && !prenomFilleul) return res.status(400).json({ ok: false, error: 'Prénom du filleul invalide.' });

  let panier = null;
  let prestationNom = null;

  try {
    if (prestationId) {
      const prestationRecord = await prestationsTable.find(prestationId).catch(() => null);
      if (!prestationRecord) return res.status(404).json({ ok: false, error: 'Prestation introuvable.' });
      if ((prestationRecord.get('salon_slug') || '').toLowerCase() !== session.slug.toLowerCase()) {
        return res.status(403).json({ ok: false, error: 'Cette prestation n\'appartient pas à ton salon.' });
      }
      prestationNom = prestationRecord.get('nom') || null;
      panier = Number(prestationRecord.get('prix_chf')) || 0;
    }

    if (body.panier_chf !== undefined && body.panier_chf !== null && body.panier_chf !== '') {
      const raw = Number(body.panier_chf);
      if (Number.isFinite(raw) && raw > 0 && raw <= 10000) panier = Math.round(raw);
    }

    if (!panier || panier <= 0 || panier > 10000) {
      return res.status(400).json({ ok: false, error: 'Panier invalide (choisis une prestation ou saisis un montant).' });
    }

    const parrainRecord = await parrains.find(parrainId);
    if (!parrainRecord) return res.status(404).json({ ok: false, error: 'Parrain introuvable.' });

    if ((parrainRecord.get('salon_slug') || '').toLowerCase() !== session.slug.toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Ce parrain n\'appartient pas à ton salon.' });
    }

    const salonRecord = await findSalonBySlug(session.slug);
    if (!salonRecord) return res.status(404).json({ ok: false, error: 'Salon introuvable.' });

    const parrainPrenom = parrainRecord.get('prenom') || '';
    const parrainCode = parrainRecord.get('code_court') || '';
    const parrainTel = parrainRecord.get('telephone') || '';
    const salonNom = salonRecord.get('nom') || session.slug;
    const recompenseTexte = salonRecord.get('recompense_parrain_texte') || 'une récompense';
    const smsTemplate = salonRecord.get('sms_template_recompense') || null;

    const fields = {
      parrain_code: parrainCode,
      salon_slug: session.slug,
      prenom: prenomFilleul,
      panier_chf: panier,
      visited_at: new Date().toISOString(),
    };
    if (prestationNom) fields.prestation_nom = prestationNom;
    if (notes) fields.notes = notes;

    await filleuls.create([{ fields }]);

    let smsSent = false;
    let smsError = null;
    if (parrainTel) {
      const smsText = smsTemplate
        ? renderTemplate(smsTemplate, {
            prenom: parrainPrenom,
            prenom_filleul: prenomFilleul || 'Un filleul',
            recompense: recompenseTexte,
            salon: salonNom,
          })
        : `Bonne nouvelle ${parrainPrenom} ! ${prenomFilleul === 'Anonyme' ? 'Un filleul' : prenomFilleul} vient de nous rendre visite chez ${salonNom}. Tu gagnes ${recompenseTexte}. Merci !`;
      try {
        await sendSms({ to: parrainTel, text: smsText });
        smsSent = true;
      } catch (err) {
        console.error('[validate] SMS récompense failed:', err);
        smsError = 'Visite enregistrée mais SMS de récompense non envoyé.';
      }
    }

    return res.status(200).json({ ok: true, sms_sent: smsSent, warning: smsError });
  } catch (err) {
    console.error('[dashboard/validate] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
