-- ==============================================================================
-- 1분 주기 알림 발송 크론 등록 SQL
-- Edge Function 'send-reminders'를 배포한 후 SQL Editor에서 실행하세요.
-- ==============================================================================

SELECT cron.unschedule('send-reminders-job') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-reminders-job');

SELECT cron.schedule(
  'send-reminders-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ofzydptsulmvvonvmeaf.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9menlkcHRzdWxtdnZvbnZtZWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTMxNDQsImV4cCI6MjEwNzQyOTE0NH0.487Cie9OdNSImtEbmHkN_tNraO4ieDY-k2AA7WH1Pj4'
    ),
    body := '{}'::jsonb
  );
  $$
);
