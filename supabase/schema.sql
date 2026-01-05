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

-- RLS (Row Level Security) 설정 (선택사항 - 필요시 활성화)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access" ON products FOR INSERT WITH CHECK (true);

