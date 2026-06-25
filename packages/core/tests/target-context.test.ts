import { describe, expect, it } from 'vitest'

import {
  collectTargetEvidence,
  formatTargetEvidenceForPrompt,
} from '../src/features/evidence/target-context/index.js'

describe('target context evidence', () => {
  it('captures stable runtime target evidence for an element without source attributes', () => {
    document.title = 'Billing Settings'
    window.history.pushState({}, '', '/settings/billing?tab=plan')
    document.body.innerHTML = `
      <main>
        <section class="billing-card">
          <h2>Current plan</h2>
          <button
            id="upgrade"
            class="btn btn-primary upgrade-button"
            data-testid="upgrade-button"
            aria-label="Upgrade subscription"
          >
            Upgrade plan
          </button>
        </section>
      </main>
    `

    const evidence = collectTargetEvidence(document.getElementById('upgrade')!)

    expect(evidence.page).toMatchObject({
      title: 'Billing Settings',
      route: '/settings/billing',
    })
    expect(evidence.element).toMatchObject({
      tagName: 'button',
      id: 'upgrade',
      classList: ['btn', 'btn-primary', 'upgrade-button'],
      text: 'Upgrade plan',
      ariaLabel: 'Upgrade subscription',
      testId: 'upgrade-button',
    })
    expect(evidence.selectors.stableCss).toBe('[data-testid="upgrade-button"]')
    expect(evidence.sourceHints).toMatchObject({
      likelyFileNames: expect.arrayContaining(['upgrade-button', 'upgrade']),
      textTokens: expect.arrayContaining(['Upgrade plan', 'Upgrade subscription']),
      classTokens: expect.arrayContaining(['btn-primary', 'upgrade-button']),
    })
    expect(evidence.context.parentChain[0]).toMatchObject({
      tagName: 'section',
      classList: ['billing-card'],
    })
    expect(evidence.context.nearbyText).toContain('Current plan')
  })

  it('limits sensitive and oversized attribute values before sending evidence to agents', () => {
    window.history.pushState({}, '', '/checkout?session=secret-session#token')
    document.body.innerHTML = `
      <button
        id="pay"
        src="/pixel.gif?token=secret-token"
        href="/checkout?session=secret-session"
        value="4242 4242 4242 4242"
        data-user-id="user-12345"
        data-email="jane@example.com"
        data-token="secret-token-should-not-leak"
        aria-label="${'Pay '.repeat(80)}"
      >Confirm as jane@example.com ${'Confirm '.repeat(80)}</button>
    `

    const evidence = collectTargetEvidence(document.getElementById('pay')!)

    expect(evidence.page.url).not.toContain('session=')
    expect(evidence.page.url).not.toContain('#token')
    expect(evidence.element.href).not.toContain('session=')
    expect(evidence.element.src).not.toContain('token=')
    expect(evidence.element.attributes.value).toBe('[redacted]')
    expect(evidence.element.attributes['data-user-id']).toBe('[redacted]')
    expect(evidence.element.attributes['data-email']).toBe('[redacted]')
    expect(evidence.element.attributes['data-token']).toBe('[redacted]')
    expect(evidence.element.text).toContain('[redacted-email]')
    expect(evidence.element.text!.length).toBeLessThanOrEqual(160)
    expect(evidence.element.ariaLabel!.length).toBeLessThanOrEqual(160)
  })

  it('does not include redacted or truncated attribute values in stable selectors', () => {
    document.body.innerHTML = `
      <button
        aria-label="Email jane@example.com"
        id="stable-target"
      >Target</button>
    `

    const evidence = collectTargetEvidence(document.getElementById('stable-target')!)

    expect(evidence.selectors.stableCss).toBe('[id="stable-target"]')
    expect(evidence.selectors.stableCss).not.toContain('jane@example.com')
  })

  it('keeps large DOM attribute and hint collections within evidence budgets', () => {
    document.body.innerHTML = `
      <button
        id="budgeted"
        class="${Array.from({ length: 24 }, (_, index) => `class-${index}`).join(' ')}"
        ${Array.from({ length: 24 }, (_, index) => `data-extra-${index}="value-${index}"`).join(' ')}
      >
        Budgeted target
      </button>
    `

    const evidence = collectTargetEvidence(document.getElementById('budgeted')!)

    expect(evidence.element.classList).toHaveLength(12)
    expect(Object.keys(evidence.element.attributes)).toHaveLength(16)
    expect(evidence.sourceHints.classTokens).toHaveLength(12)
    expect(evidence.sourceHints.likelyFileNames.length).toBeLessThanOrEqual(12)
  })

  it('captures React owner component evidence from a DOM fiber without exposing prop values', () => {
    document.body.innerHTML = `
      <main>
        <button id="upgrade" data-testid="online-upgrade-plan">Upgrade online plan</button>
      </main>
    `
    const target = document.getElementById('upgrade') as HTMLElement & Record<string, unknown>
    function BillingPage() {}
    function BillingPlanCard() {}
    function UpgradePlanButton() {}

    target.__reactFiber$inspecto = {
      type: 'button',
      memoizedProps: { children: 'Upgrade online plan' },
      return: {
        type: UpgradePlanButton,
        memoizedProps: { planId: 'enterprise-secret-plan', onUpgrade: () => {} },
        return: {
          type: BillingPlanCard,
          memoizedProps: { workspaceId: 'workspace-secret-id' },
          return: {
            type: BillingPage,
            memoizedProps: {},
            return: null,
          },
        },
      },
    }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'react',
      componentName: 'UpgradePlanButton',
      ownerChain: ['BillingPage', 'BillingPlanCard', 'UpgradePlanButton'],
      propKeys: expect.arrayContaining(['planId', 'onUpgrade', 'workspaceId']),
      renderPath: [
        { kind: 'component', name: 'BillingPage', propKeys: [] },
        { kind: 'component', name: 'BillingPlanCard', propKeys: ['workspaceId'] },
        { kind: 'component', name: 'UpgradePlanButton', propKeys: ['planId', 'onUpgrade'] },
        {
          kind: 'host',
          name: 'button',
          selector: '[data-testid="online-upgrade-plan"]',
          propKeys: [],
        },
      ],
      confidence: 'medium',
    })
    expect(evidence.framework?.propKeys).not.toEqual(expect.arrayContaining(['children']))
    expect(prompt).toContain('Framework evidence:')
    expect(prompt).toContain('Selected target evidence:')
    expect(prompt).toContain('owner chain: BillingPage > BillingPlanCard > UpgradePlanButton')
    expect(prompt).toContain(
      '- react render path: BillingPage > BillingPlanCard props(workspaceId) > UpgradePlanButton props(planId, onUpgrade) > button[data-testid="online-upgrade-plan"]',
    )
    expect(prompt).toContain('prop keys:')
    expect(prompt).toContain('likely file/component tokens:')
    expect(prompt).not.toContain('enterprise-secret-plan')
    expect(prompt).not.toContain('workspace-secret-id')
  })

  it('keeps minified React owner names out of production target prompts', () => {
    document.body.innerHTML = `
      <main>
        <button
          id="react-upgrade-plan"
          class="primary-button react-upgrade-button billing-upgrade-cta"
          data-testid="react-upgrade-plan"
          aria-label="Upgrade React enterprise plan"
        >Upgrade React plan</button>
      </main>
    `
    const target = document.getElementById('react-upgrade-plan') as HTMLElement &
      Record<string, unknown>
    function o1() {}
    function i1() {}
    function l1() {}

    target.__reactFiber$inspecto = {
      type: 'button',
      memoizedProps: { children: 'Upgrade React plan' },
      return: {
        type: l1,
        memoizedProps: { planId: 'enterprise-secret-plan', onUpgrade: () => {} },
        return: {
          type: i1,
          memoizedProps: { workspaceId: 'workspace-secret-id' },
          return: {
            type: o1,
            memoizedProps: {},
            return: null,
          },
        },
      },
    }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'react',
      componentName: 'l1',
      ownerChain: ['o1', 'i1', 'l1'],
      propKeys: expect.arrayContaining(['planId', 'onUpgrade', 'workspaceId']),
      renderPath: [
        { kind: 'component', name: 'o1', propKeys: [] },
        { kind: 'component', name: 'i1', propKeys: ['workspaceId'] },
        { kind: 'component', name: 'l1', propKeys: ['planId', 'onUpgrade'] },
        {
          kind: 'host',
          name: 'button',
          selector: '#react-upgrade-plan[data-testid="react-upgrade-plan"]',
          propKeys: [],
        },
      ],
      confidence: 'low',
    })
    expect(evidence.sourceHints.likelyFileNames).not.toEqual(
      expect.arrayContaining(['o1', 'i1', 'l1']),
    )
    expect(prompt).toContain('Selected target evidence:')
    expect(prompt).toContain('Framework evidence:')
    expect(prompt).toContain('- framework: react')
    expect(prompt).toContain('- prop keys: planId, onUpgrade, workspaceId')
    expect(prompt).toContain(
      '- react render path: component props(workspaceId) > component props(planId, onUpgrade) > button#react-upgrade-plan[data-testid="react-upgrade-plan"]',
    )
    expect(prompt).toContain('- confidence: low')
    expect(prompt).not.toContain('- component: l1')
    expect(prompt).not.toContain('- owner chain: o1 > i1 > l1')
    expect(prompt).not.toContain(
      'likely file/component tokens: primary-button, react-upgrade-button, billing-upgrade-cta, react-upgrade-plan, o1, i1, l1',
    )
    expect(prompt).not.toContain('enterprise-secret-plan')
    expect(prompt).not.toContain('workspace-secret-id')
  })

  it('captures React local source evidence from component debug sources', () => {
    document.body.innerHTML = `
      <main>
        <button id="upgrade" data-testid="online-upgrade-plan">Upgrade online plan</button>
      </main>
    `
    const target = document.getElementById('upgrade') as HTMLElement & Record<string, unknown>
    function BillingPage() {}
    function BillingPlanCard() {}
    function UpgradePlanButton() {}

    target.__reactFiber$inspecto = {
      type: 'button',
      memoizedProps: { children: 'Upgrade online plan' },
      _debugSource: {
        fileName: '/repo/src/features/billing/UpgradePlanButton.tsx',
        lineNumber: 20,
        columnNumber: 7,
      },
      return: {
        type: UpgradePlanButton,
        memoizedProps: { planId: 'enterprise-secret-plan', onUpgrade: () => {} },
        _debugSource: {
          fileName: '/repo/src/features/billing/BillingPlanCard.tsx',
          lineNumber: 42,
          columnNumber: 11,
        },
        return: {
          type: BillingPlanCard,
          memoizedProps: { workspaceId: 'workspace-secret-id' },
          _debugSource: {
            fileName: '/repo/src/pages/BillingPage.tsx',
            lineNumber: 18,
            columnNumber: 5,
          },
          return: {
            type: BillingPage,
            memoizedProps: {},
            _debugSource: {
              fileName: '/repo/src/App.tsx',
              lineNumber: 9,
              columnNumber: 3,
            },
            return: null,
          },
        },
      },
    }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      componentName: 'UpgradePlanButton',
      source: {
        componentName: 'UpgradePlanButton',
        file: '/repo/src/features/billing/UpgradePlanButton.tsx',
        line: 20,
        column: 7,
      },
      componentSources: expect.arrayContaining([
        expect.objectContaining({
          componentName: 'BillingPage',
          file: '/repo/src/pages/BillingPage.tsx',
        }),
        expect.objectContaining({
          componentName: 'BillingPlanCard',
          file: '/repo/src/features/billing/BillingPlanCard.tsx',
        }),
        expect.objectContaining({
          componentName: 'UpgradePlanButton',
          file: '/repo/src/features/billing/UpgradePlanButton.tsx',
        }),
      ]),
      confidence: 'high',
    })
    expect(evidence.sourceHints.likelyFileNames).toEqual(
      expect.arrayContaining(['UpgradePlanButton.tsx', 'BillingPlanCard.tsx', 'BillingPage.tsx']),
    )
    expect(prompt).toContain('- source: /repo/src/features/billing/UpgradePlanButton.tsx:20:7')
    expect(prompt).not.toContain('component render sources:')
    expect(prompt).not.toContain('react render path:')
    expect(prompt).not.toContain('Selected target evidence:')
    expect(prompt).not.toContain('- page:')
    expect(prompt).not.toContain('- element:')
    expect(prompt).not.toContain('- selector:')
    expect(prompt).not.toContain('- text:')
    expect(prompt).not.toContain('likely file/component tokens:')
    expect(prompt).not.toContain('/repo/src/App.tsx')
  })

  it('captures Vue owner component evidence from parent component instances', () => {
    document.body.innerHTML = `
      <section>
        <button id="upgrade" data-testid="online-upgrade-plan">Upgrade online plan</button>
      </section>
    `
    const target = document.getElementById('upgrade') as HTMLElement & Record<string, unknown>
    target.__vueParentComponent = {
      type: { name: 'UpgradePlanButton', props: { planId: null, onUpgrade: null } },
      parent: {
        type: { __name: 'BillingPlanCard', props: ['workspaceId'] },
        parent: {
          proxy: { $options: { name: 'BillingPage', props: { accountId: null } } },
          parent: null,
        },
      },
    }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'vue',
      componentName: 'UpgradePlanButton',
      ownerChain: ['BillingPage', 'BillingPlanCard', 'UpgradePlanButton'],
      propKeys: expect.arrayContaining(['planId', 'onUpgrade', 'workspaceId', 'accountId']),
      renderPath: [
        { kind: 'component', name: 'BillingPage', propKeys: ['accountId'] },
        { kind: 'component', name: 'BillingPlanCard', propKeys: ['workspaceId'] },
        { kind: 'component', name: 'UpgradePlanButton', propKeys: ['planId', 'onUpgrade'] },
        {
          kind: 'host',
          name: 'button',
          selector: '[data-testid="online-upgrade-plan"]',
          propKeys: [],
        },
      ],
      confidence: 'medium',
    })
    expect(prompt).toContain(
      '- vue component path: BillingPage props(accountId) > BillingPlanCard props(workspaceId) > UpgradePlanButton props(planId, onUpgrade) > button[data-testid="online-upgrade-plan"]',
    )
  })

  it('captures Vue production evidence from the mounted app vnode tree', () => {
    document.body.innerHTML = `
      <div id="vue-root">
        <article>
          <button id="vue-upgrade-plan" data-testid="vue-upgrade-plan">Upgrade Vue plan</button>
        </article>
      </div>
    `
    const container = document.getElementById('vue-root') as HTMLElement & Record<string, unknown>
    const article = document.querySelector('article')!
    const target = document.getElementById('vue-upgrade-plan')!
    const root = {
      type: { __name: 'VueFrameworkEvidencePage' },
      parent: null,
      props: {},
    }
    const billing = {
      type: { name: 'VueBillingCard', props: { workspaceId: null } },
      parent: root,
      props: { workspaceId: 'secret-workspace-id' },
    }
    const button = {
      type: { name: 'VueUpgradeButton', props: { planId: null, onUpgrade: null } },
      parent: billing,
      props: { planId: 'secret-plan-id', onUpgrade: () => undefined },
    }
    root.subTree = { component: billing, el: article }
    billing.subTree = { component: button, el: target }
    button.subTree = { type: 'button', el: target }
    container.__vue_app__ = { _instance: root }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'vue',
      componentName: 'VueUpgradeButton',
      ownerChain: ['VueFrameworkEvidencePage', 'VueBillingCard', 'VueUpgradeButton'],
      propKeys: expect.arrayContaining(['workspaceId', 'planId', 'onUpgrade']),
      confidence: 'medium',
    })
    expect(prompt).toContain(
      '- vue component path: VueFrameworkEvidencePage > VueBillingCard props(workspaceId) > VueUpgradeButton props(planId, onUpgrade) > button#vue-upgrade-plan[data-testid="vue-upgrade-plan"]',
    )
    expect(prompt).not.toContain('secret-workspace-id')
    expect(prompt).not.toContain('secret-plan-id')
  })

  it('captures Vue production evidence from the mounted container vnode', () => {
    document.body.innerHTML = `
      <div id="vue-root">
        <article>
          <button id="vue-upgrade-plan" data-testid="vue-upgrade-plan">Upgrade Vue plan</button>
        </article>
      </div>
    `
    const container = document.getElementById('vue-root') as HTMLElement & Record<string, unknown>
    const article = document.querySelector('article')!
    const target = document.getElementById('vue-upgrade-plan')!
    const root = {
      type: { __name: 'VueFrameworkEvidencePage' },
      parent: null,
      props: {},
    }
    const billing = {
      type: { name: 'VueBillingCard', props: { workspaceId: null } },
      parent: root,
      props: { workspaceId: 'secret-workspace-id' },
    }
    const button = {
      type: { name: 'VueUpgradeButton', props: { planId: null, onUpgrade: null } },
      parent: billing,
      props: { planId: 'secret-plan-id', onUpgrade: () => undefined },
    }
    root.subTree = { component: billing, el: article }
    billing.subTree = { component: button, el: target }
    button.subTree = { type: 'button', el: target }
    container.__vue_app__ = { _instance: null }
    container._vnode = { component: root, el: article }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'vue',
      componentName: 'VueUpgradeButton',
      ownerChain: ['VueFrameworkEvidencePage', 'VueBillingCard', 'VueUpgradeButton'],
      propKeys: expect.arrayContaining(['workspaceId', 'planId', 'onUpgrade']),
      confidence: 'medium',
    })
    expect(prompt).toContain('- vue component path: VueFrameworkEvidencePage')
    expect(prompt).not.toContain('secret-workspace-id')
    expect(prompt).not.toContain('secret-plan-id')
  })

  it('captures Vue local source evidence from component files', () => {
    document.body.innerHTML = `
      <section>
        <button id="upgrade" data-testid="online-upgrade-plan">Upgrade online plan</button>
      </section>
    `
    const target = document.getElementById('upgrade') as HTMLElement & Record<string, unknown>
    target.__vueParentComponent = {
      type: {
        name: 'UpgradePlanButton',
        __file: '/repo/src/features/billing/UpgradePlanButton.vue',
        props: { planId: null, onUpgrade: null },
      },
      parent: {
        type: {
          __name: 'BillingPlanCard',
          __file: '/repo/src/features/billing/BillingPlanCard.vue',
          props: ['workspaceId'],
        },
        parent: {
          type: { __file: '/repo/src/pages/BillingPage.vue' },
          proxy: { $options: { name: 'BillingPage', props: { accountId: null } } },
          parent: null,
        },
      },
    }

    const evidence = collectTargetEvidence(target)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(evidence.framework).toMatchObject({
      name: 'vue',
      componentName: 'UpgradePlanButton',
      source: {
        componentName: 'UpgradePlanButton',
        file: '/repo/src/features/billing/UpgradePlanButton.vue',
      },
      componentSources: expect.arrayContaining([
        expect.objectContaining({
          componentName: 'BillingPage',
          file: '/repo/src/pages/BillingPage.vue',
        }),
        expect.objectContaining({
          componentName: 'BillingPlanCard',
          file: '/repo/src/features/billing/BillingPlanCard.vue',
        }),
        expect.objectContaining({
          componentName: 'UpgradePlanButton',
          file: '/repo/src/features/billing/UpgradePlanButton.vue',
        }),
      ]),
      confidence: 'high',
    })
    expect(evidence.sourceHints.likelyFileNames).toEqual(
      expect.arrayContaining(['UpgradePlanButton.vue', 'BillingPlanCard.vue', 'BillingPage.vue']),
    )
    expect(prompt).toContain('- source: /repo/src/features/billing/UpgradePlanButton.vue')
    expect(prompt).not.toContain('component render sources:')
    expect(prompt).not.toContain('Selected target evidence:')
    expect(prompt).not.toContain('- page:')
    expect(prompt).not.toContain('- element:')
    expect(prompt).not.toContain('- selector:')
    expect(prompt).not.toContain('- text:')
    expect(prompt).not.toContain('likely file/component tokens:')
  })

  it('keeps nearby production-page context useful in target evidence prompts', () => {
    document.body.innerHTML = `
      <main class="shell">
        <section class="hero panel">
          <span class="eyebrow">Production page playground</span>
          <h1>Production page target evidence</h1>
          <p>
            This project intentionally does not use any Inspecto compile-time plugin. Every clickable
            element below is normal runtime DOM, which validates production-page inspection without
            source-location injection.
          </p>
        </section>
      </main>
    `

    const evidence = collectTargetEvidence(document.querySelector('h1')!)
    const prompt = formatTargetEvidenceForPrompt(evidence)

    expect(prompt).toContain('Selected target evidence')
    expect(prompt).toContain('Every clickable element below is normal runtime DOM')
    expect(prompt).toContain('source-location injection')
    expect(prompt.toLowerCase()).not.toContain(['fall', 'back'].join(''))
    expect(prompt).not.toContain('Every…')
  })
})
