import { describe, expect, it } from 'vitest'
import { renderLatestSessionMessage } from '../src/features/annotate/sidebar/latest-session-message.js'

function createMessageElement(): HTMLDivElement {
  const element = document.createElement('div')
  element.dataset.variant = 'stale'
  element.dataset.inspectoLatestSessionPreview = 'true'
  element.style.display = 'block'
  element.style.overflow = 'hidden'
  element.style.maxHeight = '42px'
  element.style.setProperty('-webkit-line-clamp', '2')
  return element
}

describe('annotate latest session message renderer', () => {
  it('renders loading text without preview truncation', () => {
    const element = createMessageElement()

    renderLatestSessionMessage(element, {
      isLoading: true,
      shouldShowTimeline: false,
      latestStatus: 'acknowledged',
      hasDetail: true,
      lastAgentOrSystemMessage: 'Agent update.',
      latestMessageVariant: 'agent',
    })

    expect(element.textContent).toBe('Refreshing latest task...')
    expect(element.style.display).toBe('block')
    expect(element.dataset.inspectoLatestSessionPreview).toBeUndefined()
    expect(element.style.overflow).toBe('')
    expect(element.style.maxHeight).toBe('')
    expect(element.dataset.variant).toBe('agent')
  })

  it('renders the latest message as a two-line preview when the timeline is collapsed', () => {
    const element = createMessageElement()

    renderLatestSessionMessage(element, {
      isLoading: false,
      shouldShowTimeline: false,
      latestStatus: 'acknowledged',
      hasDetail: true,
      lastAgentOrSystemMessage: 'Agent claimed this task through MCP.',
      latestMessageVariant: 'system-info',
    })

    expect(element.textContent).toBe('Agent claimed this task through MCP.')
    expect(element.dataset.inspectoLatestSessionPreview).toBe('true')
    expect(element.style.overflow).toBe('hidden')
    expect(element.style.maxHeight).toBe('42px')
    expect(element.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    expect(element.dataset.variant).toBe('system-info')
    expect(element.style.color).toBe('#9ed8ff')
  })

  it('hides the summary when the timeline is expanded', () => {
    const element = createMessageElement()

    renderLatestSessionMessage(element, {
      isLoading: false,
      shouldShowTimeline: true,
      latestStatus: 'acknowledged',
      hasDetail: true,
      lastAgentOrSystemMessage: 'Agent claimed this task through MCP.',
      latestMessageVariant: 'system-info',
    })

    expect(element.textContent).toBe('')
    expect(element.style.display).toBe('none')
    expect(element.dataset.inspectoLatestSessionPreview).toBeUndefined()
    expect(element.dataset.variant).toBe('system-info')
  })
})
