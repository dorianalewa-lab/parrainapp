const { base, escapeFormulaValue } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');

const prestations = base('Prestations');

function validateNom(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 60) return null;
  return trimmed;
}

function validatePrix(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return Math.round(n);
}

module.exports = async (req, res) => {
  const session = requireSalon(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const rows = await prestations.select({
        filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(session.slug.toLowerCase())}'`,
        pageSize: 100,
      }).all();

      const list = rows
        .map(r => ({
          id: r.id,
          nom: r.get('nom') || '',
          prix_chf: Number(r.get('prix_chf')) || 0,
          ordre: Number(r.get('ordre')) || 0,
          created_at: r.get('created_at') || null,
        }))
        .sort((a, b) => (a.ordre - b.ordre) || (a.nom.localeCompare(b.nom)));

      return res.status(200).json({ ok: true, prestations: list });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const nom = validateNom(body.nom);
      const prix_chf = validatePrix(body.prix_chf);
      const ordre = Number.isFinite(Number(body.ordre)) ? Math.round(Number(body.ordre)) : 0;

      if (!nom) return res.status(400).json({ ok: false, error: 'Nom invalide (1 à 60 caractères).' });
      if (prix_chf === null) return res.status(400).json({ ok: false, error: 'Prix invalide (0 à 10000 CHF).' });

      const created = await prestations.create([{
        fields: { salon_slug: session.slug, nom, prix_chf, ordre },
      }]);

      return res.status(200).json({
        ok: true,
        prestation: {
          id: created[0].id,
          nom,
          prix_chf,
          ordre,
        },
      });
    }

    if (req.method === 'PATCH') {
      const id = (req.query.id || (req.body || {}).id || '').toString().trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id manquant.' });

      const existing = await prestations.find(id).catch(() => null);
      if (!existing) return res.status(404).json({ ok: false, error: 'Prestation introuvable.' });
      if ((existing.get('salon_slug') || '').toLowerCase() !== session.slug.toLowerCase()) {
        return res.status(403).json({ ok: false, error: 'Cette prestation n\'appartient pas à ton salon.' });
      }

      const body = req.body || {};
      const updates = {};
      if (body.nom !== undefined) {
        const nom = validateNom(body.nom);
        if (!nom) return res.status(400).json({ ok: false, error: 'Nom invalide.' });
        updates.nom = nom;
      }
      if (body.prix_chf !== undefined) {
        const prix = validatePrix(body.prix_chf);
        if (prix === null) return res.status(400).json({ ok: false, error: 'Prix invalide.' });
        updates.prix_chf = prix;
      }
      if (body.ordre !== undefined && Number.isFinite(Number(body.ordre))) {
        updates.ordre = Math.round(Number(body.ordre));
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ ok: false, error: 'Aucun champ à mettre à jour.' });
      }

      await prestations.update([{ id, fields: updates }]);
      return res.status(200).json({ ok: true, updated: Object.keys(updates) });
    }

    if (req.method === 'DELETE') {
      const id = (req.query.id || (req.body || {}).id || '').toString().trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id manquant.' });

      const existing = await prestations.find(id).catch(() => null);
      if (!existing) return res.status(404).json({ ok: false, error: 'Prestation introuvable.' });
      if ((existing.get('salon_slug') || '').toLowerCase() !== session.slug.toLowerCase()) {
        return res.status(403).json({ ok: false, error: 'Cette prestation n\'appartient pas à ton salon.' });
      }

      await prestations.destroy([id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('[prestations] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
