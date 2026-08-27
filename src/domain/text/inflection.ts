/**
 * 見出し語(headword)の活用形を例文中から見つけるためのユーティリティ。
 * 穴埋め問題の生成(seed・CSVインポート検証)で使う:
 * 例文中の語は過去形・進行形・三単現・比較級などに活用していてもマッチさせる。
 */

/** 一般的な不規則動詞: 原形 → [過去形, 過去分詞, ...] */
const IRREGULAR_FORMS: Record<string, string[]> = {
  be: ['was', 'were', 'been', 'am', 'is', 'are'],
  begin: ['began', 'begun'],
  break: ['broke', 'broken'],
  bring: ['brought'],
  buy: ['bought'],
  catch: ['caught'],
  choose: ['chose', 'chosen'],
  come: ['came'],
  do: ['did', 'done', 'does'],
  draw: ['drew', 'drawn'],
  drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  feel: ['felt'],
  fight: ['fought'],
  find: ['found'],
  fly: ['flew', 'flown'],
  forbid: ['forbade', 'forbidden'],
  forget: ['forgot', 'forgotten'],
  get: ['got', 'gotten'],
  give: ['gave', 'given'],
  go: ['went', 'gone', 'goes'],
  grow: ['grew', 'grown'],
  hear: ['heard'],
  hide: ['hid', 'hidden'],
  hold: ['held'],
  keep: ['kept'],
  kneel: ['knelt'],
  know: ['knew', 'known'],
  lead: ['led'],
  leave: ['left'],
  lose: ['lost'],
  make: ['made'],
  mean: ['meant'],
  meet: ['met'],
  overcome: ['overcame'],
  pay: ['paid'],
  quit: ['quit'],
  rise: ['rose', 'risen'],
  run: ['ran'],
  say: ['said'],
  see: ['saw', 'seen'],
  seek: ['sought'],
  sell: ['sold'],
  send: ['sent'],
  shake: ['shook', 'shaken'],
  sing: ['sang', 'sung'],
  sit: ['sat'],
  sleep: ['slept'],
  speak: ['spoke', 'spoken'],
  spend: ['spent'],
  stand: ['stood'],
  steal: ['stole', 'stolen'],
  swim: ['swam', 'swum'],
  take: ['took', 'taken'],
  teach: ['taught'],
  tell: ['told'],
  think: ['thought'],
  throw: ['threw', 'thrown'],
  undergo: ['underwent', 'undergone', 'undergoes'],
  understand: ['understood'],
  upset: ['upset'],
  wake: ['woke', 'woken'],
  wear: ['wore', 'worn'],
  weep: ['wept'],
  win: ['won'],
  withdraw: ['withdrew', 'withdrawn'],
  write: ['wrote', 'written'],
}

const VOWELS = 'aeiou'

/** 語末が「子音+母音+子音」か(進行形・過去形の子音重ね判定: stop→stopped) */
function endsWithCvc(word: string): boolean {
  if (word.length < 3) return false
  const [a, b, c] = word.slice(-3)
  return (
    !VOWELS.includes(a) && VOWELS.includes(b) && !VOWELS.includes(c) && !'wxy'.includes(c)
  )
}

/**
 * 見出し語から機械的に導出できる活用形の候補を返す。
 * 過去形(-ed)・進行形(-ing)・三単現/複数(-s/-es)・比較級/最上級(-er/-est)・
 * 副詞化(-ly)と、綴り規則(e落ち・y→i・子音重ね)、および不規則動詞をカバーする。
 */
export function inflectionCandidates(headword: string): string[] {
  const w = headword.toLowerCase()
  const forms = new Set<string>([w])

  for (const irregular of IRREGULAR_FORMS[w] ?? []) forms.add(irregular)

  const endsWithE = w.endsWith('e')
  const yToI = w.length > 1 && w.endsWith('y') && !VOWELS.includes(w[w.length - 2])
  const stem = endsWithE ? w.slice(0, -1) : w
  const iStem = yToI ? w.slice(0, -1) + 'i' : null
  const doubled = endsWithCvc(w) ? w + w[w.length - 1] : null

  // 三単現・複数形
  forms.add(w + 's')
  forms.add(w + 'es')
  if (iStem) forms.add(iStem + 'es')

  // 過去形・過去分詞(規則変化)
  forms.add(w + 'ed')
  if (endsWithE) forms.add(w + 'd')
  if (iStem) forms.add(iStem + 'ed')
  if (doubled) forms.add(doubled + 'ed')

  // 進行形
  forms.add(w + 'ing')
  if (endsWithE) forms.add(stem + 'ing')
  if (doubled) forms.add(doubled + 'ing')

  // 比較級・最上級
  forms.add(w + 'er')
  forms.add(w + 'est')
  if (endsWithE) {
    forms.add(w + 'r')
    forms.add(w + 'st')
  }
  if (iStem) {
    forms.add(iStem + 'er')
    forms.add(iStem + 'est')
  }
  if (doubled) {
    forms.add(doubled + 'er')
    forms.add(doubled + 'est')
  }

  // 副詞化
  forms.add(w + 'ly')
  if (iStem) forms.add(iStem + 'ly')

  return [...forms]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 例文中から見出し語(またはその活用形)を探し、文中に現れたままの表記で返す。
 * 見つからなければ null。単語境界でマッチし、大文字小文字は区別しない
 * (文頭の大文字にも対応)。複数マッチ時は最長の形を優先する
 * (例: "uses" は "use" より "uses" を採用)。
 */
export function findWordFormInSentence(
  sentence: string,
  headword: string,
): string | null {
  const candidates = inflectionCandidates(headword).sort((a, b) => b.length - a.length)
  for (const candidate of candidates) {
    const re = new RegExp(`(?<![\\w-])${escapeRegExp(candidate)}(?![\\w-])`, 'i')
    const m = sentence.match(re)
    if (m) return m[0]
  }
  return null
}

/**
 * 例文中の見出し語(活用形含む)を {{blank}} に置換する。
 * 戻り値: 置換後の例文と、穴に入る語の実際の表記(解答表示用)。
 * 見出し語が見つからない場合は null。
 */
export function blankOutWord(
  sentence: string,
  headword: string,
): { sentenceText: string; answerLabel: string } | null {
  const matched = findWordFormInSentence(sentence, headword)
  if (!matched) return null
  return {
    sentenceText: sentence.replace(matched, '{{blank}}'),
    answerLabel: matched,
  }
}
