const data = require('./recover.json');
console.log(data.map(d => `Step ${d.step} (${d.tool}): ${d.args.toolSummary || d.args.Description || ''}`).join('\n'));
