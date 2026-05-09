import { loadUserConfigSync } from '../config.js'

export function resolveServerHost(cwd: string, configRoot: string): string {
  const userConfig = loadUserConfigSync(false, cwd, configRoot)
  const configuredHost = userConfig['server.host']?.trim()
  if (configuredHost) return configuredHost

  // Vitest sandbox environments can reject binding 0.0.0.0 even when the
  // same process can bind loopback successfully. Prefer loopback for tests so
  // plugin e2e coverage reflects real runtime behavior instead of sandbox
  // policy noise.
  if (process.env['VITEST']) return '127.0.0.1'
  return '127.0.0.1'
}

export function resolvePublicServerUrl(args: {
  cwd: string
  configRoot: string
  port: number
}): string {
  const userConfig = loadUserConfigSync(false, args.cwd, args.configRoot)
  const configuredPublicUrl = userConfig['server.publicUrl']?.trim()
  if (configuredPublicUrl) {
    return configuredPublicUrl.replace(/\/$/, '')
  }

  const host = resolveServerHost(args.cwd, args.configRoot)
  return `http://${host}:${args.port}`
}
