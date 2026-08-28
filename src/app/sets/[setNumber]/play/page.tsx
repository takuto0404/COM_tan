import { notFound } from 'next/navigation'
import { QuizScreen } from '@/components/quiz/QuizScreen'
import { createSignedMediaUrls } from '@/data/media/signedUrls'
import { getPlayableSetByNumber } from '@/data/repositories/sets'

// 署名付きURLを毎リクエスト発行するため動的レンダリング
export const dynamic = 'force-dynamic'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ setNumber: string }>
}) {
  const { setNumber: raw } = await params
  const setNumber = Number.parseInt(raw, 10)
  if (!Number.isInteger(setNumber) || setNumber < 1) notFound()

  const set = await getPlayableSetByNumber(setNumber)
  if (!set) notFound()

  const urls = await createSignedMediaUrls(set.mediaPaths)

  return (
    <QuizScreen
      setNumber={set.setNumber}
      title={set.title}
      questions={set.questions}
      urls={urls}
    />
  )
}
