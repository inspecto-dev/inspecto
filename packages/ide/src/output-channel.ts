import * as vscode from 'vscode'

let inspectoOutputChannel: vscode.OutputChannel | undefined

export function getInspectoOutputChannel(): vscode.OutputChannel {
  inspectoOutputChannel ??= vscode.window.createOutputChannel('Inspecto')
  return inspectoOutputChannel
}

export function logInspecto(scope: string, message: string): void {
  getInspectoOutputChannel().appendLine(`[inspecto][${scope}] ${message}`)
}

export function __resetInspectoOutputChannelForTests(): void {
  inspectoOutputChannel = undefined
}
