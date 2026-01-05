import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateProductSummary } from '@/lib/openai'
import { validateProductInput } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product }, { status: 200 })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, company, rawDetails, insuranceType, tags } = body

    if (!name || !company || !rawDetails) {
      return NextResponse.json(
        { error: '모든 필수 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 입력 데이터 검증
    const validation = validateProductInput(name, company, rawDetails)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || '입력 데이터가 유효하지 않습니다.' },
        { status: 400 }
      )
    }

    // AI 요약 재생성
    let summaryJson
    try {
      summaryJson = await generateProductSummary(rawDetails)
    } catch (error) {
      console.error('AI summary generation error:', error)
      return NextResponse.json(
        { 
          error: 'AI 요약 생성 중 오류가 발생했습니다.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // 상품 업데이트
    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        company,
        raw_details: rawDetails,
        summary_json: summaryJson,
        insurance_type: insuranceType || '종합보험',
        tags: tags || [],
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: '상품 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: '상품이 성공적으로 수정되었습니다.', product: data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: '상품 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: '상품이 성공적으로 삭제되었습니다.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
