# enex-viewer

TypeScript で REST API (`apps/api`) と Web UI (`apps/web`) を同一リポジトリで開発するための初期構成です。

## セットアップ

```bash
nvm use
npm install
```

## 開発起動

```bash
npm run dev
```

- API: [http://localhost:3001](http://localhost:3001)
- Web: [http://localhost:5173](http://localhost:5173)

## 個別起動

```bash
npm run dev:api
npm run dev:web
```

## ビルド

```bash
npm run build
```

## 個別ビルド

```bash
npm run build:api
npm run build:web
```

## 型チェック

```bash
npm run typecheck
```

```bash
npm run typecheck:api
npm run typecheck:web
```

## Agent/設計ドキュメント

- Agent の実行ルール: `AGENTS.md`
- アーキテクチャの正本: `docs/architecture.md`
- API 契約 (OpenAPI): `apps/api/openapi.yaml`
- 環境変数テンプレート: `.env.example`
