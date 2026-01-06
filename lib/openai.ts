import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

// Lazy initialization - 빌드 시점에 에러 발생 방지
let _openai: OpenAI | null = null

export const getOpenAI = (): OpenAI => {
  if (!_openai) {
    if (!apiKey) {
      console.error('OPENAI_API_KEY가 설정되지 않았습니다.')
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

// 하위 호환성을 위한 export
export const openai = apiKey ? new OpenAI({ apiKey }) : null as unknown as OpenAI

export async function generateProductSummary(rawDetails: string): Promise<any> {
  try {
    // 입력 데이터가 실제 보험 정보인지 확인 (파일에서 추출한 경우는 완화)
    if (!rawDetails || rawDetails.trim().length < 10) {
      // 최소 길이를 10자로 완화 (파일에서 추출한 경우 대비)
      throw new Error('보험 상품 상세 내용이 충분하지 않습니다. 최소 10자 이상의 실제 보험 정보를 입력해주세요.')
    }

    // 더미 데이터 감지
    const onlyNumbers = /^\d+$/.test(rawDetails.trim())
    if (onlyNumbers) {
      throw new Error('숫자만으로는 분석할 수 없습니다. 실제 보험 상품의 상세 정보를 입력해주세요.')
    }

    const prompt = `당신은 보험 상품 분석 전문가입니다. 다음 보험 상품의 상세 내용을 분석하여 구조화된 JSON 형식으로 요약해주세요.

**중요**: 
- 입력된 정보에서 가능한 한 많은 정보를 추출하여 요약하세요
- 정보가 명시되지 않은 항목은 "정보 없음" 또는 "상세 불명"으로 표시하세요
- 더미 데이터(숫자만, 의미 없는 단어만)가 아닌 이상 항상 유효한 JSON을 반환하세요
- 입력 내용이 짧거나 불완전해도, 가능한 정보를 추출하여 요약하세요

다음 형식으로 응답해주세요 (JSON만 반환, 다른 설명 없이):
{
  "keyBenefits": ["추출된 혜택 1", "추출된 혜택 2", "추출된 혜택 3"],
  "renewalType": "자동갱신" 또는 "수동갱신" 또는 "기타" 또는 "정보 없음",
  "majorCoverage": {
    "death": "사망보험금 정보 (없으면 '정보 없음')",
    "medical": "의료비 보장 내용 (없으면 '정보 없음')",
    "disability": "장해보험금 내용 (없으면 '정보 없음')",
    "other": "기타 주요 보장 내용 (없으면 '정보 없음')"
  },
  "premiumRange": "보험료 범위 (없으면 '정보 없음')",
  "targetAge": "주요 가입 대상 연령대 (없으면 '정보 없음')",
  "underwritingType": "Standard" 또는 "Simplified" 또는 "정보 없음",
  "coverageScope": {
    "brain": "Level 1" 또는 "Level 2" 또는 "Level 3" 또는 "정보 없음",
    "heart": "Level 1" 또는 "Level 2" 또는 "정보 없음",
    "cancer": "암 보장 범위 설명 (없으면 '정보 없음')"
  },
  "penaltyPeriod": {
    "exemption": "면책 기간 (예: '90일 면책', 없으면 '정보 없음')",
    "reduction": "감액 기간 (예: '1년 50%', 없으면 '정보 없음')"
  },
  "renewalStructure": "Renewal" 또는 "Non-Renewal" 또는 "정보 없음"
}

**중요 분석 기준:**

1. **가입 심사 유형 (underwritingType)**: 
   - 파일명이나 내용에 "[간편]", "간편심사", "유병자" 등의 단어가 있으면 "Simplified"
   - 특별한 언급이 없으면 "Standard"
   - "Simplified"는 아픈 사람도 받아주는 상품, "Standard"는 건강한 사람 대상

2. **3대 질병 보장 범위 (coverageScope)**:
   - **뇌 질환**: 
     * Level 1 (좁음): 뇌출혈만
     * Level 2 (중간): 뇌졸중 (뇌출혈 + 뇌경색)
     * Level 3 (넓음): 뇌혈관질환 (뇌졸중 + 기타 뇌질환)
   - **심장 질환**:
     * Level 1 (좁음): 급성심근경색만
     * Level 2 (넓음): 허혈성심장질환 (협심증 포함)

3. **패널티 기간 (penaltyPeriod)**:
   - 면책 기간: 가입 후 돈을 아예 안 주는 기간 (예: "90일 면책")
   - 감액 기간: 가입 후 돈을 일부만 주는 기간 (예: "1년 50%", "1년 50% 감액")

4. **갱신형 vs 비갱신형 (renewalStructure)**:
   - "갱신형", "새로고침", "갱신" 등의 단어가 있으면 "Renewal"
   - "비갱신", "갱신 없음" 등이 명시되면 "Non-Renewal"

**반드시 유효한 JSON 형식으로만 응답하세요. 다른 설명이나 주석은 포함하지 마세요.**

보험 상품 상세 내용:
${rawDetails}`

    console.log('Calling OpenAI API...')
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 보험 상품 분석 전문가입니다. 항상 유효한 JSON 형식으로만 응답하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0]?.message?.content || '{}'
    console.log('OpenAI API response received:', text.substring(0, 200))

    try {
      const parsed = JSON.parse(text)
      console.log('Successfully parsed JSON')
      
      // 더미 데이터 감지 확인 (더미 데이터가 확실한 경우만 거부)
      if (parsed.invalid_data === true) {
        const reason = parsed.reason || '입력된 정보가 실제 보험 상품 정보가 아닙니다.'
        // 숫자만 있는 경우 등 명확한 더미 데이터인지 확인
        if (reason.includes('숫자만') || reason.includes('의미 없는')) {
          throw new Error(reason)
        }
        // 그 외의 경우는 경고만 하고 진행
        console.warn('AI가 데이터 품질에 대해 경고했지만 계속 진행:', reason)
      }
      
      // 기본 구조 확인 및 기본값 설정
      const result = {
        keyBenefits: parsed.keyBenefits && Array.isArray(parsed.keyBenefits) && parsed.keyBenefits.length > 0
          ? parsed.keyBenefits
          : ['입력된 정보에서 주요 혜택을 추출할 수 없습니다.'],
        renewalType: parsed.renewalType || '정보 없음',
        majorCoverage: {
          death: parsed.majorCoverage?.death || '정보 없음',
          medical: parsed.majorCoverage?.medical || '정보 없음',
          disability: parsed.majorCoverage?.disability || '정보 없음',
          other: parsed.majorCoverage?.other || '정보 없음',
        },
        premiumRange: parsed.premiumRange || '정보 없음',
        targetAge: parsed.targetAge || '정보 없음',
        // 추가 분석 항목
        underwritingType: parsed.underwritingType || '정보 없음',
        coverageScope: {
          brain: parsed.coverageScope?.brain || '정보 없음',
          heart: parsed.coverageScope?.heart || '정보 없음',
          cancer: parsed.coverageScope?.cancer || '정보 없음',
        },
        penaltyPeriod: {
          exemption: parsed.penaltyPeriod?.exemption || '정보 없음',
          reduction: parsed.penaltyPeriod?.reduction || '정보 없음',
        },
        renewalStructure: parsed.renewalStructure || '정보 없음',
      }
      
      return result
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Response text:', text)
      
      // JSON 파싱 실패 시 기본 구조 반환
      console.warn('JSON 파싱 실패, 기본 구조 반환')
      return {
        keyBenefits: ['입력된 정보를 분석 중입니다.'],
        renewalType: '정보 없음',
        majorCoverage: {
          death: '정보 없음',
          medical: '정보 없음',
          disability: '정보 없음',
          other: '정보 없음',
        },
        premiumRange: '정보 없음',
        targetAge: '정보 없음',
        underwritingType: '정보 없음',
        coverageScope: {
          brain: '정보 없음',
          heart: '정보 없음',
          cancer: '정보 없음',
        },
        penaltyPeriod: {
          exemption: '정보 없음',
          reduction: '정보 없음',
        },
        renewalStructure: '정보 없음',
      }
    }
  } catch (error) {
    console.error('Error generating product summary:', error)
    if (error instanceof Error) {
      throw new Error(`AI 요약 생성 실패: ${error.message}`)
    }
    throw new Error('Failed to generate product summary')
  }
}

// 상세 정보를 구조화된 레이아웃으로 정리
export async function generateStructuredDetails(rawDetails: string): Promise<string> {
  try {
    const prompt = `당신은 보험 상품 문서 작성 전문가입니다. 다음 보험 상품의 상세 내용을 분석하여 마크다운 형식으로 구조화된 레이아웃으로 정리해주세요.

다음 섹션들을 포함하여 정리해주세요:
1. 상품 개요
2. 주요 보장 내용 (구체적인 금액과 조건 포함)
3. 보험료 정보
4. 가입 조건 및 제한사항
5. 특약 및 옵션
6. 갱신 및 해지 조건
7. 기타 중요 사항

원본 내용을 바꾸지 말고, 정보를 체계적으로 정리하고 구조화해주세요. 표를 사용하여 정보를 명확하게 표현하세요.

보험 상품 상세 내용:
${rawDetails}`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 보험 상품 문서 작성 전문가입니다. 정보를 체계적이고 읽기 쉽게 구조화하여 마크다운 형식으로 작성하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    return completion.choices[0]?.message?.content || '구조화된 정보를 생성할 수 없습니다.'
  } catch (error) {
    console.error('Error generating structured details:', error)
    if (error instanceof Error) {
      throw new Error(`구조화된 정보 생성 실패: ${error.message}`)
    }
    throw new Error('Failed to generate structured details')
  }
}

export async function analyzeComparison(
  customerInfo: {
    age: number
    gender: string
    job: string
    income?: number | string
    medicalHistory?: string
    familyHistory?: string
    lifestyle?: string
  },
  currentInsurance: string,
  currentInsuranceType: string,
  recommendedProducts: Array<{
    name: string
    company: string
    insurance_type?: string
    raw_details: string
    summary_json: any
  }>,
  currentProductInList?: {
    name: string
    company: string
    insurance_type?: string
    raw_details: string
    summary_json: any
  } | null
): Promise<string> {
  const productsInfo = recommendedProducts.map((product, index) => `
제품 ${index + 1}: ${product.name} (${product.company})
보험 종류: ${product.insurance_type || '종합보험'}
요약 정보: ${JSON.stringify(product.summary_json, null, 2)}
상세 내용: ${product.raw_details}
`).join('\n\n')

  const customerInfoText = `
- 연령: ${customerInfo.age}세
- 성별: ${customerInfo.gender}
- 직업: ${customerInfo.job}
${customerInfo.income ? `- 월 수입: ${customerInfo.income}원` : ''}
${customerInfo.medicalHistory ? `- 병력: ${customerInfo.medicalHistory}` : ''}
${customerInfo.familyHistory ? `- 가족 병력: ${customerInfo.familyHistory}` : ''}
${customerInfo.lifestyle ? `- 생활습관: ${customerInfo.lifestyle}` : ''}
`

  const currentInsuranceNote = currentProductInList 
    ? `\n**중요 참고**: 고객이 입력한 현재 보험 "${currentProductInList.name} (${currentProductInList.company})"이 관리자 등록 상품 리스트에 있는 것으로 확인되었습니다. 
이 보험은 추천 상품 리스트에 포함되어 있지 않으므로, "현재 보험"과 "추천 상품"을 비교할 때 동일한 보험이 중복되지 않습니다.
만약 추천 상품 중에 "${currentProductInList.name}"과 동일한 상품이 있다면, 그것은 현재 보험과 같은 상품이므로 반드시 동일한 가성비를 가져야 합니다.`
    : `\n**참고**: 고객이 입력한 현재 보험은 관리자 등록 상품 리스트에 없습니다. 입력된 정보를 바탕으로 분석합니다.`

  const prompt = `당신은 최고 수준의 보험 분석 전문가입니다. 고객의 현재 보험과 추천 상품들을 매우 상세하고 정밀하게 비교 분석하여 전문적인 보험 분석 보고서를 작성해주세요.

**중요**: 다음 사항을 매우 상세하게 분석해주세요:
1. 보장 범위의 차이점을 구체적으로 비교
2. 보험금 지급 조건의 차이점
3. 보험료 대비 보장 내용의 가성비 분석
4. 현재 보험의 구체적인 보장 공백(coverage gap) 식별
5. 각 추천 상품의 구체적인 우위점
6. 고객의 전체적인 상황(연령, 성별, 직업, 수입, 병력, 가족 병력, 생활습관)에 맞는 맞춤형 분석

고객 정보:
${customerInfoText}

현재 보험 정보:
보험 종류: ${currentInsuranceType}
${currentInsurance}
${currentInsuranceNote}

**중요**: 고객의 생활습관을 확인하여 적절한 보험만 추천하세요.
- 차량이 없는 고객에게는 자동차보험을 추천하지 마세요.
- 고객의 현재 보험 종류(${currentInsuranceType})와 같은 종류의 보험을 우선적으로 추천하세요.
- 고객의 상황(연령, 직업, 수입, 생활습관)에 맞는 보험만 추천하세요.

추천 상품 정보:
${productsInfo}

다음 형식으로 전문적인 보험 분석 보고서를 작성해주세요. 표는 마크다운 테이블 형식으로 작성하고, 그래프는 "보험료 대비 보장 효율" 섹션에서 "상품명: (숫자%)" 형식으로 작성해주세요:

# 📋 보험 분석 보고서

## 1. 고객 프로필 요약
${customerInfoText}

## 2. 각 보험 상품 개요

### 2.1 현재 보험
${currentProductInList ? `**상품명**: ${currentProductInList.name}  
**보험사**: ${currentProductInList.company}` : '**입력된 정보**: 고객이 입력한 보험 정보를 바탕으로 분석'}

**주요 특징**:
- (현재 보험의 핵심 특징 요약)
- (보장 범위 요약)
- (보험료 정보)

### 2.2 추천 상품 1: ${recommendedProducts[0]?.name || 'N/A'}
**보험사**: ${recommendedProducts[0]?.company || 'N/A'}

**주요 특징**:
- (상품의 핵심 특징)
- (보장 범위 요약)
- (보험료 정보)

### 2.3 추천 상품 2: ${recommendedProducts[1]?.name || 'N/A'}
**보험사**: ${recommendedProducts[1]?.company || 'N/A'}

**주요 특징**:
- (상품의 핵심 특징)
- (보장 범위 요약)
- (보험료 정보)

${recommendedProducts[2] ? `### 2.4 추천 상품 3: ${recommendedProducts[2].name}
**보험사**: ${recommendedProducts[2].company}

**주요 특징**:
- (상품의 핵심 특징)
- (보장 범위 요약)
- (보험료 정보)` : ''}

## 3. 📊 상세 비교 분석표

각 항목을 구체적인 수치와 조건으로 비교해주세요:

| 항목 | 현재 보험 | ${recommendedProducts[0]?.name || '추천 상품 1'} | ${recommendedProducts[1]?.name || '추천 상품 2'} | ${recommendedProducts[2]?.name || '추천 상품 3'} |
|------|----------|------------|------------|------------|
| **사망보험금** | (구체적 금액 및 지급 조건) | | | |
| 질병/상해 사망보험금 | | | | |
| **의료비 보장** | (구체적 보장 범위 및 한도) | | | |
| 입원비 (일당) | | | | |
| 수술비 | | | | |
| 장해보험금 (급수별) | | | | |
| 특약 보장 | | | | |
| **예상 월 보험료** | (구체적 금액) | (구체적 금액) | (구체적 금액) | (구체적 금액) |
| 갱신 유형 | | | | |
| 가입 연령 제한 | | | | |
| 보장 기간 | | | | |
| 해지 환급금 | | | | |

## 4. 📈 보험료 대비 보장 효율 (가성비)

각 보험의 보험료 대비 보장 효율을 백분율로 표시하세요. 다음 형식으로 작성해주세요:

현재 보험: (40%)
${recommendedProducts[0]?.name || '추천 상품 1'}: (80%)
${recommendedProducts[1]?.name || '추천 상품 2'}: (90%)
${recommendedProducts[2]?.name || '추천 상품 3'}: (70%)

**매우 중요**: 
- 각 상품명 뒤에 콜론(:)을 붙이고 괄호 안에 백분율을 숫자만 입력하세요. 예: "상품명: (85%)"
- **현재 보험과 추천 상품 중 동일한 상품명을 가진 보험이 있다면, 반드시 동일한 가성비 백분율을 부여해야 합니다.**
- 예를 들어, 현재 보험이 "퍼펙트플러스종합보험"이고 추천 상품 1도 "퍼펙트플러스종합보험"이라면, 둘 다 같은 백분율(예: 80%)을 가져야 합니다.
- 같은 보험은 같은 가성비를 가집니다. 보험의 가성비는 보험 자체의 특성에 의해 결정되므로, 동일한 보험은 항상 동일한 가성비를 가집니다.

## 5. ✅ 장단점 분석

### 5.1 현재 보험

**장점**:
- (구체적인 장점 1)
- (구체적인 장점 2)
- (구체적인 장점 3)

**단점**:
- (구체적인 단점 1 - 보장 공백 포함)
- (구체적인 단점 2)
- (구체적인 단점 3)

### 5.2 ${recommendedProducts[0]?.name || '추천 상품 1'}

**장점**:
- (구체적인 장점 1)
- (구체적인 장점 2)
- (구체적인 장점 3)

**단점**:
- (구체적인 단점 1)
- (구체적인 단점 2)

### 5.3 ${recommendedProducts[1]?.name || '추천 상품 2'}

**장점**:
- (구체적인 장점 1)
- (구체적인 장점 2)
- (구체적인 장점 3)

**단점**:
- (구체적인 단점 1)
- (구체적인 단점 2)

${recommendedProducts[2] ? `### 5.4 ${recommendedProducts[2].name}

**장점**:
- (구체적인 장점 1)
- (구체적인 장점 2)

**단점**:
- (구체적인 단점 1)` : ''}

## 6. 🎯 고객 맞춤형 분석

### 6.1 고객 상황 고려 사항
${customerInfo.age}세 ${customerInfo.gender}, ${customerInfo.job}직${customerInfo.income ? `, 월 수입 ${customerInfo.income}원` : ''}인 고객님의 상황을 고려한 분석:

- **연령대별 위험도**: (${customerInfo.age}세 연령대의 주요 위험 요소)
${customerInfo.medicalHistory ? `- **병력 고려**: ${customerInfo.medicalHistory} (이에 따른 보장 필요성)` : ''}
${customerInfo.familyHistory ? `- **가족 병력 고려**: ${customerInfo.familyHistory} (유전적 위험 요소)` : ''}
${customerInfo.lifestyle ? `- **생활습관 고려**: ${customerInfo.lifestyle} (위험도 평가)` : ''}
- **직업 특성**: ${customerInfo.job}직의 특성상 필요한 보장
${customerInfo.income ? `- **수입 수준**: 월 수입 ${customerInfo.income}원 기준 적정 보험료 수준` : ''}

### 6.2 보장 공백 분석
현재 보험에서 부족한 부분:
- **구체적 보장 공백 1**: (어떤 상황에서 보장이 부족한지)
- **구체적 보장 공백 2**: (발생 가능한 위험)
- **구체적 보장 공백 3**: (고객 상황에 맞지 않는 부분)

## 7. 💰 예상 보험료 비교

| 보험 | 예상 월 보험료 | 연간 보험료 | 보험료 대비 보장 효율 |
|------|--------------|-----------|-------------------|
| 현재 보험 | (금액) | (금액) | (평가) |
| ${recommendedProducts[0]?.name || '추천 1'} | (금액) | (금액) | (평가) |
| ${recommendedProducts[1]?.name || '추천 2'} | (금액) | (금액) | (평가) |
| ${recommendedProducts[2]?.name || '추천 3'} | (금액) | (금액) | (평가) |

## 8. 🏆 최종 추천 보험

### 추천 순위 1위: ${recommendedProducts[0]?.name || 'N/A'}
**보험사**: ${recommendedProducts[0]?.company || 'N/A'}  
**예상 월 보험료**: (구체적 금액)

**추천 이유**:
1. (고객 상황에 가장 적합한 이유 1)
2. (보장 공백을 가장 잘 해결하는 이유)
3. (가성비가 우수한 이유)
4. (고객의 병력/가족 병력/생활습관을 고려한 이유)

**특히 추천하는 이유**:
${customerInfo.age}세 ${customerInfo.gender}, ${customerInfo.job}직인 고객님께서는 (구체적인 이유와 상황 설명)

### 추천 순위 2위: ${recommendedProducts[1]?.name || 'N/A'}
**보험사**: ${recommendedProducts[1]?.company || 'N/A'}  
**예상 월 보험료**: (구체적 금액)

**추천 이유**:
1. (이유 1)
2. (이유 2)
3. (이유 3)

${recommendedProducts[2] ? `### 추천 순위 3위: ${recommendedProducts[2].name}
**보험사**: ${recommendedProducts[2].company}  
**예상 월 보험료**: (구체적 금액)

**추천 이유**:
1. (이유 1)
2. (이유 2)` : ''}

## 9. 💼 영업 스크립트

### 고객 맞춤형 설명
"${customerInfo.age}세 ${customerInfo.gender}이시고 ${customerInfo.job}직이시는 고객님께서는 현재 보험에서 다음과 같은 보장 공백이 있습니다..."

### 보장 공백 설명
- (구체적인 상황 예시와 위험)
- (추천 상품이 이를 어떻게 해결하는지)

### 최종 추천
"따라서 ${recommendedProducts[0]?.name || '추천 상품'}을 추천드리며, 예상 월 보험료는 (금액)원입니다. 이 상품은..."

---

**보고서 작성일**: ${new Date().toLocaleDateString('ko-KR')}  
**분석 기준**: 고객의 연령, 성별, 직업, 수입, 병력, 가족 병력, 생활습관을 종합적으로 고려한 맞춤형 분석

**중요**: 
- 모든 분석은 사실에 기반하여 정확하게 작성하세요
- 구체적인 수치, 금액, 조건을 포함하세요
- 고객의 전체적인 상황에 맞는 맞춤형 분석을 제공하세요
- 과장하지 말고 객관적이고 설득력 있게 작성하세요`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 최고 수준의 보험 분석 전문가입니다. 매우 상세하고 정밀한 비교 분석을 제공하며, 구체적인 수치와 조건을 포함하여 작성하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    return completion.choices[0]?.message?.content || '분석 결과를 생성할 수 없습니다.'
  } catch (error) {
    console.error('Error analyzing comparison:', error)
    if (error instanceof Error) {
      throw new Error(`비교 분석 실패: ${error.message}`)
    }
    throw new Error('Failed to analyze comparison')
  }
}
