'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import { ReportRenderer } from '@/components/ReportRenderer'

const INSURANCE_TYPES = ['종합보험', '자동차보험', '자녀보험', '화재보험'] as const

export default function HomePage() {
  const [customerInfo, setCustomerInfo] = useState({
    age: '',
    gender: '',
    job: '',
    income: '',
    medicalHistory: '',
    familyHistory: '',
    lifestyle: '',
  })
  const [currentInsurance, setCurrentInsurance] = useState('')
  const [currentInsuranceType, setCurrentInsuranceType] = useState('종합보험')
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!customerInfo.age || !customerInfo.gender || !customerInfo.job || !currentInsurance) {
      setError('필수 필드(연령, 성별, 직업, 현재 보험 정보)를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo: {
            age: parseInt(customerInfo.age),
            gender: customerInfo.gender,
            job: customerInfo.job,
            income: customerInfo.income || undefined,
            medicalHistory: customerInfo.medicalHistory || undefined,
            familyHistory: customerInfo.familyHistory || undefined,
            lifestyle: customerInfo.lifestyle || undefined,
          },
          currentInsurance,
          currentInsuranceType: currentInsuranceType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '분석에 실패했습니다.')
      }

      setAnalysisResult(data.analysis)
    } catch (error) {
      setError(error instanceof Error ? error.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-[95%] xl:max-w-[1600px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">보험 분석 어시스턴트</h1>
          </div>
          <p className="text-gray-600">고객의 현재 보험과 추천 상품을 AI로 비교 분석합니다.</p>
        </div>

        <div className={`grid gap-6 ${analysisResult ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Left Column - Input */}
          {!analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle>고객 정보 입력</CardTitle>
              <CardDescription>고객 정보와 현재 보험 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">고객 프로필</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">연령 <span className="text-red-500">*</span></Label>
                    <Input
                      id="age"
                      type="number"
                      value={customerInfo.age}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, age: e.target.value })
                      }
                      placeholder="예: 35"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">성별 <span className="text-red-500">*</span></Label>
                    <Input
                      id="gender"
                      value={customerInfo.gender}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, gender: e.target.value })
                      }
                      placeholder="예: 남성"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job">직업 <span className="text-red-500">*</span></Label>
                  <Input
                    id="job"
                    value={customerInfo.job}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, job: e.target.value })
                    }
                    placeholder="예: 회사원"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">월 수입 (선택사항)</Label>
                  <Input
                    id="income"
                    type="number"
                    value={customerInfo.income}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, income: e.target.value })
                    }
                    placeholder="예: 5000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">병력 (선택사항)</Label>
                  <Textarea
                    id="medicalHistory"
                    value={customerInfo.medicalHistory}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, medicalHistory: e.target.value })
                    }
                    placeholder="과거 질병, 수술 이력 등을 입력하세요..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="familyHistory">가족 병력 (선택사항)</Label>
                  <Textarea
                    id="familyHistory"
                    value={customerInfo.familyHistory}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, familyHistory: e.target.value })
                    }
                    placeholder="가족의 주요 질병 이력을 입력하세요..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lifestyle">생활습관 (선택사항)</Label>
                  <Textarea
                    id="lifestyle"
                    value={customerInfo.lifestyle}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, lifestyle: e.target.value })
                    }
                    placeholder="흡연 여부, 운동 습관, 음주 등 생활습관을 입력하세요..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">현재 보험 정보</h3>
                <div className="space-y-2">
                  <Label htmlFor="currentInsuranceType">보험 종류 <span className="text-red-500">*</span></Label>
                  <Select
                    value={currentInsuranceType}
                    onValueChange={setCurrentInsuranceType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="보험 종류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentInsurance">보험 상세 내용 <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="currentInsurance"
                    value={currentInsurance}
                    onChange={(e) => setCurrentInsurance(e.target.value)}
                    placeholder="현재 가입한 보험의 상품명, 주요 보장 내용, 보험료 등을 입력하세요..."
                    className="min-h-[200px]"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}

              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    분석 및 비교하기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          )}

          {/* Right Column - Output */}
          <Card className={analysisResult ? 'lg:col-span-full' : 'lg:col-span-2'}>
            <CardHeader>
              <CardTitle>📋 보험 분석 보고서</CardTitle>
              <CardDescription>AI가 생성한 전문적인 보험 분석 보고서입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnalysisResult(null)
                        setError(null)
                      }}
                    >
                      새로 분석하기
                    </Button>
                  </div>
                  <div className="bg-white p-6 md:p-10 lg:p-12 rounded-xl border-2 border-blue-200 shadow-xl">
                    <ReportRenderer content={analysisResult} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>왼쪽에서 고객 정보를 입력하고 분석 버튼을 클릭하세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

