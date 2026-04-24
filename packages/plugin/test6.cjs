const { parse } = require('@astrojs/compiler/sync');
const source = `---\nconst a = 1;\n---\n<div><span class="text">Hello</span></div>`;
const ast = parse(source, { position: true }).ast;

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return
  visitor.enter(node)
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, visitor)
    }
  }
}

walk(ast, {
  enter(node) {
    if (node.type === 'element' || node.type === 'component') {
      const tagName = node.name;
      const startOffset = node.position?.start?.offset ?? -1;
      const searchStart = Math.max(0, startOffset - 5);
      const sourceSub = source.substring(searchStart);
      const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^.*?<\\s*${escapedTagName}(?=\\s|/|>)`, 'is');
      const match = sourceSub.match(regex);
      console.log(`Node: ${tagName}, Offset: ${startOffset}, SearchStart: ${searchStart}`);
      console.log(`Source sub: ${sourceSub}`);
      console.log(`Regex: ${regex}`);
      console.log(`Match: ${match ? match[0] : 'NO'}`);
      console.log('---');
    }
  }
});
