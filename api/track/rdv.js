const { findParrainByCode, findSalonBySlug, incrementCounter } = require('../_lib/airtable');

module.exports = async (req, res) => {
  const code = (req.query.code || '').toString().trim().toLowerCase();
  if (!code || !/^[a-z0-9]{4,12}$/.test(code)) {
    return res.status(400).send('Lien invalide.');
  }

  try {
    const parrainRecord = await findParrainByCode(code);
    if (!parrainRecord) {
      return res.status(404).send('Lien invalide.');
    }

    const salonRecord = await findSalonBySlug(parrainRecord.get('salon_slug'));
    const bookingUrl = salonRecord?.get('booking_url');

    if (!bookingUrl) {
      const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
      return res.redirect(302, `${baseUrl}/r/${encodeURIComponent(code)}`);
    }

    await incrementCounter('Parrains', parrainRecord.id, 'nb_clics_rdv').catch(() => {});

    return res.redirect(302, bookingUrl);
  } catch (err) {
    console.error('[track/rdv] error:', err);
    return res.status(500).send('Erreur serveur.');
  }
};
