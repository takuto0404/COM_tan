import 'server-only'
import type { QuizQuestion } from '@/domain/quiz/types'
import { createAdminClient } from '@/lib/supabase/server'

export interface PlayableSet {
  id: string
  setNumber: number
  title: string | null
  questions: QuizQuestion[]
  /** このセットの学習に必要な全メディアパス(署名URL解決用) */
  mediaPaths: string[]
}

/**
 * セット番号から学習用データ一式を取得する(公開セットのみ)。
 * 見つからなければ null。
 */
export async function getPlayableSetByNumber(
  setNumber: number,
): Promise<PlayableSet | null> {
  const db = createAdminClient()
  const { data: set, error } = await db
    .from('word_sets')
    .select(
      `id, set_number, title, is_published,
       words (
         id, position, headword, meaning, tip, word_audio_path, image_path,
         questions (
           id, sentence_text, answer_label, sentence_audio_path,
           choices ( id, audio_path, label, is_correct )
         )
       )`,
    )
    .eq('set_number', setNumber)
    .eq('is_published', true)
    .maybeSingle()
  if (error) throw error
  if (!set) return null

  type WordRow = (typeof set.words)[number]
  const words = [...set.words].sort((a: WordRow, b: WordRow) => a.position - b.position)

  const questions: QuizQuestion[] = words.map((w: WordRow) => {
    const q = Array.isArray(w.questions) ? w.questions[0] : w.questions
    if (!q) throw new Error(`単語 ${w.headword} に問題がありません`)
    const choices = Array.isArray(q.choices) ? q.choices : []
    if (choices.length !== 4) {
      throw new Error(`問題 ${q.id} の選択肢が4件ではありません`)
    }
    return {
      id: q.id,
      headword: w.headword,
      meaning: w.meaning,
      sentenceText: q.sentence_text,
      answerLabel: q.answer_label,
      sentenceAudioPath: q.sentence_audio_path,
      imagePath: w.image_path,
      tip: w.tip,
      choices: choices.map((c) => ({
        id: c.id,
        audioPath: c.audio_path,
        label: c.label,
        isCorrect: c.is_correct,
      })),
    }
  })

  const mediaPaths = [
    ...new Set(
      questions.flatMap((q) => [
        q.sentenceAudioPath,
        q.imagePath,
        ...q.choices.map((c) => c.audioPath),
      ]),
    ),
  ]

  return {
    id: set.id,
    setNumber: set.set_number,
    title: set.title,
    questions,
    mediaPaths,
  }
}
