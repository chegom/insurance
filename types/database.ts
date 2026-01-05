export interface Product {
  id: string
  name: string
  company: string
  raw_details: string
  summary_json: {
    keyBenefits: string[]
    renewalType: string
    majorCoverage: {
      death?: string
      medical?: string
      disability?: string
      other?: string
    }
    premiumRange?: string
    targetAge?: string
    // 추가 분석 항목
    underwritingType?: 'Standard' | 'Simplified' | '정보 없음'
    coverageScope?: {
      brain?: 'Level 1' | 'Level 2' | 'Level 3' | '정보 없음'
      heart?: 'Level 1' | 'Level 2' | '정보 없음'
      cancer?: string
    }
    penaltyPeriod?: {
      exemption?: string // 면책 기간
      reduction?: string // 감액 기간
    }
    renewalStructure?: 'Renewal' | 'Non-Renewal' | '정보 없음'
  }
  insurance_type?: string
  tags?: string[]
  file_url?: string
  created_at: string
}

