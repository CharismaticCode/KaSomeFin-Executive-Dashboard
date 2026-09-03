import fs from 'fs';

const file = '/Users/mac/Desktop/Vibe Coding/SmartSave Zambia/KaSomeFin-Executive-Dashboard/index.html';
let html = fs.readFileSync(file, 'utf-8');

// Ensure const RANGES = ["7 days", "30 days", "90 days"]; is defined right at top of renderVals()
html = html.replace(
  `  renderVals(){\n    const s = this.state;`,
  `  renderVals(){\n    const s = this.state;\n    const RANGES = ["7 days", "30 days", "90 days"];`
);

fs.writeFileSync(file, html);

// Validate with node --check
const scriptMatch = html.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/test-dashboard-fix.js', scriptMatch[1]);
console.log('Fixed RANGES definition in Executive Dashboard!');
