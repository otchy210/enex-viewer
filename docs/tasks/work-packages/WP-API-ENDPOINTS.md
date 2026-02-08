# WP-API-ENDPOINTS

## 対象タスク
- T-003
- T-004
- T-005

## 目的
MVP の API 契約を実装に反映する。

## 成果物
- `POST /api/enex/parse`
- `GET /api/imports/:importId/notes`
- `GET /api/imports/:importId/notes/:noteId`

## 完了条件
- 正常系・異常系レスポンスを返せる
- `apps/api/openapi.yaml` と実装が一致

## 更新ルール
- このワークパッケージに含まれるタスクの進捗は `docs/tasks/implementation-tasks.md` のチェックボックスを更新して管理する。
