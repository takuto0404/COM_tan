/** 音声4択の選択肢ボタン(No1〜No4)。タップで選択+個別再生 */
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
    <div className="grid grid-cols-4 gap-2.5">
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
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border text-lg font-bold shadow-[0_3px_0_rgba(0,0,0,0.2)] transition-all active:translate-y-0.5 active:shadow-none ${
              isSelected
                ? 'border-brand bg-brand text-white'
                : 'border-gray-300 bg-linear-to-b from-white to-gray-200 text-gray-800'
            } ${isPlaying ? 'ring-4 ring-accent' : ''} disabled:opacity-70`}
          >
            <span>No{no}</span>
            <span aria-hidden className="text-sm leading-none">
              {isPlaying ? '🔊' : '♪'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
