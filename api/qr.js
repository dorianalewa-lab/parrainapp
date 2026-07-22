const QRCode = require('qrcode');
const { validateSlug } = require('./_lib/validation');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const slug = validateSlug(req.query.slug);
  const format = (req.query.format || 'svg').toString().toLowerCase();
  const download = req.query.download === '1' || req.query.download === 'true';

  if (!slug) {
    return res.status(400).json({ ok: false, error: 'Slug invalide.' });
  }
  if (!['svg', 'png'].includes(format)) {
    return res.status(400).json({ ok: false, error: 'Format invalide (svg ou png).' });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const targetUrl = `${baseUrl}/?salon=${encodeURIComponent(slug)}`;

  try {
    const qrOptions = {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 600,
      color: { dark: '#1E1B4B', light: '#FFFFFF' },
    };

    if (format === 'svg') {
      const svg = await QRCode.toString(targetUrl, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (download) {
        res.setHeader('Content-Disposition', `attachment; filename="parrainapp-qr-${slug}.svg"`);
      }
      return res.status(200).end(svg);
    }

    const pngBuffer = await QRCode.toBuffer(targetUrl, { ...qrOptions, type: 'png' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="parrainapp-qr-${slug}.png"`);
    }
    return res.status(200).end(pngBuffer);
  } catch (err) {
    console.error('[qr] error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur de génération du QR.' });
  }
};
