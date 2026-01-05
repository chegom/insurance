// 데이터 검증 유틸리티

export function isValidInsuranceData(text: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length < 10) {
    return { isValid: false, reason: '입력 내용이 너무 짧습니다. 최소 10자 이상 입력해주세요.' }
  }

  // 숫자만 있는 경우 (더미 데이터 감지) - 엄격하게 체크
  const trimmedText = text.trim()
  const onlyNumbers = /^\d+$/.test(trimmedText)
  if (onlyNumbers && trimmedText.length < 50) {
    return { isValid: false, reason: '숫자만으로는 분석할 수 없습니다. 실제 보험 정보를 입력해주세요.' }
  }

  // 매우 짧은 숫자 조합만 있는 경우 (예: "1 2 323")
  const words = trimmedText.split(/\s+/)
  if (words.length <= 3 && words.every(word => /^\d+$/.test(word))) {
    return { isValid: false, reason: '의미 있는 보험 정보를 입력해주세요.' }
  }

  // 충분한 길이가 있으면 통과 (보험 키워드 체크는 완화)
  if (trimmedText.length >= 20) {
    return { isValid: true }
  }

  // 의미 있는 단어가 있는지 확인 (선택적)
  const insuranceKeywords = [
    '보험', '보장', '보험금', '보험료', '가입', '갱신', '해지',
    '사망', '질병', '상해', '입원', '수술', '의료', '장해',
    '특약', '종신', '정기', '건강', '암', '실손', '상해보험',
    '생명보험', '건강보험', '손해보험', '연금', '저축',
    '자동차', '차량', '운전', '사고', '배상', '면책',
    '만원', '원', '년', '세', '월', '일', '회', '건',
    '지급', '지원', '혜택', '할인', '면제', '감액'
  ]

  const textLower = text.toLowerCase()
  const hasKeywords = insuranceKeywords.some(keyword => textLower.includes(keyword))

  if (!hasKeywords && trimmedText.length < 30) {
    return { isValid: false, reason: '보험 관련 내용이 포함되어 있지 않습니다. 실제 보험 정보를 입력해주세요.' }
  }

  return { isValid: true }
}

export function validateProductInput(name: string, company: string, rawDetails: string, hasFile: boolean = false): { isValid: boolean; error?: string } {
  // 상품명 검증
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: '상품명을 2자 이상 입력해주세요.' }
  }

  if (/^\d+$/.test(name.trim())) {
    return { isValid: false, error: '상품명은 숫자만으로 구성할 수 없습니다.' }
  }

  // 보험사 검증
  if (!company || company.trim().length < 2) {
    return { isValid: false, error: '보험사명을 2자 이상 입력해주세요.' }
  }

  if (/^\d+$/.test(company.trim())) {
    return { isValid: false, error: '보험사명은 숫자만으로 구성할 수 없습니다.' }
  }

  // 상세 내용 검증
  // 파일이 있으면 검증 완화 (PDF에서 추출할 예정이므로)
  if (hasFile && (!rawDetails || rawDetails.trim().length === 0)) {
    // 파일이 있고 내용이 없으면 통과 (PDF에서 추출할 예정)
    return { isValid: true }
  }

  // 상세 내용이 있으면 검증
  if (rawDetails && rawDetails.trim().length > 0) {
    const detailsValidation = isValidInsuranceData(rawDetails)
    if (!detailsValidation.isValid) {
      return { isValid: false, error: detailsValidation.reason || '상세 내용이 유효하지 않습니다.' }
    }
  }

  return { isValid: true }
}

export function validateCustomerInsurance(currentInsurance: string): { isValid: boolean; error?: string } {
  if (!currentInsurance || currentInsurance.trim().length < 10) {
    return { isValid: false, error: '현재 보험 정보를 10자 이상 입력해주세요.' }
  }

  const validation = isValidInsuranceData(currentInsurance)
  if (!validation.isValid) {
    return { isValid: false, error: validation.reason || '유효한 보험 정보를 입력해주세요.' }
  }

  return { isValid: true }
}

