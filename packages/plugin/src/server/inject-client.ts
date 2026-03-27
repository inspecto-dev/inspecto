import MagicString from 'magic-string'

export function getInjectedCode(options: { hotKeys?: string[]; maxSnippetLines?: number }): string {
  const { hotKeys = ['altKey'], maxSnippetLines = 100 } = options

  return `
// [inspecto] injected bootstrap
;(function() {
  if (typeof document === 'undefined') return;
  if (typeof __AI_INSPECTOR_PORT__ === 'undefined') return;

  // Direct string import that Vite can optimize.
  import('@inspecto/core').then(({ mountInspector }) => {
    mountInspector({
      serverUrl: 'http://127.0.0.1:' + __AI_INSPECTOR_PORT__,
      hotKeys: ${JSON.stringify(hotKeys)},
      maxSnippetLines: ${maxSnippetLines},
    });
  }).catch(function(e) {
    console.warn('[inspecto] failed to mount inspector:', e);
  });
})();
`
}

export function injectClientCode(
  source: string,
  injectedCode: string,
  filePath: string,
): { code: string; map: ReturnType<MagicString['generateMap']> } {
  const ms = new MagicString(source)
  ms.prepend(injectedCode)
  return {
    code: ms.toString(),
    map: ms.generateMap({ hires: true, source: filePath }),
  }
}
