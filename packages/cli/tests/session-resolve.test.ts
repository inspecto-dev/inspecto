import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveOnboardingSession } from '../src/onboarding/session.js'

const { buildOnboardingContextMock, readJSONMock } = vi.hoisted(() => ({
  buildOnboardingContextMock: vi.fn(),
  readJSONMock: vi.fn(),
}))

vi.mock('../src/onboarding/context.js', () => ({
  buildOnboardingContext: buildOnboardingContextMock,
}))

vi.mock('../src/utils/fs.js', async () => {
  const actual = await vi.importActual('../src/utils/fs.js')
  return {
    ...actual,
    readJSON: readJSONMock,
  }
})

describe('resolveOnboardingSession for Next.js guided onboarding', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    readJSONMock.mockImplementation(async filePath => {
      if (String(filePath).endsWith('package.json')) {
        return { scripts: { dev: 'next dev' } }
      }
      return null
    })
  })

  it('returns partial_success instead of error for Next.js projects', async () => {
    buildOnboardingContextMock.mockResolvedValue({
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Next.js'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    })

    const result = await resolveOnboardingSession('/repo')

    expect(result.status).toBe('partial_success')
    expect(result.target).toEqual({
      status: 'guided',
      candidates: [],
      reason: 'Guided onboarding is available for Next.js.',
    })
    expect(result.plan.strategy).toBe('guided')
    expect(result.framework).toBe('react')
    expect(result.metaFramework).toBe('Next.js')
    expect(result.pendingSteps).toEqual(
      expect.arrayContaining([expect.stringContaining('Review the generated Next.js patch plan')]),
    )
  })

  it('returns partial_success instead of error for Nuxt projects', async () => {
    buildOnboardingContextMock.mockResolvedValue({
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Nuxt'],
      },
      frameworks: {
        supported: ['vue'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    })

    const result = await resolveOnboardingSession('/repo')

    expect(result.status).toBe('partial_success')
    expect(result.plan.strategy).toBe('guided')
    expect(result.framework).toBe('vue')
    expect(result.metaFramework).toBe('Nuxt')
    expect(result.pendingSteps).toEqual(
      expect.arrayContaining([expect.stringContaining('Review the generated Nuxt patch plan')]),
    )
  })

  it('keeps Next.js guided onboarding when extra unsupported build tools are present', async () => {
    buildOnboardingContextMock.mockResolvedValue({
      root: '/repo',
      packageManager: 'pnpm',
      buildTools: {
        supported: [],
        unsupported: ['Next.js', 'CustomStack'],
      },
      frameworks: {
        supported: ['react'],
        unsupported: [],
      },
      ides: [{ ide: 'vscode', supported: true }],
      providers: [{ id: 'codex', label: 'Codex CLI', supported: true, preferredMode: 'cli' }],
    })

    const result = await resolveOnboardingSession('/repo')

    expect(result.status).toBe('partial_success')
    expect(result.plan.strategy).toBe('guided')
    expect(result.target.status).toBe('guided')
    expect(result.summary.risks).toEqual(
      expect.arrayContaining(['Additional unsupported build tool also detected: CustomStack']),
    )
  })
})
