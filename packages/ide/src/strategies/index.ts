import type { IAiStrategy } from './types'
import type { AiTool } from '@inspecto/types'
import { copilotStrategy } from './github-copilot'
import { claudeStrategy } from './claude'
import { geminiStrategy } from './gemini'
import { codexStrategy } from './codex'
import { cocoStrategy } from './coco'

const STRATEGY_MAP: Record<AiTool, IAiStrategy> = {
  'github-copilot': copilotStrategy,
  'claude-code': claudeStrategy,
  gemini: geminiStrategy,
  codex: codexStrategy,
  coco: cocoStrategy,
}

export function getStrategy(tool: AiTool): IAiStrategy {
  let s = STRATEGY_MAP[tool]
  if (!s) throw new Error(`No strategy registered for tool: ${tool}`)

  // Clone strategy to avoid mutating global definition
  s = { ...s, channels: [...s.channels] }

  return s
}

export function getAllStrategies(): IAiStrategy[] {
  return Object.values(STRATEGY_MAP)
}
