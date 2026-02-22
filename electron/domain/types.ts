// Domain types mirrored for main process usage

export interface AccountRow {
  id: number
  phone: string
  name: string
  session_string: string
  is_active: number
  created_at: string
}

export interface ChatRow {
  id: number
  account_id: number
  telegram_chat_id: string
  title: string
  type: string
  unread_count: number
  last_message_at: string | null
  pinned: number
}

export interface MessageRow {
  id: number
  chat_id: number
  telegram_msg_id: number
  sender_id: string
  sender_name: string
  text: string
  date: number
  is_outgoing: number
  reply_to_msg_id: number | null
  media_type: string | null
}

export interface ContactRow {
  id: number
  telegram_user_id: string
  first_name: string
  last_name: string
  username: string | null
  phone: string | null
  bitrix_contact_id: string | null
}

export interface DealRow {
  id: number
  bitrix_deal_id: string
  title: string
  stage_id: string
  stage_name: string
  amount: number
  contact_id: number | null
  assigned_user: string
  created_at: string
  updated_at: string
}

export interface DealStageHistoryRow {
  id: number
  deal_id: number
  from_stage: string
  to_stage: string
  changed_at: string
  changed_by: string
}

export interface ActivityLogRow {
  id: number
  account_id: number
  action_type: string
  entity_type: string
  entity_id: string
  details_json: string
  created_at: string
}

export interface SettingRow {
  key: string
  value: string
  updated_at: string
}

export interface CachedMessageRow {
  id: number
  chat_id: string
  text: string
  date: number
  out: number
  sender_name: string
  sender_id: string
  reply_to_id: number | null
}

export interface SessionStateRow {
  key: string
  value: string
  updated_at: number
}
