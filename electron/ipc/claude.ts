import { IpcMain } from 'electron'
import Anthropic from '@anthropic-ai/sdk'

let anthropic: Anthropic | null = null

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    })
  }
  return anthropic
}

interface MessageHistory {
  text: string
  out: boolean
  senderName: string
}

interface DealInfo {
  TITLE?: string
  STAGE_ID?: string
  OPPORTUNITY?: string
  COMMENTS?: string
}

export function setupClaudeIPC(ipcMain: IpcMain): void {
  ipcMain.handle(
    'claude:generateMessage',
    async (_event, context: string, history: MessageHistory[], dealInfo?: DealInfo) => {
      const client = getClient()

      const chatHistory = history
        .slice(-20)
        .map((m) => `${m.out ? 'Operator' : m.senderName}: ${m.text}`)
        .join('\n')

      const dealContext = dealInfo
        ? `\nDeal: ${dealInfo.TITLE ?? 'N/A'}, Stage: ${dealInfo.STAGE_ID ?? 'N/A'}, Amount: ${dealInfo.OPPORTUNITY ?? 'N/A'}\nNotes: ${dealInfo.COMMENTS ?? 'none'}`
        : ''

      const systemPrompt = `You are an AI assistant helping a CRM operator compose Telegram messages to clients.
Context: ${context}${dealContext}

Generate 3 message suggestions with different tones.
Respond in JSON format: [{"text": "...", "tone": "professional|friendly|urgent", "confidence": 0.0-1.0}]`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Chat history:\n${chatHistory}\n\nSuggest 3 reply messages.`,
          },
        ],
        system: systemPrompt,
      })

      const firstBlock = response.content[0]
      const text = firstBlock !== undefined && firstBlock.type === 'text' ? firstBlock.text : ''
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [{ text, tone: 'professional', confidence: 0.5 }]
      } catch {
        return [{ text, tone: 'professional', confidence: 0.5 }]
      }
    }
  )
}
