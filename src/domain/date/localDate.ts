/**
 * 「1日」はユーザー端末のローカル日付(SPEC 2章)。
 * domain層の規約: 現在時刻は必ず引数で受け取る(Date.now()直呼び禁止)。
 */

/** 'YYYY-MM-DD' 形式のローカル日付文字列 */
export type LocalDate = string

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** 実行環境(=端末)のタイムゾーンでのローカル日付を返す */
export function formatLocalDate(now: Date): LocalDate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${mm}-${dd}`
}

/** 'YYYY-MM' (カレンダー・月間ランキングの集計キー) */
export function monthOf(date: LocalDate): string {
  return date.slice(0, 7)
}

/** UTC基準の日付文字列(サーバー受理窓の計算用) */
function utcDateString(instant: Date): LocalDate {
  return instant.toISOString().slice(0, 10)
}

/**
 * サーバー受理窓(SPEC 6.3): クライアントが申告したローカル日付が、
 * サーバー現在時刻から見て「実在しうるローカル日付」の範囲に収まるか。
 * 地球上のタイムゾーンは UTC-12〜UTC+14 のため、余裕をみて ±windowHours で判定する。
 */
export function isWithinServerAcceptanceWindow(
  clientDate: LocalDate,
  serverNow: Date,
  windowHours = 26,
): boolean {
  if (!isLocalDate(clientDate)) return false
  const windowMs = windowHours * 60 * 60 * 1000
  const earliest = utcDateString(new Date(serverNow.getTime() - windowMs))
  const latest = utcDateString(new Date(serverNow.getTime() + windowMs))
  return earliest <= clientDate && clientDate <= latest
}
