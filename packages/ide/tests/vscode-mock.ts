import { vi } from 'vitest'

const mockExecuteCommand = vi.fn()
const mockGetExtension = vi.fn()
const mockWriteText = vi.fn()
const mockShowInformationMessage = vi.fn()
const mockShowErrorMessage = vi.fn()
const mockCreateOutputChannel = vi.fn()
const mockCreateTerminal = vi.fn()
const mockSendText = vi.fn()
const mockShow = vi.fn()

let mockTerminals: any[] = []
let mockWorkspaceFolders: any[] = [{ uri: { fsPath: '/mock/workspace' } }]
let mockActiveEditor: any = undefined

export const vscodeMock = {
  commands: {
    executeCommand: mockExecuteCommand,
  },
  extensions: {
    getExtension: mockGetExtension,
  },
  env: {
    clipboard: {
      writeText: mockWriteText,
    },
  },
  window: {
    showInformationMessage: mockShowInformationMessage,
    showErrorMessage: mockShowErrorMessage,
    createOutputChannel: mockCreateOutputChannel,
    createTerminal: mockCreateTerminal,
    get terminals() {
      return mockTerminals
    },
    tabGroups: { all: [] },
    get activeTextEditor() {
      return mockActiveEditor
    },
    set activeTextEditor(editor) {
      mockActiveEditor = editor
    },
  },
  workspace: {
    get workspaceFolders() {
      return mockWorkspaceFolders
    },
    set workspaceFolders(folders) {
      mockWorkspaceFolders = folders as any
    },
    getWorkspaceFolder: vi.fn(uri => {
      if (!uri) return undefined
      return mockWorkspaceFolders.find(folder => uri.fsPath?.startsWith(folder.uri.fsPath))
    }),
  },
  Uri: {
    file: vi.fn((fsPath: string) => ({ fsPath })),
  },
  TabInputWebview: class TabInputWebview {
    public readonly viewType: string
    constructor(viewType: string) {
      this.viewType = viewType
    }
  },
}

export function resetVscodeMocks() {
  mockExecuteCommand.mockReset()
  mockGetExtension.mockReset()
  mockWriteText.mockReset()
  mockShowInformationMessage.mockReset()
  mockShowErrorMessage.mockReset()
  mockCreateTerminal.mockReset()
  mockSendText.mockReset()
  mockShow.mockReset()
  mockTerminals = []
  mockWorkspaceFolders = [{ uri: { fsPath: '/mock/workspace' } }]
  mockActiveEditor = undefined
  vscodeMock.workspace.getWorkspaceFolder.mockClear()
  vscodeMock.Uri.file.mockClear()

  // Set default implementation
  mockCreateOutputChannel.mockReturnValue({
    appendLine: vi.fn(),
    show: vi.fn(),
  })
}

export function addMockTerminal(name: string) {
  const t = { name, sendText: mockSendText, show: mockShow }
  mockTerminals.push(t)
  return t
}

export function setMockTerminalCreate() {
  mockCreateTerminal.mockImplementation(({ name }) => {
    return addMockTerminal(name)
  })
}

export function setMockWorkspaceFolders(folders: string[]): void {
  vscodeMock.workspace.workspaceFolders = folders.map(fsPath => ({ uri: { fsPath } }))
}

export function setMockActiveEditor(path?: string): void {
  if (!path) {
    vscodeMock.window.activeTextEditor = undefined
    return
  }
  vscodeMock.window.activeTextEditor = {
    document: { uri: { fsPath: path } },
  }
}
