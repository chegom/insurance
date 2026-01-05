import { supabaseAdmin } from './supabase'

/**
 * Storage에서 파일을 다운로드하여 Uint8Array로 반환
 */
export async function downloadFileFromStorage(fileUrl: string): Promise<Uint8Array | null> {
  try {
    // Supabase Storage public URL 형식: 
    // https://[project-id].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    
    // pathParts 예: ['storage', 'v1', 'object', 'public', 'insurance-files', 'products', '1234567890-file.pdf']
    const publicIndex = pathParts.indexOf('public')
    if (publicIndex === -1 || publicIndex >= pathParts.length - 1) {
      console.error('잘못된 Storage URL 형식:', fileUrl)
      return null
    }
    
    const bucketName = pathParts[publicIndex + 1]
    const filePath = pathParts.slice(publicIndex + 2).join('/')
    
    // Storage에서 파일 다운로드
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .download(filePath)
    
    if (error) {
      console.error('파일 다운로드 오류:', error)
      return null
    }
    
    if (!data) {
      return null
    }
    
    // Blob을 ArrayBuffer로 변환 후 Uint8Array로 변환
    const arrayBuffer = await data.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (error) {
    console.error('파일 다운로드 중 오류:', error)
    return null
  }
}

