# WP-WEB-REFACTOR

## 対象タスク
- T-020

## 目的
Web UI 全体の再利用可能なユーティリティを整備し、重複と実装ゆれを減らす。

## 成果物
- API エラー整形ユーティリティ（`buildErrorMessage` 相当の共通化）
- ノート詳細表示フォーマッタ（`formatTimestamp` / `formatResourceLabel` 相当の共通化）
- 非同期テスト補助ユーティリティ（`createDeferred` 相当の共通化）
- 既存 upload / note detail UI の挙動維持を担保する回帰テスト

## 完了条件
- `npm run typecheck -w apps/web` が通過
- `npm run test -w apps/web` が通過
- 既存 UI 挙動（文言/状態遷移/エラー表示）が維持される

## 更新ルール
- このワークパッケージに含まれるタスクの進捗は `docs/tasks/implementation-tasks.md` のチェックボックスを更新して管理する。
