/**
 * 解答表示(正解・誤答共通)。
 * イメージ画像は正誤を問わず必ず表示する(SPEC 4.3)。
 * 例文は answer_label(活用形)で穴を埋めた全文を表示する。
 */
import type { QuizQuestion } from '@/domain/quiz/types'
import { SentenceWithBlank } from './SentenceWithBlank'

export function AnswerReveal({
  question,
  correct,
  imageUrl,
  tipChecked,
  canNext,
  canRetry,
  onTipCheck,
  onNext,
  onRetry,
}: {
  question: QuizQuestion
  correct: boolean
  imageUrl: string
  tipChecked: boolean
  canNext: boolean
  canRetry: boolean
  onTipCheck: () => void
  onNext: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col gap-3" data-testid="quiz-reveal">
      <p
        data-testid={correct ? 'quiz-correct' : 'quiz-wrong'}
        className={`text-center text-2xl font-bold ${correct ? 'text-emerald-600' : 'text-rose-600'}`}
      >
        {correct ? '正解!' : 'ざんねん…'}
      </p>

      <div className="text-center">
        <p data-testid="quiz-answer" className="text-3xl font-bold">
          {question.headword}
        </p>
        {question.meaning && <p className="text-gray-600">{question.meaning}</p>}
      </div>

      {/* 署名付きURLのためnext/imageは使わない(外部ローダー不要・先読みキャッシュを共有) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${question.headword} のイメージ画像`}
        data-testid="quiz-image"
        className="mx-auto max-h-48 w-full max-w-xs rounded-xl bg-gray-100 object-contain"
      />

      <SentenceWithBlank
        sentenceText={question.sentenceText}
        answerLabel={question.answerLabel}
      />

      {correct && question.tip !== null && (
        <label
          className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4"
          data-testid="quiz-tip"
        >
          <input
            type="checkbox"
            data-testid="tip-check"
            checked={tipChecked}
            onChange={onTipCheck}
            className="mt-1 size-5 accent-amber-500"
          />
          <span className="text-sm leading-relaxed">
            <span className="font-bold">チップス: </span>
            {question.tip}
          </span>
        </label>
      )}

      {correct ? (
        <button
          type="button"
          data-testid="quiz-next"
          disabled={!canNext}
          onClick={onNext}
          className="mt-auto rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:bg-gray-300"
        >
          次へ
        </button>
      ) : (
        <button
          type="button"
          data-testid="quiz-retry"
          disabled={!canRetry}
          onClick={onRetry}
          className="mt-auto rounded-xl bg-rose-600 py-4 text-lg font-bold text-white disabled:bg-gray-300"
        >
          もう一度挑戦
        </button>
      )}
    </div>
  )
}
