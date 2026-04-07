import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vscodeMock, resetVscodeMocks } from './vscode-mock'

// Mock vscode module before importing the strategy
vi.mock('vscode', () => vscodeMock)

import { copilotStrategy } from '../src/strategies/copilot'

describe('Copilot Strategy', () => {
  beforeEach(() => {
    resetVscodeMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have correct channels configured', () => {
    expect(copilotStrategy.target).toBe('copilot')
    expect(copilotStrategy.channels).toHaveLength(2)
    expect(copilotStrategy.channels[0].type).toBe('extension')
    expect(copilotStrategy.channels[1].type).toBe('clipboard')
  })

  describe('extension channel', () => {
    const pluginChannel = copilotStrategy.channels.find(c => c.type === 'extension')!

    it('should throw if Copilot extension is not found', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue(undefined)

      const payload = {
        prompt: 'Fix this bug',
        target: 'copilot' as const,
        targetType: 'extension' as const,
        ide: 'vscode' as const,
      }
      await expect(pluginChannel.execute(payload)).rejects.toThrow(
        'GitHub Copilot Chat extension not found',
      )
    })

    it('should activate extension and send prompt when already active', async () => {
      const mockActivate = vi.fn()
      vscodeMock.extensions.getExtension.mockReturnValue({
        isActive: true,
        activate: mockActivate,
      })

      const payload = {
        prompt: 'Explain this code',
        target: 'copilot' as const,
        targetType: 'extension' as const,
        ide: 'vscode' as const,
        autoSend: true,
      }
      await pluginChannel.execute(payload)

      expect(mockActivate).not.toHaveBeenCalled()
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.chat.open',
        { query: 'Explain this code', isPartialQuery: false },
      )
    })

    it('should handle cold start correctly with delays', async () => {
      const mockActivate = vi.fn().mockResolvedValue(undefined)
      vscodeMock.extensions.getExtension.mockReturnValue({
        isActive: false,
        activate: mockActivate,
      })

      const payload = {
        prompt: 'Cold start prompt',
        target: 'copilot' as const,
        targetType: 'extension' as const,
        ide: 'vscode' as const,
        autoSend: false,
      }

      // We need to handle the timers for cold start manually
      const executePromise = pluginChannel.execute(payload)

      // Advance past the delay
      await vi.advanceTimersByTimeAsync(1000)

      await executePromise

      expect(mockActivate).toHaveBeenCalled()
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.panel.chat.view.copilot.focus',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
    })

    it('should not block on Copilot activation before opening chat', async () => {
      const mockActivate = vi.fn(() => new Promise(() => {}))
      vscodeMock.extensions.getExtension.mockReturnValue({
        isActive: false,
        activate: mockActivate,
      })

      const payload = {
        prompt: 'Open chat even if activation stalls',
        target: 'copilot' as const,
        targetType: 'extension' as const,
        ide: 'vscode' as const,
        autoSend: true,
      }

      await pluginChannel.execute(payload)

      expect(mockActivate).toHaveBeenCalled()
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.chat.open',
        { query: 'Open chat even if activation stalls', isPartialQuery: false },
      )
    })
  })
})
