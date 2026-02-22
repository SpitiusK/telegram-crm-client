import { IpcMain } from 'electron'

const WEBHOOK_URL = process.env.BITRIX24_WEBHOOK_URL ?? ''

async function bitrixCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const url = `${WEBHOOK_URL}/${method}.json`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = (await response.json()) as { result: unknown }
  return data.result
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
