# 開発ガイド

この文書は、開発環境の前提、主要コマンド、ワークスペース構成をまとめた開発者向けガイドです。

## 1. 前提環境

- Node.js: `v20`（`.nvmrc` 準拠）
- npm workspaces を利用

### セットアップ

```bash
nvm use
npm install
```

## 2. 開発起動

### API + Web 同時起動

```bash
npm run dev
```

- API: `http://localhost:3001`
- Web: `http://localhost:5173`

### 個別起動

```bash
npm run dev:api
npm run dev:web
```

## 3. 品質チェック/テスト

### 型チェック

```bash
npm run typecheck
npm run typecheck -w apps/api
npm run typecheck -w apps/web
```

### テスト

```bash
npm run test
npm run test -w apps/api
npm run test -w apps/web
```

### カバレッジ

```bash
npm run test:coverage
npm run test:coverage -w apps/api
npm run test:coverage -w apps/web
```

## 4. ビルド

```bash
npm run build
npm run build:api
npm run build:web
```

## 5. ワークスペース構成

- `apps/api`: Express + TypeScript による REST API
- `apps/web`: React + Vite + TypeScript による Web UI
- `docs`: 要件/設計/タスク/テストなどの文書


## 6. hash lookup 付きアップロード手順（Web）

1. ENEX ファイルを選択すると、Web が SHA-256 を計算して進捗を表示します。
2. 計算完了後に `POST /api/imports/hash-lookup` を呼び出し、既存 import の有無を判定します。
3. `shouldUpload=true` のときだけ Upload ボタンが有効になり、`POST /api/enex/parse` を実行できます。アップロード中は ENEX POST フェーズ専用インジケータ（`Phase 2/2`）と「キャンセル不可」メッセージが表示されます。
4. `shouldUpload=false` のときは Upload をスキップし、表示された `importId` を再利用してノート参照に進みます。

## 7. 関連ドキュメント

- アーキテクチャ: `docs/architecture.md`
- API 契約 (OpenAPI): `apps/api/openapi.yaml`
- テストガイド: `docs/testing/test-guidelines.md`
- タスク一覧: `docs/tasks/implementation-tasks.md`


## 8. ノート添付の一括ダウンロード手順（Web）

1. 対象 import を表示後、ノート一覧のチェックボックスでノートを選択します。
2. 必要に応じて `Select all in page` で現在ページを全選択/全解除します。
3. `Download selected attachments` を押すと、Web は選択ノートの resources を集約し `POST /api/imports/:importId/resources/bulk-download` を呼び出します。
4. 処理中は `Preparing ZIP...` が表示され、完了後に ZIP がダウンロードされます。
5. 失敗時はアラートが表示され、選択状態を保持したまま再試行できます。

## 9. 大容量 ENEX（〜1GB）運用ガイド

- `POST /api/enex/parse` のアップロード上限は現状 1GB。
- multipart 受信データはメモリへ全量展開せず、`os.tmpdir()` 配下（通常 `/tmp/enex-viewer-*`）へ一時ファイルとしてストリーミング保存される。
- parser は tmp ENEX を `<note>` 単位で逐次処理するため、全体を `Buffer.toString()` しない（`ERR_STRING_TOO_LONG` 回避）。
- import 完了時は `wal_checkpoint(TRUNCATE)` を実行し、再起動後も hash lookup が既存 `importId` を再利用できるようにする。

### 9.1 ディスク容量の目安

- `ENEX_VIEWER_DATA` 配下: SQLite DB + `resources` 保存領域として、少なくとも ENEX 実サイズと同等以上（推奨 2 倍）を確保。
- tmp 領域（例: `/tmp`）: アップロード中 ENEX 一時ファイル + 一括 ZIP 作成時の作業領域として、少なくとも 3GB を推奨。
- 目安として「1GB ENEX を安全に扱うには合計 5GB 以上の空き容量」を確保する。

### 9.2 tmp ファイル運用上の注意（T-215/T-216）

1. tmp ファイルは成功/失敗時に自動削除されるが、プロセス異常終了時は残る可能性があるため `enex-viewer-*` の残骸を定期点検する。
2. コンテナ運用では `os.tmpdir()` の実体（`/tmp` マウント容量）を監視し、ディスク逼迫時は upload を制限する。
3. tmp を手動削除する場合は「アップロード処理中でないこと」を確認してから実施する。
4. `ENEX_VIEWER_DATA` と tmp を同一ボリュームに置く場合、同時に枯渇しやすいため容量アラートを設定する。
