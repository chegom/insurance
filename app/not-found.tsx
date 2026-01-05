import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <FileQuestion className="h-8 w-8 text-blue-600" />
            <CardTitle>페이지를 찾을 수 없습니다</CardTitle>
          </div>
          <CardDescription>
            요청하신 페이지가 존재하지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            페이지가 이동되었거나 삭제되었을 수 있습니다.
          </div>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                홈으로
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/admin">관리자 페이지</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

