/** 黄色フィルの進捗バー+右側にパーセント表示(docs/design/ 参照) */
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="flex items-center gap-3">
      <div className="h-6 flex-1 overflow-hidden rounded-full border border-gray-300 bg-gray-100">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-12 text-right text-lg font-bold text-gray-700">{clamped}%</span>
    </div>
  )
}
