import type { InspectoMessages, InspectoLocale } from '@inspecto-dev/types'

const DEFAULT_LOCALE = 'en'

const EN_MESSAGES: Record<string, string> = {
  'launcher.title': 'Inspecto',
  'launcher.panel.title': 'Choose a mode',
  'launcher.panel.subtitle': 'Your next page click will follow this mode.',
  'launcher.action.inspect.title': 'Inspect',
  'launcher.action.inspect.description': 'Click one component to inspect or ask AI',
  'launcher.action.annotate.title': 'Annotate',
  'launcher.action.annotate.description':
    'Capture notes across components, then create a task or ask once',
  'launcher.action.pause.title': 'Pause selection',
  'launcher.action.pause.description': 'Use the page normally for a moment',
  'launcher.action.resume.title': 'Resume selection',
  'launcher.action.resume.description': 'Start capturing page clicks again',
  'launcher.hint.hotkeyDisabled':
    'Hotkey disabled. Open the launcher to choose Inspect or Annotate.',
  'launcher.hint.hotkeyQuickJump': 'Hotkey: {hotkey} for quick jump',
  'launcher.state.paused': 'Selection paused',
  'launcher.state.annotate': 'Annotate mode',
  'launcher.state.inspect': 'Inspect mode',
  'launcher.state.ready': 'Ready',
  'menu.openInEditor': 'Open in Editor',
  'menu.attachRuntime': 'Attach runtime context',
  'menu.runtimeEnabled': 'Runtime context enabled',
  'menu.runtimeFixOnly': 'Runtime context defaults to fix actions only until you choose otherwise',
  'menu.attachCss': 'Attach CSS context',
  'menu.cssEnabled': 'CSS context enabled',
  'menu.ask.placeholder.default': 'Add a custom ask or extra instruction...',
  'menu.ask.placeholder.fallback': 'Ask anything about this component...',
  'menu.ask.placeholder.setup': 'Inspecto setup needs attention...',
  'menu.ask.ariaLabel': 'Custom ask',
  'menu.preview.show': 'Show preview',
  'menu.preview.hide': 'Hide preview',
  'menu.sending': 'Sending...',
  'menu.error.openIde': 'Unable to open file in the editor.',
  'annotate.mode.title': 'Annotate mode',
  'annotate.quickCapture.toggle': 'Toggle quick capture',
  'annotate.exitMode': 'Exit annotate mode',
  'annotate.empty.title': 'Start by clicking a component',
  'annotate.empty.body':
    'Each click opens one note. Save a few notes first, then add an overall goal and create a task or ask once.',
  'annotate.instruction.placeholder': 'Overall goal for this batch (optional)...',
  'annotate.instruction.ariaLabel': 'Overall goal',
  'annotate.previewMessage': 'Preview message',
  'annotate.batchPayload': 'Batch payload',
  'annotate.previewRawPrompt': 'View raw prompt payload',
  'annotate.copyContext': 'Copy context',
  'annotate.copyContext.copied': 'Copied',
  'annotate.copyContext.failed': 'Failed to copy',
  'annotate.saveNote': 'Save note',
  'annotate.updateNote': 'Update note',
  'annotate.askAi': 'Ask AI',
  'annotate.askAiHint': 'Ask AI',
  'annotate.createTask': 'Create Task',
  'annotate.createTaskHint': 'Create Task',
  'annotate.recommendedAction': 'Recommended: {action}',
  'annotate.recommendedAction.agentHint': 'Recommended: {action}',
  'annotate.recommendedAction.askHint': 'Recommended: {action}',
  'annotate.sent': 'Sent',
  'annotate.taskCreated': 'Created',
  'annotate.cancel': 'Cancel',
  'annotate.delete': 'Delete',
  'annotate.composer.placeholder': 'What should change for this component?',
  'annotate.records.none': 'No records included yet.',
  'annotate.target.unknown': 'Unknown target',
  'annotate.source.unknown': 'Unknown source',
  'annotate.note.optionalEmpty': 'Optional note left empty.',
  'annotate.note.none': 'No note provided',
  'annotate.runtimeErrors': '{count} errors',
  'annotate.liveStatus.quickAskSending': 'Sending notes to your IDE assistant.',
  'annotate.liveStatus.createTaskSending': 'Creating a task from your notes.',
  'annotate.liveStatus.quickAskSent': 'Notes sent to your IDE assistant.',
  'annotate.liveStatus.taskCreated': 'Task created from your notes.',
  'annotate.latestSession.title': 'Current task',
  'annotate.latestSession.refresh': 'Refresh current task',
  'annotate.latestSession.meta.loaded': '{count} annotations',
  'annotate.latestSession.meta.summary': 'Refresh to load details',
  'annotate.latestSession.loading': 'Refreshing latest task...',
  'annotate.latestSession.pending': '',
  'annotate.latestSession.acknowledged': 'AI acknowledged.',
  'annotate.latestSession.inProgress': 'AI working...',
  'annotate.latestSession.resolved': 'AI finished. Check the page.',
  'annotate.latestSession.dismissed': 'Task dismissed.',
  'annotate.latestSession.noDetail': 'Sent to AI.',
  'annotate.latestSession.hint.pending': 'If it has not started, ask AI to continue.',
  'annotate.latestSession.hint.acknowledged': 'AI connected. Waiting for update.',
  'annotate.latestSession.hint.in_progress': 'Stay for updates, or refresh later.',
  'annotate.latestSession.hint.resolved': 'Review the result. Create a follow-up if needed.',
  'annotate.latestSession.reconnect': 'Reconnect',
  'annotate.latestSession.error.disconnected':
    'Connection lost. Reconnect to keep following this task.',
  'annotate.latestSession.status.pending': 'waiting',
  'annotate.latestSession.status.acknowledged': 'acknowledged',
  'annotate.latestSession.status.in_progress': 'in progress',
  'annotate.latestSession.status.resolved': 'complete',
  'annotate.latestSession.status.dismissed': 'dismissed',
  'annotate.header.capturing': 'Capturing clicks',
  'annotate.header.quickCaptureOn': '{label} on',
  'runtime.summary.error.one': '{count} runtime error',
  'runtime.summary.error.other': '{count} runtime errors',
  'runtime.summary.request.one': '{count} failed request',
  'runtime.summary.request.other': '{count} failed requests',
  'workflow.confirm': 'Confirm to execute "{label}"?',
  'workflow.confirm.ok': 'Confirm',
  'workflow.feedback.executed': 'Execution started',
  'workflow.notice.title': 'Workflow dispatched',
  'workflow.notice.status.ide': 'sent to IDE',
  'workflow.notice.meta.ide': 'IDE channel',
  'workflow.notice.message.ide':
    'Sent to IDE. Live sidebar updates are unavailable for annotate.channel=ide.',
  'workflow.notice.hint.ide': 'Switch annotate.channel to mcp to follow agent progress here.',
}

const ZH_CN_MESSAGES: Record<string, string> = {
  'launcher.panel.title': '选择模式',
  'launcher.panel.subtitle': '你下一次页面点击将按当前模式执行。',
  'launcher.action.inspect.title': '检查',
  'launcher.action.inspect.description': '点击一个组件进行检查或向 AI 提问',
  'launcher.action.annotate.title': '批注',
  'launcher.action.annotate.description': '跨组件记录批注，然后创建任务或一次性提问',
  'launcher.action.pause.title': '暂停选择',
  'launcher.action.pause.description': '暂时按正常方式操作页面',
  'launcher.action.resume.title': '恢复选择',
  'launcher.action.resume.description': '重新开始捕获页面点击',
  'launcher.hint.hotkeyDisabled': '快捷键已禁用。打开启动器后选择“检查”或“批注”。',
  'launcher.hint.hotkeyQuickJump': '快捷键：{hotkey}（快速跳转）',
  'launcher.state.paused': '已暂停选择',
  'launcher.state.annotate': '批注模式',
  'launcher.state.inspect': '检查模式',
  'launcher.state.ready': '就绪',
  'menu.openInEditor': '在编辑器中打开',
  'menu.attachRuntime': '附加运行时上下文',
  'menu.runtimeEnabled': '已启用运行时上下文',
  'menu.runtimeFixOnly': '运行时上下文默认仅用于修复类操作，直到你手动切换',
  'menu.attachCss': '附加 CSS 上下文',
  'menu.cssEnabled': '已启用 CSS 上下文',
  'menu.ask.placeholder.default': '添加自定义提问或额外说明...',
  'menu.ask.placeholder.fallback': '询问与此组件相关的任何问题...',
  'menu.ask.placeholder.setup': 'Inspecto 环境需要检查...',
  'menu.ask.ariaLabel': '自定义提问',
  'menu.preview.show': '显示预览',
  'menu.preview.hide': '隐藏预览',
  'menu.sending': '发送中...',
  'menu.error.openIde': '无法在编辑器中打开文件。',
  'annotate.mode.title': '批注模式',
  'annotate.quickCapture.toggle': '切换快速捕获',
  'annotate.exitMode': '退出批注模式',
  'annotate.empty.title': '先点击一个组件开始',
  'annotate.empty.body':
    '每次点击可记录一条批注。先保存几条，再补充整体目标，然后创建任务或一次性提问。',
  'annotate.instruction.placeholder': '本批次的整体目标（可选）...',
  'annotate.instruction.ariaLabel': '整体目标',
  'annotate.previewMessage': '预览消息',
  'annotate.batchPayload': '批次载荷',
  'annotate.previewRawPrompt': '查看原始 prompt 载荷',
  'annotate.copyContext': '复制上下文',
  'annotate.copyContext.copied': '已复制',
  'annotate.copyContext.failed': '复制失败，请重试',
  'annotate.saveNote': '保存',
  'annotate.updateNote': '更新',
  'annotate.askAi': '问 AI',
  'annotate.askAiHint': '问 AI',
  'annotate.createTask': '创建任务',
  'annotate.createTaskHint': '创建任务',
  'annotate.recommendedAction': '推荐：{action}',
  'annotate.recommendedAction.agentHint': '推荐：{action}',
  'annotate.recommendedAction.askHint': '推荐：{action}',
  'annotate.sent': '已发送',
  'annotate.taskCreated': '已创建',
  'annotate.cancel': '取消',
  'annotate.delete': '删除',
  'annotate.composer.placeholder': '这个组件需要修改什么？',
  'annotate.records.none': '还没有包含记录。',
  'annotate.target.unknown': '未知目标',
  'annotate.source.unknown': '未知来源',
  'annotate.note.optionalEmpty': '可选备注为空。',
  'annotate.note.none': '未提供备注',
  'annotate.runtimeErrors': '{count} 个错误',
  'annotate.liveStatus.quickAskSending': '正在将批注发送给 AI 助手。',
  'annotate.liveStatus.createTaskSending': '正在根据批注创建任务。',
  'annotate.liveStatus.quickAskSent': '批注已发送给 AI 助手。',
  'annotate.liveStatus.taskCreated': '已根据批注创建任务。',
  'annotate.latestSession.title': '当前任务',
  'annotate.latestSession.refresh': '刷新当前任务',
  'annotate.latestSession.meta.loaded': '包含 {count} 条批注',
  'annotate.latestSession.meta.summary': '包含多条批注 • 刷新以加载详情',
  'annotate.latestSession.loading': '正在刷新最新任务...',
  'annotate.latestSession.pending': '',
  'annotate.latestSession.acknowledged': 'AI 已接手。',
  'annotate.latestSession.inProgress': 'AI 处理中...',
  'annotate.latestSession.resolved': 'AI 已完成处理。请回到页面确认。',
  'annotate.latestSession.dismissed': '任务已被忽略。',
  'annotate.latestSession.noDetail': '已发送给 AI。',
  'annotate.latestSession.hint.pending': '如果还没有开始，请让 AI 继续处理。',
  'annotate.latestSession.hint.acknowledged': 'AI 已连接，正在等待更新。',
  'annotate.latestSession.hint.in_progress': '可留在这里查看进展，或稍后手动刷新。',
  'annotate.latestSession.hint.resolved': '请确认结果；如果还有问题，可创建后续任务。',
  'annotate.latestSession.reconnect': '重新连接',
  'annotate.latestSession.error.disconnected': '连接已断开。重新连接以继续跟进这条任务。',
  'annotate.latestSession.status.pending': '等待中',
  'annotate.latestSession.status.acknowledged': '已领取',
  'annotate.latestSession.status.in_progress': '处理中',
  'annotate.latestSession.status.resolved': '已完成',
  'annotate.latestSession.status.dismissed': '已忽略',
  'annotate.header.capturing': '正在捕获点击',
  'annotate.header.quickCaptureOn': '{label} 已开启',
  'runtime.summary.error.one': '{count} 个运行时错误',
  'runtime.summary.error.other': '{count} 个运行时错误',
  'runtime.summary.request.one': '{count} 个失败请求',
  'runtime.summary.request.other': '{count} 个失败请求',
  'workflow.confirm': '确认执行「{label}」？',
  'workflow.confirm.ok': '确认执行',
  'workflow.feedback.executed': '执行已启动',
  'workflow.notice.title': 'Workflow 已发送',
  'workflow.notice.status.ide': '已发送到 IDE',
  'workflow.notice.meta.ide': 'IDE 通道',
  'workflow.notice.message.ide': '已发送到 IDE。annotate.channel=ide 不支持在侧边栏实时更新。',
  'workflow.notice.hint.ide': '如需在这里跟进 agent 进度，请将 annotate.channel 切换为 mcp。',
}

const BUILTIN_MESSAGES: Record<string, Record<string, string>> = {
  en: EN_MESSAGES,
  'zh-CN': ZH_CN_MESSAGES,
}

let currentLocale: string = DEFAULT_LOCALE
let currentMessages: InspectoMessages = {}

function normalizeLocale(locale?: string | null): string {
  if (!locale) return DEFAULT_LOCALE
  if (BUILTIN_MESSAGES[locale]) return locale
  if (locale.toLowerCase().startsWith('zh')) return 'zh-CN'
  if (locale.toLowerCase().startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

function resolveBrowserLocale(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(navigator.language)
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
}

export function configureI18n(input?: {
  locale?: InspectoLocale
  messages?: InspectoMessages
}): void {
  currentLocale = normalizeLocale(input?.locale ?? resolveBrowserLocale())
  currentMessages = input?.messages ?? {}
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const message =
    currentMessages[key] ??
    BUILTIN_MESSAGES[currentLocale]?.[key] ??
    BUILTIN_MESSAGES[DEFAULT_LOCALE]?.[key] ??
    key
  return interpolate(message, vars)
}

export function runtimeSummaryLabel(kind: 'error' | 'request', count: number): string {
  const suffix = count === 1 ? 'one' : 'other'
  return t(`runtime.summary.${kind}.${suffix}`, { count })
}
