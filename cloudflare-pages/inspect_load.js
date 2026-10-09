const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const loadDatasetMatch = html.match(/async function loadDataset\(\) \{[\s\S]*?\n  \}/);
if (loadDatasetMatch) console.log(loadDatasetMatch[0]);

const renderTableMatch = html.match(/function renderTable\(\) \{[\s\S]*?\n  \}/);
if (renderTableMatch) console.log(renderTableMatch[0].slice(0, 1500));
