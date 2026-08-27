import { expect, test } from '@playwright/test'

test('ランディングページが表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('landing-title')).toHaveText('COM単')
})
