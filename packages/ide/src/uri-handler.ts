import * as vscode from 'vscode'
import type { Provider, IdeType, AiPayload } from '@inspecto-dev/types'
import { DEFAULT_PROVIDER_MODE, INSPECTO_API_PATHS } from '@inspecto-dev/types'
import { getStrategy } from './strategies/index'
import { executeWithFallback, AllChannelsFailedError, filterChannels } from './fallback-chain'
import { resolveServerPorts } from './extension'

export class InspectoUriHandler implements vscode.UriHandler {
  constructor(private readonly ide: IdeType) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    console.log(`[InspectoUriHandler] Received URI: ${uri.toString()}`)
    const params = new URLSearchParams(uri.query)
    const target = params.get('target') as Provider | null
    const ticketId = params.get('ticket')

    if (!target) {
      vscode.window.showErrorMessage('inspecto: missing target')
      return
    }

    let payload: AiPayload | null = null

    // If a ticket is provided, fetch the full payload from the server
    if (ticketId) {
      const ports = resolveServerPorts()
      let serverReached = false
      let ticketExpired = false

      for (const port of ports) {
        try {
          const res = await fetch(
            `http://127.0.0.1:${port}${INSPECTO_API_PATHS.AI_TICKET}/${ticketId}`,
          )
          serverReached = true
          if (res.ok) {
            payload = (await res.json()) as AiPayload
            break
          } else if (res.status === 404) {
            ticketExpired = true
          }
        } catch {
          continue
        }
      }

      if (!payload) {
        if (!serverReached) {
          vscode.window.showErrorMessage(
            'inspecto: failed to connect to local server. Is your dev server running?',
          )
        } else if (ticketExpired) {
          vscode.window.showErrorMessage(
            'inspecto: ticket expired or not found. Please click "Send to AI" again in the browser.',
          )
        } else {
          vscode.window.showErrorMessage(
            'inspecto: failed to fetch payload from local server (unknown error)',
          )
        }
        return
      }
    } else {
      // Legacy fallback for direct URI parameters
      const prompt = params.get('prompt') || ''
      if (!prompt) {
        vscode.window.showErrorMessage('inspecto: missing prompt')
        return
      }

      let overrides = undefined
      if (params.has('overrides')) {
        try {
          overrides = JSON.parse(params.get('overrides')!)
        } catch (e) {
          console.warn('Failed to parse overrides from URI', e)
        }
      }

      payload = {
        ide: this.ide,
        target,
        targetType: overrides?.type ?? DEFAULT_PROVIDER_MODE[target] ?? 'extension',
        prompt,
      }

      if (params.has('autoSend')) {
        payload.autoSend = params.get('autoSend') === 'true'
      }

      const file = params.get('file')
      if (file) payload.filePath = file

      if (params.has('line')) payload.line = Number(params.get('line'))
      if (params.has('col')) payload.column = Number(params.get('col'))

      const snippet = params.get('snippet')
      if (snippet) payload.snippet = snippet

      if (overrides) payload.overrides = overrides
    }

    let strategy
    try {
      strategy = getStrategy(target)
    } catch (e: any) {
      vscode.window.showErrorMessage(`inspecto: ${e.message}`)
      return
    }

    const finalPayload = strategy.preparePayload ? strategy.preparePayload(payload) : payload

    const channels = filterChannels(
      strategy.channels,
      payload.overrides?.type || payload.targetType,
    )

    try {
      await executeWithFallback(channels, finalPayload)
    } catch (err) {
      if (err instanceof AllChannelsFailedError) {
        vscode.window.showErrorMessage(
          `inspecto: all channels failed for ${target}. ${err.attempts.length} attempts.`,
        )
      } else {
        vscode.window.showErrorMessage(`inspecto: dispatch error — ${err}`)
      }
    }
  }
}
