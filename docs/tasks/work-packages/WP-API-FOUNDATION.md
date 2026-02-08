# WP-API-FOUNDATION

## 対象タスク
- T-001
- T-006
- T-007

## 目的
API の責務分離と ENEX 解析の核を先に固める。

## 成果物
- `apps/api/src` のレイヤ分割
- ENEX 解析サービス
- 本文サニタイズユーティリティ

## 完了条件
- API が `npm run typecheck -w apps/api` を通過
- 危険な HTML を除去できるテストが存在

## 更新ルール
- このワークパッケージに含まれるタスクの進捗は `docs/tasks/implementation-tasks.md` のチェックボックスを更新して管理する。
