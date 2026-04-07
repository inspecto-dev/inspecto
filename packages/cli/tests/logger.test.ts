import { beforeEach, describe, expect, it, vi } from 'vitest'
import { log } from '../src/utils/logger.js'
import { reportCommandError, writeCommandOutput } from '../src/utils/output.js'

describe('logger copyable code blocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prints copyable code without box drawing characters', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    log.copyableCodeBlock(['const answer = 42', 'console.log(answer)'])

    const output = consoleSpy.mock.calls.map(call => String(call[0]))

    expect(output).not.toContain(expect.stringContaining('┌'))
    expect(output).not.toContain(expect.stringContaining('│'))
    expect(output).not.toContain(expect.stringContaining('└'))
    expect(output).toContain('      const answer = 42')
    expect(output).toContain('      console.log(answer)')
  })
})

describe('command output utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prints formatted JSON and skips the plain-text renderer in json mode', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const renderText = vi.fn()
    const result = { status: 'ok', nested: { value: 1 } }

    const returned = writeCommandOutput(result, true, renderText)

    expect(returned).toBe(result)
    expect(renderText).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2))
  })

  it('uses the plain-text renderer when json mode is disabled', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const renderText = vi.fn()
    const result = { status: 'ok' }

    const returned = writeCommandOutput(result, false, renderText)

    expect(returned).toBe(result)
    expect(renderText).toHaveBeenCalledWith(result)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('prints machine-safe JSON errors when json mode is enabled', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loggerSpy = vi.spyOn(log, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    error.stack = 'Error: boom\n    at fake'

    reportCommandError(error, { json: true })

    expect(loggerSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          status: 'error',
          error: {
            message: 'boom',
          },
        },
        null,
        2,
      ),
    )
  })

  it('includes the stack in JSON error output when debug mode is enabled', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loggerSpy = vi.spyOn(log, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    error.stack = 'Error: boom\n    at fake'

    reportCommandError(error, { json: true, debug: true })

    expect(loggerSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          status: 'error',
          error: {
            message: 'boom',
            stack: 'Error: boom\n    at fake',
          },
        },
        null,
        2,
      ),
    )
  })
})
