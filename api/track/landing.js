const { findParrainByCode, findSalonBySlug, incrementCounter } = require('../_lib/airtable');

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function renderNotFound(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(404).end(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Lien invalide</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  body { font-family: 'DM Sans', sans-serif; background: #F9F8FF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; margin: 0; }
  .card { background: #fff; border-radius: 24px; padding: 40px 32px; max-width: 380px; text-align: center; box-shadow: 0 4px 40px rgba(91,33,182,0.08); }
  h1 { font-family: 'Syne', sans-serif; font-size: 22px; color: #1E1B4B; margin: 12px 0; }
  p { color: #6B7280; font-size: 14px; line-height: 1.6; }
</style></head>
<body><div class="card">
  <div style="font-size:40px">🔗</div>
  <h1>Lien invalide ou expiré</h1>
  <p>Ce lien de parrainage n'existe pas ou n'est plus actif. Contacte la personne qui te l'a partagé.</p>
</div></body></html>`);
}

module.exports = async (req, res) => {
  const code = (req.query.code || '').toString().trim().toLowerCase();
  if (!code || !/^[a-z0-9]{4,12}$/.test(code)) {
    return renderNotFound(res);
  }

  const parrainRecord = await findParrainByCode(code);
  if (!parrainRecord) return renderNotFound(res);

  const salonSlug = parrainRecord.get('salon_slug');
  const salonRecord = await findSalonBySlug(salonSlug);

  incrementCounter('Parrains', parrainRecord.id, 'nb_clics_landing').catch(() => {});

  const parrainPrenom = parrainRecord.get('prenom') || 'Un ami';
  const salonNom = salonRecord?.get('nom') || (salonSlug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const pourcentage = salonRecord?.get('pourcentage_reduc_filleul') || 15;
  const hasBookingUrl = !!salonRecord?.get('booking_url');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).end(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(parrainPrenom)} te recommande ${escapeHtml(salonNom)}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --purple: #5B21B6;
    --purple-light: #EDE9FE;
    --purple-mid: #7C3AED;
    --dark: #1E1B4B;
    --gray: #6B7280;
    --light: #F9F8FF;
    --white: #FFFFFF;
  }
  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--light);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }
  .card {
    background: var(--white);
    border-radius: 24px;
    max-width: 420px;
    width: 100%;
    padding: 40px 32px;
    box-shadow: 0 4px 40px rgba(91,33,182,0.08);
    text-align: center;
  }
  .avatar {
    width: 72px;
    height: 72px;
    background: var(--purple-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
  }
  .recommande { font-size: 14px; color: var(--gray); margin-bottom: 8px; }
  .recommande strong { color: var(--purple); font-weight: 500; }
  h1 {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--dark);
    line-height: 1.3;
    margin-bottom: 12px;
  }
  .salon-name { color: var(--purple); }
  .subtitle {
    font-size: 15px;
    color: var(--gray);
    line-height: 1.6;
    margin-bottom: 32px;
  }
  .parrain-bonus {
    background: var(--purple-light);
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 13px;
    color: var(--purple);
    margin-bottom: 28px;
    line-height: 1.5;
  }
  .parrain-bonus strong {
    display: block;
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    margin-bottom: 2px;
    color: var(--dark);
  }
  .offer-box {
    background: var(--purple);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 28px;
    color: var(--white);
  }
  .offer-box .pct {
    font-family: 'Syne', sans-serif;
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
  }
  .offer-box .label { font-size: 14px; opacity: 0.85; }
  .btn {
    display: block;
    width: 100%;
    padding: 16px;
    background: var(--purple);
    color: var(--white);
    border: none;
    border-radius: 12px;
    font-family: 'Syne', sans-serif;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s;
    margin-bottom: 12px;
  }
  .btn:hover { background: var(--purple-mid); }
  .placeholder {
    text-align: center;
    padding: 16px;
    background: var(--purple-light);
    color: var(--purple);
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
  }
  .powered { margin-top: 24px; font-size: 12px; color: #C4B5FD; }
  .powered span { color: var(--purple); font-weight: 500; }
</style>
</head>
<body>

<div class="card">
  <div class="avatar">✂️</div>

  <p class="recommande"><strong>${escapeHtml(parrainPrenom)}</strong> te recommande</p>

  <h1>Viens découvrir <span class="salon-name">${escapeHtml(salonNom)}</span></h1>

  <p class="subtitle">Tu as reçu une invitation personnelle. Prends rendez-vous et bénéficie d'une offre exclusive pour ta première visite.</p>

  <div class="offer-box">
    <div class="pct">-${escapeHtml(pourcentage)}%</div>
    <div class="label">sur ta première visite</div>
  </div>

  <div class="parrain-bonus">
    <strong>Et ${escapeHtml(parrainPrenom)} ?</strong>
    Recevra aussi une récompense de notre part dès que tu viens nous rendre visite. 🎁
  </div>

  ${hasBookingUrl
    ? `<a class="btn" href="/api/track/rdv?code=${encodeURIComponent(code)}" rel="noopener">Prendre rendez-vous →</a>`
    : `<p class="placeholder">${escapeHtml(salonNom)} te contactera bientôt pour organiser ton rendez-vous.</p>`
  }

  <p class="powered">Propulsé par <span>ParrainApp</span></p>
</div>

</body>
</html>`);
};
