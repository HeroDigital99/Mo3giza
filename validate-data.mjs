import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('./data/adhkar.json', import.meta.url), 'utf8'));
const required = ['id','title','category','count','timing','text','virtue','source','grade','sourceLinks'];
const ids = new Set();
const errors = [];
for (const item of data) {
  if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`);
  ids.add(item.id);
  for (const key of required) if (!(key in item) || item[key] === '' || item[key] == null) errors.push(`${item.id}: missing ${key}`);
  if (!Number.isInteger(item.count) || item.count < 0) errors.push(`${item.id}: count must be a non-negative integer`);
  if (!Array.isArray(item.sourceLinks)) errors.push(`${item.id}: sourceLinks must be an array`);
  for (const link of item.sourceLinks || []) {
    try { if (new URL(link.url).protocol !== 'https:') errors.push(`${item.id}: source URL must use HTTPS`); }
    catch { errors.push(`${item.id}: invalid source URL`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${data.length} records, ${ids.size} unique IDs, all required fields and HTTPS source links valid.`);
