import type {
  AnnotationTransport,
  FeedbackRecord,
  FeedbackRecordSession,
} from '@inspecto-dev/types'

export function toAnnotationTransportFromRecordUi(record: FeedbackRecord): AnnotationTransport {
  return {
    note: record.note,
    intent: record.intent,
    targets: [
      {
        ...(record.target.label ? { label: record.target.label } : {}),
        ...(record.target.location ? { location: record.target.location } : {}),
        ...(record.target.selector ? { selector: record.target.selector } : {}),
        ...(record.target.targetEvidencePrompt
          ? { targetEvidencePrompt: record.target.targetEvidencePrompt }
          : {}),
      },
    ],
  }
}

export function collectAnnotationTransportsFromSession(
  session: FeedbackRecordSession,
): AnnotationTransport[] {
  const transports = session.records.map(record => toAnnotationTransportFromRecordUi(record))

  if (session.current.target) {
    transports.push(
      toAnnotationTransportFromRecordUi({
        id: session.current.id,
        displayOrder: session.current.displayOrder ?? transports.length + 1,
        target: session.current.target,
        note: session.current.note,
        intent: session.current.intent,
      }),
    )
  }

  return transports
}

export function formatAnnotationContextAsMarkdown(
  instruction: string,
  annotations: AnnotationTransport[],
): string {
  let md = ''
  if (instruction) {
    md += `${instruction}\n\n`
  }
  if (annotations.length > 0) {
    md += '### Selected Elements\n\n'
    annotations.forEach((ann, index) => {
      md += `**Annotation ${index + 1}**\n`
      if (ann.note) {
        md += `* Note: ${ann.note}\n`
      }
      ann.targets.forEach((target, targetIndex) => {
        md += `\n* Target ${targetIndex + 1}:\n`
        if (target.label) md += `  - Label: \`${target.label}\`\n`
        if (target.location) {
          md += `  - Location: \`${target.location.file.split('/').pop() || target.location.file}:${target.location.line}:${target.location.column}\`\n`
        }
        if (target.selector) md += `  - Selector: \`${target.selector}\`\n`
        if (target.targetEvidencePrompt)
          md += `\n  ${indentBlock(target.targetEvidencePrompt, '  ')}\n`
        if (target.snippet) md += `\n  \`\`\`\n${target.snippet}\n  \`\`\`\n`
      })
      md += '\n---\n\n'
    })
  }
  return md.trim()
}

function indentBlock(value: string, prefix: string): string {
  return value
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n')
}
