# COM単 学習Webアプリ 実装計画書

- 版: v1.0
- 前提: [docs/SPEC.md](./SPEC.md) v1.0
- 目的: View と Logic を分離した構造で、AI(Claude Code)主導の開発を回すための設計・手順・テスト戦略を定める。

---

## 1. アーキテクチャ方針: View / Logic 分離

### 1.1 レイヤ構成

```
src/
├── domain/        # ① 純粋ロジック層(最重要・最厚テスト)
│   ├── quiz/          # クイズ進行ステートマシン(reducer)
│   ├── scheduler/     # 「今日のセット」提示ロジック
│   ├── points/        # ポイント計算(10pt/0pt判定)
│   ├── progress/      # 進捗率・完全記憶・クリア回数
│   ├── ranking/       # 順位計算(同点=同順位)
│   └── date/          # 端末ローカル日付処理(「今日」判定・月境界・サーバー受理窓の検証)
├── data/          # ② データアクセス層(Repository)
│   ├── repositories/  # Supabaseクエリを関数に隠蔽
│   └── media/         # 音声・画像の署名付きURL取得・プリフェッチ
├── actions/       # ③ Server Actions(検証 → domain → repository)
├── hooks/         # ④ 接着層: ViewとLogicを繋ぐReact hooks
│   └── useQuizSession.ts など
├── components/    # ⑤ View層: propsを受けて描画するだけ
│   ├── quiz/  ├── home/  ├── calendar/  ├── ranking/  └── ui/
├── app/           # ⑥ Next.jsルート(レイヤの組み立てのみ)
└── lib/           # Supabaseクライアント初期化等の共通基盤
```

### 1.2 各レイヤのルール(AI開発時の契約)

| 層 | してよいこと | 禁止事項 |
|---|---|---|
| ① domain | 純関数・型定義のみ。入力→出力が決定的 | import禁止: React / Next / Supabase / Date.now()直呼び(現在時刻は必ず引数で受け取る) |
| ② data | Supabaseクエリ、Storage操作 | ビジネスルールの判定(判定はdomainに委譲) |
| ③ actions | 認証確認→入力検証→domainで判定→dataで永続化 | クライアントから受けた計算結果(ポイント等)を信用すること |
| ④ hooks | domainのreducerをuseReducerで回す、audio再生の副作用管理 | 描画(JSXを返さない) |
| ⑤ components | props→JSX。イベントはコールバックpropsで上に返す | fetch / Supabase / domainの直接呼び出し、useState以外の複雑な状態 |
| ⑥ app | Server Componentでのデータ取得と⑤への受け渡し | ロジックの実装 |

この分離の狙い:
- **domainはブラウザ・DB・音声なしでVitestで完全にテストできる**。仕様書の学習ルール(1日1回、完全記憶、やり直しフロー)は全部ここに入る。
- **componentsは「propsを与えたらこう見える」だけ**なので、AIに書かせても壊れにくく、レビューは見た目確認で済む。
- バグの大半が集中する「状態遷移」を①に閉じ込め、E2Eは薄く保つ。

### 1.3 クイズ進行はステートマシンで実装する

学習フロー(SPEC 4.3)は `domain/quiz/` の **純粋reducer** として実装する。副作用(音声再生)は状態に「今再生すべき音声」を持たせ、hooks層が実行する。

```ts
// 状態(抜粋)
type QuizState =
  | { phase: 'intro' }                                  // スタート待ち(音声アンロック)
  | { phase: 'playing_choices'; qIndex: number; playingChoice: 1|2|3|4 }
  | { phase: 'answering';       qIndex: number; selected: number | null }
  | { phase: 'correct';         qIndex: number }        // 答え+イメージ画像表示、例文音声再生中
  | { phase: 'tip';             qIndex: number; checked: boolean }
  | { phase: 'wrong';           qIndex: number }        // 答え+イメージ画像表示、例文音声再生中
  | { phase: 'retry_ready';     qIndex: number }        // 同一問題やり直しへ
  | { phase: 'finished';        result: SetResult }     // 結果画面。「次に進む」→次の推奨セットへ連続進行

// イベント(抜粋)
type QuizEvent =
  | { type: 'START' }
  | { type: 'AUDIO_ENDED' }          // 音声1本の再生完了
  | { type: 'SELECT'; choice: number }
  | { type: 'REPLAY_CHOICE'; choice: number }
  | { type: 'CONFIRM' }              // 決定ボタン
  | { type: 'TIP_CHECK' }
  | { type: 'NEXT' }
```

- 遷移ルール(誤答→答え表示→音声1周→同一問題再挑戦、チップスチェック必須など)はすべてreducerのユニットテストで検証する。
- 選択肢シャッフルは乱数を引数(seed または注入されたshuffle関数)で受け取り、テストを決定的にする。

### 1.4 メディア(音声・画像)はPort/Adapterで抽象化

```ts
interface AudioPort {
  preload(paths: string[]): Promise<void>
  play(path: string): Promise<void>      // 再生完了でresolve
  stop(): void
}
interface ImagePort {
  prefetch(paths: string[]): Promise<void>   // 署名URL解決+ブラウザキャッシュへ先読み
  resolveUrl(path: string): string           // 表示用URL(署名付き)
}
```

- 本番実装: AudioはHTMLAudioElement、Imageは`<img>`プリロード。いずれも署名付きURL+次問題分の先読み。セット終盤には**次の推奨セットのメディアも先読み**し、「次に進む」での連続進行を待ち時間ゼロに近づける。
- テスト実装: 即resolveするフェイク。hooks層のテストとE2Eの高速化に使う。
- E2E時はテストモードで無音の短尺MP3・軽量ダミー画像を使い、`window.__test.audio` に再生履歴を記録して検証可能にする。

## 2. AI開発の進め方

### 2.1 基本サイクル

1タスク = 1つの完結した機能単位(下記WBS参照)。各タスクは次の順で進める:

1. **契約の確定**: 型定義とインターフェース(関数シグネチャ・props型)を先に書く
2. **テスト作成**: domainはユニットテストを先に書く(仕様書の該当節をテストケース名に対応させる)
3. **実装**: テストが通るまで実装
4. **配線**: hooks / components / app に接続し、該当するE2Eを追加
5. **完了確認**(Definition of Done):
   - `npm run typecheck` / `lint` / `test`(unit)/ 対象のE2E がグリーン
   - 仕様書の該当節と差分がないことを自己チェック

### 2.2 リポジトリ運用

- `CLAUDE.md` に本書のレイヤルール(1.2の表)・コマンド一覧・命名規約を記載し、セッション毎に参照させる(Phase 0で作成)。
- 1タスク=1ブランチ=1コミット群。mainへはテストグリーンでのみマージ。
- CI(GitHub Actions)で typecheck / lint / unit / E2E を全実行。E2EはSupabase CLIのローカルスタック(Docker)を起動して実施(無料)。

### 2.3 AIに委ねる範囲と人間が確認する範囲

| 作業 | 担当 |
|---|---|
| domain実装+ユニットテスト | AI(テストで機械的に検証可能) |
| components実装 | AI + **人間がスマホ幅でスクリーンショット確認** |
| DBスキーマ・RLSポリシー | AI作成 + **人間がレビュー必須**(セキュリティ境界のため) |
| 学習フローの体感(音声タイミング等) | **人間が実機(iPhone/Android)で確認** |
| 仮データの内容 | AIが生成(英文+無音ダミーMP3) |

## 3. テスト戦略

### 3.1 テストピラミッド

```
        E2E (Playwright)          … 12シナリオ+α。動線の保証
      ─────────────────
     結合 (Vitest + Testing Library)  … hooksとcomponentsの接着部を薄く
   ─────────────────────
  ユニット (Vitest)                 … domain全関数。ここに全ルールを閉じ込め最厚に
```

方針: **仕様のルールはユニットで網羅し、E2Eは「配線が正しいこと」の確認に徹する**。E2Eでルールの全分岐を踏むと遅く脆くなるため。

### 3.2 ユニットテスト(Vitest)— 対象と主要ケース

| モジュール | 主要テストケース(仕様書対応) |
|---|---|
| quiz reducer | 正解→例文音声→次問題 / 誤答→答え表示→音声完了までNEXT不可→同一問題再挑戦 / チップス未チェックでNEXT不可 / 10問目正解でfinished / 再挑戦時の再シャッフル(4.3) |
| points | 通常クリア10pt / 5回クリア済みは0pt / クライアント申告値を使わない(4.4) |
| progress | 進捗率式・上限5クランプ / 完全記憶判定(2章, 4.2) |
| scheduler | 復習(1〜4回)を古い順に優先 / 今日実施済みを除外 / 復習なしなら新規をセット番号順 / 全完全記憶時の挙動 / 次の推奨セット(連続進行用)の先読み対象決定(4.2) |
| date | 端末ローカル日付の算出 / 日付境界(23:59→0:00)をまたぐケース / 月初・月末境界 / サーバー受理窓(UTC±26h相当)の範囲内・範囲外判定(2章, 6.3, 7章) |
| ranking | 同点同順位(1,2,2,4) / 上位100抽出 / 自分の順位算出(4.6) |
| CSVインポート検証 | 選択肢4件・正解1件・音声欠落の検出(4.7) |

### 3.3 結合テスト(Vitest + Testing Library)— 薄く

- `useQuizSession`: フェイクAudioPortを注入し、「reducerのイベント発火と音声再生指示が正しく連動するか」だけ確認。
- 主要components: 代表的なpropsでのレンダリングとコールバック発火(スナップショット偏重にしない)。

### 3.4 E2Eテスト(Playwright)

**構成**
- プロジェクト: `mobile-chrome`(Pixel 7相当、主)+ `desktop-chromium`(従)。
- バックエンド: Supabase CLI のローカルスタックを起動し、シードSQL(仮データ10セット+テストユーザー)を毎回投入。テスト間の独立性はDBリセット or ユーザー分離で担保。
- 認証: メール+パスワードのテストユーザーでログインし `storageState` を保存して各テストで再利用(毎回ログインしない)。GoogleログインのE2Eは外部依存のため対象外とし、「Googleボタンが正しいOAuth URLへ遷移すること」までを検証。
- **時刻注入**: 「1日」は端末時刻基準のため、主役はPlaywrightの `clock` API(クライアント時刻の固定・進行)。「翌日になった」「月が替わった」をclock変更+リロードで再現し、1日1回制限・月間ランキングのリセットをテストする。サーバーの受理窓検証(SPEC 6.3)は `TEST_FAKE_NOW` 環境変数でサーバー時刻を固定し、範囲外日付が拒否されることを確認する。
- **音声**: テストモードでは無音ダミーMP3を配信。`window.__test.audio.played`(再生履歴)と `data-testid` で「No.1→4が順に再生された」「例文音声が再生された」を検証。実音声の聴感はE2E対象外(人間の実機確認)。

**シナリオ(SPEC 8章の12本を実装単位に整理)**

| # | シナリオ | フェーズ |
|---|---|---|
| E1 | メール登録→確認→ニックネーム設定→ホーム | 3 |
| E2 | セット完走(全問正解): 10pt・クリア回数+1・結果画面 | 2 |
| E3 | 誤答→答え表示→音声1周→同一問題やり直し→完走 | 1 |
| E4 | チップス: チェックまで次へ進めない | 1 |
| E5 | 1日1回制限: 同日同セット不可・別セット可・翌日(時刻注入)で可 | 2 |
| E6 | 完全記憶: 5回目でバッジ・6回目0pt・進捗率5/5維持 | 2 |
| E7 | ホーム: 復習優先の自動提示・進捗率表示・結果画面「次に進む」で次の推奨セットへ連続進行 | 2 |
| E8 | カレンダー: 日別pt表示・月送り | 2 |
| E9 | ランキング: 上位表示・自分の順位枠・月替わりリセット(時刻注入) | 3 |
| E10 | 中断: セット途中でリロード→記録なし・再実施可 | 2 |
| E11 | 管理: 問題CRUD・音声アップロード・CSVインポート(正常+エラー)・非公開セット非表示 | 4 |
| E12 | 権限: 一般ユーザーの/admin拒否・BANユーザーのブロック | 4 |

**テスト容易性のための実装要件**(実装時に必ず入れる)
- 全ての操作可能要素に `data-testid` を付与(命名: `quiz-choice-1`, `quiz-confirm`, `tip-check` …)。
- テストモードフラグ(`NEXT_PUBLIC_TEST_MODE`)で: ダミー音声配信 / `window.__test` フック有効化 / アニメーション短縮。
- シードスクリプト `npm run seed:test` を用意し、ローカル開発とCIで同一データを使う。

## 4. WBS(タスク分解)

### Phase 0: 基盤(0.5週)
- T0-1: Next.js + TypeScript + Tailwind + ESLint/Prettier 初期化、CLAUDE.md作成
- T0-2: Supabaseプロジェクト作成、CLIローカルスタック、スキーマv1(SPEC 6.1)+RLS、マイグレーション運用開始
- T0-3: 仮データ生成スクリプト(10セット100語、英例文、無音MP3、ダミー画像)+ `seed:test`
- T0-4: CI構築(typecheck/lint/unit/E2E空回し)、Playwright/Vitestセットアップ

### Phase 1: 学習コア(1.5週)— 価値の中心。最優先
- T1-1: `domain/quiz` reducer+ユニットテスト一式(3.2表のquiz行)
- T1-2: `AudioPort` / `ImagePort` 本番実装(署名URL・プリフェッチ)+フェイク実装
- T1-3: `useQuizSession` +結合テスト
- T1-4: クイズ画面components(問題文・選択肢4ボタン・決定・正誤+イメージ画像・チップス・結果)
- T1-5: E2E: E3, E4
- ✅ マイルストーン: 仮データでスマホ実機で1セット完走できる

### Phase 2: 学習サイクル(1週)
- T2-1: `domain/date`(JST)+ `domain/points` + `domain/progress` +ユニット
- T2-2: クリア記録Server Action(6.3の検証込み)+ `set_completions` 書き込み
- T2-3: `domain/scheduler` +ホーム画面(今日のセット・進捗率)+結果画面からの連続進行導線(次セットの先読み込み)
- T2-4: セット一覧(仮想スクロール・カテゴリ絞込)
- T2-5: カレンダー画面
- T2-6: E2E: E2, E5, E6, E7, E8, E10
- ✅ マイルストーン: 学習サイクル(毎日→5回→完全記憶)が回る

### Phase 3: アカウント+ソーシャル(1週)
- T3-1: 認証画面(メール登録・確認・ログイン・リセット・Google)
- T3-2: オンボーディング(ニックネーム)+設定画面(変更・退会)
- T3-3: `domain/ranking` +ランキング画面(上位100+自分枠)
- T3-4: E2E: E1, E9
- ✅ マイルストーン: 複数ユーザーで競える

### Phase 4: 管理画面(1.5週)
- T4-1: adminロール・ミドルウェアガード
- T4-2: コンテンツCRUD+音声アップロード・試聴・公開フラグ
- T4-3: CSV/ZIP一括インポート(検証・エラーレポート・進捗表示)
- T4-4: ユーザー管理(検索・BAN・ニックネーム変更)
- T4-5: 統計ダッシュボード(簡易)
- T4-6: E2E: E11, E12
- ✅ マイルストーン: 実データ500セットを投入できる

### Phase 5: 仕上げ(0.5〜1週)
- T5-1: 実データ投入リハーサル(CSV列定義の確定が前提 → SPEC 11章)
- T5-2: 性能調整(プリフェッチ検証・Lighthouse・500セットでの一覧/集計)
- T5-3: E2E全シナリオ安定化(flaky対策)、実機総点検
- T5-4: リリース準備(Vercel Pro、規約ページ、OGP等)

想定期間: 合計6〜7週(1人+AI、専業でない場合は適宜スケール)。

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| iOS Safariの音声自動再生がブロックされる | Phase 1の最初の実機確認項目にする。スタートボタンのジェスチャーでアンロックする設計(SPEC 3.1)を早期検証 |
| E2Eで音声待ちがflakyになる | 音声完了はイベントフックで検知し、固定sleepを一切使わない。テストモードで無音短尺MP3 |
| 日付境界のバグ(制限・集計のずれ) | 現在時刻を全domain関数の引数にし、端末日付の境界(23:59/0:00)・サーバー受理窓の内外をユニットで固定 |
| 端末時刻の改ざんによる不正 | サーバー受理窓(UTC±26h相当)で過去日・未来日を拒否+`UNIQUE(user_id, set_id, completed_on)` で物理担保(SPEC 6.3) |
| 500セットで一覧・集計が重い | Phase 5で実規模ダミーデータの負荷確認。インデックス+必要ならマテビュー(SPEC 6.2) |
| RLS設定ミスによる情報漏えい | ポリシーは人間レビュー必須。E12に「他人の記録が読めない」検証を追加 |

## 6. コマンド一覧(整備目標)

```bash
npm run dev            # 開発サーバー
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run test           # Vitest(unit+結合)
npm run test:e2e       # Playwright(ローカルSupabase起動込み)
npm run seed:test      # 仮データ+テストユーザー投入
npm run db:migrate     # マイグレーション適用
```
