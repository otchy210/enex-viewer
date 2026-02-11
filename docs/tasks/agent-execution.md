# エージェント実行ガイド

## 1. 目的

クラウド上の Codex エージェントへ並列タスク委譲するときの、最小かつ必須の運用ルールを定義する。

## 2. 基本原則

- 1 エージェントは原則 1 タスク ID を担当する（1タスク1PR）。
- スコープ外の変更は行わない。
- 破壊的変更（履歴改変、不要な大規模リネーム）は行わない。

## 3. タスク開始時に必ず確認すること

- `docs/tasks/implementation-tasks.md` の依存関係と完了条件
- `docs/tasks/workstreams.md` の担当レーンの注意事項
- `apps/api/openapi.yaml`（API 契約が関係する場合）

## 4. コミット規約

- コミットメッセージ先頭は必ず `T-00x: <summary>` 形式にする。
- 例:
  - `T-003: Add ENEX upload endpoint`
  - `T-013: Update OpenAPI and README`

## 5. ライブラリ選定ルール（再発明の回避）

- 実装前に、標準 API と既存ライブラリで解決可能かを確認する。
- 同等に解決できる場合は、自前実装より保守実績のある枯れたライブラリを優先する。
- 自前実装を選ぶ場合は、PR 説明に理由を明記する。

## 6. テスト基盤ルール

- 新規テストは既存基盤を使用する。
  - API: Vitest + Supertest
  - Web: Vitest + Testing Library + jsdom
- 新たなテストフレームワークは、明確な必要性と合意がない限り導入しない。

## 7. カバレッジ運用ルール

- 機能追加・仕様変更・リファクタ時は、必ずカバレッジを計測する。
- 実行コマンド:
  - 全体: `npm run test:coverage`
  - API: `npm run test:coverage -w apps/api`
  - Web: `npm run test:coverage -w apps/web`
- global 閾値（lines/functions/branches/statements）は 80% 以上を維持する。
- 進行中タスクのスコープを変えないため、是正は専用タスク（T-021）へ切り出してよい。

## 8. 完了判定チェックリスト

- [ ] `npm run typecheck` が通る
- [ ] 影響範囲のテストが通る
- [ ] `npm run test:coverage`（または対象 workspace coverage）が通る
- [ ] タスク受け入れ条件を満たす
- [ ] 必要なドキュメント更新を反映した

## 9. 進捗更新ルール

- タスク完了時に `docs/tasks/implementation-tasks.md` の該当行を `[ ]` から `[x]` に更新する。
- チェック更新は実装変更と同じ PR に含める。
- 担当外タスクのチェックは変更しない。

## 10. 並列実行での依存切り離し

- API と Web を並列化する場合は契約先行（OpenAPI 固定）で進める。
- Web は契約準拠モックで先行実装し、後段で実 API へ差し替える。
