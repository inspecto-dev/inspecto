import * as vscode from 'vscode'
import type { AiTool, IdeType, AiPayload } from '@inspecto/types'
import { DEFAULT_TOOL_MODE } from '@inspecto/types'
import { getStrategy } from './strategies/index'
import { executeWithFallback, AllChannelsFailedError, filterChannels } from './fallback-chain'

export class InspectoUriHandler implements vscode.UriHandler {
  constructor(private readonly ide: IdeType) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    const params = new URLSearchParams(uri.query)
    const target = params.get('target') as AiTool | null
    const prompt = params.get('prompt') || ''

    if (!target || !prompt) {
      vscode.window.showErrorMessage('inspecto: missing target or prompt')
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

    let strategy
    try {
      strategy = getStrategy(target)
    } catch (e: any) {
      vscode.window.showErrorMessage(`inspecto: ${e.message}`)
      return
    }

    const payload: AiPayload = {
      ide: this.ide,
      target,
      targetType: overrides?.type ?? DEFAULT_TOOL_MODE[target] ?? 'plugin',
      prompt,
    }

    const file = params.get('file')
    if (file) payload.filePath = file

    if (params.has('line')) payload.line = Number(params.get('line'))
    if (params.has('col')) payload.column = Number(params.get('col'))

    const snippet = params.get('snippet')
    if (snippet) payload.snippet = snippet

    if (overrides) payload.overrides = overrides

    const finalPayload = strategy.preparePayload ? strategy.preparePayload(payload) : payload

    const channels = filterChannels(strategy.channels, overrides?.type)

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
