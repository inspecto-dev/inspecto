import type {
  AnnotationWorkSession,
  AnnotationWorkSessionSummary,
  FeedbackRecord,
  FeedbackRecordSession,
  WorkflowSlotOption,
} from '@inspecto-dev/types'
import type { AnnotateSendScope } from './helpers.js'

export type SidebarMode = 'capture-enabled' | 'capture-paused'
export type SendScope = AnnotateSendScope
export type SuccessScope = 'quick-ask' | 'create-task' | 'clipboard' | null
export type PreferredAction = 'quick-ask' | 'create-task'
export type DeliveryMode = 'ide' | 'mcp'

export type AnnotateWorkflowNotice = {
  kind: 'ide-dispatch'
  workflowId: string
  workflowLabel: string
}

export interface AnnotateSidebarOptions {
  mode: SidebarMode
  canAttachCssContext?: boolean
  cssContextEnabled?: boolean
  canAttachRuntimeContext?: boolean
  runtimeContextEnabled?: boolean
  runtimeContextSummary?: string
  runtimeErrorCount?: number
  session: FeedbackRecordSession
  instruction: string
  includedRecords: FeedbackRecord[]
  fullPrompt: string
  isSending: boolean
  sendingScope: SendScope
  successScope: SuccessScope
  preferredAction?: PreferredAction
  deliveryMode?: DeliveryMode
  latestSessionSummary?: AnnotationWorkSessionSummary | null
  latestSessionDetail?: AnnotationWorkSession | null
  latestSessionLoading?: boolean
  latestSessionError?: string
  workflowNotice?: AnnotateWorkflowNotice | null
  workflows?: WorkflowSlotOption[]
  onWorkflow?: (workflowId: string) => void
  quickCaptureEnabled?: boolean
  errorMessage?: string
  onPauseCapture: () => void
  onResumeCapture: () => void
  onToggleQuickCapture?: () => void
  onToggleCssContext?: () => void
  onToggleRuntimeContext?: () => void
  onUpdateInstruction: (instruction: string) => void
  onRemovePromptChip: (recordId: string) => void
  onEditRecord?: (id: string) => void
  onRefreshLatestSession?: () => void
  onCopyContext?: () => Promise<void>
  onQuickAsk: () => void
  onCreateTask: () => void
  onExit: () => void
}

export type SidebarController = {
  element: HTMLElement
  update(next: AnnotateSidebarOptions): void
  destroy(): void
}
