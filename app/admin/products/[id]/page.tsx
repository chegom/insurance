'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2, Calendar, FileText, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Product } from '@/types/database'
import ReactMarkdown from 'react-markdown'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [structuredDetails, setStructuredDetails] = useState<string | null>(null)
  const [isGeneratingStructured, setIsGeneratingStructured] = useState(false)
  const [updatedSummary, setUpdatedSummary] = useState<Product['summary_json'] | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/admin/products/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '상품을 불러올 수 없습니다.')
        }

        setProduct(data.product)
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  const handleGenerateStructured = async () => {
    if (!product) return

    setIsGeneratingStructured(true)
    try {
      const response = await fetch(`/api/admin/products/${params.id}/structured`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '구조화된 정보 생성에 실패했습니다.')
      }

      setStructuredDetails(data.structuredDetails)
      
      // 요약 정보도 업데이트
      if (data.summaryJson) {
        setUpdatedSummary(data.summaryJson)
        // 상품 정보도 업데이트
        setProduct({ ...product!, summary_json: data.summaryJson })
      }
    } catch (err) {
      console.error('Error generating structured details:', err)
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsGeneratingStructured(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">{error || '상품을 찾을 수 없습니다.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span>{product.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{formatDate(product.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 상세 정보 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle>상품 상세 정보</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateStructured}
                  disabled={isGeneratingStructured}
                >
                  {isGeneratingStructured ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      AI로 정리하기
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                {structuredDetails 
                  ? 'AI가 구조화하여 정리한 정보입니다.' 
                  : '입력하신 상품 정보입니다. "AI로 정리하기" 버튼을 클릭하면 구조화된 레이아웃으로 정리됩니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">상품명</h3>
                <p className="text-gray-700">{product.name}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">보험사</h3>
                <p className="text-gray-700">{product.company}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  {structuredDetails ? '구조화된 상세 내용' : '원본 상세 내용'}
                </h3>
                <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                  {structuredDetails ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{structuredDetails}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {product.raw_details}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 요약 정보 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <CardTitle>AI 요약 정보</CardTitle>
              </div>
              <CardDescription>AI가 분석한 주요 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">주요 혜택</h3>
                <ul className="space-y-2">
                  {product.summary_json.keyBenefits?.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">갱신 유형</h3>
                <p className="text-gray-700">{product.summary_json.renewalType}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">주요 보장 내용</h3>
                <div className="space-y-2">
                  {product.summary_json.majorCoverage?.death && (
                    <div>
                      <span className="font-medium text-gray-600">사망보험금: </span>
                      <span className="text-gray-700">{product.summary_json.majorCoverage.death}</span>
                    </div>
                  )}
                  {product.summary_json.majorCoverage?.medical && (
                    <div>
                      <span className="font-medium text-gray-600">의료비: </span>
                      <span className="text-gray-700">{product.summary_json.majorCoverage.medical}</span>
                    </div>
                  )}
                  {product.summary_json.majorCoverage?.disability && (
                    <div>
                      <span className="font-medium text-gray-600">장해보험금: </span>
                      <span className="text-gray-700">{product.summary_json.majorCoverage.disability}</span>
                    </div>
                  )}
                  {product.summary_json.majorCoverage?.other && (
                    <div>
                      <span className="font-medium text-gray-600">기타: </span>
                      <span className="text-gray-700">{product.summary_json.majorCoverage.other}</span>
                    </div>
                  )}
                </div>
              </div>

              {product.summary_json.premiumRange && (
                <div>
                  <h3 className="font-semibold mb-2">보험료 범위</h3>
                  <p className="text-gray-700">{product.summary_json.premiumRange}</p>
                </div>
              )}

              {product.summary_json.targetAge && (
                <div>
                  <h3 className="font-semibold mb-2">주요 가입 대상 연령대</h3>
                  <p className="text-gray-700">{product.summary_json.targetAge}</p>
                </div>
              )}

              {/* 추가 분석 항목 */}
              {product.summary_json.underwritingType && product.summary_json.underwritingType !== '정보 없음' && (
                <div>
                  <h3 className="font-semibold mb-2">가입 심사 유형</h3>
                  <p className="text-gray-700">
                    {product.summary_json.underwritingType === 'Standard' 
                      ? '표준체/일반심사 (건강한 사람 대상)' 
                      : product.summary_json.underwritingType === 'Simplified'
                      ? '간편심사/유병자 (아픈 사람도 가입 가능)'
                      : product.summary_json.underwritingType}
                  </p>
                </div>
              )}

              {product.summary_json.coverageScope && (
                <div>
                  <h3 className="font-semibold mb-3">3대 질병 보장 범위</h3>
                  <div className="space-y-2">
                    {product.summary_json.coverageScope.brain && product.summary_json.coverageScope.brain !== '정보 없음' && (
                      <div>
                        <span className="font-medium text-gray-600">뇌 질환: </span>
                        <span className="text-gray-700">
                          {product.summary_json.coverageScope.brain === 'Level 1' 
                            ? 'Level 1 (좁음: 뇌출혈만)'
                            : product.summary_json.coverageScope.brain === 'Level 2'
                            ? 'Level 2 (중간: 뇌졸중)'
                            : product.summary_json.coverageScope.brain === 'Level 3'
                            ? 'Level 3 (넓음: 뇌혈관질환 전체)'
                            : product.summary_json.coverageScope.brain}
                        </span>
                      </div>
                    )}
                    {product.summary_json.coverageScope.heart && product.summary_json.coverageScope.heart !== '정보 없음' && (
                      <div>
                        <span className="font-medium text-gray-600">심장 질환: </span>
                        <span className="text-gray-700">
                          {product.summary_json.coverageScope.heart === 'Level 1' 
                            ? 'Level 1 (좁음: 급성심근경색만)'
                            : product.summary_json.coverageScope.heart === 'Level 2'
                            ? 'Level 2 (넓음: 허혈성심장질환)'
                            : product.summary_json.coverageScope.heart}
                        </span>
                      </div>
                    )}
                    {product.summary_json.coverageScope.cancer && product.summary_json.coverageScope.cancer !== '정보 없음' && (
                      <div>
                        <span className="font-medium text-gray-600">암: </span>
                        <span className="text-gray-700">{product.summary_json.coverageScope.cancer}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product.summary_json.penaltyPeriod && (
                <div>
                  <h3 className="font-semibold mb-3">패널티 기간 (승환 계약 시 주의)</h3>
                  <div className="space-y-2">
                    {product.summary_json.penaltyPeriod.exemption && product.summary_json.penaltyPeriod.exemption !== '정보 없음' && (
                      <div>
                        <span className="font-medium text-gray-600">면책 기간: </span>
                        <span className="text-gray-700">{product.summary_json.penaltyPeriod.exemption}</span>
                        <span className="text-sm text-red-600 ml-2">(가입 후 돈을 아예 안 주는 기간)</span>
                      </div>
                    )}
                    {product.summary_json.penaltyPeriod.reduction && product.summary_json.penaltyPeriod.reduction !== '정보 없음' && (
                      <div>
                        <span className="font-medium text-gray-600">감액 기간: </span>
                        <span className="text-gray-700">{product.summary_json.penaltyPeriod.reduction}</span>
                        <span className="text-sm text-red-600 ml-2">(가입 후 돈을 일부만 주는 기간)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product.summary_json.renewalStructure && product.summary_json.renewalStructure !== '정보 없음' && (
                <div>
                  <h3 className="font-semibold mb-2">갱신 구조</h3>
                  <p className="text-gray-700">
                    {product.summary_json.renewalStructure === 'Renewal' 
                      ? '갱신형 (초기 보험료는 저렴하지만 10/20년 뒤 보험료 인상 가능)'
                      : product.summary_json.renewalStructure === 'Non-Renewal'
                      ? '비갱신형 (보험료 고정)'
                      : product.summary_json.renewalStructure}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

