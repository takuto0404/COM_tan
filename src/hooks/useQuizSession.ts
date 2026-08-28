'use client'

/**
 * クイズ進行のhook(IMPLEMENTATION_PLAN T1-3)。
 * domainのreducerを回し、状態が要求する音声再生をAudioPortで実行して
 * AUDIO_ENDED を返す。描画はしない(JSXを返さない)。
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { AudioPort, ImagePort } from '@/data/media/ports'
import {
  canGoNext,
  createInitialState,
  currentQuestion,
  orderedChoices,
  quizReducer,
  setResult,
} from '@/domain/quiz/reducer'
import { shuffledOrder, type Rng } from '@/domain/quiz/shuffle'
import type { QuizQuestion } from '@/domain/quiz/types'

export interface UseQuizSessionOptions {
  questions: QuizQuestion[]
  audio: AudioPort
  images: ImagePort
  /** テストで決定的にするための乱数注入(既定: Math.random) */
  rng?: Rng
}

export function useQuizSession({
  questions,
  audio,
  images,
  rng = Math.random,
}: UseQuizSessionOptions) {
  const rngRef = useRef(rng)
  useEffect(() => {
    rngRef.current = rng
  }, [rng])

  const [state, dispatch] = useReducer(
    quizReducer,
    undefined,
    // 初期化は初回レンダーのrngで一度だけ行う
    () =>
      createInitialState(
        questions,
        questions.map(() => shuffledOrder(4, rng)),
      ),
  )

  // 再生完了の競合ガード: 古い再生の完了で誤ってAUDIO_ENDEDを送らない
  const tokenRef = useRef(0)
  const playGuarded = useCallback(
    (path: string) => {
      const token = ++tokenRef.current
      void audio.play(path).then(() => {
        if (tokenRef.current === token) dispatch({ type: 'AUDIO_ENDED' })
      })
    },
    [audio],
  )

  const question = currentQuestion(state)
  const choices = useMemo(() => orderedChoices(state), [state])

  // 選択肢の自動順次再生(No.1→4)
  useEffect(() => {
    if (state.phase === 'playing_choices' && state.playingChoice !== null) {
      playGuarded(choices[state.playingChoice - 1].audioPath)
    }
    // choicesはorders/qIndexから導出されるため依存はphase/playingChoice/qIndexで足りる
  }, [state.phase, state.playingChoice, state.qIndex, choices, playGuarded])

  // 個別再生(回答受付中のみ)
  useEffect(() => {
    if (state.phase === 'answering' && state.replay !== null) {
      playGuarded(choices[state.replay.choice - 1].audioPath)
    }
  }, [state.phase, state.replay, choices, playGuarded])

  // 正解・誤答時の例文音声(1回再生)
  useEffect(() => {
    if (state.phase === 'correct' || state.phase === 'wrong') {
      playGuarded(question.sentenceAudioPath)
    }
  }, [state.phase, state.qIndex, question.sentenceAudioPath, playGuarded])

  // アンマウント時に再生停止(進行中のplayの完了通知も無効化する)
  useEffect(() => {
    const token = tokenRef
    return () => {
      token.current++
      audio.stop()
    }
  }, [audio])

  const start = useCallback(() => {
    // ユーザージェスチャー起点(音声アンロック)。メディアの先読みもここで開始
    const paths = questions.flatMap((q) => [
      q.sentenceAudioPath,
      ...q.choices.map((c) => c.audioPath),
    ])
    void audio.preload(paths)
    void images.prefetch(questions.map((q) => q.imagePath))
    dispatch({ type: 'START' })
  }, [questions, audio, images])

  const select = useCallback((choice: number) => dispatch({ type: 'SELECT', choice }), [])
  const replayChoice = useCallback(
    (choice: number) => dispatch({ type: 'REPLAY_CHOICE', choice }),
    [],
  )
  const confirm = useCallback(() => dispatch({ type: 'CONFIRM' }), [])
  const tipCheck = useCallback(() => dispatch({ type: 'TIP_CHECK' }), [])
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const retry = useCallback(
    () => dispatch({ type: 'RETRY', order: shuffledOrder(4, rngRef.current) }),
    [],
  )

  return {
    state,
    question,
    choices,
    canNext: canGoNext(state),
    result: state.phase === 'finished' ? setResult(state) : null,
    actions: { start, select, replayChoice, confirm, tipCheck, next, retry },
  }
}
