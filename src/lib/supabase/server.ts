import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * サーバー専用のservice roleクライアント(RLSをバイパスする)。
 * クライアントコンポーネントからimportするとビルドエラーになる('server-only')。
 * 認証導入(Phase 3)後は、ユーザー文脈の読み取りはセッション付きクライアントに移す。
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です(.env.local を確認)',
    )
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
