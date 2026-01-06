import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { analyzeComparison } from '@/lib/openai'
import { validateCustomerInsurance } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerInfo, currentInsurance, currentInsuranceType } = body

    if (!customerInfo || !currentInsurance) {
      return NextResponse.json(
        { error: '고객 정보와 현재 보험 정보를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 현재 보험 정보 검증
    const insuranceValidation = validateCustomerInsurance(currentInsurance)
    if (!insuranceValidation.isValid) {
      return NextResponse.json(
        { error: insuranceValidation.error || '현재 보험 정보가 유효하지 않습니다.' },
        { status: 400 }
      )
    }

    // 고객 상황 분석
    const hasCar = customerInfo.lifestyle?.toLowerCase().includes('차량') || 
                   customerInfo.lifestyle?.toLowerCase().includes('자동차') ||
                   customerInfo.lifestyle?.toLowerCase().includes('운전')
    const noCar = customerInfo.lifestyle?.toLowerCase().includes('차량 없음') ||
                  customerInfo.lifestyle?.toLowerCase().includes('차 없음') ||
                  customerInfo.lifestyle?.toLowerCase().includes('자동차 없음')

    // 고객의 현재 보험 종류와 상황에 맞는 상품만 필터링
    const supabase = getSupabase()
    let query = supabase
      .from('products')
      .select('*')

    // 고객 상황에 맞는 보험 종류만 필터링
    if (noCar || (!hasCar && currentInsuranceType !== '자동차보험')) {
      // 차가 없으면 자동차보험 제외
      query = query.neq('insurance_type', '자동차보험')
    }

    const { data: allProducts, error: fetchError } = await query.order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Supabase error:', fetchError)
      return NextResponse.json(
        { error: '상품 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!allProducts || allProducts.length === 0) {
      return NextResponse.json(
        { error: '추천할 상품이 없습니다. 관리자 페이지에서 상품을 먼저 추가해주세요.' },
        { status: 404 }
      )
    }

    // 고객이 입력한 보험 정보가 관리자 리스트에 있는지 확인
    const currentInsuranceLower = currentInsurance.toLowerCase()
    const matchedProduct = allProducts.find((product) => {
      const productNameLower = product.name.toLowerCase()
      const productDetailsLower = product.raw_details.toLowerCase()
      const productTypeMatch = product.insurance_type === currentInsuranceType
      return (
        (currentInsuranceLower.includes(productNameLower) ||
        productNameLower.includes(currentInsuranceLower.split(' ')[0]) ||
        currentInsuranceLower.includes(product.company.toLowerCase())) &&
        productTypeMatch
      )
    })

    let productsToCompare: typeof allProducts
    let currentProductInList = null

    if (matchedProduct) {
      // 고객 보험이 리스트에 있으면 같은 종류의 다른 보험들을 비교
      currentProductInList = matchedProduct
      const sameTypeProducts = allProducts.filter(
        (p) => p.id !== matchedProduct.id && p.insurance_type === currentInsuranceType
      )
      const otherTypeProducts = allProducts.filter(
        (p) => p.id !== matchedProduct.id && p.insurance_type !== currentInsuranceType
      )
      
      // 같은 종류의 보험을 우선적으로, 그 다음 다른 종류의 보험 추가
      // 현재 보험은 추천 상품 리스트에 포함하지 않음 (중복 방지)
      productsToCompare = [...sameTypeProducts.slice(0, 2), ...otherTypeProducts.slice(0, 1)]
    } else {
      // 고객 보험이 리스트에 없으면 현재 보험 종류와 같은 종류의 보험을 우선 추천
      const sameTypeProducts = allProducts.filter(p => p.insurance_type === currentInsuranceType)
      const otherTypeProducts = allProducts.filter(p => p.insurance_type !== currentInsuranceType)
      
      productsToCompare = [...sameTypeProducts.slice(0, 2), ...otherTypeProducts.slice(0, 1)]
    }

    // 최대 3개로 제한
    productsToCompare = productsToCompare.slice(0, 3)

    // AI로 비교 분석 수행
    const analysisResult = await analyzeComparison(
      customerInfo,
      currentInsurance,
      currentInsuranceType,
      productsToCompare,
      currentProductInList
    )

    return NextResponse.json(
      { 
        analysis: analysisResult, 
        recommendedProducts: productsToCompare,
        currentProductMatched: currentProductInList !== null
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error analyzing:', error)
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

