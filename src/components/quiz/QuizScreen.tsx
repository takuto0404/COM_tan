'use client'

/**
 * クイズ画面のクライアントコンテナ。
 * useQuizSession(hooks層)を駆動し、フェーズごとの表示を組み立てる。
 * 配下の表示部品はpropsのみで描画する。デザインは docs/design/ を参照。
 */
import { useMemo } from 'react'
import {
  createHtmlAudioPort,
  createImagePort,
  createTestAudioPort,
  type MediaUrlMap,
} from '@/data/media/ports'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionBar } from '@/components/ui/SectionBar'
import type { QuizQuestion } from '@/domain/quiz/types'
import { useQuizSession } from '@/hooks/useQuizSession'
import { AnswerReveal } from './AnswerReveal'
import { ChoiceButtons } from './ChoiceButtons'
import { ResultView } from './ResultView'
import { SentenceWithBlank } from './SentenceWithBlank'

const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === '1'

export interface QuizScreenProps {
  setNumber: number
  title: string | null
  questions: QuizQuestion[]
  urls: MediaUrlMap
}

export function QuizScreen({ setNumber, title, questions, urls }: QuizScreenProps) {
  const audio = useMemo(
    () => (TEST_MODE ? createTestAudioPort() : createHtmlAudioPort(urls)),
    [urls],
  )
  const images = useMemo(() => createImagePort(urls), [urls])
  const { state, question, choices, canNext, result, actions } = useQuizSession({
    questions,
    audio,
    images,
  })

  const heading = (
    <>
      <SectionBar>単語帳:{title ?? `セット${setNumber}`}</SectionBar>
      <div className="px-4 py-3">
        <ProgressBar percent={(state.results.length / questions.length) * 100} />
      </div>
    </>
  )

  if (state.phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col">
        {heading}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-linear-to-b from-sky-400 via-sky-500 to-blue-700 px-6">
          <p className="text-center text-lg font-bold text-white drop-shadow">
            全{questions.length}問・音声が流れます
          </p>
          <button
            type="button"
            data-testid="quiz-start"
            onClick={actions.start}
            className="w-full max-w-sm rounded-full bg-linear-to-b from-[#fca42d] to-cta-dark py-5 text-2xl font-bold text-white shadow-[0_6px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none"
          >
            問題を始める
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'finished' && result) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col">
        <ResultView setNumber={setNumber} questions={questions} result={result} />
      </div>
    )
  }

  const revealing = state.phase === 'correct' || state.phase === 'wrong'

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col">
      {heading}

      <div className="flex items-baseline justify-between border-y border-gray-200 px-4 py-2">
        <span className="text-2xl font-bold">問題{state.qIndex + 1}</span>
        <span data-testid="quiz-progress" className="text-sm text-gray-500">
          {state.qIndex + 1} / {questions.length}
        </span>
      </div>

      {!revealing && (
        <div className="flex flex-1 flex-col gap-4 bg-linear-to-b from-sky-400 via-sky-500 to-blue-700 p-4">
          <SentenceWithBlank sentenceText={question.sentenceText} />
          <ChoiceButtons
            choices={choices}
            selected={state.selected}
            playingChoice={state.playingChoice}
            // 自動再生中でもタップ可(タップで再生を打ち切って回答受付へ)
            disabled={false}
            testMode={TEST_MODE}
            onTap={(no) => {
              actions.select(no)
              actions.replayChoice(no)
            }}
          />
          <button
            type="button"
            data-testid="quiz-confirm"
            disabled={state.selected === null}
            onClick={actions.confirm}
            className="mt-auto w-full rounded-full bg-linear-to-b from-brand to-brand-dark py-4 text-xl font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
          >
            決定
          </button>
        </div>
      )}

      {revealing && (
        <AnswerReveal
          question={question}
          correct={state.phase === 'correct'}
          selectedLabel={state.selected !== null ? choices[state.selected - 1].label : ''}
          imageUrl={images.resolveUrl(question.imagePath)}
          tipChecked={state.tipChecked}
          canNext={canNext}
          canRetry={state.phase === 'wrong'}
          onTipCheck={actions.tipCheck}
          onPlaySentence={actions.playSentence}
          onNext={actions.next}
          onRetry={actions.retry}
        />
      )}
    </div>
  )
}
