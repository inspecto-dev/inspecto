import { describe, expect, it } from 'vitest'
import {
  getDualModeProviderCapability,
  getHostIdeLabel,
  isSupportedHostIde,
} from '@inspecto-dev/types'

describe('shared capabilities', () => {
  it('exposes shared host IDE labels', () => {
    expect(getHostIdeLabel('vscode')).toBe('VS Code')
    expect(getHostIdeLabel('cursor')).toBe('Cursor')
    expect(getHostIdeLabel('trae')).toBe('Trae')
    expect(getHostIdeLabel('trae-cn')).toBe('Trae CN')
  })

  it('exposes supported host IDE guards', () => {
    expect(isSupportedHostIde('vscode')).toBe(true)
    expect(isSupportedHostIde('cursor')).toBe(true)
    expect(isSupportedHostIde('trae')).toBe(true)
    expect(isSupportedHostIde('trae-cn')).toBe(true)
    expect(isSupportedHostIde('unknown')).toBe(false)
  })

  it('exposes dual-mode provider metadata', () => {
    expect(getDualModeProviderCapability('codex')).toEqual({
      label: 'Codex',
      extensionId: 'openai.chatgpt',
      cliBin: 'codex',
    })

    expect(getDualModeProviderCapability('claude-code')).toEqual({
      label: 'Claude Code',
      extensionId: 'anthropic.claude-code',
      cliBin: 'claude',
    })

    expect(getDualModeProviderCapability('gemini')).toEqual({
      label: 'Gemini',
      extensionId: 'google.geminicodeassist',
      cliBin: 'gemini',
    })

    expect(getDualModeProviderCapability('copilot')).toBeUndefined()
  })
})
