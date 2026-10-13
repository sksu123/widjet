-- ==============================================================================
-- [긴급 수정 SQL] function digest(text, unknown) does not exist 오류 해결
-- Supabase 대시보드 -> SQL Editor -> New Query 에 붙여넣고 [Run] 을 누르세요.
-- ==============================================================================

-- [함수 1] PC -> 클라우드 스냅샷 및 알림 목록 업로드
CREATE OR REPLACE FUNCTION public.push_snapshot(
  p_key TEXT,
  p_payload JSONB,
  p_reminders JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RAISE EXCEPTION 'Invalid synchronization key';
  END IF;

  IF length(p_payload::text) > 262144 THEN
    RAISE EXCEPTION 'Payload size exceeds limit (256KB)';
  END IF;

  -- PostgreSQL 내장 sha256 함수 사용 (확장 스키마 의존성 없음)
  v_hash := encode(sha256(p_key::bytea), 'hex');

  -- 스냅샷 업서트
  INSERT INTO public.sync_snapshots (key_hash, payload, updated_at)
  VALUES (v_hash, p_payload, NOW())
  ON CONFLICT (key_hash)
  DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();

  -- 미발송 예약 알림 갱신
  DELETE FROM public.reminders
  WHERE key_hash = v_hash AND sent_at IS NULL;

  -- 새 예약 알림 등록
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
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
  v_data JSONB;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN NULL;
  END IF;

  v_hash := encode(sha256(p_key::bytea), 'hex');

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
SET search_path = public, extensions, pg_catalog
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

  v_hash := encode(sha256(p_key::bytea), 'hex');

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
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN FALSE;
  END IF;

  v_hash := encode(sha256(p_key::bytea), 'hex');

  DELETE FROM public.push_subscriptions
  WHERE key_hash = v_hash AND endpoint = p_endpoint;

  RETURN TRUE;
END;
$$;

-- [함수 5] 연동 해제
CREATE OR REPLACE FUNCTION public.revoke_key(
  p_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) < 16 THEN
    RETURN FALSE;
  END IF;

  v_hash := encode(sha256(p_key::bytea), 'hex');

  DELETE FROM public.sync_snapshots WHERE key_hash = v_hash;
  DELETE FROM public.reminders WHERE key_hash = v_hash;
  DELETE FROM public.push_subscriptions WHERE key_hash = v_hash;

  RETURN TRUE;
END;
$$;
