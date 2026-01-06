'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Loader2, Building2, Calendar, Eye, Search, Edit, Trash2, X, Tag, Upload, FileText } from 'lucide-react'
import { Product } from '@/types/database'

// Supabase 클라이언트 (클라이언트 사이드용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const INSURANCE_TYPES = ['종합보험', '자동차보험', '자녀보험', '화재보험'] as const

export default function AdminPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    rawDetails: '',
    insuranceType: '종합보험' as string,
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async (search?: string, tag?: string) => {
    try {
      setIsLoadingProducts(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (tag) params.append('tag', tag)
      
      const response = await fetch(`/api/admin/products?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    fetchProducts(query || undefined, selectedTag || undefined)
  }

  const handleTagFilter = (tag: string | null) => {
    setSelectedTag(tag)
    fetchProducts(searchQuery || undefined, tag || undefined)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입 확인
    if (file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'PDF 파일만 업로드 가능합니다.' })
      return
    }

    // Supabase 클라이언트 확인
    if (!supabase) {
      setMessage({ type: 'error', text: 'Supabase 연결이 설정되지 않았습니다.' })
      return
    }

    setIsUploadingFile(true)
    setMessage(null)
    setUploadedFileName(null)

    try {
      // 1. Supabase Storage에 직접 업로드 (서버리스 함수 우회)
      const fileName = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      setMessage({ type: 'success', text: '파일을 Storage에 업로드 중...' })
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('insurance-files')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage 업로드 오류:', uploadError)
        throw new Error(`파일 업로드 실패: ${uploadError.message}`)
      }

      // 2. 업로드된 파일 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('insurance-files')
        .getPublicUrl(fileName)

      const fileUrl = urlData.publicUrl
      console.log('파일 업로드 완료:', fileUrl)

      setMessage({ type: 'success', text: 'AI가 PDF에서 정보를 추출 중... (대용량 파일은 시간이 걸릴 수 있습니다)' })

      // 3. 서버에서 파일 처리 요청 (파일 경로만 전송)
      const response = await fetch('/api/admin/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: fileName,
          fileUrl: fileUrl,
          fileName: file.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '파일 처리에 실패했습니다.')
      }

      // 추출된 텍스트를 rawDetails에 추가
      const extractedText = data.text
      if (extractedText && extractedText.trim().length > 0) {
        const currentDetails = formData.rawDetails.trim()
        const newDetails = currentDetails 
          ? `${currentDetails}\n\n--- 업로드된 파일 내용 (${file.name}) ---\n\n${extractedText}`
          : extractedText
        
        setFormData({ ...formData, rawDetails: newDetails })
        setUploadedFileName(file.name)
        setUploadedFile(null) // 파일 객체는 저장하지 않음 (이미 Storage에 있음)
        
        setMessage({ 
          type: 'success', 
          text: `파일에서 핵심 정보를 추출했습니다! "상품 추가 및 AI 요약" 버튼을 클릭하세요.` 
        })
      } else {
        throw new Error('파일에서 텍스트를 추출할 수 없습니다.')
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
      })
    } finally {
      setIsUploadingFile(false)
      // 파일 input 초기화
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      // 업로드된 파일이 있으면 FormData로 전송, 없으면 JSON으로 전송
      let response: Response
      
      if (uploadedFile) {
        // 파일이 있으면 FormData로 전송
        const formDataToSend = new FormData()
        formDataToSend.append('file', uploadedFile)
        formDataToSend.append('name', formData.name)
        formDataToSend.append('company', formData.company)
        formDataToSend.append('rawDetails', formData.rawDetails)
        formDataToSend.append('insuranceType', formData.insuranceType)
        formDataToSend.append('tags', JSON.stringify(formData.tags))
        
        response = await fetch('/api/admin/add-product', {
          method: 'POST',
          body: formDataToSend,
        })
      } else {
        // 파일이 없으면 기존 방식대로 JSON으로 전송
        response = await fetch('/api/admin/add-product', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            company: formData.company,
            rawDetails: formData.rawDetails,
            insuranceType: formData.insuranceType,
            tags: formData.tags,
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || '상품 추가에 실패했습니다.'
        const errorDetails = data.details ? `\n상세: ${data.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      if (data.data && data.data.summary_json) {
        const summary = data.data.summary_json
        const hasValidSummary = summary.keyBenefits && 
                                Array.isArray(summary.keyBenefits) && 
                                summary.keyBenefits.length > 0
        
        if (!hasValidSummary) {
          throw new Error('입력된 정보로부터 유효한 보험 요약을 생성할 수 없습니다. 더 자세한 보험 정보를 입력해주세요.')
        }
      }

      setMessage({ type: 'success', text: '상품이 성공적으로 추가되었습니다!' })
      setFormData({ name: '', company: '', rawDetails: '', insuranceType: '종합보험', tags: [] })
      setTagInput('')
      setUploadedFileName(null)
      setUploadedFile(null)
      fetchProducts(searchQuery || undefined, selectedTag || undefined)
    } catch (error) {
      console.error('Error submitting form:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      company: product.company,
      rawDetails: product.raw_details,
      insuranceType: product.insurance_type || '종합보험',
      tags: product.tags || [],
    })
  }

  const handleUpdate = async () => {
    if (!editingProduct) return

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          rawDetails: formData.rawDetails,
          insuranceType: formData.insuranceType,
          tags: formData.tags,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '상품 수정에 실패했습니다.')
      }

      setMessage({ type: 'success', text: '상품이 성공적으로 수정되었습니다!' })
      setEditingProduct(null)
      setFormData({ name: '', company: '', rawDetails: '', insuranceType: '종합보험', tags: [] })
      setTagInput('')
      setUploadedFileName(null)
      setUploadedFile(null)
      fetchProducts(searchQuery || undefined, selectedTag || undefined)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '상품 삭제에 실패했습니다.')
      }

      setMessage({ type: 'success', text: '상품이 성공적으로 삭제되었습니다!' })
      setDeleteConfirm(null)
      fetchProducts(searchQuery || undefined, selectedTag || undefined)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getAllTags = () => {
    const tags = new Set<string>()
    products.forEach(product => {
      if (product.tags) {
        product.tags.forEach(tag => tags.add(tag))
      }
    })
    return Array.from(tags)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">관리자 페이지</h1>
          </div>
          <p className="text-gray-600">보험 상품 정보를 업로드하고 AI로 요약합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 상품 추가/수정 폼 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{editingProduct ? '상품 수정' : '새 상품 추가'}</CardTitle>
                <CardDescription>
                  {editingProduct 
                    ? '상품 정보를 수정하고 AI 요약을 재생성합니다.'
                    : '상품 정보를 입력하면 AI가 자동으로 주요 내용을 요약합니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingProduct ? (e) => { e.preventDefault(); handleUpdate(); } : handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">상품명</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="예: 종신보험 플러스"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">보험사</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="예: 삼성생명"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insuranceType">보험 종류</Label>
                    <Select
                      value={formData.insuranceType}
                      onValueChange={(value) => setFormData({ ...formData, insuranceType: value })}
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
                    <Label htmlFor="fileUpload">약관 업로드</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="fileUpload"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploadingFile}
                      />
                      <label htmlFor="fileUpload" className="w-full">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingFile}
                          className="cursor-pointer w-full"
                          asChild
                        >
                          <span>
                            {isUploadingFile ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                업로드 중...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                업로드
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                    {uploadedFileName && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                        <FileText className="h-4 w-4" />
                        <span>업로드됨: {uploadedFileName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawDetails">추가 내용 (선택사항)</Label>
                    <Textarea
                      id="rawDetails"
                      value={formData.rawDetails}
                      onChange={(e) => setFormData({ ...formData, rawDetails: e.target.value })}
                      placeholder="보험 약관, 주요 보장 내용, 보험료 정보 등을 입력하거나 PDF 파일을 업로드하세요..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">태그 (선택사항)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        placeholder="태그 입력 후 Enter"
                      />
                      <Button type="button" onClick={handleAddTag} variant="outline">
                        추가
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {message && (
                    <div
                      className={`p-4 rounded-md ${
                        message.type === 'success'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {editingProduct && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(null)
                          setFormData({ name: '', company: '', rawDetails: '', insuranceType: '종합보험', tags: [] })
                          setTagInput('')
                          setUploadedFileName(null)
                          setUploadedFile(null)
                        }}
                        className="flex-1"
                      >
                        취소
                      </Button>
                    )}
                    <Button type="submit" disabled={isLoading} className={editingProduct ? 'flex-1' : 'w-full'}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingProduct ? '수정 중...' : 'AI가 분석 중입니다...'}
                        </>
                      ) : (
                        editingProduct ? '상품 수정' : '상품 추가 및 AI 요약'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* 상품 리스트 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>등록된 상품 목록</CardTitle>
                <CardDescription>
                  등록된 보험 상품을 검색, 수정, 삭제할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 검색 및 필터 */}
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="상품명, 보험사, 내용으로 검색..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {getAllTags().length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedTag === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTagFilter(null)}
                      >
                        전체
                      </Button>
                      {getAllTags().map((tag) => (
                        <Button
                          key={tag}
                          variant={selectedTag === tag ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTagFilter(tag)}
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {isLoadingProducts ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>등록된 상품이 없습니다.</p>
                    <p className="text-sm mt-2">위 폼을 사용하여 상품을 추가하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  <span>{product.company}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(product.created_at)}</span>
                                </div>
                              </div>
                              {product.tags && product.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {product.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                                    >
                                      <Tag className="inline h-3 w-3 mr-1" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {product.summary_json.keyBenefits && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500 mb-1">주요 혜택:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {product.summary_json.keyBenefits.slice(0, 3).map((benefit, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                      >
                                        {benefit}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/products/${product.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteConfirm(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 삭제 확인</DialogTitle>
            <DialogDescription>
              정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
