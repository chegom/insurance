import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')

    let query = supabase
      .from('products')
      .select('*')

    // 검색 기능
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,raw_details.ilike.%${search}%`)
    }

    // 태그 필터링
    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: products, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: '상품 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ products: products || [] }, { status: 200 })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

