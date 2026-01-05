-- Products 테이블에 파일 URL 컬럼 추가
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 파일 URL 인덱스 생성 (선택사항)
CREATE INDEX IF NOT EXISTS idx_products_file_url ON products(file_url) WHERE file_url IS NOT NULL;

