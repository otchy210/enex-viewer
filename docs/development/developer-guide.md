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
3. `shouldUpload=true` のときだけ Upload ボタンが有効になり、`POST /api/enex/parse` を実行できます。
4. `shouldUpload=false` のときは Upload をスキップし、表示された `importId` を再利用してノート参照に進みます。

## 7. 関連ドキュメント

- アーキテクチャ: `docs/architecture.md`
- API 契約 (OpenAPI): `apps/api/openapi.yaml`
- テストガイド: `docs/testing/test-guidelines.md`
- タスク一覧: `docs/tasks/implementation-tasks.md`
