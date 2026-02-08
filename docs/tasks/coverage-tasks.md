# テストカバレッジ強化タスク

## 1. 目的
機能実装タスクと分離して、カバレッジ閾値（global 80%）を安定達成する。

## 2. タスク一覧

| ID | 種別 | タスク | 依存 | 受け入れ条件 |
|---|---|---|---|---|
| T-021 | Quality | テストカバレッジ引き上げ（閾値達成） | T-011, T-012 | `npm run test:coverage` が通り、global 閾値（lines/functions/branches/statements 80%）を満たす |

## 3. T-021 の範囲
- 対象:
  - API/Web の低カバレッジ領域
  - 特に `apps/web/src/api/*`、`apps/web/src/features/*` などの未計測/低計測ファイル
- 方針:
  - まず `npm run test:coverage` を実行し、低カバレッジ箇所を特定する
  - 実装コードは原則変更せず、テスト追加で引き上げる
  - どうしても実装修正が必要な場合は、最小変更に限定し理由を PR に明記する
  - 既存のテスト基盤（Vitest + Supertest / Testing Library）を使う

## 4. 完了時チェック
- [ ] `npm run typecheck` が通る
- [ ] `npm run test` が通る
- [ ] `npm run test:coverage` が通る
- [ ] global 閾値（lines/functions/branches/statements 80%）を満たす
- [ ] 対象ワークパッケージのチェックボックス更新済み
