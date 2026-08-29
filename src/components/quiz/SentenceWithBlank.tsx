/**
 * 例文表示: {{blank}} を「(    )」または「( 解答 )」に置き換えて描画する。
 * question: 紺カードに白文字(出題時) / answer: 明るい背景に黒文字+赤の解答(解答表示時)
 */

export function SentenceWithBlank({
  sentenceText,
  answerLabel,
  variant = 'question',
}: {
  sentenceText: string
  /** 指定すると空欄を埋めた全文を表示する(解答表示用) */
  answerLabel?: string
  variant?: 'question' | 'answer'
}) {
  const [before, after] = sentenceText.split('{{blank}}')
  const filled = answerLabel !== undefined

  if (variant === 'question') {
    return (
      <p
        data-testid="quiz-sentence"
        className="rounded-lg bg-brand p-4 text-lg leading-relaxed text-white"
      >
        {before}
        {'( '}
        {filled ? (
          <strong className="font-bold text-accent">{answerLabel}</strong>
        ) : (
          <span aria-label="空欄" className="inline-block w-14" />
        )}
        {' )'}
        {after}
      </p>
    )
  }

  return (
    <p data-testid="quiz-sentence" className="text-lg leading-relaxed text-gray-900">
      {before}
      {'( '}
      {filled ? (
        <strong className="font-bold text-emphasis">{answerLabel}</strong>
      ) : (
        <span aria-label="空欄" className="inline-block w-14" />
      )}
      {' )'}
      {after}
    </p>
  )
}
