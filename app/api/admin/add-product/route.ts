import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { generateProductSummary, extractKeyInfoFromPDF } from '@/lib/openai'
import { validateProductInput } from '@/lib/validation'
import { downloadFileFromStorage } from '@/lib/storage'

// Node.js 런타임에서만 pdf-parse 사용
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 대용량 PDF 처리를 위해 5분으로 증가

// PostgreSQL이 처리할 수 없는 문자 제거
function sanitizeText(text: string): string {
  if (!text) return ''
  
  return text
    // null 바이트 제거
    .replace(/\x00/g, '')
    // 잘못된 유니코드 이스케이프 시퀀스 제거
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
    // 제어 문자 제거 (탭, 줄바꿈, 캐리지 리턴 제외)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 잘못된 서로게이트 쌍 제거
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    // 백슬래시 이스케이프 처리
    .replace(/\\/g, '\\\\')
}

// pdf-parse를 사용하여 PDF 파싱 (v1.1.1)
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
    // Content-Type 확인하여 FormData인지 JSON인지 판단
    const contentType = request.headers.get('content-type') || ''
    let name: string, company: string, rawDetails: string, insuranceType: string, tags: string[]
    let file: File | null = null
    
    if (contentType.includes('multipart/form-data')) {
      // FormData로 전송된 경우
      const formData = await request.formData()
      file = formData.get('file') as File | null
      name = formData.get('name') as string || ''
      company = formData.get('company') as string || ''
      rawDetails = formData.get('rawDetails') as string || ''
      insuranceType = formData.get('insuranceType') as string || '종합보험'
      const tagsStr = formData.get('tags') as string || '[]'
      try {
        tags = JSON.parse(tagsStr)
      } catch {
        tags = []
      }
    } else {
      // JSON으로 전송된 경우
      const body = await request.json()
      name = body.name || ''
      company = body.company || ''
      rawDetails = body.rawDetails || ''
      insuranceType = body.insuranceType || '종합보험'
      tags = body.tags || []
    }

    if (!name || !company) {
      return NextResponse.json(
        { error: '상품명과 보험사는 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    // 파일이 있으면 Supabase Storage에 저장하고 PDF 파싱하여 텍스트 추출
    let details = rawDetails || ''
    let fileUrl: string | null = null
    
    if (file && file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // 파일을 Supabase Storage에 저장
        const fileName = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { data: uploadData, error: uploadError } = await getSupabaseAdmin().storage
          .from('insurance-files')
          .upload(fileName, arrayBuffer, {
            contentType: 'application/pdf',
            upsert: false,
          })
        
        if (uploadError) {
          console.error('파일 업로드 오류:', uploadError)
          // 파일 업로드 실패해도 계속 진행
        } else {
          // Public URL 생성
          const { data: urlData } = getSupabaseAdmin().storage
            .from('insurance-files')
            .getPublicUrl(fileName)
          
          fileUrl = urlData.publicUrl
          console.log('파일이 Storage에 저장되었습니다:', fileUrl)
        }
        
        // PDF 파싱하여 텍스트 추출
        let extractedText = ''
        try {
          extractedText = await parsePdf(buffer)
          console.log('PDF 파싱 성공, 추출된 텍스트 길이:', extractedText.length)
          
          // 텍스트가 너무 길면 (약 100K자 이상) AI로 핵심 정보만 추출
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
        } catch (parseError) {
          console.error('PDF 파싱 오류:', parseError)
          // 파싱 실패해도 계속 진행
        }
        
        // 기존 내용이 있으면 추가, 없으면 그대로 사용
        if (extractedText && extractedText.trim().length > 0) {
          details = details.trim()
            ? `${details}\n\n--- 업로드된 파일 내용 (${file.name}) ---\n\n${extractedText}`
            : extractedText
          console.log('추출된 텍스트를 details에 추가했습니다. 길이:', details.length)
        } else {
          console.warn('PDF에서 텍스트를 추출하지 못했습니다. 파일명과 기본 정보로 분석을 시도합니다.')
          // 텍스트 추출 실패 시에도 파일 정보로 분석 시도
          if (!details.trim()) {
            details = `보험 상품명: ${name}\n보험사: ${company}\n파일명: ${file.name}\n\n이 파일은 PDF 약관 문서입니다.`
          }
        }
      } catch (pdfError) {
        console.error('PDF 처리 중 오류:', pdfError)
        // PDF 처리 실패해도 계속 진행
        if (!details.trim()) {
          details = `보험 상품명: ${name}\n보험사: ${company}\n파일명: ${file?.name || '알 수 없음'}\n\nPDF 파일 처리 중 오류가 발생했습니다.`
        }
      }
    }

    // 입력 데이터 검증 (파일이 있으면 검증 완화)
    // 파일이 업로드된 경우 details가 비어있어도 허용 (PDF에서 추출할 예정)
    const hasFile = !!(file && file.type === 'application/pdf')
    const validation = validateProductInput(name, company, details, hasFile)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || '입력 데이터가 유효하지 않습니다.' },
        { status: 400 }
      )
    }

    // 환경 변수 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY가 설정되지 않았습니다.')
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // Gemini API로 상품 요약 생성
    let summaryJson
    try {
      console.log('AI 분석 시작 - 파일 있음:', !!file, 'details 길이:', details.length)
      
      // 파일이 있거나 details가 있으면 무조건 AI 분석 수행
      if (file || details.trim().length > 0) {
        // details가 비어있거나 너무 짧으면 파일 정보로 보강
        if (details.trim().length < 20 && file) {
          const fileInfo = `보험 상품명: ${name}\n보험사: ${company}\n파일명: ${file.name}\n파일 크기: ${(file.size / 1024).toFixed(2)} KB\n\n`
          details = details.trim() ? `${fileInfo}${details}` : `${fileInfo}이 파일은 보험 약관 PDF 문서입니다.`
          console.log('details가 짧아서 파일 정보를 추가했습니다:', details.substring(0, 100))
        }
        
        // AI 분석 수행
        try {
          console.log('AI 분석 시작, 입력 텍스트 길이:', details.length)
          summaryJson = await generateProductSummary(details)
          console.log('AI 분석 완료:', JSON.stringify(summaryJson).substring(0, 200))
        } catch (aiError) {
          console.error('AI 분석 오류:', aiError)
          // AI 분석 실패 시 기본값 설정
          summaryJson = {
            keyBenefits: ['AI 분석 중 오류가 발생했습니다. PDF 파일을 확인해주세요.'],
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
      } else {
        // 파일도 없고 details도 없으면 기본 정보만으로 요약 생성
        summaryJson = {
          keyBenefits: ['추가 정보가 필요합니다.'],
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
      console.log('최종 summaryJson:', JSON.stringify(summaryJson).substring(0, 300))
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError)
      return NextResponse.json(
        { 
          error: 'AI 요약 생성 중 오류가 발생했습니다.',
          details: geminiError instanceof Error ? geminiError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Supabase에 저장 (텍스트 정제 적용)
    const { data, error } = await getSupabase()
      .from('products')
      .insert([
        {
          name: sanitizeText(name),
          company: sanitizeText(company),
          raw_details: sanitizeText(details),
          summary_json: summaryJson,
          insurance_type: insuranceType || '종합보험',
          tags: tags || [],
          file_url: fileUrl, // 파일 URL 저장
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { 
          error: '상품 저장 중 오류가 발생했습니다.',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: '상품이 성공적으로 추가되었습니다.', data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding product:', error)
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

