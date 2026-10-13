-- ==============================================================================
-- 교행보드 (School Admin Widget) Supabase 클라우드 동기화 스키마
-- ==============================================================================

-- 1. 필수 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 스냅샷 테이블 (PC별 최신 일정/D-DAY 1행 저장)
CREATE TABLE IF NOT EXISTS public.sync_snapshots (
  key_hash TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 알림 예약 테이블
CREATE TABLE IF NOT EXISTS public.reminders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash TEXT NOT NULL,
  notify_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending 
  ON public.reminders (notify_at) 
  WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_key_hash 
  ON public.reminders (key_hash);

-- 4. 웹푸시 구독 정보 테이블
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_key_hash 
  ON public.push_subscriptions (key_hash);

-- 5. RLS (Row Level Security) 설정: 직접 접근 전면 차단
ALTER TABLE public.sync_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 초기화
DROP POLICY IF EXISTS "Deny direct snapshot select" ON public.sync_snapshots;
DROP POLICY IF EXISTS "Deny direct snapshot insert" ON public.sync_snapshots;
DROP POLICY IF EXISTS "Deny direct snapshot update" ON public.sync_snapshots;
DROP POLICY IF EXISTS "Deny direct snapshot delete" ON public.sync_snapshots;

DROP POLICY IF EXISTS "Deny direct reminders select" ON public.reminders;
DROP POLICY IF EXISTS "Deny direct reminders insert" ON public.reminders;
DROP POLICY IF EXISTS "Deny direct reminders update" ON public.reminders;
DROP POLICY IF EXISTS "Deny direct reminders delete" ON public.reminders;

DROP POLICY IF EXISTS "Deny direct push select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Deny direct push insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Deny direct push update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Deny direct push delete" ON public.push_subscriptions;

-- (테이블에 대한 직접 CRUD 정책을 일체 부여하지 않아 RPC 함수를 통해서만 접근 가능)

-- ==============================================================================
-- 6. 보안 RPC 함수 (SECURITY DEFINER)
-- ==============================================================================

-- [함수 1] PC에서 스냅샷 및 예약 알림 저장
CREATE OR REPLACE FUNCTION public.push_snapshot(
  p_key TEXT,
  p_payload JSONB,
  p_reminders JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RAISE EXCEPTION 'Invalid synchronization key';
  END IF;

  -- 250KB 이상 페이로드 제한
  IF length(p_payload::text) > 262144 THEN
    RAISE EXCEPTION 'Payload size exceeds limit (256KB)';
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  -- 스냅샷 업서트
  INSERT INTO public.sync_snapshots (key_hash, payload, updated_at)
  VALUES (v_hash, p_payload, NOW())
  ON CONFLICT (key_hash)
  DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();

  -- 아직 발송되지 않은 기존 예약 알림은 새로운 목록으로 교체
  DELETE FROM public.reminders
  WHERE key_hash = v_hash AND sent_at IS NULL;

  -- 새로운 예약 알림 등록
  IF p_reminders IS NOT NULL AND jsonb_array_length(p_reminders) > 0 THEN
    INSERT INTO public.reminders (key_hash, notify_at, title, body)
    SELECT
      v_hash,
      (elem->>'notify_at')::TIMESTAMPTZ,
      substr(coalesce(elem->>'title', '교행보드 알림'), 1, 100),
      substr(coalesce(elem->>'body', ''), 1, 300)
    FROM jsonb_array_elements(p_reminders) AS elem
    WHERE (elem->>'notify_at') IS NOT NULL;
  END IF;

  RETURN TRUE;
END;
$$;

-- [함수 2] 모바일에서 최신 스냅샷 조회
CREATE OR REPLACE FUNCTION public.get_snapshot(
  p_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
  v_data JSONB;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN NULL;
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  SELECT jsonb_build_object(
    'payload', payload,
    'updated_at', updated_at
  )
  INTO v_data
  FROM public.sync_snapshots
  WHERE key_hash = v_hash;

  RETURN v_data;
END;
$$;

-- [함수 3] 모바일 웹푸시 구독 등록
CREATE OR REPLACE FUNCTION public.register_push(
  p_key TEXT,
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RAISE EXCEPTION 'Invalid synchronization key';
  END IF;

  IF p_endpoint IS NULL OR p_p256dh IS NULL OR p_auth IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription data';
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  INSERT INTO public.push_subscriptions (key_hash, endpoint, p256dh, auth, created_at)
  VALUES (v_hash, p_endpoint, p_p256dh, p_auth, NOW())
  ON CONFLICT (endpoint)
  DO UPDATE SET
    key_hash = EXCLUDED.key_hash,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    created_at = NOW();

  RETURN TRUE;
END;
$$;

-- [함수 4] 모바일 웹푸시 구독 해제
CREATE OR REPLACE FUNCTION public.unregister_push(
  p_key TEXT,
  p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN FALSE;
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  DELETE FROM public.push_subscriptions
  WHERE key_hash = v_hash AND endpoint = p_endpoint;

  RETURN TRUE;
END;
$$;

-- [함수 5] 연동 해제 (해당 키의 모든 데이터 즉시 영구 삭제)
CREATE OR REPLACE FUNCTION public.revoke_key(
  p_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN FALSE;
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  DELETE FROM public.sync_snapshots WHERE key_hash = v_hash;
  DELETE FROM public.reminders WHERE key_hash = v_hash;
  DELETE FROM public.push_subscriptions WHERE key_hash = v_hash;

  RETURN TRUE;
END;
$$;

-- [함수 6] 오래된 데이터 자동 정리 (90일 미사용 키 및 30일 지난 발송 완료 알림)
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- 90일 이상 갱신 없는 스냅샷 및 연관 데이터 삭제
  DELETE FROM public.sync_snapshots WHERE updated_at < NOW() - INTERVAL '90 days';
  DELETE FROM public.reminders WHERE notify_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.push_subscriptions WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;

-- 함수 실행 권한을 anon과 authenticated에 부여
GRANT EXECUTE ON FUNCTION public.push_snapshot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_snapshot TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_push TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_key TO anon, authenticated;

-- 매일 자정 오래된 데이터 정리 크론
SELECT cron.unschedule('daily-cleanup-job') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-cleanup-job');
SELECT cron.schedule('daily-cleanup-job', '0 0 * * *', 'SELECT public.cleanup_expired_data();');
