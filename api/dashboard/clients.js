const { parrains, escapeFormulaValue, findSalonBySlug } = require('../_lib/airtable');
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

    const rows = await parrains.select({
      filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(session.slug.toLowerCase())}'`,
      sort: [{ field: 'created_at', direction: 'desc' }],
      pageSize: 100,
    }).all();

    const parrainsData = rows.map(r => ({
      id: r.id,
      prenom: r.get('prenom') || '',
      telephone: r.get('telephone') || '',
      code_court: r.get('code_court') || '',
      created_at: r.get('created_at') || null,
      consent_at: r.get('consent_at') || null,
      source: r.get('source') || null,
    }));

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const monthAgo = now - 30 * 24 * 3600 * 1000;

    const stats = {
      total_parrains: parrainsData.length,
      parrains_semaine: parrainsData.filter(p => p.created_at && new Date(p.created_at).getTime() >= weekAgo).length,
      parrains_mois: parrainsData.filter(p => p.created_at && new Date(p.created_at).getTime() >= monthAgo).length,
    };

    return res.status(200).json({
      ok: true,
      salon: {
        slug: salonRecord.get('slug'),
        nom: salonRecord.get('nom') || salonRecord.get('slug'),
        panier_moyen_chf: salonRecord.get('panier_moyen_chf') || null,
        pourcentage_reduc_filleul: salonRecord.get('pourcentage_reduc_filleul') || null,
        booking_url: salonRecord.get('booking_url') || null,
      },
      parrains: parrainsData,
      stats,
    });
  } catch (err) {
    console.error('[dashboard/clients] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur.' });
  }
};
