# ENEX Viewer 詳細設計

## 1. 目的

実装時に必要なモジュール分割、主要モデル、処理方針を定義する。

## 2. API 内部構成

`apps/api/src` を以下の責務で分割する。

- `routes/`: HTTP ルーティング
- `controllers/`: request/response 変換、入力検証エラー整形
- `services/`: ENEX 解析、検索、詳細取得ユースケース
- `repositories/`: データアクセス（MVP はインメモリ）
- `models/`: ドメイン型定義
- `lib/`: サニタイズ、クエリ解析、ID/日時変換など共通処理

## 3. Web 内部構成

`apps/web/src` を以下の責務で分割する。

- `pages/`: 画面単位コンポーネント
- `features/`: 機能単位 UI（upload/notes など）
- `api/`: API クライアントとエラー整形
- `state/`: 機能状態管理
- `components/`: 再利用 UI 部品
- `test/` または `test-utils/`: テスト共通設定/補助

## 4. 主要ドメインモデル

- `ImportSession`: `id`, `createdAt`, `noteCount`, `warnings[]`
- `NoteSummary`: `id`, `title`, `createdAt`, `updatedAt`, `tags[]`, `excerpt`
- `NoteDetail`: `id`, `title`, `createdAt`, `updatedAt`, `tags[]`, `contentHtml`, `resources[]`
- `ResourceMeta`: `id`, `fileName`, `mime`, `size`

## 5. ENEX 解析方針

- 枯れた XML パーサを利用してノート単位へ変換する。
- Evernote `content`（ENML）を表示用 HTML に変換し、サニタイズする。
- 解析不能ノートは `warnings[]` へ蓄積し、処理全体は可能な範囲で継続する。

## 6. 検索・一覧方針

- MVP はインメモリの部分一致検索を採用する。
- 正規化ルール（大小文字、前後空白）を共通化する。
- 将来差し替えを見据え、検索実装をサービス層に閉じ込める。

## 7. Web フローとエラー処理方針

- Web の主導線は「ENEX アップロード → ノート一覧（検索/ページング） → ノート詳細」の 1 画面フローとする。
- API エラー形式は OpenAPI 契約（`ErrorResponse`）に従う。
- Web はアップロード/一覧/詳細それぞれの操作で API エラーを表示し、本文が取得不能な場合は `HTTP <status>` をフォールバック表示する。
- 想定外エラーはログへ残し、UI には安全なメッセージを返す。

## 8. テスト設計方針

- API unit: パーサ、変換、検索、入力解析
- API integration: エンドポイントの正常系/異常系
- Web unit: 主要コンポーネント描画、状態遷移、エラー表示
- カバレッジ: global 80%（lines/functions/branches/statements）を維持

## 9. 並列開発ルール（契約先行 + モック）

- API 実装前に `apps/api/openapi.yaml` を固定する。
- Web の `api/` 層は実 API とモックを差し替え可能に設計する。
- 結合時に HTTP ステータス、JSON 型、エラーフォーマットの互換を確認する。
