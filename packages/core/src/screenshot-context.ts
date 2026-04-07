import html2canvas from 'html2canvas'
import type { ScreenshotContext } from '@inspecto-dev/types'

const SCREENSHOT_PADDING = 12

export async function captureElementScreenshot(
  element: Element,
): Promise<ScreenshotContext | null> {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const ownerDocument = element.ownerDocument
  const view = ownerDocument.defaultView
  if (!view) return null

  try {
    const left = Math.max(0, rect.left + view.scrollX - SCREENSHOT_PADDING)
    const top = Math.max(0, rect.top + view.scrollY - SCREENSHOT_PADDING)
    const width = Math.ceil(rect.width + SCREENSHOT_PADDING * 2)
    const height = Math.ceil(rect.height + SCREENSHOT_PADDING * 2)
    const root = ownerDocument.documentElement

    const canvas = await html2canvas(root, {
      backgroundColor: null,
      logging: false,
      useCORS: true,
      x: left,
      y: top,
      width,
      height,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    })

    return {
      enabled: true,
      capturedAt: new Date().toISOString(),
      mimeType: 'image/png',
      imageDataUrl: canvas.toDataURL('image/png'),
    }
  } catch {
    return null
  }
}
