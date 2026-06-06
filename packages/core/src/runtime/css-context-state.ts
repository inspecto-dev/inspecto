export type CssContextRecordState = {
  targetKey: string
  cssContextEnabled?: boolean
}

export type CssContextState = {
  annotateCssContextEnabled: boolean
  currentTargetKey: string | null
  currentCssContextEnabled?: boolean
  savedRecords: CssContextRecordState[]
}

export function isCssContextEnabledForTargetKey(
  state: CssContextState,
  targetKey: string,
): boolean {
  if (state.annotateCssContextEnabled) return true

  if (state.currentTargetKey === targetKey) {
    return state.currentCssContextEnabled ?? false
  }

  const savedRecord = state.savedRecords.find(record => record.targetKey === targetKey)
  return savedRecord?.cssContextEnabled ?? false
}
