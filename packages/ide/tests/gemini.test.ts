import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vscodeMock, resetVscodeMocks } from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

import { geminiStrategy } from '../src/strategies/gemini'

describe('Gemini Strategy', () => {
  beforeEach(() => {
    resetVscodeMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('extension channel', () => {
    const channel = geminiStrategy.channels.find(c => c.type === 'extension')!

    it('should throw if extension is not found', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue(undefined)
      await expect(channel.execute({ prompt: 'test' } as any)).rejects.toThrow(
        'Gemini Code Assist extension (google.geminicodeassist) not found',
      )
    })

    it('should focus chat and paste', async () => {
      vscodeMock.extensions.getExtension.mockReturnValue({ isActive: true })

      const executePromise = channel.execute({ prompt: 'Test prompt' } as any)

      await vi.advanceTimersByTimeAsync(2500)
      await executePromise

      expect(vscodeMock.env.clipboard.writeText).toHaveBeenCalledWith('Test prompt')
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'cloudcode.gemini.chatView.focus',
      )
      expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
        'editor.action.clipboardPasteAction',
      )
    })
  })
})
