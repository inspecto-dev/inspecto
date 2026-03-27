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
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
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
