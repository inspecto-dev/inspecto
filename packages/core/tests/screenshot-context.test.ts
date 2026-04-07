import { beforeEach, describe, expect, it, vi } from 'vitest'
import html2canvas from 'html2canvas'
import { captureElementScreenshot } from '../src/screenshot-context.js'

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}))

describe('captureElementScreenshot', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('returns a screenshot context for a visible element', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    element.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        right: 110,
        bottom: 70,
        width: 100,
        height: 50,
        toJSON() {},
      }) as DOMRect

    vi.mocked(html2canvas).mockResolvedValueOnce({
      toDataURL: () => 'data:image/png;base64,AAA=',
    } as HTMLCanvasElement)

    const screenshot = await captureElementScreenshot(element)

    expect(screenshot?.enabled).toBe(true)
    expect(screenshot?.mimeType).toBe('image/png')
    expect(screenshot?.imageDataUrl).toBe('data:image/png;base64,AAA=')
  })

  it('returns null when capture throws', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    element.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 100,
        bottom: 40,
        width: 100,
        height: 40,
        toJSON() {},
      }) as DOMRect

    vi.mocked(html2canvas).mockRejectedValueOnce(new Error('capture failed'))

    await expect(captureElementScreenshot(element)).resolves.toBeNull()
  })

  it('returns null for zero-size elements', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    element.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON() {},
      }) as DOMRect

    await expect(captureElementScreenshot(element)).resolves.toBeNull()
    expect(vi.mocked(html2canvas)).not.toHaveBeenCalled()
  })
})
