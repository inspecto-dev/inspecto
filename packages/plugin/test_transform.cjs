const { transformAstro } = require('./dist/index.cjs');
const fs = require('fs');

const source = fs.readFileSync('../../playground/astro-vite/src/components/ModeCard.astro', 'utf8');
const result = transformAstro({ source, filePath: 'test.astro' });
console.log(result.code);
