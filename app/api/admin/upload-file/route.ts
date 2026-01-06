import { NextRequest, NextResponse } from 'next/server'
import { generateProductSummary } from '@/lib/openai'

// Node.js 런타임에서만 pdf-parse 사용
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 큰 파일 처리 시간을 위해 60초로 설정

// pdf-parse를 사용하여 PDF 파싱 (서버리스 환경 호환 - v1.1.1)
async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse 1.x API 사용
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    
    const data = await pdfParse(buffer)
    
    if (!data.text || !data.text.trim()) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다.')
    }
    
    return data.text.trim()
  } catch (error) {
    console.error('PDF 파싱 오류:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 업로드되지 않았습니다.' },
        { status: 400 }
      )
    }

    // 파일 타입 확인
    const fileType = file.type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'PDF 또는 Word 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 50MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // PDF 파일 처리
    if (fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      try {
        const extractedText = await parsePdf(buffer)

        if (!extractedText || extractedText.trim().length === 0) {
          return NextResponse.json(
            { error: 'PDF 파일에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다.' },
            { status: 400 }
          )
        }

        // AI 분석 수행
        let aiSummary = null
        try {
          if (extractedText.trim().length > 0) {
            aiSummary = await generateProductSummary(extractedText)
            console.log('AI 분석 완료:', aiSummary)
          }
        } catch (aiError) {
          console.error('AI 분석 오류:', aiError)
          // AI 분석 실패해도 텍스트는 반환
        }

        return NextResponse.json(
          { 
            success: true,
            text: extractedText,
            fileName: file.name,
            fileSize: file.size,
            aiSummary: aiSummary // AI 분석 결과 포함
          },
          { status: 200 }
        )
      } catch (pdfError) {
        console.error('PDF 파싱 오류:', pdfError)
        const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error'
        const errorStack = pdfError instanceof Error ? pdfError.stack : undefined
        console.error('에러 상세:', { errorMessage, errorStack })
        
        return NextResponse.json(
          { 
            error: 'PDF 파일을 읽는 중 오류가 발생했습니다.',
            details: errorMessage
          },
          { status: 500 }
        )
      }
    } else {
      // Word 파일은 현재 지원하지 않음
      return NextResponse.json(
        { error: '현재 PDF 파일만 지원합니다. Word 파일 지원은 준비 중입니다.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    return NextResponse.json(
      { 
        error: '파일 업로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

