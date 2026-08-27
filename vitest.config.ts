import { defineConfig } from 'vitest/config'

// テストの決定性のためタイムゾーンを固定する(端末ローカル日付の検証用)
process.env.TZ = 'Asia/Tokyo'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
})
