import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { extractKeyInfoFromPDF } from '@/lib/openai'

// Node.js 런타임
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 (대용량 PDF 처리)

// PostgreSQL이 처리할 수 없는 문자 제거
function sanitizeText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\x00/g, '')
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/\\/g, '\\\\')
}

// pdf-parse를 사용하여 PDF 파싱
async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    
    if (!data.text || !data.text.trim()) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다.')
    }
    
    return sanitizeText(data.text.trim())
  } catch (error) {
    console.error('PDF 파싱 오류:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, fileUrl, fileName } = body

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다.' },
        { status: 400 }
      )
    }

    // 환경변수 확인
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log('파일 처리 시작:', filePath)

    // Supabase Storage에서 파일 다운로드
    const supabase = getSupabaseAdmin()
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('insurance-files')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('파일 다운로드 오류:', downloadError)
      return NextResponse.json(
        { error: '파일을 다운로드할 수 없습니다.', details: downloadError?.message },
        { status: 500 }
      )
    }

    console.log('파일 다운로드 완료, 크기:', fileData.size)

    // Blob을 Buffer로 변환
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // PDF 파싱
    let extractedText = ''
    try {
      extractedText = await parsePdf(buffer)
      console.log('PDF 파싱 완료, 텍스트 길이:', extractedText.length)
    } catch (parseError) {
      console.error('PDF 파싱 오류:', parseError)
      return NextResponse.json(
        { error: 'PDF 파싱에 실패했습니다.', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // 텍스트가 너무 길면 AI로 핵심 정보 추출
    if (extractedText.length > 100000) {
      console.log('텍스트가 너무 깁니다. AI로 핵심 정보를 추출합니다...')
      try {
        extractedText = await extractKeyInfoFromPDF(extractedText)
        console.log('AI 추출 완료, 결과 길이:', extractedText.length)
      } catch (extractError) {
        console.error('AI 추출 오류:', extractError)
        // AI 추출 실패 시 앞부분만 사용
        extractedText = extractedText.substring(0, 100000) + '\n\n... (내용이 너무 길어 일부만 저장됨)'
      }
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: fileName,
      fileUrl: fileUrl,
      originalLength: buffer.length,
      extractedLength: extractedText.length,
    })

  } catch (error) {
    console.error('파일 처리 오류:', error)
    return NextResponse.json(
      { 
        error: '파일 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

