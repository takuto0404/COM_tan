import Link from 'next/link'
import { SectionBar } from '@/components/ui/SectionBar'

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col">
      <SectionBar>COM単ホーム</SectionBar>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-linear-to-b from-sky-400 via-sky-500 to-blue-700 px-6 py-10">
        <div className="text-center">
          <h1
            data-testid="landing-title"
            className="text-5xl font-black italic tracking-tight text-accent drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)]"
          >
            COM単
          </h1>
          <p className="mt-3 font-bold text-white drop-shadow">
            単語帳「COM単」の学習効果をあげる英単語学習アプリ
          </p>
        </div>
        <Link
          href="/sets/1/play"
          className="w-full max-w-sm rounded-full bg-linear-to-b from-[#fca42d] to-cta-dark py-5 text-center text-2xl font-bold text-white shadow-[0_6px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none"
        >
          問題を始める
        </Link>
      </div>
    </main>
  )
}
