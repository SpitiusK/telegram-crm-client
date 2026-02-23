import { describe, it, expect } from 'vitest'
import { chunkMessages } from '@electron/rag/chunker'
import type { TelegramMessage } from '../../types'

function makeMessage(overrides: Partial<TelegramMessage> = {}): TelegramMessage {
  return {
    id: 1,
    chatId: '100',
    text: 'Hello',
    date: 1000000,
    out: false,
    senderName: 'Alice',
    senderId: '1',
    ...overrides,
  }
}

function makeConversation(count: number, gapSec = 60): TelegramMessage[] {
  const msgs: TelegramMessage[] = []
  for (let i = 0; i < count; i++) {
    msgs.push(makeMessage({
      id: i + 1,
      text: `Message ${i + 1}`,
      date: 1000000 + i * gapSec,
      out: i % 2 === 0,
      senderName: i % 2 === 0 ? 'Operator' : 'Client',
      senderId: i % 2 === 0 ? '1' : '2',
    }))
  }
  return msgs
}

describe('chunkMessages', () => {
  it('returns empty array for empty input', () => {
    expect(chunkMessages([], '100', 'Alice')).toEqual([])
  })

  it('returns empty array when all messages have empty text', () => {
    const msgs = [
      makeMessage({ id: 1, text: '' }),
      makeMessage({ id: 2, text: '   ' }),
    ]
    expect(chunkMessages(msgs, '100', 'Alice')).toEqual([])
  })

  it('creates single chunk for a short conversation', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'Hi!', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'Hello!', date: 1000060, senderName: 'Bob', out: true }),
      makeMessage({ id: 3, text: 'How are you?', date: 1000120, senderName: 'Alice' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Alice')

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({
      chatId: '100',
      chatTitle: 'Alice',
      messageIds: [1, 2, 3],
      messageCount: 3,
      startDate: 1000000,
      endDate: 1000120,
    })
    expect(chunks[0]?.senderNames).toContain('Alice')
    expect(chunks[0]?.senderNames).toContain('Bob')
  })

  it('formats chunk text as "SenderName: message"', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'Hello', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'Hi there', date: 1000060, senderName: 'Bob' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')
    expect(chunks[0]?.text).toBe('Alice: Hello\nBob: Hi there')
  })

  it('splits on 2-hour time gap', () => {
    const twoHours = 2 * 60 * 60
    const msgs = [
      makeMessage({ id: 1, text: 'Morning', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'Still morning', date: 1000060, senderName: 'Alice' }),
      // 3-hour gap
      makeMessage({ id: 3, text: 'Afternoon', date: 1000000 + twoHours + 3600, senderName: 'Alice' }),
      makeMessage({ id: 4, text: 'Still afternoon', date: 1000000 + twoHours + 3660, senderName: 'Alice' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Alice')

    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.messageIds).toEqual([1, 2])
    expect(chunks[1]?.messageIds).toEqual([3, 4])
  })

  it('does not split when gap is exactly 2 hours', () => {
    const twoHours = 2 * 60 * 60
    const msgs = [
      makeMessage({ id: 1, text: 'First', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'Second', date: 1000000 + twoHours, senderName: 'Alice' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Alice')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.messageIds).toEqual([1, 2])
  })

  it('respects custom gap threshold', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'A', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'B', date: 1000400, senderName: 'Alice' }),
    ]

    // 5-minute gap threshold -> 400s gap exceeds it
    const chunks = chunkMessages(msgs, '100', 'Alice', 300)
    expect(chunks).toHaveLength(2)
  })

  it('splits when max messages per chunk (20) is reached', () => {
    const msgs = makeConversation(25, 60) // 25 msgs, 1 min apart

    const chunks = chunkMessages(msgs, '100', 'Chat')

    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.messageCount).toBe(20)
    expect(chunks[1]?.messageCount).toBe(5)
  })

  it('splits when max chars per chunk (2000) is reached', () => {
    // Each message: "Alice: " (7) + 100 chars + newline = ~108 chars
    // 2000 / 108 ≈ 18 messages fit, 19th triggers split
    const msgs: TelegramMessage[] = []
    for (let i = 0; i < 25; i++) {
      msgs.push(makeMessage({
        id: i + 1,
        text: 'A'.repeat(100),
        date: 1000000 + i * 60,
        senderName: 'Alice',
      }))
    }

    const chunks = chunkMessages(msgs, '100', 'Chat')
    expect(chunks.length).toBeGreaterThan(1)

    for (const chunk of chunks) {
      expect(chunk.messageCount).toBeLessThanOrEqual(20)
    }
  })

  it('sorts messages by date regardless of input order', () => {
    const msgs = [
      makeMessage({ id: 3, text: 'Third', date: 1000200, senderName: 'Alice' }),
      makeMessage({ id: 1, text: 'First', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'Second', date: 1000100, senderName: 'Alice' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Alice')

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.messageIds).toEqual([1, 2, 3])
    expect(chunks[0]?.text).toBe('Alice: First\nAlice: Second\nAlice: Third')
  })

  it('filters out empty messages but keeps non-empty ones', () => {
    const msgs = [
      makeMessage({ id: 1, text: '', date: 1000000 }),
      makeMessage({ id: 2, text: 'Real message', date: 1000060 }),
      makeMessage({ id: 3, text: '   ', date: 1000120 }),
      makeMessage({ id: 4, text: 'Another one', date: 1000180 }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.messageIds).toEqual([2, 4])
    expect(chunks[0]?.messageCount).toBe(2)
  })

  it('correctly identifies outgoing-only chunks', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'I said', date: 1000000, out: true, senderName: 'Operator' }),
      makeMessage({ id: 2, text: 'I also said', date: 1000060, out: true, senderName: 'Operator' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')
    expect(chunks[0]?.isOutgoingOnly).toBe(true)
  })

  it('marks chunk as not outgoing-only when mixed', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'I said', date: 1000000, out: true, senderName: 'Operator' }),
      makeMessage({ id: 2, text: 'They said', date: 1000060, out: false, senderName: 'Client' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')
    expect(chunks[0]?.isOutgoingOnly).toBe(false)
  })

  it('collects unique sender names', () => {
    const msgs = [
      makeMessage({ id: 1, text: 'A', date: 1000000, senderName: 'Alice' }),
      makeMessage({ id: 2, text: 'B', date: 1000060, senderName: 'Bob' }),
      makeMessage({ id: 3, text: 'C', date: 1000120, senderName: 'Alice' }),
      makeMessage({ id: 4, text: 'D', date: 1000180, senderName: 'Charlie' }),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')
    const names = chunks[0]?.senderNames ?? []

    expect(names).toHaveLength(3)
    expect(names).toContain('Alice')
    expect(names).toContain('Bob')
    expect(names).toContain('Charlie')
  })

  it('handles single message', () => {
    const msgs = [makeMessage({ id: 1, text: 'Solo', date: 1000000 })]

    const chunks = chunkMessages(msgs, '100', 'Chat')

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.messageCount).toBe(1)
    expect(chunks[0]?.startDate).toBe(1000000)
    expect(chunks[0]?.endDate).toBe(1000000)
  })

  it('creates multiple splits with mixed gap and size triggers', () => {
    const twoHours = 2 * 60 * 60
    const msgs = [
      // Group 1: 2 messages
      ...makeConversation(2, 60),
      // Gap > 2h
      makeMessage({ id: 100, text: 'After gap', date: 1000000 + twoHours + 3600, senderName: 'Alice' }),
      // Group 2: 21 more messages (will split at 20)
      ...Array.from({ length: 21 }, (_, i) => makeMessage({
        id: 101 + i,
        text: `Msg ${i}`,
        date: 1000000 + twoHours + 3660 + i * 60,
        senderName: i % 2 === 0 ? 'Alice' : 'Bob',
      })),
    ]

    const chunks = chunkMessages(msgs, '100', 'Chat')

    // Group 1 (2 msgs) + Group 2 split at 20 (20 msgs) + remainder (2+ msgs)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
  })
})
