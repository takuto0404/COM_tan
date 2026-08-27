/** セット完走の結果画面。Phase 2で「次に進む」(連続進行)とクリア記録に接続する */
import Link from 'next/link'
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
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4"
      data-testid="quiz-result"
    >
      <h1 className="text-center text-2xl font-bold">セット{setNumber} 完走!</h1>
      <p className="text-center text-gray-600">
        初回正解 {result.firstTryCorrectCount} / {questions.length}
      </p>

      <ol className="flex flex-col gap-2">
        {questions.map((q, i) => {
          const r = result.results[i]
          return (
            <li
              key={q.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <span
                aria-hidden
                className={`text-xl font-bold ${r?.firstTryCorrect ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {r?.firstTryCorrect ? '○' : '×'}
              </span>
              <div>
                <p className="font-bold">{q.headword}</p>
                {q.meaning && <p className="text-sm text-gray-600">{q.meaning}</p>}
              </div>
            </li>
          )
        })}
      </ol>

      <Link
        href="/"
        data-testid="quiz-go-home"
        className="mt-auto rounded-xl bg-blue-600 py-4 text-center text-lg font-bold text-white"
      >
        ホームへ
      </Link>
    </main>
  )
}
