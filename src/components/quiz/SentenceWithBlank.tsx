/** 例文表示: {{blank}} を空欄(または解答)に置き換えて描画する */

export function SentenceWithBlank({
  sentenceText,
  answerLabel,
}: {
  sentenceText: string
  /** 指定すると空欄を埋めた全文を表示する(解答表示用) */
  answerLabel?: string
}) {
  const [before, after] = sentenceText.split('{{blank}}')
  return (
    <p
      data-testid="quiz-sentence"
      className="rounded-xl bg-gray-50 p-4 text-lg leading-relaxed"
    >
      {before}
      {answerLabel !== undefined ? (
        <strong className="font-bold text-blue-700 underline underline-offset-4">
          {answerLabel}
        </strong>
      ) : (
        <span
          aria-label="空欄"
          className="mx-1 inline-block w-24 border-b-2 border-gray-500 align-baseline"
        >
          &nbsp;
        </span>
      )}
      {after}
    </p>
  )
}
