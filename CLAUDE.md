# COM単 開発ガイド(AI向け規約)

英単語学習Webアプリ。仕様は `docs/SPEC.md`、実装計画・アーキテクチャは `docs/IMPLEMENTATION_PLAN.md` を必ず参照すること。

## コマンド

```bash
npm run dev            # 開発サーバー (http://localhost:3000)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run test           # Vitest (unit)
npm run test:e2e       # Playwright (要: dev serverは自動起動)
npm run format         # Prettier
npm run seed:test      # 仮データ投入 (要: supabase start 済み)
supabase start         # ローカルSupabase起動 (要Docker)
supabase db reset      # マイグレーション再適用 (シードし直す前に実行)
```

npmはプロジェクトローカルキャッシュ(`.npmrc` の `cache=.npm-cache`)を使う。`~/.npm` にroot所有ファイルがあるため変更しないこと。

## レイヤ構成と規約(違反禁止)

| 層         | 場所              | してよいこと                                 | 禁止事項                                                                                                     |
| ---------- | ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| domain     | `src/domain/`     | 純関数・型定義のみ                           | React / Next / Supabase のimport、`Date.now()`・`new Date()`の引数なし呼び出し(現在時刻は必ず引数で受け取る) |
| data       | `src/data/`       | Supabaseクエリ、Storage操作                  | ビジネスルールの判定(domainに委譲)                                                                           |
| actions    | `src/actions/`    | 認証確認→入力検証→domain判定→data永続化      | クライアント申告の計算結果(ポイント等)を信用すること                                                         |
| hooks      | `src/hooks/`      | domainのreducer駆動、音声・画像の副作用管理  | JSXを返すこと                                                                                                |
| components | `src/components/` | props→JSX。イベントはコールバックpropsで返す | fetch / Supabase / domainの直接呼び出し                                                                      |
| app        | `src/app/`        | Server Componentでのデータ取得と組み立て     | ロジックの実装                                                                                               |

## 実装ルール

- 1タスクの手順: 型定義→ユニットテスト→実装→配線→ `typecheck / lint / test / 該当E2E` グリーンで完了。
- domainの学習ルール(1日1回・完全記憶・やり直しフロー・ポイント)は必ずユニットテストを添える。
- 操作可能なUI要素には `data-testid` を付与(例: `quiz-choice-1`, `quiz-confirm`, `tip-check`)。
- 「1日」はユーザー端末のローカル日付(`src/domain/date/localDate.ts`)。サーバー側は受理窓(±26h)で検証する。
- クリア記録の書き込みはServer Action経由のみ。pointsはサーバーで算出する(SPEC 6.3)。
- メディア(音声・画像)は非公開バケット `media`。配信は署名付きURL。
- コメント・UI文言は日本語、コード識別子は英語。

## テスト

- ユニット: `src/**/*.test.ts`(Vitest、TZはAsia/Tokyoに固定済み)。
- E2E: `e2e/*.spec.ts`(Playwright、主プロジェクトは mobile-chrome / Pixel 7)。
- E2Eで固定sleep禁止。音声はテストモード(無音MP3+`window.__test.audio`)で検証する。
- テストユーザー: `test1@example.com` / `test2@example.com` / `admin@example.com`(パスワードは全て `password123`)。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
