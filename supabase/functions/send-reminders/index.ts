// Supabase Edge Function: send-reminders
// 매 1분마다 pg_cron에 의해 호출되어 notify_at <= now()인 알림을 찾아 웹푸시 발송
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@school-widget.local'

    if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 발송 대기 중인 알림 조회 (최대 50건)
    const { data: pendingReminders, error: remError } = await supabase
      .from('reminders')
      .select('id, key_hash, title, body, notify_at')
      .is('sent_at', null)
      .lte('notify_at', new Date().toISOString())
      .order('notify_at', { ascending: true })
      .limit(50)

    if (remError) {
      console.error('Error fetching reminders:', remError)
      return new Response(JSON.stringify({ error: remError.message }), { status: 500 })
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send', sentCount: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let sentCount = 0
    const processedReminderIds: number[] = []

    for (const reminder of pendingReminders) {
      // 해당 키 해시에 연결된 웹푸시 구독자 목록 조회
      const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('key_hash', reminder.key_hash)

      if (subError || !subs || subs.length === 0) {
        // 구독자가 없더라도 알림은 처리 완료로 마킹
        processedReminderIds.push(reminder.id)
        continue
      }

      const payloadString = JSON.stringify({
        title: reminder.title,
        body: reminder.body,
        icon: '/icon.png',
        badge: '/icon.png',
        url: './'
      })

      const sendPromises = subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, payloadString)
          sentCount++
        } catch (pushErr: any) {
          // 구독 만료 (404 Not Found 또는 410 Gone) 시 DB에서 정리
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            console.log(`Removing expired subscription: ${sub.id}`)
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error(`Push send error for sub ${sub.id}:`, pushErr.message)
          }
        }
      })

      await Promise.all(sendPromises)
      processedReminderIds.push(reminder.id)
    }

    // 발송 완료된 알림들의 sent_at 업데이트
    if (processedReminderIds.length > 0) {
      await supabase
        .from('reminders')
        .update({ sent_at: new Date().toISOString() })
        .in('id', processedReminderIds)
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersProcessed: processedReminderIds.length,
        pushesSent: sentCount
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Unhandled Edge Function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
