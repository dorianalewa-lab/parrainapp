const Airtable = require('airtable');

if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
  console.error('[airtable] Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env var');
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

function escapeFormulaValue(str) {
  return String(str).replace(/'/g, "\\'");
}

module.exports = {
  base,
  parrains: base('Parrains'),
  salons: base('Salons'),
  filleuls: base('Filleuls'),
  escapeFormulaValue,
};
