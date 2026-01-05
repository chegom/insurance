import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 환경 변수 체크 함수 (런타임에 호출)
export function checkSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
}

// Supabase 클라이언트 (lazy initialization)
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    checkSupabaseEnv()
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

export const getSupabaseAdmin = (): SupabaseClient => {
  if (!_supabaseAdmin) {
    checkSupabaseEnv()
    _supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : getSupabase()
  }
  return _supabaseAdmin
}

// 하위 호환성을 위한 export (런타임에만 사용)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as unknown as SupabaseClient

export const supabaseAdmin = supabaseUrl && supabaseAnonKey
  ? (supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : supabase)
  : null as unknown as SupabaseClient

