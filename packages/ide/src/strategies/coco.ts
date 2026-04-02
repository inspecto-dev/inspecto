import type { IAiStrategy } from './types'
import { createCliExecutor } from './utils/cli-strategy'
import { executeClipboardFallback } from '../channels/clipboard-fallback'

export const cocoStrategy: IAiStrategy = {
  target: 'coco',
  channels: [
    {
      type: 'cli',
      execute: createCliExecutor({
        terminalName: 'Coco CLI',
        defaultBin: 'coco',
      }),
    },
    { type: 'clipboard', execute: executeClipboardFallback },
  ],
}
