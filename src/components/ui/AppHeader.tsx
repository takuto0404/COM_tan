/** ネイビー地+黄色ロゴのアプリヘッダー(docs/design/ 参照) */
import Link from 'next/link'

export function AppHeader() {
  return (
    <header className="border-b-2 border-accent bg-brand">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/" className="flex items-baseline gap-1">
          <span className="text-2xl font-black italic tracking-tight text-accent">
            COM
          </span>
          <span className="text-2xl font-black text-white">単</span>
          <span className="ml-1 text-xs font-bold text-accent">[コムタン]</span>
        </Link>
        {/* ハンバーガーメニュー(ナビゲーションはPhase 2以降で接続) */}
        <span aria-hidden className="flex flex-col gap-1.5 p-2">
          <span className="block h-0.5 w-7 rounded bg-white" />
          <span className="block h-0.5 w-7 rounded bg-white" />
          <span className="block h-0.5 w-7 rounded bg-white" />
        </span>
      </div>
    </header>
  )
}
