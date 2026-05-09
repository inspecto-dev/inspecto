export function getViteVirtualModuleScript(serverPort: number) {
  return `
import { mountInspector } from '@inspecto-dev/core';
window.__AI_INSPECTOR_PORT__ = ${serverPort};
mountInspector({
  serverUrl: 'http://0.0.0.0:' + window.__AI_INSPECTOR_PORT__,
});
`
}

export const VITE_VIRTUAL_MODULE_ID = '\0virtual:inspecto-client'
export const VITE_VIRTUAL_IMPORT_ID = '/@id/__x00__virtual:inspecto-client'
