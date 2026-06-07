export type TargetElementSummary = {
  tagName: string
  id?: string
  classList: string[]
  text?: string
}

export type TargetFrameworkEvidence = {
  name: 'react' | 'vue'
  componentName: string
  ownerChain: string[]
  propKeys: string[]
  renderPath?: TargetFrameworkRenderNode[]
  source?: TargetFrameworkSourceEvidence
  componentSources?: TargetFrameworkSourceEvidence[]
  confidence: 'high' | 'medium' | 'low'
}

export type TargetFrameworkRenderNode = {
  kind: 'component' | 'host'
  name: string
  propKeys: string[]
  selector?: string
}

export type TargetFrameworkSourceEvidence = {
  componentName: string
  file: string
  line?: number
  column?: number
}

export type TargetEvidence = {
  page: {
    url: string
    title?: string
    route?: string
  }
  element: {
    tagName: string
    id?: string
    classList: string[]
    text?: string
    ariaLabel?: string
    role?: string
    testId?: string
    name?: string
    href?: string
    src?: string
    attributes: Record<string, string>
  }
  selectors: {
    css: string
    stableCss?: string
    roleLocator?: string
    textLocator?: string
    testIdLocator?: string
  }
  layout: {
    rect: {
      x: number
      y: number
      width: number
      height: number
    }
    viewport: {
      width: number
      height: number
    }
    visible: boolean
  }
  context: {
    parentChain: TargetElementSummary[]
    childrenSummary: TargetElementSummary[]
    nearbyText: string[]
  }
  framework?: TargetFrameworkEvidence
  sourceHints: {
    likelyFileNames: string[]
    textTokens: string[]
    classTokens: string[]
  }
}
