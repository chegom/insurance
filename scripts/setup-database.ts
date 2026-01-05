import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

// Service role key를 사용하여 관리자 권한으로 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('데이터베이스 스키마를 생성하는 중...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Products 테이블 생성
      CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        raw_details TEXT NOT NULL,
        summary_json JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );

      -- 인덱스 생성 (검색 성능 향상)
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_products_company ON products(company);
    `
  })

  if (error) {
    console.error('오류 발생:', error)
    // RPC가 없을 경우 직접 SQL 실행 시도
    console.log('RPC를 사용할 수 없습니다. Supabase 대시보드에서 직접 SQL을 실행해주세요.')
    console.log('\n다음 SQL을 Supabase 대시보드 > SQL Editor에서 실행하세요:')
    console.log(`
-- Products 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  raw_details TEXT NOT NULL,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company);
    `)
    process.exit(1)
  }

  console.log('✅ 데이터베이스 스키마가 성공적으로 생성되었습니다!')
}

setupDatabase()

