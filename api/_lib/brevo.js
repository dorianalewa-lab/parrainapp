const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

async function sendSms({ to, text, sender }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const senderName = sender || process.env.BREVO_SMS_SENDER || 'ParrainApp';

  const res = await fetch(BREVO_SMS_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: senderName.slice(0, 11),
      recipient: to,
      content: text,
      type: 'transactional',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo SMS failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

module.exports = { sendSms };
