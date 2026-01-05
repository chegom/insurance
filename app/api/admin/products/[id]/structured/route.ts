import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateStructuredDetails, generateProductSummary } from '@/lib/openai'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 상품 정보 가져오기
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // AI로 구조화된 상세 정보 생성
    const structuredDetails = await generateStructuredDetails(product.raw_details)

    // 구조화된 내용을 기반으로 요약 정보도 재생성
    let updatedSummary = product.summary_json
    try {
      updatedSummary = await generateProductSummary(product.raw_details)
      
      // DB에 업데이트된 요약 정보 저장
      await supabase
        .from('products')
        .update({ summary_json: updatedSummary })
        .eq('id', id)
    } catch (summaryError) {
      console.error('요약 정보 재생성 오류:', summaryError)
      // 요약 정보 재생성 실패해도 구조화된 내용은 반환
    }

    return NextResponse.json(
      { 
        structuredDetails,
        summaryJson: updatedSummary
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error generating structured details:', error)
    return NextResponse.json(
      { 
        error: '구조화된 정보 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

