# enex-viewer

ENEX Viewer は、Evernote ENEX ファイルを読み込み、ノートの一覧検索と詳細閲覧を行うためのモノレポです。

- API: `apps/api`（ENEX 解析、ノート一覧/詳細 API）
- Web: `apps/web`（アップロード、検索、詳細表示 UI）

## 主要機能

- ENEX ファイルのアップロードと解析（`POST /api/enex/parse`）
- インポート単位のノート一覧取得（`GET /api/imports/:importId/notes`）
- ノート詳細取得（`GET /api/imports/:importId/notes/:noteId`）

Web トップ画面は ENEX Viewer 本体の導線のみに整理されており、アップロード、ノート一覧検索、詳細閲覧を 1 画面で行えます。

## ハッシュ lookup フロー（Phase 2）

1. Web で ENEX を選択すると、クライアントで SHA-256 を計算し進捗を表示します。
2. 計算済みハッシュを `POST /api/imports/hash-lookup` へ送信します。
3. `shouldUpload=true` の場合のみ Upload を実行し、`POST /api/enex/parse` で import を作成します。
4. `shouldUpload=false` の場合はアップロードをスキップし、既存 `importId` を再利用してノート一覧を表示できます。

## ドキュメント索引

### プロダクト/設計

- ドキュメント入口: `docs/INDEX.md`
- 要件定義: `docs/product/requirements.md`
- 仕様書: `docs/product/spec.md`
- アーキテクチャ: `docs/architecture.md`
- 詳細設計: `docs/design/system-design.md`

### API 契約

- OpenAPI: `apps/api/openapi.yaml`

### 開発者向けガイド

- 開発ガイド（環境構築、コマンド、ワークスペース構成）: `docs/development/developer-guide.md`
- テスト運用ガイドライン: `docs/testing/test-guidelines.md`
- 手動テストシナリオ: `docs/testing/manual-test-scenarios.md`

### タスク/運用

- タスク入口: `docs/tasks/README.md`
- 実装タスク一覧: `docs/tasks/implementation-tasks.md`
- エージェント実行ガイド: `docs/tasks/agent-execution.md`
- ワークストリーム定義: `docs/tasks/workstreams.md`
