declare global {
  var __AI_INSPECTOR_SERVER_URL__: string | undefined
  interface Window {
    InspectoClient?: {
      mountInspector: typeof import('./index.js').mountInspector
      unmountInspector: typeof import('./index.js').unmountInspector
    }
  }
}

export {}
