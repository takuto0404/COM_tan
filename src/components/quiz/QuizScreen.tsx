'use client'

/**
 * クイズ画面のクライアントコンテナ。
 * useQuizSession(hooks層)を駆動し、フェーズごとの表示を組み立てる。
 * 配下の表示部品はpropsのみで描画する。
 */
import { useMemo } from 'react'
import {
  createHtmlAudioPort,
  createImagePort,
  createTestAudioPort,
  type MediaUrlMap,
} from '@/data/media/ports'
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

  if (state.phase === 'intro') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <p className="text-sm text-gray-500">セット{setNumber}</p>
        <h1 className="text-2xl font-bold">{title ?? `セット${setNumber}`}</h1>
        <p className="text-sm text-gray-600">全{questions.length}問。音声が流れます。</p>
        <button
          type="button"
          data-testid="quiz-start"
          onClick={actions.start}
          className="rounded-full bg-blue-600 px-10 py-4 text-lg font-bold text-white active:bg-blue-700"
        >
          スタート
        </button>
      </main>
    )
  }

  if (state.phase === 'finished' && result) {
    return <ResultView setNumber={setNumber} questions={questions} result={result} />
  }

  const answering = state.phase === 'answering'
  const revealing =
    state.phase === 'correct' || state.phase === 'wrong' || state.phase === 'retry_ready'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between text-sm text-gray-500">
        <span>セット{setNumber}</span>
        <span data-testid="quiz-progress">
          {state.qIndex + 1} / {questions.length}
        </span>
      </header>

      {!revealing && (
        <>
          <SentenceWithBlank sentenceText={question.sentenceText} />
          <ChoiceButtons
            choices={choices}
            selected={state.selected}
            playingChoice={state.playingChoice}
            disabled={!answering}
            testMode={TEST_MODE}
            onTap={(no) => {
              actions.select(no)
              actions.replayChoice(no)
            }}
          />
          <button
            type="button"
            data-testid="quiz-confirm"
            disabled={!answering || state.selected === null}
            onClick={actions.confirm}
            className="mt-auto rounded-xl bg-blue-600 py-4 text-lg font-bold text-white disabled:bg-gray-300"
          >
            決定
          </button>
        </>
      )}

      {revealing && (
        <AnswerReveal
          question={question}
          correct={state.phase === 'correct'}
          imageUrl={images.resolveUrl(question.imagePath)}
          tipChecked={state.tipChecked}
          canNext={canNext}
          canRetry={state.phase === 'retry_ready'}
          onTipCheck={actions.tipCheck}
          onNext={actions.next}
          onRetry={actions.retry}
        />
      )}
    </main>
  )
}
