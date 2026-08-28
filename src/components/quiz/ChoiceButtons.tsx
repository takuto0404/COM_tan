/** 音声4択の選択肢ボタン(No.1〜No.4)。タップで選択+個別再生 */
import type { QuizChoice } from '@/domain/quiz/types'

export function ChoiceButtons({
  choices,
  selected,
  playingChoice,
  disabled,
  testMode,
  onTap,
}: {
  choices: QuizChoice[]
  selected: number | null
  /** 自動順次再生中のNo(視覚的に明示する: 非機能要件) */
  playingChoice: number | null
  disabled: boolean
  /** E2E用に正解フラグをDOMへ出す(本番では出さない) */
  testMode: boolean
  onTap: (no: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {choices.map((choice, i) => {
        const no = i + 1
        const isPlaying = playingChoice === no
        const isSelected = selected === no
        return (
          <button
            key={choice.id}
            type="button"
            data-testid={`quiz-choice-${no}`}
            data-correct={testMode && choice.isCorrect ? '1' : undefined}
            data-playing={isPlaying ? '1' : undefined}
            disabled={disabled}
            onClick={() => onTap(no)}
            aria-pressed={isSelected}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-lg font-bold transition-colors ${
              isSelected
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-800'
            } ${isPlaying ? 'ring-4 ring-amber-300' : ''} disabled:opacity-60`}
          >
            <span>No.{no}</span>
            <span aria-hidden className="text-xl">
              {isPlaying ? '🔊' : '♪'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
