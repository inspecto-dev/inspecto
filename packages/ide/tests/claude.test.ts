import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vscodeMock, resetVscodeMocks } from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

import { claudeStrategy } from '../src/strategies/claude'

describe('Claude Strategy', () => {
  beforeEach(() => {
    resetVscodeMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have correct channels configured', () => {
    expect(claudeStrategy.target).toBe('claude-code')
    expect(claudeStrategy.channels).toHaveLength(3) // extension, cli, clipboard
  })

  describe('extension channel', () => {
    const pluginChannel = claudeStrategy.channels.find(c => c.type === 'extension')!

    it('should throw if extension is not found', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue(undefined)
      const payload = { prompt: 'Fix this bug' } as any
      await expect(pluginChannel.execute(payload)).rejects.toThrow(
        'Claude Code extension (anthropic.claude-code) not found',
      )
    })

    it('should write to clipboard and use claude-vscode.focus', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })
      vscodeMock.window.tabGroups = { all: [{ tabs: [] }] } as any

      const payload = { prompt: 'Test prompt' } as any
      const executePromise = pluginChannel.execute(payload)

      await vi.advanceTimersByTimeAsync(500)
      await executePromise

      expect(vscodeMock.env.clipboard.writeText).toHaveBeenCalledWith('Test prompt')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('claude-vscode.focus')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
    })

    it('should write to clipboard and fallback to terminal paste if editor paste fails', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })
      vscodeMock.window.tabGroups = { all: [{ tabs: [] }] } as any

      // Make the first paste attempt throw
      vscodeMock.commands.executeCommand.mockImplementation(async cmd => {
        if (cmd === 'editor.action.clipboardPasteAction') throw new Error('Editor paste failed')
      })

      const payload = { prompt: 'Test prompt' } as any
      const executePromise = pluginChannel.execute(payload)

      await vi.advanceTimersByTimeAsync(500)
      await executePromise

      expect(vscodeMock.env.clipboard.writeText).toHaveBeenCalledWith('Test prompt')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('claude-vscode.focus')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.terminal.paste',
      )
    })

    it('should write to clipboard and fallback to type command if both pastes fail', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })
      vscodeMock.window.tabGroups = { all: [{ tabs: [] }] } as any

      // Make both paste attempts throw
      vscodeMock.commands.executeCommand.mockImplementation(async cmd => {
        if (cmd === 'workbench.action.terminal.paste') throw new Error('Terminal paste failed')
        if (cmd === 'editor.action.clipboardPasteAction') throw new Error('Editor paste failed')
      })

      const payload = { prompt: 'Test prompt' } as any
      const executePromise = pluginChannel.execute(payload)

      await vi.advanceTimersByTimeAsync(500)
      await executePromise

      expect(vscodeMock.env.clipboard.writeText).toHaveBeenCalledWith('Test prompt')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('claude-vscode.focus')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.terminal.paste',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('type', {
        text: 'Test prompt',
      })
    })
  })
})
