import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// Change script src="./support.js" to script src="/support.js"
html = html.replace('<script src="./support.js"></script>', '<script src="/support.js"></script>');

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-comp.js', scriptMatch[1]);
console.log('Fixed script support.js path in Executive Dashboard index.html!');
