import { describe, expect, it } from 'vitest'
import { blankOutWord, findWordFormInSentence } from './inflection'

describe('findWordFormInSentence', () => {
  it('原形にマッチする', () => {
    expect(findWordFormInSentence('They had to abandon the ship.', 'abandon')).toBe(
      'abandon',
    )
  })

  it('過去形(-ed / -d / y→ied / 子音重ね)にマッチする', () => {
    expect(
      findWordFormInSentence('The report concluded that it was risky.', 'conclude'),
    ).toBe('concluded')
    expect(findWordFormInSentence('She devoted her life to art.', 'devote')).toBe(
      'devoted',
    )
    expect(findWordFormInSentence('He studied all night.', 'study')).toBe('studied')
    expect(findWordFormInSentence('The bus stopped suddenly.', 'stop')).toBe('stopped')
  })

  it('進行形(-ing / e落ち / 子音重ね)にマッチする', () => {
    expect(findWordFormInSentence('He is wandering around the town.', 'wander')).toBe(
      'wandering',
    )
    expect(findWordFormInSentence('She is making dinner now.', 'make')).toBe('making')
    expect(findWordFormInSentence('They are running in the park.', 'run')).toBe('running')
  })

  it('三単現・複数形(-s / -es / y→ies)にマッチする', () => {
    expect(findWordFormInSentence('One company dominates the market.', 'dominate')).toBe(
      'dominates',
    )
    expect(findWordFormInSentence('She resembles her mother.', 'resemble')).toBe(
      'resembles',
    )
    expect(findWordFormInSentence('The baby cries at night.', 'cry')).toBe('cries')
  })

  it('不規則動詞(過去形・過去分詞)にマッチする', () => {
    expect(findWordFormInSentence('He knelt down to tie his shoes.', 'kneel')).toBe(
      'knelt',
    )
    expect(findWordFormInSentence('She overcame her fear.', 'overcome')).toBe('overcame')
    expect(findWordFormInSentence('He withdrew some cash.', 'withdraw')).toBe('withdrew')
    expect(findWordFormInSentence('She wept at the news.', 'weep')).toBe('wept')
    expect(findWordFormInSentence('The patient underwent surgery.', 'undergo')).toBe(
      'underwent',
    )
    expect(findWordFormInSentence('The rules forbade smoking.', 'forbid')).toBe('forbade')
  })

  it('比較級・最上級・副詞形にマッチする', () => {
    expect(findWordFormInSentence('This engine is more efficient.', 'efficient')).toBe(
      'efficient',
    )
    expect(findWordFormInSentence('He spoke boldly in public.', 'bold')).toBe('boldly')
    expect(findWordFormInSentence('This is the boldest plan of all.', 'bold')).toBe(
      'boldest',
    )
  })

  it('文頭の大文字でもマッチし、文中の表記のまま返す', () => {
    expect(findWordFormInSentence('Trembling, she opened the door.', 'tremble')).toBe(
      'Trembling',
    )
  })

  it('最長の活用形を優先する(部分置換の欠陥を防ぐ)', () => {
    // "dedicated" に対して "dedicate" で部分マッチして "{{blank}}d" が残らないこと
    expect(
      findWordFormInSentence('The monument is dedicated to the victims.', 'dedicate'),
    ).toBe('dedicated')
  })

  it('単語境界を守る(他の単語の内部にはマッチしない)', () => {
    expect(findWordFormInSentence('The witness saw everything.', 'wit')).toBeNull()
    expect(findWordFormInSentence('A mockingbird sang outside.', 'mock')).toBeNull()
  })

  it('ハイフン付きの見出し語にマッチする', () => {
    expect(
      findWordFormInSentence('The keen-eyed birdwatcher spotted an eagle.', 'keen-eyed'),
    ).toBe('keen-eyed')
  })

  it('見つからなければ null', () => {
    expect(findWordFormInSentence('Nothing to see here.', 'abandon')).toBeNull()
  })
})

describe('blankOutWord', () => {
  it('活用形ごと {{blank}} に置換し、解答表示用の表記を返す', () => {
    expect(blankOutWord('The report concluded that it was risky.', 'conclude')).toEqual({
      sentenceText: 'The report {{blank}} that it was risky.',
      answerLabel: 'concluded',
    })
  })

  it('不規則動詞も置換できる', () => {
    expect(blankOutWord('He knelt down to tie his shoes.', 'kneel')).toEqual({
      sentenceText: 'He {{blank}} down to tie his shoes.',
      answerLabel: 'knelt',
    })
  })

  it('見出し語が例文にない場合は null(インポート検証で弾く)', () => {
    expect(blankOutWord('Nothing to see here.', 'abandon')).toBeNull()
  })
})
