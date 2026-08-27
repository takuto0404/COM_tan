// @vitest-environment happy-dom
/**
 * useQuizSession の結合テスト(薄く):
 * reducerのイベントと音声再生指示が正しく連動するかのみ確認する。
 * 遷移ルールの網羅は domain/quiz/reducer.test.ts が担う。
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createFakeAudioPort, type ImagePort } from '@/data/media/ports'
import type { QuizQuestion } from '@/domain/quiz/types'
import { useQuizSession } from './useQuizSession'

function makeQuestion(n: number): QuizQuestion {
  return {
    id: `q${n}`,
    headword: `word${n}`,
    meaning: null,
    sentenceText: `Sentence {{blank}} ${n}.`,
    answerLabel: `word${n}`,
    sentenceAudioPath: `s${n}.mp3`,
    imagePath: `i${n}.png`,
    tip: null,
    choices: [0, 1, 2, 3].map((c) => ({
      id: `q${n}c${c}`,
      audioPath: `w${n}-${c}.mp3`,
      label: `c${c}`,
      isCorrect: c === 0,
    })),
  }
}

const fakeImages: ImagePort & { prefetched: string[] } = {
  prefetched: [],
  async prefetch(paths) {
    this.prefetched.push(...paths)
  },
  resolveUrl: (p) => p,
}

function setup(questionCount = 2) {
  const audio = createFakeAudioPort()
  const questions = Array.from({ length: questionCount }, (_, i) => makeQuestion(i + 1))
  const rendered = renderHook(() =>
    useQuizSession({ questions, audio, images: fakeImages, rng: () => 0 }),
  )
  return { audio, ...rendered }
}

describe('useQuizSession', () => {
  it('start で選択肢4音声が表示順に自動再生され、回答受付になる', async () => {
    const { result, audio } = setup()
    act(() => result.current.actions.start())
    await waitFor(() => expect(result.current.state.phase).toBe('answering'))
    // 再生履歴 = フックが返す表示順の選択肢音声と一致する
    expect(audio.played).toEqual(result.current.choices.map((c) => c.audioPath))
  })

  it('正解を確定すると例文音声が再生され、次へ進める', async () => {
    const { result, audio } = setup()
    act(() => result.current.actions.start())
    await waitFor(() => expect(result.current.state.phase).toBe('answering'))
    const correctNo = result.current.choices.findIndex((c) => c.isCorrect) + 1
    act(() => {
      result.current.actions.select(correctNo)
      result.current.actions.confirm()
    })
    await waitFor(() => expect(result.current.canNext).toBe(true))
    expect(audio.played).toContain('s1.mp3')
    act(() => result.current.actions.next())
    await waitFor(() => expect(result.current.state.qIndex).toBe(1))
  })

  it('誤答すると例文音声の後にやり直し待ちになり、retryで再挑戦できる', async () => {
    const { result } = setup()
    act(() => result.current.actions.start())
    await waitFor(() => expect(result.current.state.phase).toBe('answering'))
    const wrongNo = result.current.choices.findIndex((c) => !c.isCorrect) + 1
    act(() => {
      result.current.actions.select(wrongNo)
      result.current.actions.confirm()
    })
    await waitFor(() => expect(result.current.state.phase).toBe('retry_ready'))
    act(() => result.current.actions.retry())
    await waitFor(() => expect(result.current.state.phase).toBe('answering'))
    expect(result.current.state.qIndex).toBe(0) // 同じ問題
  })

  it('個別再生で該当選択肢の音声がもう一度再生される', async () => {
    const { result, audio } = setup()
    act(() => result.current.actions.start())
    await waitFor(() => expect(result.current.state.phase).toBe('answering'))
    const before = audio.played.length
    act(() => result.current.actions.replayChoice(2))
    await waitFor(() => expect(audio.played.length).toBe(before + 1))
    expect(audio.played.at(-1)).toBe(result.current.choices[1].audioPath)
  })
})
