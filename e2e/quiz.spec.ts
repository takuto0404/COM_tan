import { expect, test, type Page } from '@playwright/test'

/**
 * 学習フローのE2E(IMPLEMENTATION_PLAN E3/E4 + Phase 1マイルストーン)。
 * テストモード(NEXT_PUBLIC_TEST_MODE=1)で実行され、音声は短遅延で完了する。
 * 正解の選択肢は data-correct=1 で特定できる(テストモード限定)。
 */

async function startQuiz(page: Page, setNumber = 1) {
  await page.goto(`/sets/${setNumber}/play`)
  await page.getByTestId('quiz-start').click()
  await waitForAnswering(page)
}

/** 選択肢4音声の自動再生が終わり回答受付になるまで待つ */
async function waitForAnswering(page: Page) {
  await expect(page.getByTestId('quiz-choice-1')).toBeEnabled()
}

async function answerCorrectly(page: Page) {
  await page.locator('[data-testid^="quiz-choice-"][data-correct="1"]').click()
  await page.getByTestId('quiz-confirm').click()
  await expect(page.getByTestId('quiz-correct')).toBeVisible()
}

async function answerWrongly(page: Page) {
  await page.locator('[data-testid^="quiz-choice-"]:not([data-correct])').first().click()
  await page.getByTestId('quiz-confirm').click()
  await expect(page.getByTestId('quiz-wrong')).toBeVisible()
}

/** 正解表示から次の問題へ進む(チップスがあればチェックする) */
async function goNext(page: Page) {
  const tip = page.getByTestId('tip-check')
  if (await tip.isVisible()) {
    await tip.check()
  }
  const next = page.getByTestId('quiz-next')
  await expect(next).toBeEnabled()
  await next.click()
}

test('選択肢4音声が自動再生されてから回答できる', async ({ page }) => {
  await startQuiz(page)
  const played = await page.evaluate(() => window.__test?.audio.played ?? [])
  expect(played.length).toBe(4) // No.1〜No.4
})

test('誤答フロー: 答えと画像が表示され、同じ問題をやり直して正解で次へ進める (E3)', async ({
  page,
}) => {
  await startQuiz(page)
  await answerWrongly(page)

  // 答え・イメージ画像・穴埋めが埋まった例文が表示される
  await expect(page.getByTestId('quiz-answer')).toBeVisible()
  await expect(page.getByTestId('quiz-image')).toBeVisible()
  await expect(page.getByTestId('quiz-sentence')).not.toContainText('____')

  // 選択していた(音声が流れていた)単語も表示され、正解とは異なる
  const selectedWord = await page.getByTestId('quiz-selected').textContent()
  const answerWord = await page.getByTestId('quiz-answer').textContent()
  expect(selectedWord).toBeTruthy()
  expect(selectedWord).not.toBe(answerWord)

  // 例文音声を聞き終えたらやり直せる(同じ問題: 進捗は 1/10 のまま)
  const retry = page.getByTestId('quiz-retry')
  await expect(retry).toBeEnabled()
  await retry.click()
  await waitForAnswering(page)
  await expect(page.getByTestId('quiz-progress')).toHaveText('1 / 10')

  // やり直しで正解すれば次の問題へ
  await answerCorrectly(page)
  await expect(page.getByTestId('quiz-image')).toBeVisible() // 正解時も画像表示
  await goNext(page)
  await expect(page.getByTestId('quiz-progress')).toHaveText('2 / 10')
})

test('チップス: 既読チェックを付けるまで次へ進めない (E4)', async ({ page }) => {
  // シードデータでは各セットの1問目にチップスがある
  await startQuiz(page)
  await answerCorrectly(page)

  await expect(page.getByTestId('quiz-tip')).toBeVisible()
  await expect(page.getByTestId('quiz-next')).toBeDisabled()

  await page.getByTestId('tip-check').check()
  const next = page.getByTestId('quiz-next')
  await expect(next).toBeEnabled()
  await next.click()
  await expect(page.getByTestId('quiz-progress')).toHaveText('2 / 10')
})

test('1セット10問を完走して結果画面が表示される (Phase 1マイルストーン)', async ({
  page,
}) => {
  await startQuiz(page, 2)
  for (let q = 1; q <= 10; q++) {
    await expect(page.getByTestId('quiz-progress')).toHaveText(`${q} / 10`)
    await answerCorrectly(page)
    await goNext(page)
    if (q < 10) await waitForAnswering(page)
  }
  await expect(page.getByTestId('quiz-result')).toBeVisible()
  await expect(page.getByTestId('quiz-result')).toContainText('初回正解 10 / 10')
})

test('非公開セットは開けない', async ({ page }) => {
  const response = await page.goto('/sets/10/play') // セット10は非公開(シード)
  expect(response?.status()).toBe(404)
})
