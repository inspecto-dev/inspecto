import { describe, expect, it } from 'vitest'
import {
  buildRequestDetails,
  buildRequestRecord,
  buildXhrState,
  isAbortLikeError,
  safePathname,
  stringifyRequestUrl,
} from '../src/features/evidence/runtime-context/request.js'

describe('runtime context request helpers', () => {
  it('builds request details from Request input and init overrides', () => {
    const request = new Request('https://example.com/api/user', { method: 'POST' })

    expect(buildRequestDetails(request)).toEqual({
      method: 'POST',
      url: 'https://example.com/api/user',
      pathname: '/api/user',
    })
    expect(buildRequestDetails(request, { method: 'PATCH' })).toMatchObject({
      method: 'PATCH',
    })
  })

  it('normalizes request records and xhr state with only present fields', () => {
    expect(
      buildRequestRecord({
        method: 'GET',
        pathname: '/api/user',
        status: 500,
        responseSummary: 'Internal Server Error',
      }),
    ).toEqual({
      method: 'GET',
      pathname: '/api/user',
      status: 500,
      responseSummary: 'Internal Server Error',
    })

    expect(buildXhrState({ method: 'POST', pathname: '/api/save' })).toEqual({
      method: 'POST',
      pathname: '/api/save',
      attached: false,
      recorded: false,
      aborted: false,
    })
  })

  it('stringifies urls and extracts pathnames safely', () => {
    expect(stringifyRequestUrl(new URL('https://example.com/api/items'))).toBe(
      'https://example.com/api/items',
    )
    expect(safePathname('/api/local')).toBe('/api/local')
    expect(safePathname('relative path')).toBe('/relative%20path')
  })

  it('recognizes abort-like errors', () => {
    expect(isAbortLikeError(new DOMException('cancelled', 'AbortError'))).toBe(true)
    expect(isAbortLikeError(Object.assign(new Error('cancelled'), { name: 'AbortError' }))).toBe(
      true,
    )
    expect(isAbortLikeError(new Error('network failed'))).toBe(false)
  })
})
