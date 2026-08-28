import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import type { MediaUrlMap } from './ports'

const BUCKET = 'media'
/** 署名URLの有効期限(秒)。1セットの学習時間より十分長く */
const EXPIRES_IN = 60 * 60

/** ストレージパス群の署名付きURLをまとめて発行する(SPEC 3.1: 非公開バケット) */
export async function createSignedMediaUrls(paths: string[]): Promise<MediaUrlMap> {
  if (paths.length === 0) return {}
  const db = createAdminClient()
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrls(paths, EXPIRES_IN)
  if (error) throw error
  const map: MediaUrlMap = {}
  for (const entry of data) {
    if (entry.error || !entry.path || !entry.signedUrl) {
      throw new Error(`署名URLの発行に失敗: ${entry.path}: ${entry.error}`)
    }
    map[entry.path] = entry.signedUrl
  }
  return map
}
