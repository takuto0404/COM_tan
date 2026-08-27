/** クイズ進行のドメイン型(SPEC 4.3)。DB・React・音声実装には依存しない */

export interface QuizChoice {
  id: string
  audioPath: string
  /** 答え表示用の単語テキスト */
  label: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  headword: string
  meaning: string | null
  /** 例文。穴埋め位置は {{blank}} */
  sentenceText: string
  /** 穴に入る語の例文中での表記(活用形) */
  answerLabel: string
  sentenceAudioPath: string
  imagePath: string
  /** チップス(なければ null) */
  tip: string | null
  /** 選択肢4件(表示順は choiceOrder で決まる) */
  choices: QuizChoice[]
}

export interface QuestionResult {
  questionId: string
  /** 1回目の解答で正解したか */
  firstTryCorrect: boolean
  /** 解答試行回数(正解するまでの回数) */
  attempts: number
}

export type QuizPhase =
  | 'intro' // スタート待ち(タップで音声アンロック)
  | 'playing_choices' // No.1→4 の選択肢音声を自動順次再生中
  | 'answering' // 回答受付中(個別再生・選択・決定)
  | 'correct' // 正解表示+イメージ画像+例文音声再生
  | 'wrong' // 誤答: 答え+イメージ画像表示+例文音声再生
  | 'retry_ready' // 音声を聞き終え、同一問題のやり直し待ち
  | 'finished' // 10問完走

export interface QuizState {
  questions: QuizQuestion[]
  phase: QuizPhase
  qIndex: number
  /** 各問題の選択肢表示順(choices配列のインデックス)。やり直しで再シャッフルされる */
  orders: number[][]
  /** 現在の問題の解答試行回数 */
  attempts: number
  /** 選択中のNo(1〜4)。未選択は null */
  selected: number | null
  /** 自動順次再生中の選択肢No */
  playingChoice: 1 | 2 | 3 | 4 | null
  /** 個別再生のリクエスト(seqの増加で再トリガー) */
  replay: { choice: number; seq: number } | null
  /** correct/wrong の例文音声を聞き終えたか */
  audioDone: boolean
  /** チップスの既読チェック */
  tipChecked: boolean
  /** 確定済みの問題結果 */
  results: QuestionResult[]
}

export type QuizEvent =
  | { type: 'START' }
  | { type: 'AUDIO_ENDED' }
  | { type: 'SELECT'; choice: number }
  | { type: 'REPLAY_CHOICE'; choice: number }
  | { type: 'CONFIRM' }
  | { type: 'TIP_CHECK' }
  | { type: 'NEXT' }
  /** やり直し。再シャッフルした表示順を受け取る(reducerを純粋に保つため) */
  | { type: 'RETRY'; order: number[] }

export interface SetResult {
  results: QuestionResult[]
  firstTryCorrectCount: number
}
