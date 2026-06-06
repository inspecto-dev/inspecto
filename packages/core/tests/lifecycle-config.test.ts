import { describe, expect, it } from 'vitest'
import {
  buildI18nConfig,
  canUseInspectMode,
  getThemeAttributeValue,
  mergeServerRuntimeContext,
  shouldFallbackToAnnotateMode,
} from '../src/runtime/lifecycle-config.js'

describe('lifecycle config helpers', () => {
  it('derives inspect mode availability from IDE and delivery state', () => {
    expect(canUseInspectMode({ ide: 'none', deliveryMode: 'ide' })).toBe(false)
    expect(
      canUseInspectMode({
        ide: 'vscode',
        deliveryMode: 'mcp',
        ideConnectionKnown: true,
        ideConnected: false,
      }),
    ).toBe(false)
    expect(
      canUseInspectMode({
        ide: 'vscode',
        deliveryMode: 'mcp',
        ideConnectionKnown: false,
        ideConnected: false,
      }),
    ).toBe(true)
  })

  it('detects when inspect mode should fall back to annotate mode', () => {
    expect(
      shouldFallbackToAnnotateMode({
        mode: 'inspect',
        ide: 'none',
        deliveryMode: 'ide',
      }),
    ).toBe(true)
    expect(
      shouldFallbackToAnnotateMode({
        mode: 'annotate',
        ide: 'none',
        deliveryMode: 'ide',
      }),
    ).toBe(false)
  })

  it('maps configured themes to host attribute values', () => {
    expect(getThemeAttributeValue('dark')).toBe('dark')
    expect(getThemeAttributeValue('light')).toBe('light')
    expect(getThemeAttributeValue('auto')).toBeNull()
    expect(getThemeAttributeValue(undefined)).toBeNull()
  })

  it('keeps i18n config empty unless locale or messages are provided', () => {
    expect(buildI18nConfig({})).toEqual({})
    expect(buildI18nConfig({ locale: 'zh-CN' })).toEqual({ locale: 'zh-CN' })
    expect(buildI18nConfig({ messages: { launcher: { title: 'Inspecto' } } })).toEqual({
      messages: { launcher: { title: 'Inspecto' } },
    })
  })

  it('merges server runtime context into existing options', () => {
    expect(
      mergeServerRuntimeContext({ enabled: true, maxRuntimeErrors: 3 }, { maxFailedRequests: 2 }),
    ).toEqual({
      enabled: true,
      maxRuntimeErrors: 3,
      maxFailedRequests: 2,
    })
  })
})
