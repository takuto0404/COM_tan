/** Fisher–Yatesシャッフル。乱数は注入する(domain規約: テストの決定性のため) */
export type Rng = () => number

export function shuffledOrder(length: number, rng: Rng): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
