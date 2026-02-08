# テスト基盤移行タスク（独立カテゴリ）

## 1. 目的
既存テスト資産をプロジェクト標準のテスト基盤（Vitest / Supertest / Testing Library）へ移行し、今後の実装タスクと並列で品質担保を進める。

## 2. 前提
- テスト基盤セットアップは完了済み（`npm run test` が実行可能）。
- 本カテゴリは既存レーン（A-E）と独立運用する。
- ただし個別タスクは対象機能の存在に依存する。
- 運用ルールは `docs/testing/test-guidelines.md` に集約する。

## 3. タスク一覧

| ID | 種別 | タスク | 依存 | 受け入れ条件 |
|---|---|---|---|---|
| T-015 | Test-Migration | API 既存テストを Vitest へ移行 | T-006 | 既存 API テストが Vitest 上で pass し、`node:test` 依存が不要になる |
| T-016 | Test-Migration | API 統合テスト追加（Supertest） | T-003 | `/health` `/api/message` `/api/enex/parse` の主要ケースを自動検証 |
| T-017 | Test-Migration | Web テスト追加（Testing Library + jsdom） | T-002 | 既存 UI の主要描画・ローディング・エラー表示を検証 |
| T-018 | Test-Migration | テスト運用ドキュメント更新 | T-015, T-016, T-017 | 実行手順、命名規約、配置ルールが docs に反映 |

## 4. 並列実行方針
- 並列1: T-015（API unit 移行）
- 並列2: T-016（API integration 追加）
- 並列3: T-017（Web unit 追加）
- 収束: T-018（ドキュメント同期）

## 5. 実装ルール
- 既存のプロダクションコードを壊さない。
- 既存テストの意図を維持したまま、フレームワークだけを移行する。
- 新規テストファイルは `*.vitest.test.ts` / `*.vitest.test.tsx` 命名を基本とする。
- テストは workspace コマンドで実行可能にする。

## 6. 完了時チェック
- [ ] `npm run test:api` が通る
- [ ] `npm run test:web` が通る
- [ ] `npm run test` が通る
- [ ] `docs/tasks/implementation-tasks.md` の該当タスクチェック更新済み
