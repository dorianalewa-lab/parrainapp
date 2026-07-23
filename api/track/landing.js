const QRCode = require('qrcode');
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
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  body { font-family: 'DM Sans', sans-serif; background: #F9F8FF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; margin: 0; }
  .card { background: #fff; border-radius: 24px; padding: 40px 32px; max-width: 380px; text-align: center; box-shadow: 0 4px 40px rgba(91,33,182,0.08); }
  h1 { font-family: 'Montserrat', sans-serif; font-size: 22px; color: #1E1B4B; margin: 12px 0; }
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

  const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const scanUrl = `${baseUrl}/scan?code=${encodeURIComponent(code)}`;
  let qrSvg = '';
  try {
    qrSvg = await QRCode.toString(scanUrl, {
      type: 'svg',
      margin: 1,
      width: 240,
      color: { dark: '#1E1B4B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    qrSvg = qrSvg.replace('<svg ', '<svg style="width:100%;height:auto;max-width:240px" ');
  } catch (err) {
    console.error('[landing] QR generation failed:', err);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).end(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(parrainPrenom)} te recommande ${escapeHtml(salonNom)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
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
    padding: 24px 16px;
  }
  .container {
    max-width: 420px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .card {
    background: var(--white);
    border-radius: 24px;
    padding: 40px 32px;
    box-shadow: 0 4px 40px rgba(91,33,182,0.08);
    text-align: center;
  }
  .card.compact { padding: 28px 24px; }
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
    font-family: 'Montserrat', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--dark);
    line-height: 1.3;
    margin-bottom: 12px;
  }
  h2 {
    font-family: 'Montserrat', sans-serif;
    font-size: 18px;
    color: var(--dark);
    margin-bottom: 6px;
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
    font-family: 'Montserrat', sans-serif;
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
    font-family: 'Montserrat', sans-serif;
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
    font-family: 'Montserrat', sans-serif;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s;
    margin-bottom: 12px;
  }
  .btn:hover { background: var(--purple-mid); }
  .btn-outline {
    background: var(--white);
    color: var(--purple);
    border: 1.5px solid var(--purple);
  }
  .btn-outline:hover { background: var(--purple-light); }
  .placeholder {
    text-align: center;
    padding: 16px;
    background: var(--purple-light);
    color: var(--purple);
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
  }
  .voucher-card {
    background: linear-gradient(135deg, #F9F8FF 0%, #EDE9FE 100%);
    border: 2px dashed var(--purple);
  }
  .voucher-header { color: var(--purple); font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  .qr-wrap {
    background: var(--white);
    padding: 16px;
    border-radius: 16px;
    display: inline-block;
    margin: 12px 0;
  }
  .voucher-instructions {
    font-size: 13px;
    color: var(--gray);
    line-height: 1.6;
    margin-top: 12px;
    text-align: left;
    padding: 0 8px;
  }
  .voucher-instructions strong { color: var(--dark); }
  .steps { list-style: none; padding: 0; margin: 12px 0 0; text-align: left; }
  .steps li { padding: 6px 0 6px 32px; position: relative; font-size: 13px; color: var(--dark); line-height: 1.5; }
  .steps li::before {
    content: counter(step);
    counter-increment: step;
    position: absolute;
    left: 0; top: 6px;
    width: 22px; height: 22px;
    background: var(--purple);
    color: var(--white);
    border-radius: 50%;
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .steps { counter-reset: step; }
  .powered { margin-top: 12px; font-size: 12px; color: #C4B5FD; text-align: center; }
  .powered span { color: var(--purple); font-weight: 500; }
</style>
</head>
<body>

<div class="container">

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
  </div>

  ${qrSvg ? `
  <div class="card voucher-card">
    <div class="voucher-header">🎁 Ton bon de recommandation</div>
    <h2>À montrer au salon</h2>

    <div class="qr-wrap">
      ${qrSvg}
    </div>

    <ol class="steps">
      <li>Prends rendez-vous chez ${escapeHtml(salonNom)}</li>
      <li>Le jour de ta visite, montre ce QR code au salon</li>
      <li>Le salon le scanne et enregistre ta venue</li>
      <li>${escapeHtml(parrainPrenom)} reçoit sa récompense 🎉</li>
    </ol>

    <p class="voucher-instructions" style="text-align:center;margin-top:16px">
      💡 <strong>Astuce</strong> : ajoute cette page à tes favoris ou fais une capture d'écran du QR pour l'avoir sous la main le jour J.
    </p>
  </div>
  ` : ''}

  <p class="powered">Propulsé par <span>ParrainApp</span></p>

</div>

</body>
</html>`);
};
