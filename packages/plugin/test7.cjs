const { parse } = require('@astrojs/compiler/sync');
const source = `---\nconst a = 1;\n---\n<div><span class="text">Hello</span></div>`;
const ast = parse(source, { position: true }).ast;
let s = source;

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
      let tagStartIndex = startOffset
      while (tagStartIndex >= 0 && source[tagStartIndex] !== '<') {
        tagStartIndex--
      }
      if (tagStartIndex >= 0) {
        const substringAfterTag = source.substring(tagStartIndex)
        const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const strictRegex = new RegExp(`^<\\s*${escapedTagName}(?=\\s|/|>)`, 'i')
        const strictMatch = substringAfterTag.match(strictRegex)

        if (strictMatch) {
            const insertPosition = tagStartIndex + strictMatch[0].length
            console.log(`Matched! Inserting at ${insertPosition} for ${tagName}`);
            s = s.slice(0, insertPosition) + ' DATA ' + s.slice(insertPosition)
        }
      }
    }
  }
});
console.log(s);
