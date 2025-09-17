// utils/topSellingStore.js
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const filePath = path.join(process.cwd(), 'data', 'topSelling.json');

// Ensure file exists and load initial cache synchronously (so controllers can call getIds() synchronously)
function ensureFileSync() {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({ ids: [] }, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('topSellingStore.ensureFileSync error', err);
  }
}
ensureFileSync();

let cache = [];
try {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  cache = Array.isArray(parsed.ids) ? parsed.ids.slice() : [];
} catch (err) {
  console.error('topSellingStore init read error', err);
  cache = [];
}

async function persist() {
  try {
    await fsp.writeFile(filePath, JSON.stringify({ ids: cache }, null, 2), 'utf8');
  } catch (err) {
    console.error('topSellingStore persist error', err);
  }
}

function getIds() {
  // return a copy
  return cache.slice();
}

function isSelected(id) {
  return cache.includes(String(id));
}

async function toggleId(id) {
  id = String(id);
  const idx = cache.indexOf(id);
  if (idx === -1) {
    cache.push(id);
  } else {
    cache.splice(idx, 1);
  }
  await persist();
}

module.exports = {
  getIds,
  isSelected,
  toggleId,
  // for convenience (rarely needed) :
  _internal: { filePath }
};
