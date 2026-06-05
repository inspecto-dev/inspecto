export {
  addTargetToCurrentAnnotation,
  beginEditingRecord,
  clearDraftForTarget,
  createAnnotationTarget,
  describeElement,
  findElementForAnnotationTarget,
  findElementForLocation,
  getAnnotationTargetKey,
  markTargetInAnnotateSession,
  persistCurrentDraft,
  rebindCurrentAnnotationElements,
  restoreEditingRecord,
} from '../features/annotate/targets/index.js'

export {
  clearAnnotateError,
  clearAnnotateSuccess,
  composeAnnotateInstruction,
  getAnnotateSidebarOptions,
  getNextRecordDisplayOrderUi as getNextRecordDisplayOrder,
  hasCurrentRecordUi as hasCurrentRecord,
  renderAnnotateSelectionOverlay,
  sendAnnotationBatch,
  showAnnotateSuccess,
  toAnnotateErrorMessage,
  toAnnotationTransportFromRecordUi as toAnnotationTransportFromRecord,
} from './annotate-ui.js'

export {
  refreshLatestAnnotateSession,
  startLatestAnnotateSessionStream,
  stopLatestAnnotateSessionStream,
} from './annotate-session-stream.js'
