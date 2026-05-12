export type HotKey = 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'

export type HotKeyString =
  | 'alt'
  | 'shift'
  | 'ctrl'
  | 'meta'
  | 'cmd'
  | 'alt+shift'
  | 'ctrl+shift'
  | 'meta+shift'
  | 'cmd+shift'

export type HotKeys = HotKeyString | false

export interface SourceLocation {
  file: string
  line: number
  column: number
  name?: string
}

export type SourceAttrValue = string

export type PathType = 'relative' | 'absolute'

export type LogLevel = 'info' | 'warn' | 'error' | 'silent'

export type TransformPattern = string | RegExp

export interface UnpluginOptions {
  include?: TransformPattern[]
  exclude?: TransformPattern[]
  escapeTags?: string[]
  pathType?: PathType
  attributeName?: string
  logLevel?: LogLevel
}
