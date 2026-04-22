import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockOutputChannel, vscodeMock, resetVscodeMocks } from './vscode-mock'

vi.mock('vscode', () => vscodeMock)

vi.mock('../src/channels/clipboard-fallback', () => ({
  executeClipboardFallback: vi.fn(),
}))

vi.mock('../src/utils/clipboard', () => ({
  withClipboardGuard: vi.fn(async (_text: string, action: () => Promise<void>) => {
    await action()
    return { success: true }
  }),
  ensureClipboardSuccess: vi.fn(),
  executeRobustPaste: vi.fn(async () => undefined),
}))

import { codebuddyStrategy } from '../src/strategies/codebuddy'
import { __resetInspectoOutputChannelForTests } from '../src/output-channel'
import {
  withClipboardGuard,
  ensureClipboardSuccess,
  executeRobustPaste,
} from '../src/utils/clipboard'

describe('CodeBuddy Strategy', () => {
  beforeEach(() => {
    resetVscodeMocks()
    __resetInspectoOutputChannelForTests()
    vi.useFakeTimers()
    vi.mocked(withClipboardGuard).mockImplementation(
      async (_text: string, action: () => Promise<void>) => {
        const promise = action()
        await vi.runAllTimersAsync()
        await promise
        return { success: true }
      },
    )
    vi.mocked(executeRobustPaste).mockResolvedValue(undefined)
    vi.mocked(ensureClipboardSuccess).mockImplementation(() => undefined)
    vscodeMock.env.uriScheme = 'codebuddycn'
    ;(vscodeMock.env as any).appName = 'CodeBuddy CN'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have correct channels configured', () => {
    expect(codebuddyStrategy.target).toBe('codebuddy')
    expect(codebuddyStrategy.channels).toHaveLength(2)
    expect(codebuddyStrategy.channels[0].type).toBe('builtin')
    expect(codebuddyStrategy.channels[1].type).toBe('clipboard')
  })

  it('accepts the codebuddycn uri scheme and sends prompt through sendToChat first', async () => {
    const builtinChannel = codebuddyStrategy.channels.find(c => c.type === 'builtin')!
    vscodeMock.commands.executeCommand
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    const payload = {
      prompt: 'Inspecto manual test',
      target: 'codebuddy' as const,
      targetType: 'builtin' as const,
      ide: 'codebuddy-cn' as const,
      autoSend: true,
    }

    const executePromise = builtinChannel.execute(payload)
    await vi.advanceTimersByTimeAsync(500)
    await executePromise

    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'tencentcloud.codingcopilot.chat.startNewChat',
    )
    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'tencentcloud.codingcopilot.sendToChat',
      { prompt: 'Inspecto manual test', mode: 'craft' },
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('[inspecto][codebuddy] Opening native chat'),
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Trying command: tencentcloud.codingcopilot.sendToChat'),
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Command succeeded: tencentcloud.codingcopilot.sendToChat'),
    )
    expect(vscodeMock.workspace.openTextDocument).not.toHaveBeenCalled()
    expect(vscodeMock.window.showTextDocument).not.toHaveBeenCalled()
  })

  it('prefills a new chat without sending when autoSend is false', async () => {
    const builtinChannel = codebuddyStrategy.channels.find(c => c.type === 'builtin')!
    vscodeMock.commands.executeCommand.mockResolvedValue(undefined)

    const payload = {
      prompt: 'Inspecto draft prompt',
      target: 'codebuddy' as const,
      targetType: 'builtin' as const,
      ide: 'codebuddy-cn' as const,
      autoSend: false,
    }

    const executePromise = builtinChannel.execute(payload)
    await vi.advanceTimersByTimeAsync(500)
    await executePromise

    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'tencentcloud.codingcopilot.chat.startNewChat',
    )
    expect(withClipboardGuard).toHaveBeenCalledTimes(1)
    expect(withClipboardGuard).toHaveBeenCalledWith('Inspecto draft prompt', expect.any(Function))
    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'coding-copilot.webviews.chat.focus',
    )
    expect(executeRobustPaste).toHaveBeenCalledWith('Inspecto draft prompt')
    expect(ensureClipboardSuccess).toHaveBeenCalledWith({ success: true })
    expect(vscodeMock.commands.executeCommand).not.toHaveBeenCalledWith(
      'tencentcloud.codingcopilot.sendToChat',
      expect.anything(),
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Prefilling prompt via focus + clipboard paste'),
    )
  })

  it('falls back to chat.sendMessage when sendToChat fails', async () => {
    const builtinChannel = codebuddyStrategy.channels.find(c => c.type === 'builtin')!
    vscodeMock.commands.executeCommand
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('sendToChat failed'))
      .mockResolvedValueOnce(undefined)

    const payload = {
      prompt: 'Fallback prompt',
      target: 'codebuddy' as const,
      targetType: 'builtin' as const,
      ide: 'codebuddy-cn' as const,
      autoSend: true,
    }

    const executePromise = builtinChannel.execute(payload)
    await vi.advanceTimersByTimeAsync(500)
    await executePromise

    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'tencentcloud.codingcopilot.chat.startNewChat',
    )
    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'tencentcloud.codingcopilot.sendToChat',
      { prompt: 'Fallback prompt', mode: 'craft' },
    )
    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      3,
      'tencentcloud.codingcopilot.chat.sendMessage',
      { message: 'Fallback prompt', options: { mode: 'craft' } },
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Command failed: tencentcloud.codingcopilot.sendToChat'),
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Trying command: tencentcloud.codingcopilot.chat.sendMessage'),
    )
  })

  it('throws a recoverable error when both native prompt commands fail', async () => {
    const builtinChannel = codebuddyStrategy.channels.find(c => c.type === 'builtin')!
    vscodeMock.commands.executeCommand
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('sendToChat failed'))
      .mockRejectedValueOnce(new Error('chat.sendMessage failed'))

    const payload = {
      prompt: 'Broken prompt',
      target: 'codebuddy' as const,
      targetType: 'builtin' as const,
      ide: 'codebuddy-cn' as const,
      autoSend: true,
    }

    const executePromise = builtinChannel.execute(payload)
    const rejection = expect(executePromise).rejects.toThrow(
      'Failed to send prompt through CodeBuddy chat',
    )
    await vi.advanceTimersByTimeAsync(500)
    await rejection

    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'tencentcloud.codingcopilot.sendToChat',
      { prompt: 'Broken prompt', mode: 'craft' },
    )
    expect(vscodeMock.commands.executeCommand).toHaveBeenNthCalledWith(
      3,
      'tencentcloud.codingcopilot.chat.sendMessage',
      { message: 'Broken prompt', options: { mode: 'craft' } },
    )
    expect(getMockOutputChannel().appendLine).toHaveBeenCalledWith(
      expect.stringContaining('Command failed: tencentcloud.codingcopilot.chat.sendMessage'),
    )
  })
})
