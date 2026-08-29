/**
 * 解答表示(正解・誤答共通)。docs/design/ の解答画面を踏襲:
 * 判定バッジ+英単語(赤) → イメージ画像 → POINTボックス+例文(クリーム地)
 * → チップス(先生から一言スタイル・チェック必須) → ボタン。
 * イメージ画像は正誤を問わず必ず表示する(SPEC 4.3)。
 */
import type { QuizQuestion } from '@/domain/quiz/types'
import { SectionBar } from '@/components/ui/SectionBar'
import { SentenceWithBlank } from './SentenceWithBlank'

function Badge({ correct }: { correct: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {correct ? (
        <span className="block size-14 rounded-full border-[10px] border-cta" />
      ) : (
        <span className="text-5xl font-black leading-none text-brand">✕</span>
      )}
      <span
        className={`text-sm font-black tracking-wide ${correct ? 'text-cta' : 'text-brand'}`}
      >
        {correct ? 'CORRECT' : 'WRONG'}
      </span>
    </div>
  )
}

export function AnswerReveal({
  question,
  correct,
  selectedLabel,
  imageUrl,
  tipChecked,
  canNext,
  canRetry,
  onTipCheck,
  onPlaySentence,
  onNext,
  onRetry,
}: {
  question: QuizQuestion
  correct: boolean
  /** 回答時に選択していた(音声が流れていた)単語の表記 */
  selectedLabel: string
  imageUrl: string
  tipChecked: boolean
  canNext: boolean
  canRetry: boolean
  onTipCheck: () => void
  /** 例文音声の再生(何度でも可) */
  onPlaySentence: () => void
  onNext: () => void
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col" data-testid="quiz-reveal">
      {/* 判定+英単語 */}
      <div className="flex items-center gap-5 border-b border-gray-200 px-4 py-4">
        <Badge correct={correct} />
        <div data-testid={correct ? 'quiz-correct' : 'quiz-wrong'}>
          {correct ? (
            <>
              <p className="text-sm text-gray-500">選択した英単語</p>
              <p data-testid="quiz-answer" className="text-4xl font-bold text-emphasis">
                {question.headword}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">選択した英単語</p>
              <p
                data-testid="quiz-selected"
                className="text-2xl font-bold text-brand line-through decoration-2"
              >
                {selectedLabel}
              </p>
              <p className="mt-1 text-sm text-gray-500">正解の英単語</p>
              <p data-testid="quiz-answer" className="text-4xl font-bold text-emphasis">
                {question.headword}
              </p>
            </>
          )}
        </div>
      </div>

      {/* イメージ画像(全幅) */}
      {/* 署名付きURLのためnext/imageは使わない(外部ローダー不要・先読みキャッシュを共有) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`${question.headword} のイメージ画像`}
        data-testid="quiz-image"
        className="max-h-64 w-full bg-gray-100 object-cover"
      />

      {/* POINTボックス+例文(クリーム地) */}
      <div className="flex flex-col gap-3 bg-cream px-4 py-4">
        <div className="overflow-hidden rounded border border-cta bg-white">
          <p className="bg-cta py-1 text-center text-sm font-bold tracking-widest text-white">
            POINT
          </p>
          <div className="px-4 py-3">
            <p className="text-xl font-bold">{question.headword}</p>
            {question.meaning && <p className="mt-1 text-gray-800">{question.meaning}</p>}
          </div>
        </div>
        <SentenceWithBlank
          sentenceText={question.sentenceText}
          answerLabel={question.answerLabel}
          variant="answer"
        />
        <button
          type="button"
          data-testid="quiz-play-sentence"
          onClick={onPlaySentence}
          className="mx-auto w-56 rounded-full bg-linear-to-b from-brand to-brand-dark py-3 text-lg font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none"
        >
          🔊 PLAY
        </button>
      </div>

      {/* チップス(既読チェック必須) */}
      {correct && question.tip !== null && (
        <div data-testid="quiz-tip">
          <SectionBar>先生から一言</SectionBar>
          <div className="flex flex-col items-center gap-3 px-4 py-4">
            <p className="text-base leading-relaxed">{question.tip}</p>
            <label className="flex flex-col items-center gap-1">
              <input
                type="checkbox"
                data-testid="tip-check"
                checked={tipChecked}
                onChange={onTipCheck}
                className="size-9 rounded border-2 border-gray-400 accent-cta"
              />
              <span className="text-base font-bold">確認したらチェック!</span>
            </label>
          </div>
        </div>
      )}

      <div className="mt-auto px-4 py-4">
        {correct ? (
          <button
            type="button"
            data-testid="quiz-next"
            disabled={!canNext}
            onClick={onNext}
            className="w-full rounded-full bg-linear-to-b from-brand to-brand-dark py-4 text-xl font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
          >
            次へ
          </button>
        ) : (
          <button
            type="button"
            data-testid="quiz-retry"
            disabled={!canRetry}
            onClick={onRetry}
            className="w-full rounded-full bg-linear-to-b from-cta to-cta-dark py-4 text-xl font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
          >
            もう一度挑戦
          </button>
        )}
      </div>
    </div>
  )
}
