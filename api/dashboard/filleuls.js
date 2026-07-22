const { getFilleulsForSalon, parrains, escapeFormulaValue } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const session = requireSalon(req, res);
  if (!session) return;

  try {
    const filleulsRows = await getFilleulsForSalon(session.slug);

    const parrainRows = await parrains.select({
      filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(session.slug.toLowerCase())}'`,
      pageSize: 100,
    }).all();

    const parrainByCode = new Map();
    for (const p of parrainRows) {
      const code = (p.get('code_court') || '').toString().toLowerCase();
      if (code) parrainByCode.set(code, {
        id: p.id,
        prenom: p.get('prenom') || '',
        telephone: p.get('telephone') || '',
      });
    }

    const list = filleulsRows
      .map(f => {
        const code = (f.get('parrain_code') || '').toString().toLowerCase();
        const parrain = parrainByCode.get(code) || null;
        return {
          id: f.id,
          prenom: f.get('prenom') || 'Anonyme',
          panier_chf: Number(f.get('panier_chf')) || 0,
          prestation_nom: f.get('prestation_nom') || null,
          notes: f.get('notes') || null,
          visited_at: f.get('visited_at') || f.get('created_at') || null,
          parrain_code: f.get('parrain_code') || '',
          parrain,
        };
      })
      .sort((a, b) => {
        const ta = a.visited_at ? new Date(a.visited_at).getTime() : 0;
        const tb = b.visited_at ? new Date(b.visited_at).getTime() : 0;
        return tb - ta;
      });

    return res.status(200).json({ ok: true, filleuls: list, total: list.length });
  } catch (err) {
    console.error('[dashboard/filleuls] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
