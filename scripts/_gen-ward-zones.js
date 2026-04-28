const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, 'bbmp-officers.csv');
const outPath = path.join(__dirname, 'ward-zones.json');
const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split(/\r?\n/);
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
const wardNameIdx = headers.findIndex(h => h.toLowerCase().includes('ward name'));
const zoneIdx = headers.findIndex(h => h.toLowerCase() === 'zones');
const result = {};
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
  const wardName = cols[wardNameIdx];
  const zone = cols[zoneIdx];
  if (wardName && zone) result[wardName] = zone;
}
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log('Total wards:', Object.keys(result).length);
