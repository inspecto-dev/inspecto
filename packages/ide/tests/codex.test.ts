import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vscodeMock, resetVscodeMocks } from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

import { codexStrategy } from '../src/strategies/codex'

describe('Codex Strategy', () => {
  beforeEach(() => {
    resetVscodeMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('extension channel', () => {
    const channel = codexStrategy.channels.find(c => c.type === 'extension')!

    it('should throw if extension not found', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue(undefined)
      await expect(channel.execute({ prompt: 'test' } as any)).rejects.toThrow(
        'Codex extension (openai.chatgpt) not found',
      )
    })

    it('should send to showAskInChat when autoSend is false', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })

      const executePromise = channel.execute({
        prompt: 'Codex prompt',
        filePath: '/test.ts',
        line: 42,
      } as any)

      await vi.advanceTimersByTimeAsync(1000)
      await executePromise

      expect(vscodeMock.env.clipboard.writeText).toHaveBeenCalledWith('Codex prompt')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'chatgpt.sidebarSecondaryView.focus',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
    })

    it('should send to sidebarSecondaryView when autoSend is true', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })

      await channel.execute({
        prompt: 'Codex prompt',
        filePath: '/test.ts',
        line: 42,
        autoSend: true,
      } as any)

      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith('chatgpt.implementTodo', {
        comment: 'Codex prompt',
      })
    })
  })
})
