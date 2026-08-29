/**
 * クイズ進行の純粋reducer(SPEC 4.3)。
 * 副作用(音声・画像)は持たない: 「いま何を再生すべきか」を状態で表現し、
 * hooks層が実行して AUDIO_ENDED を返す。
 */
import type { QuizEvent, QuizQuestion, QuizState, SetResult } from './types'

export const CHOICE_COUNT = 4

/**
 * 初期状態を作る。orders は問題ごとの選択肢表示順(シャッフルは呼び出し側の責務)。
 */
export function createInitialState(
  questions: QuizQuestion[],
  orders: number[][],
): QuizState {
  if (questions.length === 0) throw new Error('questions must not be empty')
  if (orders.length !== questions.length) {
    throw new Error('orders must match questions length')
  }
  for (const order of orders) validateOrder(order)
  return {
    questions,
    phase: 'intro',
    qIndex: 0,
    orders,
    attempts: 0,
    selected: null,
    playingChoice: null,
    replay: null,
    audioDone: false,
    tipChecked: false,
    results: [],
  }
}

function validateOrder(order: number[]): void {
  const sorted = [...order].sort()
  if (sorted.length !== CHOICE_COUNT || sorted.some((v, i) => v !== i)) {
    throw new Error(`invalid choice order: ${JSON.stringify(order)}`)
  }
}

export function currentQuestion(state: QuizState): QuizQuestion {
  return state.questions[state.qIndex]
}

/** 現在の問題の選択肢を表示順(No.1〜4)で返す */
export function orderedChoices(state: QuizState) {
  const q = currentQuestion(state)
  return state.orders[state.qIndex].map((i) => q.choices[i])
}

/** 「次へ」を押せるか(正解表示中: 例文音声を聞き終え、チップスがあれば既読チェック済み) */
export function canGoNext(state: QuizState): boolean {
  if (state.phase !== 'correct') return false
  if (!state.audioDone) return false
  if (currentQuestion(state).tip !== null && !state.tipChecked) return false
  return true
}

export function setResult(state: QuizState): SetResult {
  return {
    results: state.results,
    firstTryCorrectCount: state.results.filter((r) => r.firstTryCorrect).length,
  }
}

export function quizReducer(state: QuizState, event: QuizEvent): QuizState {
  switch (event.type) {
    case 'START': {
      if (state.phase !== 'intro') return state
      return { ...state, phase: 'playing_choices', playingChoice: 1 }
    }

    case 'AUDIO_ENDED': {
      switch (state.phase) {
        case 'playing_choices': {
          const current = state.playingChoice
          if (current === null) return state
          if (current < CHOICE_COUNT) {
            return { ...state, playingChoice: (current + 1) as 2 | 3 | 4 }
          }
          // No.4まで再生し終えたら回答受付へ
          return { ...state, phase: 'answering', playingChoice: null }
        }
        case 'answering':
          // 個別再生の完了
          return state.replay ? { ...state, replay: null } : state
        case 'correct':
          return { ...state, audioDone: true }
        case 'wrong':
          // 例文音声を1周聞き終えたらやり直し可能に
          return { ...state, phase: 'retry_ready', audioDone: true }
        default:
          return state
      }
    }

    case 'SELECT': {
      if (state.phase !== 'answering') return state
      if (event.choice < 1 || event.choice > CHOICE_COUNT) return state
      return { ...state, selected: event.choice }
    }

    case 'REPLAY_CHOICE': {
      if (state.phase !== 'answering') return state
      if (event.choice < 1 || event.choice > CHOICE_COUNT) return state
      return {
        ...state,
        replay: { choice: event.choice, seq: (state.replay?.seq ?? 0) + 1 },
      }
    }

    case 'CONFIRM': {
      if (state.phase !== 'answering' || state.selected === null) return state
      const attempts = state.attempts + 1
      const choice = orderedChoices(state)[state.selected - 1]
      if (choice.isCorrect) {
        return {
          ...state,
          phase: 'correct',
          attempts,
          audioDone: false,
          tipChecked: false,
          results: [
            ...state.results,
            {
              questionId: currentQuestion(state).id,
              firstTryCorrect: attempts === 1,
              attempts,
            },
          ],
        }
      }
      return { ...state, phase: 'wrong', attempts, audioDone: false }
    }

    case 'TIP_CHECK': {
      if (state.phase !== 'correct') return state
      if (currentQuestion(state).tip === null) return state
      return { ...state, tipChecked: true }
    }

    case 'NEXT': {
      if (!canGoNext(state)) return state
      const nextIndex = state.qIndex + 1
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: 'finished', selected: null }
      }
      return {
        ...state,
        phase: 'playing_choices',
        qIndex: nextIndex,
        attempts: 0,
        selected: null,
        playingChoice: 1,
        replay: null,
        audioDone: false,
        tipChecked: false,
      }
    }

    case 'RETRY': {
      if (state.phase !== 'retry_ready') return state
      // 表示順は変えない: 聞き比べた記憶を保ったまま同じ並びで再挑戦させる
      return {
        ...state,
        phase: 'playing_choices',
        selected: null,
        playingChoice: 1,
        replay: null,
        audioDone: false,
      }
    }
  }
}
