import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.error('GEMINI_API_KEY가 설정되지 않았습니다.')
  throw new Error('Missing GEMINI_API_KEY environment variable')
}

export const genAI = new GoogleGenerativeAI(apiKey)

export async function generateProductSummary(rawDetails: string): Promise<any> {
  try {
    if (!apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.')
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `당신은 보험 상품 분석 전문가입니다. 다음 보험 상품의 상세 내용을 분석하여 구조화된 JSON 형식으로 요약해주세요.

다음 형식으로 응답해주세요 (JSON만 반환, 다른 설명 없이):
{
  "keyBenefits": ["주요 혜택 1", "주요 혜택 2", "주요 혜택 3"],
  "renewalType": "자동갱신" 또는 "수동갱신" 또는 "기타",
  "majorCoverage": {
    "death": "사망보험금 금액",
    "medical": "의료비 보장 내용",
    "disability": "장해보험금 내용",
    "other": "기타 주요 보장 내용"
  },
  "premiumRange": "보험료 범위 (예: 월 5만원~10만원)",
  "targetAge": "주요 가입 대상 연령대"
}

보험 상품 상세 내용:
${rawDetails}`

    console.log('Calling Gemini API...')
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    console.log('Gemini API response received:', text.substring(0, 200))
    
    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('Successfully parsed JSON')
        return parsed
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        console.error('Response text:', text)
        throw new Error(`JSON 파싱 실패: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
    }
    
    // JSON이 없으면 기본 구조 반환
    console.warn('No JSON found in response, returning default structure')
    return {
      keyBenefits: ["상품 정보를 확인해주세요"],
      renewalType: "기타",
      majorCoverage: {
        death: "정보 없음",
        medical: "정보 없음",
        disability: "정보 없음",
        other: "정보 없음"
      },
      premiumRange: "정보 없음",
      targetAge: "정보 없음"
    }
  } catch (error) {
    console.error('Error generating product summary:', error)
    if (error instanceof Error) {
      throw new Error(`AI 요약 생성 실패: ${error.message}`)
    }
    throw new Error('Failed to generate product summary')
  }
}

export async function analyzeComparison(
  customerInfo: {
    age: number
    gender: string
    job: string
  },
  currentInsurance: string,
  recommendedProducts: Array<{
    name: string
    company: string
    raw_details: string
    summary_json: any
  }>
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const productsInfo = recommendedProducts.map((product, index) => `
제품 ${index + 1}: ${product.name} (${product.company})
요약 정보: ${JSON.stringify(product.summary_json, null, 2)}
상세 내용: ${product.raw_details.substring(0, 500)}...
`).join('\n\n')

  const prompt = `당신은 최고 수준의 보험 분석 전문가입니다. 고객의 현재 보험과 추천 상품들을 비교 분석하여 설득력 있는 영업 스크립트를 작성해주세요.

고객 정보:
- 연령: ${customerInfo.age}세
- 성별: ${customerInfo.gender}
- 직업: ${customerInfo.job}

현재 보험 정보:
${currentInsurance}

추천 상품 정보:
${productsInfo}

다음 형식으로 분석 결과를 작성해주세요:

## 📊 비교 분석표

| 항목 | 현재 보험 | 추천 상품 1 | 추천 상품 2 | 추천 상품 3 |
|------|----------|------------|------------|------------|
| 주요 보장 내용 | | | | |
| 보험료 | | | | |
| 갱신 유형 | | | | |
| 주요 특징 | | | | |

## 🎯 핵심 차이점 및 보장 공백 분석

### 현재 보험의 한계점
- 

### 추천 상품의 우위점
- 

## 💼 영업 스크립트

고객님께 설명드릴 때 사용할 설득력 있는 스크립트를 작성해주세요. 특히 보장 공백(coverage gap)에 초점을 맞춰서 작성해주세요.

---

**중요**: 사실에 기반하여 정확하고 설득력 있게 작성하되, 과장하지 마세요. 고객의 현재 상황과 필요에 맞는 맞춤형 분석을 제공해주세요.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error analyzing comparison:', error)
    throw new Error('Failed to analyze comparison')
  }
}

