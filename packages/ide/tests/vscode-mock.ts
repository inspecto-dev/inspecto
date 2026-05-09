import { vi } from 'vitest'

const mockExecuteCommand = vi.fn()
const mockRegisterCommand = vi.fn((_id, callback) => ({ dispose: vi.fn(), callback }))
const mockRegisterUriHandler = vi.fn(() => ({ dispose: vi.fn() }))
const mockGetExtension = vi.fn()
const mockOpenTextDocument = vi.fn()
const mockShowTextDocument = vi.fn()
const mockWriteText = vi.fn()
const mockShowInformationMessage = vi.fn()
const mockShowWarningMessage = vi.fn()
const mockShowErrorMessage = vi.fn()
const mockCreateOutputChannel = vi.fn()
const mockCreateTerminal = vi.fn()
const mockSendText = vi.fn()
const mockShow = vi.fn()

let mockTerminals: any[] = []
let mockWorkspaceFolders: any[] = [{ uri: { fsPath: '/mock/workspace' } }]
let mockActiveEditor: any = undefined
let mockOutputChannel: any = undefined

export const vscodeMock = {
  commands: {
    executeCommand: mockExecuteCommand,
    registerCommand: mockRegisterCommand,
  },
  extensions: {
    getExtension: mockGetExtension,
  },
  env: {
    uriScheme: 'vscode',
    appName: 'Visual Studio Code',
    clipboard: {
      writeText: mockWriteText,
    },
  },
  window: {
    showInformationMessage: mockShowInformationMessage,
    showWarningMessage: mockShowWarningMessage,
    showErrorMessage: mockShowErrorMessage,
    createOutputChannel: mockCreateOutputChannel,
    createTerminal: mockCreateTerminal,
    registerUriHandler: mockRegisterUriHandler,
    showTextDocument: mockShowTextDocument,
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
    openTextDocument: mockOpenTextDocument,
    getWorkspaceFolder: vi.fn(uri => {
      if (!uri) return undefined
      return mockWorkspaceFolders.find(folder => uri.fsPath?.startsWith(folder.uri.fsPath))
    }),
  },
  Uri: {
    file: vi.fn((fsPath: string) => ({ fsPath })),
  },
  Position: class Position {
    constructor(
      public readonly line: number,
      public readonly character: number,
    ) {}
  },
  Selection: class Selection {
    constructor(
      public readonly anchor: { line: number; character: number },
      public readonly active: { line: number; character: number },
    ) {}
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
  mockOpenTextDocument.mockReset()
  mockShowTextDocument.mockReset()
  mockRegisterCommand.mockReset()
  mockRegisterUriHandler.mockReset()
  mockRegisterUriHandler.mockReturnValue({ dispose: vi.fn() })
  mockWriteText.mockReset()
  mockShowInformationMessage.mockReset()
  mockShowWarningMessage.mockReset()
  mockShowErrorMessage.mockReset()
  mockCreateTerminal.mockReset()
  mockSendText.mockReset()
  mockShow.mockReset()
  mockTerminals = []
  mockWorkspaceFolders = [{ uri: { fsPath: '/mock/workspace' } }]
  mockActiveEditor = undefined
  vscodeMock.workspace.getWorkspaceFolder.mockClear()
  vscodeMock.Uri.file.mockClear()
  vscodeMock.env.uriScheme = 'vscode'
  vscodeMock.env.appName = 'Visual Studio Code'

  // Set default implementation
  mockOutputChannel = {
    appendLine: vi.fn(),
    show: vi.fn(),
  }
  mockCreateOutputChannel.mockReturnValue(mockOutputChannel)
  mockOpenTextDocument.mockImplementation(async ({ content }: { content?: string }) => {
    const text = content ?? ''
    const lines = text.split('\n')
    return {
      getText: () => text,
      lineCount: lines.length,
      lineAt: (line: number) => ({ text: lines[line] ?? '' }),
      uri: { scheme: 'untitled', fsPath: '/mock/inspecto-codebuddy-prompt.md' },
    }
  })
  mockShowTextDocument.mockImplementation(async (document: any) => {
    const editor = {
      document,
      selection: undefined,
      selections: [],
    }
    mockActiveEditor = editor
    return editor
  })
}

export function getMockOutputChannel() {
  return mockOutputChannel
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
