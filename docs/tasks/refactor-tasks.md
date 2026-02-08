# リファクタタスク（独立カテゴリ）

## 1. 目的
機能実装とは分離して、重複ロジックの共通化・厳密化を安全に進める。

## 2. タスク一覧

| ID | 種別 | タスク | 依存 | 受け入れ条件 |
|---|---|---|---|---|
| T-019 | Refactor | API のクエリ/パラメータ解析ロジック共通化（厳密バリデーション） | T-004, T-005 | 共通関数化後も既存挙動とテストが維持される |
| T-020 | Refactor | Web アップロード処理のユーティリティ共通化（API エラー整形/テスト補助） | T-008, T-017 | 共通化後も upload UI の既存挙動とテストが維持される |

## 3. T-019 の範囲
- 対象: API controller の入力解析ロジック（query / params）
- 目的: 重複の削減とバリデーション方針の統一
- 方針:
  - 配列クエリの扱いを明示（黙って丸めない）
  - 数値変換は厳密な整数判定にする（`10abc` を許容しない）
  - 既存の HTTP ステータスとエラーメッセージを維持する

## 4. 完了時チェック
- [ ] `npm run typecheck -w apps/api` が通る
- [ ] `npm run test:api` が通る
- [ ] 既存 endpoint の外部仕様（OpenAPI/レスポンス挙動）を壊していない
- [ ] 対象ワークパッケージのチェックボックス更新済み

## 5. T-020 の範囲
- 対象:
  - `apps/web/src/api/enex.ts` の API エラー整形ロジック（例: `buildErrorMessage`）
  - `apps/web/src/features/upload/UploadSection.vitest.test.tsx` の非同期テスト補助（例: `createDeferred`）
- 目的:
  - upload 関連で同種処理が増えたときに再利用できるユーティリティへ整理する
  - 実装とテストの重複を減らし、失敗時メッセージの扱いを統一する
- 方針:
  - API エラー整形は `apps/web/src/lib/` などに切り出し、upload API 以外でも使える形にする
  - テスト補助は `apps/web/src/test-utils/` などに切り出し、型付きで再利用可能にする
  - UI 文言、HTTP リクエスト仕様、既存の表示・状態遷移は変更しない

## 6. T-020 完了時チェック
- [ ] `npm run typecheck -w apps/web` が通る
- [ ] `npm run test -w apps/web` が通る
- [ ] UploadSection の外部挙動（表示文言/ボタン状態/エラー表示）を維持
- [ ] 対象ワークパッケージのチェックボックス更新済み
