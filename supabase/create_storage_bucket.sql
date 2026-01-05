-- Supabase Storage에 insurance-files bucket 생성
-- 이 SQL은 Supabase Dashboard의 Storage 섹션에서 실행하거나
-- Supabase CLI를 통해 실행할 수 있습니다.

-- 참고: Storage bucket은 SQL로 직접 생성할 수 없으므로
-- Supabase Dashboard에서 수동으로 생성해야 합니다:
-- 1. Supabase Dashboard > Storage > New bucket
-- 2. Bucket name: insurance-files
-- 3. Public bucket: Yes (또는 No, 필요에 따라)
-- 4. File size limit: 50MB
-- 5. Allowed MIME types: application/pdf

-- 또는 Supabase MCP를 사용하여 생성할 수 있습니다.

