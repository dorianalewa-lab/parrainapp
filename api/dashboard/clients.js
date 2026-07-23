const { parrains, escapeFormulaValue, findSalonBySlug, getFilleulsForSalon } = require('../_lib/airtable');
const { requireSalon } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const session = requireSalon(req, res);
  if (!session) return;

  try {
    const salonRecord = await findSalonBySlug(session.slug);
    if (!salonRecord) {
      return res.status(404).json({ ok: false, error: 'Salon introuvable.' });
    }

    const [parrainsRows, filleulsRows] = await Promise.all([
      parrains.select({
        filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(session.slug.toLowerCase())}'`,
        sort: [{ field: 'created_at', direction: 'desc' }],
        pageSize: 100,
      }).all(),
      getFilleulsForSalon(session.slug),
    ]);

    const filleulsByCode = new Map();
    for (const f of filleulsRows) {
      const code = (f.get('parrain_code') || '').toString().toLowerCase();
      if (!filleulsByCode.has(code)) filleulsByCode.set(code, []);
      filleulsByCode.get(code).push({
        id: f.id,
        prenom: f.get('prenom') || '',
        panier_chf: Number(f.get('panier_chf')) || 0,
        visited_at: f.get('visited_at') || null,
      });
    }

    const parrainsData = parrainsRows.map(r => {
      const code = (r.get('code_court') || '').toString().toLowerCase();
      const filleulsList = filleulsByCode.get(code) || [];
      const ca = filleulsList.reduce((s, f) => s + f.panier_chf, 0);
      return {
        id: r.id,
        prenom: r.get('prenom') || '',
        telephone: r.get('telephone') || '',
        code_court: r.get('code_court') || '',
        created_at: r.get('created_at') || null,
        nb_clics_landing: Number(r.get('nb_clics_landing')) || 0,
        nb_clics_rdv: Number(r.get('nb_clics_rdv')) || 0,
        filleuls_venus: filleulsList,
        nb_filleuls_venus: filleulsList.length,
        ca_genere_chf: ca,
      };
    });

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const monthAgo = now - 30 * 24 * 3600 * 1000;

    const totalCaAll = filleulsRows.reduce((s, f) => s + (Number(f.get('panier_chf')) || 0), 0);
    const totalFilleulsAll = filleulsRows.length;

    const stats = {
      total_parrains: parrainsData.length,
      parrains_semaine: parrainsData.filter(p => p.created_at && new Date(p.created_at).getTime() >= weekAgo).length,
      parrains_mois: parrainsData.filter(p => p.created_at && new Date(p.created_at).getTime() >= monthAgo).length,
      total_filleuls_venus: totalFilleulsAll,
      ca_total_chf: totalCaAll,
    };

    return res.status(200).json({
      ok: true,
      salon: {
        slug: salonRecord.get('slug'),
        nom: salonRecord.get('nom') || salonRecord.get('slug'),
        panier_moyen_chf: Number(salonRecord.get('panier_moyen_chf')) || null,
        pourcentage_reduc_filleul: Number(salonRecord.get('pourcentage_reduc_filleul')) || null,
        booking_url: salonRecord.get('booking_url') || null,
        recompense_parrain_texte: salonRecord.get('recompense_parrain_texte') || null,
      },
      parrains: parrainsData,
      stats,
    });
  } catch (err) {
    console.error('[dashboard/clients] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
