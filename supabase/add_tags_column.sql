-- tags 컬럼 추가 (기존 테이블에 추가)
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- tags 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

