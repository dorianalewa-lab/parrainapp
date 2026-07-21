const Airtable = require('airtable');

if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
  console.error('[airtable] Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env var');
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

function escapeFormulaValue(str) {
  return String(str).replace(/'/g, "\\'");
}

async function findSalonBySlug(slug) {
  if (!slug) return null;
  const rows = await base('Salons').select({
    filterByFormula: `LOWER({slug})='${escapeFormulaValue(slug.toLowerCase())}'`,
    maxRecords: 1,
  }).firstPage();
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  base,
  parrains: base('Parrains'),
  salons: base('Salons'),
  filleuls: base('Filleuls'),
  escapeFormulaValue,
  findSalonBySlug,
};
