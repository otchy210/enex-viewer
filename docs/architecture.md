# Architecture

## 概要
このリポジトリは npm workspaces を使ったモノレポ構成です。

- API: `apps/api`（Express + TypeScript）
- Web: `apps/web`（React + Vite + TypeScript）

Web アプリは `/api/*` 経由で API を呼び出します。開発時は Vite のプロキシで `/api` を `http://localhost:3001` に転送します。

## ディレクトリ構成
- `apps/api`: REST API サーバー本体と API 契約（`openapi.yaml`）
- `apps/web`: API を利用するブラウザクライアント
- `docs`: プロジェクト全体の設計・運用ドキュメント

## 責務境界
- API は業務ロジック、バリデーション、レスポンス整形を担当する。
- Web は表示と UI 状態管理を担当する。
- API に属する業務ロジックを Web 側で重複実装しない。

## データフロー
1. ブラウザが Web UI から `/api/...` へリクエストする。
2. ローカル開発では Vite の dev proxy が API に転送する。
3. API がリクエストを処理し、JSON を返す。
4. Web がレスポンスデータを描画する。

## 設定
- Node バージョンは `.nvmrc`（Node 20）を使用する。
- 必須環境変数は `.env.example` を参照する。

## Contract-First の指針
- API 変更は `apps/api/openapi.yaml` の更新から始める。
- 実装とクライアント利用は契約定義に従う。
