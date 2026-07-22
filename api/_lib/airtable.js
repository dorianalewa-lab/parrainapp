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

async function findParrainByCode(code) {
  if (!code) return null;
  const rows = await base('Parrains').select({
    filterByFormula: `LOWER({code_court})='${escapeFormulaValue(code.toLowerCase())}'`,
    maxRecords: 1,
  }).firstPage();
  return rows.length > 0 ? rows[0] : null;
}

async function incrementCounter(table, recordId, field) {
  try {
    const record = await base(table).find(recordId);
    const current = Number(record.get(field)) || 0;
    await base(table).update([{ id: recordId, fields: { [field]: current + 1 } }]);
    return current + 1;
  } catch (err) {
    console.error(`[incrementCounter] ${table}/${recordId}/${field}:`, err);
    return null;
  }
}

async function getFilleulsForSalon(slug) {
  if (!slug) return [];
  return await base('Filleuls').select({
    filterByFormula: `LOWER({salon_slug})='${escapeFormulaValue(slug.toLowerCase())}'`,
    pageSize: 100,
  }).all();
}

module.exports = {
  base,
  parrains: base('Parrains'),
  salons: base('Salons'),
  filleuls: base('Filleuls'),
  escapeFormulaValue,
  findSalonBySlug,
  findParrainByCode,
  incrementCounter,
  getFilleulsForSalon,
};
