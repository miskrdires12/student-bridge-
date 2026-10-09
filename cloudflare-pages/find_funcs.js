const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');

function findFunc(name) {
  const idx = lines.findIndex(l => l.includes('function ' + name));
  if (idx !== -1) {
    console.log(`=== ${name} (Line ${idx + 1}) ===`);
    console.log(lines.slice(idx, idx + 45).join('\n'));
  } else {
    console.log(`Function ${name} not found`);
  }
}

findFunc('loadDataset');
findFunc('renderTable');
findFunc('applyFilters');
