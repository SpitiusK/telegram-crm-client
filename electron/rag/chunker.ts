import type { TelegramMessage } from '../../src/types'

const TWO_HOURS_SEC = 2 * 60 * 60
const MAX_MESSAGES_PER_CHUNK = 20
const MAX_CHARS_PER_CHUNK = 2000

export interface MessageChunk {
  text: string
  chatId: string
  chatTitle: string
  startDate: number
  endDate: number
  messageIds: number[]
  senderNames: string[]
  messageCount: number
  isOutgoingOnly: boolean
}

function formatChunkText(messages: TelegramMessage[]): string {
  return messages
    .map((m) => `${m.senderName}: ${m.text}`)
    .join('\n')
}

function chunkLength(messages: TelegramMessage[]): number {
  return messages.reduce((sum, m) => sum + m.senderName.length + 2 + m.text.length + 1, 0)
}

export function chunkMessages(
  messages: TelegramMessage[],
  chatId: string,
  chatTitle: string,
  gapThresholdSec = TWO_HOURS_SEC,
): MessageChunk[] {
  if (messages.length === 0) return []

  // Sort by date ascending
  const sorted = [...messages].sort((a, b) => a.date - b.date)

  // Filter out empty messages
  const nonEmpty = sorted.filter((m) => m.text.trim().length > 0)
  if (nonEmpty.length === 0) return []

  const chunks: MessageChunk[] = []
  let currentGroup: TelegramMessage[] = []

  for (const msg of nonEmpty) {
    const lastInGroup = currentGroup[currentGroup.length - 1]
    const shouldSplit =
      currentGroup.length > 0 && lastInGroup !== undefined &&
      (msg.date - lastInGroup.date > gapThresholdSec ||
        currentGroup.length >= MAX_MESSAGES_PER_CHUNK ||
        chunkLength(currentGroup) + msg.senderName.length + 2 + msg.text.length + 1 > MAX_CHARS_PER_CHUNK)

    if (shouldSplit) {
      chunks.push(buildChunk(currentGroup, chatId, chatTitle))
      currentGroup = []
    }

    currentGroup.push(msg)
  }

  // Flush remaining messages
  if (currentGroup.length > 0) {
    chunks.push(buildChunk(currentGroup, chatId, chatTitle))
  }

  return chunks
}

function buildChunk(messages: TelegramMessage[], chatId: string, chatTitle: string): MessageChunk {
  const senderSet = new Set<string>()
  for (const m of messages) {
    senderSet.add(m.senderName)
  }

  return {
    text: formatChunkText(messages),
    chatId,
    chatTitle,
    startDate: (messages[0] as TelegramMessage).date,
    endDate: (messages[messages.length - 1] as TelegramMessage).date,
    messageIds: messages.map((m) => m.id),
    senderNames: [...senderSet],
    messageCount: messages.length,
    isOutgoingOnly: messages.every((m) => m.out),
  }
}
