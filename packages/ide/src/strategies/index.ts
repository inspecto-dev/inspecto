import type { IAiStrategy } from './types'
import type { Provider } from '@inspecto-dev/types'
import { copilotStrategy } from './copilot'
import { claudeStrategy } from './claude'
import { geminiStrategy } from './gemini'
import { codexStrategy } from './codex'
import { cocoStrategy } from './coco'
import { traeStrategy } from './trae'
import { cursorStrategy } from './cursor'

const STRATEGY_MAP: Record<Provider, IAiStrategy> = {
  copilot: copilotStrategy,
  'claude-code': claudeStrategy,
  gemini: geminiStrategy,
  codex: codexStrategy,
  coco: cocoStrategy,
  trae: traeStrategy,
  cursor: cursorStrategy,
}

export function getStrategy(tool: Provider): IAiStrategy {
  let s = STRATEGY_MAP[tool]
  if (!s) throw new Error(`No strategy registered for tool: ${tool}`)

  // Clone strategy to avoid mutating global definition
  s = { ...s, channels: [...s.channels] }

  return s
}

export function getAllStrategies(): IAiStrategy[] {
  return Object.values(STRATEGY_MAP)
}
