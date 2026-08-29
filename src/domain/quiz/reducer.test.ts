import { describe, expect, it } from 'vitest'
import {
  canGoNext,
  createInitialState,
  currentQuestion,
  orderedChoices,
  quizReducer,
  setResult,
} from './reducer'
import type { QuizEvent, QuizQuestion, QuizState } from './types'

/** テスト用の問題を作る。choices[0] が常に正解 */
function makeQuestion(n: number, tip: string | null = null): QuizQuestion {
  return {
    id: `q${n}`,
    headword: `word${n}`,
    meaning: `意味${n}`,
    sentenceText: `Sentence {{blank}} number ${n}.`,
    answerLabel: `word${n}ed`,
    sentenceAudioPath: `audio/sentences/${n}.mp3`,
    imagePath: `images/words/${n}.png`,
    tip,
    choices: [0, 1, 2, 3].map((c) => ({
      id: `q${n}c${c}`,
      audioPath: `audio/words/${n}-${c}.mp3`,
      label: `choice${c}`,
      isCorrect: c === 0,
    })),
  }
}

const IDENTITY = [0, 1, 2, 3]

function makeState(questionCount = 3, tips: Array<string | null> = []): QuizState {
  const questions = Array.from({ length: questionCount }, (_, i) =>
    makeQuestion(i + 1, tips[i] ?? null),
  )
  return createInitialState(
    questions,
    questions.map(() => IDENTITY),
  )
}

function dispatchAll(state: QuizState, events: QuizEvent[]): QuizState {
  return events.reduce(quizReducer, state)
}

/** intro → 回答受付まで進める(選択肢4音声の自動再生を消化) */
function toAnswering(state: QuizState): QuizState {
  return dispatchAll(state, [
    { type: 'START' },
    { type: 'AUDIO_ENDED' },
    { type: 'AUDIO_ENDED' },
    { type: 'AUDIO_ENDED' },
    { type: 'AUDIO_ENDED' },
  ])
}

describe('開始〜自動順次再生', () => {
  it('STARTでNo.1から自動再生が始まり、4音声終了後に回答受付になる', () => {
    let s = quizReducer(makeState(), { type: 'START' })
    expect(s.phase).toBe('playing_choices')
    expect(s.playingChoice).toBe(1)
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    expect(s.playingChoice).toBe(2)
    s = dispatchAll(s, [{ type: 'AUDIO_ENDED' }, { type: 'AUDIO_ENDED' }])
    expect(s.playingChoice).toBe(4)
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    expect(s.phase).toBe('answering')
    expect(s.playingChoice).toBeNull()
  })

  it('intro以外でSTARTは無視される', () => {
    const s = toAnswering(makeState())
    expect(quizReducer(s, { type: 'START' })).toBe(s)
  })
})

describe('回答受付', () => {
  it('選択→決定で正解なら correct になり、初回正解が記録される', () => {
    let s = toAnswering(makeState())
    s = dispatchAll(s, [{ type: 'SELECT', choice: 1 }, { type: 'CONFIRM' }])
    expect(s.phase).toBe('correct')
    expect(s.results).toEqual([{ questionId: 'q1', firstTryCorrect: true, attempts: 1 }])
  })

  it('未選択でCONFIRMは無視される', () => {
    const s = toAnswering(makeState())
    expect(quizReducer(s, { type: 'CONFIRM' })).toBe(s)
  })

  it('自動再生中は選択・決定できない', () => {
    const s = quizReducer(makeState(), { type: 'START' })
    expect(quizReducer(s, { type: 'SELECT', choice: 1 })).toBe(s)
  })

  it('個別再生はansweringのみ有効で、AUDIO_ENDEDでクリアされる', () => {
    let s = toAnswering(makeState())
    s = quizReducer(s, { type: 'REPLAY_CHOICE', choice: 3 })
    expect(s.replay).toEqual({ choice: 3, seq: 1 })
    s = quizReducer(s, { type: 'REPLAY_CHOICE', choice: 3 })
    expect(s.replay?.seq).toBe(2) // 同じ選択肢でも再トリガーできる
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    expect(s.replay).toBeNull()
    expect(s.phase).toBe('answering')
  })

  it('シャッフルされた表示順で正誤判定される', () => {
    const questions = [makeQuestion(1)]
    // 表示No.1=choices[2](不正解), 表示No.3=choices[0](正解)
    let s = createInitialState(questions, [[2, 1, 0, 3]])
    s = toAnswering(s)
    const wrong = dispatchAll(s, [{ type: 'SELECT', choice: 1 }, { type: 'CONFIRM' }])
    expect(wrong.phase).toBe('wrong')
    const right = dispatchAll(s, [{ type: 'SELECT', choice: 3 }, { type: 'CONFIRM' }])
    expect(right.phase).toBe('correct')
  })
})

describe('誤答フロー(SPEC 4.3)', () => {
  function toWrong(state: QuizState): QuizState {
    return dispatchAll(toAnswering(state), [
      { type: 'SELECT', choice: 2 },
      { type: 'CONFIRM' },
    ])
  }

  it('誤答で wrong になり、結果はまだ記録されない', () => {
    const s = toWrong(makeState())
    expect(s.phase).toBe('wrong')
    expect(s.results).toEqual([])
    expect(s.attempts).toBe(1)
  })

  it('例文音声を聞き終えるまでやり直せない', () => {
    const s = toWrong(makeState())
    expect(quizReducer(s, { type: 'RETRY' })).toBe(s)
  })

  it('音声終了→RETRYで同一問題を同じ表示順のまま再挑戦する', () => {
    const questions = [makeQuestion(1)]
    let s = toWrong(createInitialState(questions, [[2, 1, 0, 3]]))
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    expect(s.phase).toBe('retry_ready')
    s = quizReducer(s, { type: 'RETRY' })
    expect(s.phase).toBe('playing_choices')
    expect(s.playingChoice).toBe(1)
    expect(s.selected).toBeNull()
    expect(s.orders[0]).toEqual([2, 1, 0, 3]) // 表示順は変わらない
    expect(s.qIndex).toBe(0) // 同じ問題
  })

  it('やり直して正解しても初回正解にはならない', () => {
    let s = toWrong(makeState())
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    s = quizReducer(s, { type: 'RETRY' })
    s = dispatchAll(s, [
      { type: 'AUDIO_ENDED' },
      { type: 'AUDIO_ENDED' },
      { type: 'AUDIO_ENDED' },
      { type: 'AUDIO_ENDED' },
      { type: 'SELECT', choice: 1 },
      { type: 'CONFIRM' },
    ])
    expect(s.phase).toBe('correct')
    expect(s.results).toEqual([{ questionId: 'q1', firstTryCorrect: false, attempts: 2 }])
  })
})

describe('正解後の進行とチップス(SPEC 4.3)', () => {
  it('例文音声を聞き終えるまで次へ進めない', () => {
    let s = toAnswering(makeState())
    s = dispatchAll(s, [{ type: 'SELECT', choice: 1 }, { type: 'CONFIRM' }])
    expect(canGoNext(s)).toBe(false)
    expect(quizReducer(s, { type: 'NEXT' })).toBe(s)
    s = quizReducer(s, { type: 'AUDIO_ENDED' })
    expect(canGoNext(s)).toBe(true)
  })

  it('チップスがある問題は既読チェックまで次へ進めない', () => {
    let s = toAnswering(makeState(3, ['覚え方のコツ']))
    s = dispatchAll(s, [
      { type: 'SELECT', choice: 1 },
      { type: 'CONFIRM' },
      { type: 'AUDIO_ENDED' },
    ])
    expect(canGoNext(s)).toBe(false)
    expect(quizReducer(s, { type: 'NEXT' })).toBe(s)
    s = quizReducer(s, { type: 'TIP_CHECK' })
    expect(canGoNext(s)).toBe(true)
    s = quizReducer(s, { type: 'NEXT' })
    expect(s.qIndex).toBe(1)
    expect(s.phase).toBe('playing_choices')
  })

  it('チップスがない問題でTIP_CHECKは無視される', () => {
    let s = toAnswering(makeState())
    s = dispatchAll(s, [
      { type: 'SELECT', choice: 1 },
      { type: 'CONFIRM' },
      { type: 'AUDIO_ENDED' },
    ])
    expect(quizReducer(s, { type: 'TIP_CHECK' })).toBe(s)
  })

  it('NEXTで次の問題に進み、状態がリセットされる', () => {
    let s = toAnswering(makeState())
    s = dispatchAll(s, [
      { type: 'SELECT', choice: 1 },
      { type: 'CONFIRM' },
      { type: 'AUDIO_ENDED' },
      { type: 'NEXT' },
    ])
    expect(s.qIndex).toBe(1)
    expect(s.phase).toBe('playing_choices')
    expect(s.playingChoice).toBe(1)
    expect(s.selected).toBeNull()
    expect(s.attempts).toBe(0)
    expect(currentQuestion(s).id).toBe('q2')
  })
})

describe('完走', () => {
  it('最終問題の正解→NEXTで finished になり、結果が集計される', () => {
    let s = makeState(2)
    for (let i = 0; i < 2; i++) {
      s = dispatchAll(i === 0 ? quizReducer(s, { type: 'START' }) : s, [])
      // 1問目はSTART済み、2問目はNEXT後に自動再生中
      s = dispatchAll(s, [
        { type: 'AUDIO_ENDED' },
        { type: 'AUDIO_ENDED' },
        { type: 'AUDIO_ENDED' },
        { type: 'AUDIO_ENDED' },
        { type: 'SELECT', choice: i === 0 ? 1 : 2 },
        { type: 'CONFIRM' },
      ])
      if (i === 1) {
        // 2問目はわざと誤答→やり直し→正解
        s = dispatchAll(s, [
          { type: 'AUDIO_ENDED' },
          { type: 'RETRY' },
          { type: 'AUDIO_ENDED' },
          { type: 'AUDIO_ENDED' },
          { type: 'AUDIO_ENDED' },
          { type: 'AUDIO_ENDED' },
          { type: 'SELECT', choice: 1 },
          { type: 'CONFIRM' },
        ])
      }
      s = dispatchAll(s, [{ type: 'AUDIO_ENDED' }, { type: 'NEXT' }])
    }
    expect(s.phase).toBe('finished')
    const result = setResult(s)
    expect(result.results).toHaveLength(2)
    expect(result.firstTryCorrectCount).toBe(1)
  })
})

describe('ヘルパー・バリデーション', () => {
  it('orderedChoicesは表示順で選択肢を返す', () => {
    const s = createInitialState([makeQuestion(1)], [[3, 0, 1, 2]])
    expect(orderedChoices(s).map((c) => c.id)).toEqual(['q1c3', 'q1c0', 'q1c1', 'q1c2'])
  })

  it('不正な表示順は拒否される', () => {
    expect(() => createInitialState([makeQuestion(1)], [[0, 1, 2, 2]])).toThrow()
    expect(() => createInitialState([makeQuestion(1)], [[0, 1, 2]])).toThrow()
  })

  it('問題数とordersの不一致は拒否される', () => {
    expect(() => createInitialState([makeQuestion(1)], [])).toThrow()
  })
})
