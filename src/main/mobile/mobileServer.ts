import http, { IncomingMessage, ServerResponse } from 'http'
import os from 'os'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { app, BrowserWindow } from 'electron'
import QRCode from 'qrcode'
import { getDb } from '../db/database'
import { getMobileHtml, getManifestJson, getServiceWorkerJs } from './mobileHtml'
import { triggerCloudSync } from '../cloud/cloudSyncManager'

let server: http.Server | null = null
let currentPort = 49200
let primaryIp = '127.0.0.1'
let activeToken = ''
let sseClients: Set<ServerResponse> = new Set()
let getMainWindowFn: (() => BrowserWindow | null) | null = null

// 모든 비내부 IPv4 주소 목록 추출
export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces()
  const addresses: string[] = []

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name]
    if (!netList) continue
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        // 169.254.x.x (APIPA) 제외
        if (!net.address.startsWith('169.254.')) {
          addresses.push(net.address)
        }
      }
    }
  }

  // 192.168.x.x 또는 10.x.x.x 대역을 최우선으로 정렬
  addresses.sort((a, b) => {
    const isAPref = a.startsWith('192.168.') || a.startsWith('10.')
    const isBPref = b.startsWith('192.168.') || b.startsWith('10.')
    if (isAPref && !isBPref) return -1
    if (!isAPref && isBPref) return 1
    return 0
  })

  return addresses.length > 0 ? addresses : ['127.0.0.1']
}

// 토큰 가져오기 또는 새로 생성
function getOrInitToken(): string {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'mobile_sync_token'").get() as { value: string } | undefined
    if (row && row.value && row.value.trim().length >= 6) {
      return row.value.trim()
    }
    // 새 토큰 생성 (8자리 영숫자)
    const newToken = crypto.randomBytes(4).toString('hex')
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('mobile_sync_token', ?, CURRENT_TIMESTAMP)").run(newToken)
    return newToken
  } catch (err) {
    return crypto.randomBytes(4).toString('hex')
  }
}

// 토큰 재발급
export function regenerateMobileToken(): string {
  const newToken = crypto.randomBytes(4).toString('hex')
  activeToken = newToken
  try {
    const db = getDb()
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('mobile_sync_token', ?, CURRENT_TIMESTAMP)").run(newToken)
  } catch (err) {
    console.error('Failed to save regenerated token:', err)
  }
  return newToken
}

// 오늘 날짜 반환 (YYYY-MM-DD, KST 기준)
function getTodayString(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// 요청 바디 JSON 파싱 헬퍼
function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 1e6) { // 1MB 제한
        req.destroy()
        reject(new Error('Request entity too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

// 토큰 검증
function isAuthorized(req: IncomingMessage, urlObj: URL): boolean {
  const tokenParam = urlObj.searchParams.get('token')
  if (tokenParam === activeToken) return true

  const authHeader = req.headers['authorization']
  if (authHeader) {
    const parts = authHeader.split(' ')
    if (parts.length === 2 && parts[1] === activeToken) return true
  }

  return false
}

// 변경 사항 브로드캐스트 (SSE 및 PC 메인 윈도우)
export function broadcastMobileUpdate(): void {
  triggerCloudSync()
  // 1. SSE 클라이언트들에게 알림
  const deadClients: ServerResponse[] = []
  for (const client of sseClients) {
    try {
      client.write('data: change\n\n')
    } catch (e) {
      deadClients.push(client)
    }
  }
  for (const dead of deadClients) {
    sseClients.delete(dead)
  }

  // 2. PC 렌더러 창에 실시간 변경 알림 전송
  try {
    const win = getMainWindowFn ? getMainWindowFn() : null
    if (win && !win.isDestroyed()) {
      win.webContents.send('mobile:data-changed')
    }
  } catch (e) {
    console.error('Failed to notify PC renderer:', e)
  }
}

// 요청 처리 핸들러
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS 및 캐시 제어 기본 헤더
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const hostHeader = req.headers.host || `localhost:${currentPort}`
  const parsedUrl = new URL(req.url || '/', `http://${hostHeader}`)
  const pathname = parsedUrl.pathname

  const appVersion = (app && typeof app.getVersion === 'function' ? app.getVersion() : null) || 'v2.0.57'
  const baseDir = (app && typeof app.getAppPath === 'function' ? app.getAppPath() : process.cwd())

  // 1. 정적 PWA 리소스
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(getMobileHtml('교행 보드', appVersion))
    return
  }

  if (pathname === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' })
    res.end(getManifestJson())
    return
  }

  if (pathname === '/sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
    res.end(getServiceWorkerJs())
    return
  }

  if (pathname === '/icon.png') {
    const iconPath = path.join(baseDir, 'resources', 'icon.png')
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(fs.readFileSync(iconPath))
      return
    }
    res.writeHead(404)
    res.end()
    return
  }

  // 2. 인증 필요 없는 상태 확인
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      running: true,
      port: currentPort,
      ip: primaryIp,
      version: appVersion
    }))
    return
  }

  // 3. API 엔드포인트 보안 검증
  if (pathname.startsWith('/api/')) {
    if (!isAuthorized(req, parsedUrl)) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }))
      return
    }

    const db = getDb()
    const today = getTodayString()

    // SSE 엔드포인트
    if (pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })
      res.write('data: connected\n\n')
      sseClients.add(res)

      req.on('close', () => {
        sseClients.delete(res)
      })
      return
    }

    // 전체 데이터 조회 (오늘 일정, D-DAY, 행정실 오늘 일정)
    if (pathname === '/api/data' && req.method === 'GET') {
      try {
        // 1) 오늘 일정/할일
        const schedules = db.prepare('SELECT * FROM schedules WHERE start_date = ? ORDER BY id ASC').all(today)

        // 2) D-DAY 목록 (settings.custom_ddays)
        let ddays: any[] = []
        const ddayRow = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as { value: string } | undefined
        if (ddayRow && ddayRow.value) {
          try {
            const rawDdays = JSON.parse(ddayRow.value)
            const nowDate = new Date()
            nowDate.setHours(0, 0, 0, 0)
            ddays = rawDdays.map((d: any) => {
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
          } catch (e) {
            console.error('Failed to parse custom_ddays', e)
          }
        }

        // 3) 행정실 오늘 일정 (admin_schedules)
        let adminSchedules: any[] = []
        try {
          adminSchedules = db.prepare(`
            SELECT id, title, category, date, end_date, is_deadline
            FROM admin_schedules
            WHERE date = ? OR (end_date IS NOT NULL AND date <= ? AND end_date >= ?)
            ORDER BY is_deadline DESC, id ASC
          `).all(today, today, today)
        } catch (e) {
          // 행정달력 테이블이 없을 수도 있으므로 안전하게 무시
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          today,
          schedules,
          ddays,
          adminSchedules
        }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }

    // 새 일정/할일 추가
    if (pathname === '/api/schedules' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req)
        const title = (body.title || '').trim()
        if (!title) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Title is required' }))
          return
        }

        const startDate = body.start_date || today
        const category = body.category || 'general'
        const color = body.color || '#3b82f6'

        const stmt = db.prepare(`
          INSERT INTO schedules (title, description, start_date, category, color, is_all_day, reminder_minutes, is_completed, is_dday)
          VALUES (?, '', ?, ?, ?, 1, 30, 0, 0)
        `)
        const result = stmt.run(title, startDate, category, color)

        broadcastMobileUpdate()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, id: result.lastInsertRowid }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }

    // 일정 완료 상태 토글 (PATCH /api/schedules/:id/toggle)
    const toggleMatch = pathname.match(/^\/api\/schedules\/(\d+)\/toggle$/)
    if (toggleMatch && req.method === 'PATCH') {
      try {
        const id = Number(toggleMatch[1])
        const body = await readRequestBody(req)
        const isCompleted = body.is_completed === 1 ? 1 : 0

        db.prepare('UPDATE schedules SET is_completed = ? WHERE id = ?').run(isCompleted, id)

        broadcastMobileUpdate()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }

    // 일정 삭제 (DELETE /api/schedules/:id)
    const scheduleMatch = pathname.match(/^\/api\/schedules\/(\d+)$/)
    if (scheduleMatch && req.method === 'DELETE') {
      try {
        const id = Number(scheduleMatch[1])
        db.prepare('DELETE FROM schedules WHERE id = ?').run(id)

        // 만약 D-DAY와 연동된 일정이면 custom_ddays에서도 정리
        try {
          const ddayRow = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as { value: string } | undefined
          if (ddayRow && ddayRow.value) {
            const rawDdays = JSON.parse(ddayRow.value)
            const filtered = rawDdays.filter((d: any) => d.scheduleId !== id)
            if (filtered.length !== rawDdays.length) {
              db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('custom_ddays', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(filtered))
            }
          }
        } catch (e) {}

        broadcastMobileUpdate()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }

    // 새 D-DAY 추가 (POST /api/ddays)
    if (pathname === '/api/ddays' && req.method === 'POST') {
      try {
        const body = await readRequestBody(req)
        const title = (body.title || '').trim()
        const targetDate = (body.targetDate || '').trim()

        if (!title || !targetDate) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Title and targetDate are required' }))
          return
        }

        // 1) schedules 테이블에 [D-DAY] 일정 추가
        let scheduleId: number | undefined
        try {
          const schRes = db.prepare(`
            INSERT INTO schedules (title, description, start_date, category, color, is_all_day, reminder_minutes, is_completed, is_dday)
            VALUES (?, '', ?, 'event', '#7c3aed', 1, 30, 0, 1)
          `).run(`[D-DAY] ${title}`, targetDate)
          scheduleId = schRes.lastInsertRowid as number
        } catch (e) {
          console.error('Failed to insert D-DAY schedule', e)
        }

        // 2) custom_ddays 목록 갱신
        let ddayList: any[] = []
        const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as { value: string } | undefined
        if (row && row.value) {
          try {
            ddayList = JSON.parse(row.value)
          } catch (e) {}
        }

        const newDday = {
          id: Date.now().toString(),
          title,
          targetDate,
          scheduleId
        }
        ddayList.push(newDday)

        db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('custom_ddays', ?, CURRENT_TIMESTAMP)")
          .run(JSON.stringify(ddayList))

        broadcastMobileUpdate()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, dday: newDday }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }

    // D-DAY 삭제 (DELETE /api/ddays/:id)
    const ddayMatch = pathname.match(/^\/api\/ddays\/([a-zA-Z0-9_-]+)$/)
    if (ddayMatch && req.method === 'DELETE') {
      try {
        const id = ddayMatch[1]
        let ddayList: any[] = []
        const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as { value: string } | undefined
        if (row && row.value) {
          try {
            ddayList = JSON.parse(row.value)
          } catch (e) {}
        }

        const target = ddayList.find((d: any) => d.id === id)
        if (target && target.scheduleId) {
          try {
            db.prepare('DELETE FROM schedules WHERE id = ?').run(target.scheduleId)
          } catch (e) {}
        }

        const filtered = ddayList.filter((d: any) => d.id !== id)
        db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('custom_ddays', ?, CURRENT_TIMESTAMP)")
          .run(JSON.stringify(filtered))

        broadcastMobileUpdate()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
        return
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        return
      }
    }
  }

  // 매칭되지 않는 엔드포인트
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
}

// 서버 시작 함수
export async function startMobileServer(getMainWindow: () => BrowserWindow | null): Promise<boolean> {
  getMainWindowFn = getMainWindow
  if (server) return true

  activeToken = getOrInitToken()
  const ipList = getLocalIpAddresses()
  primaryIp = ipList[0] || '127.0.0.1'

  const tryListen = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const s = http.createServer(handleRequest)

      s.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} is in use, trying next port...`)
          resolve(false)
        } else {
          console.error('Server error:', err)
          resolve(false)
        }
      })

      s.listen(port, '0.0.0.0', () => {
        server = s
        currentPort = port
        console.log(`🚀 Mobile sync server started at http://${primaryIp}:${currentPort} (token: ${activeToken})`)
        resolve(true)
      })
    })
  }

  // 49200 ~ 49210 포트 순차 시도
  for (let p = 49200; p <= 49210; p++) {
    const success = await tryListen(p)
    if (success) return true
  }

  console.error('Failed to bind mobile server to any port between 49200 and 49210')
  return false
}

// 서버 중지
export function stopMobileServer(): void {
  if (server) {
    for (const client of sseClients) {
      try { client.end() } catch (e) {}
    }
    sseClients.clear()
    server.close()
    server = null
    console.log('Mobile sync server stopped')
  }
}

// 상태 및 QR 코드 조회
export async function getMobileServerStatus(): Promise<{
  running: boolean
  port: number
  ip: string
  allIps: string[]
  token: string
  url: string
  qrCode: string
  connectedClients: number
}> {
  const running = server !== null
  const allIps = getLocalIpAddresses()
  primaryIp = allIps[0] || '127.0.0.1'

  const url = `http://${primaryIp}:${currentPort}/?token=${activeToken}`
  let qrCode = ''
  try {
    qrCode = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Failed to generate QR code:', err)
  }

  return {
    running,
    port: currentPort,
    ip: primaryIp,
    allIps,
    token: activeToken,
    url,
    qrCode,
    connectedClients: sseClients.size
  }
}
