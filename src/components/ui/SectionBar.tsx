/** 薄グレーのセクション見出し帯(中央寄せ) */
export function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-y border-gray-200 bg-bar py-2 text-center text-base font-bold text-gray-800">
      {children}
    </div>
  )
}
