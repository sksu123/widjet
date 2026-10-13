import axios from 'axios'

// Supabase 기본 접속 설정
export const SUPABASE_URL = 'https://ofzydptsulmvvonvmeaf.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9menlkcHRzdWxtdnZvbnZtZWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTMxNDQsImV4cCI6MjEwNzQyOTE0NH0.487Cie9OdNSImtEbmHkN_tNraO4ieDY-k2AA7WH1Pj4'
export const VAPID_PUBLIC_KEY =
  'BPKuWEYcwgaiSQXDIJEFlUzA7av51GgsOfznUHKPVPkPAfnc5uL81sJYeKCM1f6imT1lX0jWorun9vd88V-Tsho'

const apiClient = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  timeout: 10000,
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
})

export interface SnapshotPayload {
  today: string
  schedules: any[]
  ddays: any[]
  adminSchedules: any[]
}

export interface ReminderItem {
  notify_at: string // ISO 8601 UTC
  title: string
  body: string
}

/**
 * Supabase RPC: push_snapshot
 */
export async function pushSnapshotToCloud(
  key: string,
  payload: SnapshotPayload,
  reminders: ReminderItem[]
): Promise<boolean> {
  try {
    const res = await apiClient.post('/rpc/push_snapshot', {
      p_key: key,
      p_payload: payload,
      p_reminders: reminders
    })
    return res.data === true
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message
    console.error('Supabase push_snapshot error:', msg)
    throw new Error(msg)
  }
}

/**
 * Supabase RPC: get_snapshot
 */
export async function getSnapshotFromCloud(
  key: string
): Promise<{ payload: SnapshotPayload; updated_at: string } | null> {
  try {
    const res = await apiClient.post('/rpc/get_snapshot', {
      p_key: key
    })
    return res.data
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message
    console.error('Supabase get_snapshot error:', msg)
    throw new Error(msg)
  }
}

/**
 * Supabase RPC: revoke_key (연동 해제 및 데이터 영구 삭제)
 */
export async function revokeKeyFromCloud(key: string): Promise<boolean> {
  try {
    const res = await apiClient.post('/rpc/revoke_key', {
      p_key: key
    })
    return res.data === true
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message
    console.error('Supabase revoke_key error:', msg)
    throw new Error(msg)
  }
}
