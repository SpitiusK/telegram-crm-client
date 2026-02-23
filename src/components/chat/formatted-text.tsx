import type { ReactNode } from 'react'
import type { MessageEntity } from '@/types'

export function renderFormattedText(text: string, entities?: MessageEntity[]): ReactNode {
  if (!entities || entities.length === 0) {
    return text
  }

  const sorted = [...entities].sort((a, b) => a.offset - b.offset)
  const parts: ReactNode[] = []
  let cursor = 0

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!
    // Add plain text before this entity
    if (e.offset > cursor) {
      parts.push(text.slice(cursor, e.offset))
    }

    const segment = text.slice(e.offset, e.offset + e.length)

    switch (e.type) {
      case 'bold':
        parts.push(<strong key={i}>{segment}</strong>)
        break
      case 'italic':
        parts.push(<em key={i}>{segment}</em>)
        break
      case 'code':
        parts.push(
          <code key={i} className="bg-black/20 px-1 rounded font-mono text-sm">
            {segment}
          </code>
        )
        break
      case 'pre':
        parts.push(
          <pre key={i} className="bg-black/20 p-2 rounded font-mono text-sm overflow-x-auto my-1">
            {segment}
          </pre>
        )
        break
      case 'underline':
        parts.push(<u key={i}>{segment}</u>)
        break
      case 'strike':
        parts.push(<s key={i}>{segment}</s>)
        break
      case 'spoiler':
        parts.push(
          <span
            key={i}
            className="bg-foreground text-foreground hover:bg-transparent transition-colors rounded px-0.5 cursor-pointer"
          >
            {segment}
          </span>
        )
        break
      case 'url':
        parts.push(
          <a
            key={i}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            {segment}
          </a>
        )
        break
      case 'textUrl':
        parts.push(
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            {segment}
          </a>
        )
        break
      case 'mention':
        parts.push(
          <span key={i} className="text-primary cursor-pointer">
            {segment}
          </span>
        )
        break
      case 'hashtag':
        parts.push(
          <span key={i} className="text-primary">
            {segment}
          </span>
        )
        break
    }

    cursor = e.offset + e.length
  }

  // Add remaining plain text
  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts
}
