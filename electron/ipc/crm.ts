import { IpcMain } from 'electron'

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL ?? ''

async function bitrixCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  if (!WEBHOOK_URL) {
    throw new Error('BITRIX24_WEBHOOK_URL is not configured')
  }

  const url = `${WEBHOOK_URL}/${method}.json`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error'
    throw new Error(`Bitrix24 network error: ${message}`, { cause: err })
  }

  if (!response.ok) {
    throw new Error(`Bitrix24 HTTP ${response.status}: ${response.statusText}`)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error('Bitrix24 returned invalid JSON')
  }

  const result = data as { result?: unknown; error?: string; error_description?: string }

  if (result.error) {
    throw new Error(`Bitrix24 API error: ${result.error} — ${result.error_description ?? 'no details'}`)
  }

  return result.result
}

export function setupCrmIPC(ipcMain: IpcMain): void {
  ipcMain.handle('crm:getDeal', async (_event, id: string) => {
    return bitrixCall('crm.deal.get', { id })
  })

  ipcMain.handle('crm:getDeals', async (_event, filter?: Record<string, string>) => {
    return bitrixCall('crm.deal.list', {
      filter: filter ?? {},
      select: ['ID', 'TITLE', 'STAGE_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'CONTACT_ID', 'COMPANY_ID', 'ASSIGNED_BY_ID', 'DATE_CREATE', 'DATE_MODIFY', 'COMMENTS'],
    })
  })

  ipcMain.handle('crm:getContact', async (_event, id: string) => {
    return bitrixCall('crm.contact.get', { id })
  })

  ipcMain.handle('crm:updateDeal', async (_event, id: string, fields: Record<string, string>) => {
    return bitrixCall('crm.deal.update', { id, fields })
  })

  ipcMain.handle('crm:findDealByPhone', async (_event, phone: string) => {
    const contacts = (await bitrixCall('crm.contact.list', {
      filter: { PHONE: phone },
      select: ['ID'],
    })) as Array<{ ID: string }> | null

    if (!contacts || contacts.length === 0) return null

    const firstContact = contacts[0]
    if (!firstContact) return null

    const deals = (await bitrixCall('crm.deal.list', {
      filter: { CONTACT_ID: firstContact.ID },
      select: ['ID', 'TITLE', 'STAGE_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'CONTACT_ID', 'DATE_CREATE'],
    })) as Array<Record<string, string>> | null

    return deals && deals.length > 0 ? deals[0] : null
  })
}
