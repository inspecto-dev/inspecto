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
} from './component-annotate-targets.js'

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
} from './component-annotate-ui.js'
