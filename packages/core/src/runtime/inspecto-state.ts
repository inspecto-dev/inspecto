import { createEmptySession } from '../features/annotate/session/index.js'
import type { createAnnotateOverlay } from '../features/annotate/overlay/index.js'
import type { AnnotateSendScope } from '../features/annotate/sidebar/helpers.js'
import type {
  AnnotateWorkflowNotice,
  SidebarController,
} from '../features/annotate/sidebar/types.js'
import type { createOverlay } from '../features/inspect/overlay/index.js'
import { createRuntimeContextCollector } from '../features/evidence/runtime-context/index.js'
import type {
  AnnotationWorkSession,
  AnnotationWorkSessionSummary,
  FeedbackRecord,
  FeedbackRecordDraft,
  HotKeys,
  IdeType,
  InspectorOptions,
  WorkflowSlotOption,
} from '@inspecto-dev/types'
import type { AnnotationSessionEventStreamConnection } from '../transport/http-client.js'

export type InspectorMode = 'inspect' | 'annotate'
export type InspectoOptions = InspectorOptions & { mode?: InspectorMode }
type InspectOverlay = ReturnType<typeof createOverlay>
type AnnotateOverlay = ReturnType<typeof createAnnotateOverlay>

const DEFAULT_ANNOTATE_INSTRUCTION = ''

const BaseElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as typeof HTMLElement)

export abstract class InspectoElementState extends BaseElement {
  protected options: InspectoOptions = {}
  protected serverHotKeys: HotKeys | null = null
  protected active = false
  protected disabled = false
  protected prePauseState: { active: boolean; mode: InspectorMode } = {
    active: false,
    mode: 'inspect',
  }
  protected mode: InspectorMode = 'inspect'
  protected ide: IdeType = 'vscode'
  protected ideConnected = false
  protected ideConnectionKnown = false
  protected launcherPanelOpen = false
  protected shadowRootEl!: ShadowRoot
  protected overlay!: InspectOverlay
  protected annotateOverlay: AnnotateOverlay | null = null
  protected cleanupMenu: (() => void) | null = null
  protected annotateSession = createEmptySession()
  protected annotateCapturePaused = false
  protected annotateQuickCaptureEnabled = false
  protected annotateSidebar: SidebarController | null = null
  protected annotateElements = new Map<string, Element>()
  protected annotateDrafts = new Map<string, FeedbackRecordDraft>()
  protected annotateEditingRecord: FeedbackRecord | null = null
  protected badge!: HTMLDivElement
  protected configLoadPromise: Promise<void> | null = null
  protected annotateInstructionDraft = DEFAULT_ANNOTATE_INSTRUCTION
  protected annotateErrorMessage = ''
  protected annotateRuntimeContextEnabled = false
  protected annotateCssContextEnabled = false
  protected deliveryMode: 'ide' | 'mcp' = 'mcp'
  protected annotateWorkflows: WorkflowSlotOption[] = []
  protected annotateSendState: {
    isSending: boolean
    scope: AnnotateSendScope
  } = {
    isSending: false,
    scope: null,
  }
  protected annotateLatestSessionSummary: AnnotationWorkSessionSummary | null = null
  protected annotateLatestSessionDetail: AnnotationWorkSession | null = null
  protected annotateLatestSessionStream: AnnotationSessionEventStreamConnection | null = null
  protected annotateLatestSessionLoading = false
  protected annotateLatestSessionError = ''
  protected annotateWorkflowNotice: AnnotateWorkflowNotice | null = null
  protected annotateSuccessScope: 'quick-ask' | 'create-task' | 'clipboard' | null = null
  protected annotateSuccessTimeout: ReturnType<typeof setTimeout> | null = null
  protected annotateSuccessOnClear: (() => void) | null = null
  protected pendingAnnotateViewportFrame: number | null = null
  protected runtimeContextCollector = createRuntimeContextCollector()
  protected cleanupRuntimeContextCapture: (() => void) | null = null
  protected lastPointerX = 0
  protected lastPointerY = 0
}
