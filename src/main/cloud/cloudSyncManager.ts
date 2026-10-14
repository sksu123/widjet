import crypto from 'crypto'
import QRCode from 'qrcode'
import { getDb } from '../db/database'
import {
  pushSnapshotToCloud,
  revokeKeyFromCloud,
  SnapshotPayload,
  ReminderItem
} from './supabaseClient'

let syncTimeout: NodeJS.Timeout | null = null
let lastSyncTime: string | null = null
let lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error' = 'idle'
let lastSyncError: string | null = null

// 기본 모바일 호스팅 주소 (GitHub Pages)
export const DEFAULT_HOSTING_URL = 'https://sksu123.github.io/widjet/'

// KST 오늘 날짜 (YYYY-MM-DD)
function getKstDateString(offsetDays = 0): string {
  const d = new Date()
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

// 특정 YYYY-MM-DD의 한국 시간 오전 8:00 (KST)를 UTC ISO 문자열로 변환
function getKst8AmUtcIso(dateStr: string): string {
  // YYYY-MM-DD 08:00:00+09:00
  return new Date(`${dateStr}T08:00:00+09:00`).toISOString()
}

/**
 * 보안 키 가져오기 (없으면 null)
 */
export function getCloudSyncKey(): string | null {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'cloud_sync_key'").get() as
      | { value: string }
      | undefined
    if (row && row.value && row.value.trim().length >= 16) {
      return row.value.trim()
    }
    return null
  } catch (err) {
    return null
  }
}

/**
 * 모바일 호스팅 주소 가져오기
 */
export function getCloudHostingUrl(): string {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'cloud_hosting_url'").get() as
      | { value: string }
      | undefined
    if (row && row.value && row.value.trim()) {
      return row.value.trim()
    }
  } catch (e) {}
  return DEFAULT_HOSTING_URL
}

/**
 * 모바일 호스팅 주소 저장
 */
export function setCloudHostingUrl(url: string): void {
  try {
    const db = getDb()
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('cloud_hosting_url', ?, CURRENT_TIMESTAMP)"
    ).run(url.trim())
  } catch (e) {
    console.error('Failed to save cloud_hosting_url', e)
  }
}

/**
 * 새 클라우드 키 발급
 */
export function initOrCreateCloudKey(): string {
  let key = getCloudSyncKey()
  if (!key) {
    key = crypto.randomBytes(24).toString('hex') // 48자리 무작위 16진수 문자열
    const db = getDb()
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('cloud_sync_key', ?, CURRENT_TIMESTAMP)"
    ).run(key)
  }
  return key
}

/**
 * 연동 해제 (원격 데이터 삭제 + 로컬 키 제거)
 */
export async function disableCloudSync(): Promise<boolean> {
  const key = getCloudSyncKey()
  if (key) {
    try {
      await revokeKeyFromCloud(key)
    } catch (e) {
      console.warn('Failed to revoke remote key on Supabase:', e)
    }
  }

  const db = getDb()
  db.prepare("DELETE FROM settings WHERE key = 'cloud_sync_key'").run()
  lastSyncStatus = 'idle'
  lastSyncTime = null
  lastSyncError = null
  return true
}

/**
 * 동기화할 스냅샷 및 알림 목록 계산
 */
export function buildSnapshotAndReminders(): {
  payload: SnapshotPayload
  reminders: ReminderItem[]
} {
  const db = getDb()
  const today = getKstDateString()
  const nowUtc = new Date().toISOString()

  // 1) 오늘(당일) 진행 중인 schedules 조회 (PC 대시보드와 동일하게 start_date = today)
  let schedules: any[] = []
  try {
    schedules = db
      .prepare(
        `SELECT id, title, description, start_date, end_date, category, color, is_all_day, is_completed, is_dday
         FROM schedules
         WHERE start_date = ?
         ORDER BY is_completed ASC, start_date ASC, id ASC`
      )
      .all(today)
  } catch (e) {
    console.error('Error querying schedules for snapshot:', e)
  }

  // 2) D-DAY 목록 (settings.custom_ddays) - 오늘 및 미래 일정만 (daysLeft >= 0)
  let ddays: any[] = []
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as
      | { value: string }
      | undefined
    if (row && row.value) {
      const rawDdays = JSON.parse(row.value)
      const nowDate = new Date()
      nowDate.setHours(0, 0, 0, 0)
      ddays = rawDdays
        .map((d: any) => {
          const target = new Date(d.targetDate)
          target.setHours(0, 0, 0, 0)
          const diffTime = target.getTime() - nowDate.getTime()
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return {
            id: d.id,
            title: d.title,
            targetDate: d.targetDate,
            scheduleId: d.scheduleId,
            daysLeft
          }
        })
        .filter((d: any) => d.daysLeft >= 0)
        .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    }
  } catch (e) {
    console.error('Error parsing custom_ddays for snapshot:', e)
  }

  // 3) 오늘(당일) 행정달력 일정 (admin_schedules)
  let adminSchedules: any[] = []
  try {
    adminSchedules = db
      .prepare(
        `SELECT id, title, category, date, end_date, is_deadline
         FROM admin_schedules
         WHERE date = ?
         ORDER BY is_deadline DESC, id ASC`
      )
      .all(today)
  } catch (e) {
    // 테이블 없을 시 안전 무시
  }

  // 4) 알림 계산 (Reminders)
  const reminders: ReminderItem[] = []

  // (1) D-DAY 알림: D-3일 오전 8시, 당일 오전 8시
  for (const d of ddays) {
    if (!d.targetDate) continue

    // 당일 오전 8시 KST
    const dayIso = getKst8AmUtcIso(d.targetDate)
    if (dayIso > nowUtc) {
      reminders.push({
        notify_at: dayIso,
        title: `🚩 오늘이 D-DAY입니다! [${d.title}]`,
        body: `오늘 마감/행사: ${d.title} (목표일: ${d.targetDate})`
      })
    }

    // D-3일 오전 8시 KST
    const d3Target = new Date(`${d.targetDate}T00:00:00+09:00`)
    d3Target.setDate(d3Target.getDate() - 3)
    const d3DateStr = new Date(d3Target.getTime() - d3Target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10)
    const d3Iso = getKst8AmUtcIso(d3DateStr)
    if (d3Iso > nowUtc) {
      reminders.push({
        notify_at: d3Iso,
        title: `⏳ D-3 알림: [${d.title}]`,
        body: `${d.title} D-DAY가 3일 남았습니다. 준비 상황을 확인하세요.`
      })
    }
  }

  // (2) 오늘의 할일/일정 아침 요약 알림: 오늘부터 향후 7일간 각각 08:00 KST
  for (let offset = 0; offset <= 7; offset++) {
    const curDateStr = getKstDateString(offset)
    const curNotifyIso = getKst8AmUtcIso(curDateStr)
    if (curNotifyIso <= nowUtc) continue

    let dayItems: any[] = []
    if (offset === 0) {
      dayItems = schedules.filter((s) => s.is_completed !== 1)
    } else {
      try {
        dayItems = db
          .prepare(
            'SELECT title FROM schedules WHERE start_date = ? AND (is_completed IS NULL OR is_completed = 0)'
          )
          .all(curDateStr)
      } catch (e) {}
    }

    if (dayItems.length > 0) {
      const summaryTitles = dayItems.map((s) => s.title).slice(0, 3).join(', ')
      const moreCount = dayItems.length > 3 ? ` 외 ${dayItems.length - 3}건` : ''
      reminders.push({
        notify_at: curNotifyIso,
        title: `☀️ 오늘 일정/할일 (${dayItems.length}건)`,
        body: `${summaryTitles}${moreCount}`
      })
    }
  }

  // (3) 행정달력 마감일 알림: 향후 7일간 마감 당일 오전 8시 KST
  try {
    const futureDeadlines = db
      .prepare(
        `SELECT title, category, date FROM admin_schedules 
         WHERE is_deadline = 1 AND date >= ? AND date <= ?`
      )
      .all(today, getKstDateString(7)) as any[]

    for (const a of futureDeadlines) {
      if (!a.date) continue
      const notifyIso = getKst8AmUtcIso(a.date)
      if (notifyIso > nowUtc) {
        reminders.push({
          notify_at: notifyIso,
          title: `📋 [행정마감일] ${a.title}`,
          body: `오늘 마감 예정 업무: [${a.category || '행정'}] ${a.title}`
        })
      }
    }
  } catch (e) {}

  return {
    payload: {
      today,
      schedules,
      ddays,
      adminSchedules
    },
    reminders
  }
}

/**
 * 즉시 동기화 실행
 */
export async function syncCloudNow(): Promise<{ success: boolean; error?: string }> {
  const key = getCloudSyncKey()
  if (!key) {
    return { success: false, error: '클라우드 연동이 설정되지 않았습니다.' }
  }

  lastSyncStatus = 'syncing'
  try {
    const { payload, reminders } = buildSnapshotAndReminders()
    await pushSnapshotToCloud(key, payload, reminders)

    lastSyncTime = new Date().toISOString()
    lastSyncStatus = 'success'
    lastSyncError = null
    console.log('✅ Cloud sync success at', lastSyncTime)
    return { success: true }
  } catch (err: any) {
    lastSyncStatus = 'error'
    lastSyncError = err.message || String(err)
    console.error('❌ Cloud sync error:', lastSyncError)
    return { success: false, error: lastSyncError }
  }
}

/**
 * 2초 디바운스 동기화 트리거
 */
export function triggerCloudSync(): void {
  const key = getCloudSyncKey()
  if (!key) return

  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }

  syncTimeout = setTimeout(() => {
    syncCloudNow().catch(() => {})
  }, 2000)
}

/**
 * 클라우드 동기화 상태 및 접속 QR 정보 반환
 */
export async function getCloudSyncStatus(): Promise<{
  enabled: boolean
  key: string | null
  hostingUrl: string
  mobileAccessUrl: string | null
  qrCode: string | null
  lastSyncTime: string | null
  lastSyncStatus: string
  lastSyncError: string | null
}> {
  const key = getCloudSyncKey()
  const enabled = key !== null
  const hostingUrl = getCloudHostingUrl()

  let mobileAccessUrl: string | null = null
  let qrCode: string | null = null

  if (enabled && key) {
    // URL Fragment(#key=...) 형태로 키 전달 (서버 로그에 남지 않고 클라이언트만 읽음)
    const base = hostingUrl.endsWith('/') ? hostingUrl : `${hostingUrl}/`
    mobileAccessUrl = `${base}#key=${encodeURIComponent(key)}`

    try {
      qrCode = await QRCode.toDataURL(mobileAccessUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
    } catch (err) {
      console.error('Failed to generate cloud QR code:', err)
    }
  }

  return {
    enabled,
    key,
    hostingUrl,
    mobileAccessUrl,
    qrCode,
    lastSyncTime,
    lastSyncStatus,
    lastSyncError
  }
}
