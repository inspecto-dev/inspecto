export function getViteVirtualModuleScript(serverPort: number, publicServerUrl?: string) {
  return `
import { mountInspector } from '@inspecto-dev/core';
window.__AI_INSPECTOR_PORT__ = ${serverPort};
window.__AI_INSPECTOR_SERVER_URL__ = '${publicServerUrl ?? `http://127.0.0.1:${serverPort}`}';
mountInspector({
  serverUrl: window.__AI_INSPECTOR_SERVER_URL__,
});
`
}

export const VITE_VIRTUAL_MODULE_ID = '\0virtual:inspecto-client'
export const VITE_VIRTUAL_IMPORT_ID = '/@id/__x00__virtual:inspecto-client'
