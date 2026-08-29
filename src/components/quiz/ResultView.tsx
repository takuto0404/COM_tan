/** セット完走の結果画面。Phase 2で「次に進む」(連続進行)とクリア記録に接続する */
import Link from 'next/link'
import { SectionBar } from '@/components/ui/SectionBar'
import type { QuizQuestion, SetResult } from '@/domain/quiz/types'

export function ResultView({
  setNumber,
  questions,
  result,
}: {
  setNumber: number
  questions: QuizQuestion[]
  result: SetResult
}) {
  return (
    <div className="flex flex-1 flex-col" data-testid="quiz-result">
      <SectionBar>セット{setNumber} 結果</SectionBar>

      <div className="flex flex-col items-center gap-1 border-b border-gray-200 py-5">
        <p className="text-2xl font-black text-cta">完走!</p>
        <p className="text-gray-700">
          初回正解 {result.firstTryCorrectCount} / {questions.length}
        </p>
      </div>

      <ol>
        {questions.map((q, i) => {
          const r = result.results[i]
          return (
            <li
              key={q.id}
              className="flex items-center gap-4 border-b border-gray-200 px-4 py-3"
            >
              <span
                aria-hidden
                className={`w-7 text-center text-2xl font-black ${
                  r?.firstTryCorrect ? 'text-cta' : 'text-brand'
                }`}
              >
                {r?.firstTryCorrect ? '○' : '✕'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{q.headword}</p>
                {q.meaning && (
                  <p className="truncate text-sm text-gray-600">{q.meaning}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-auto px-4 py-4">
        <Link
          href="/"
          data-testid="quiz-go-home"
          className="block w-full rounded-full bg-linear-to-b from-brand to-brand-dark py-4 text-center text-xl font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none"
        >
          ホームへ
        </Link>
      </div>
    </div>
  )
}
