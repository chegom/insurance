-- insurance_type 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS insurance_type TEXT DEFAULT '종합보험';

-- insurance_type 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_products_insurance_type ON products(insurance_type);

