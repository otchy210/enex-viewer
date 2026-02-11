# アーキテクチャ

## 1. 目的

ENEX Viewer のシステム境界、責務分離、主要データフローを定義する。

## 2. コンテキスト

- Web (`apps/web`): ユーザー操作、表示、検索 UI を担当
- API (`apps/api`): ENEX 解析、検索、詳細取得、エラーハンドリングを担当

## 3. コンテナ構成

- Browser
  - React + Vite の SPA
- API Server
  - Express + TypeScript
  - ENEX パース、ドメイン変換、検索処理

## 4. 責務分離

- Web は表示責務に限定し、ENEX 解析ロジックを持たない。
- API は XML 解析、モデル変換、検索、詳細取得を担当する。
- API 契約の正本は `apps/api/openapi.yaml`。

## 5. 主要データフロー

1. ユーザーが Web で ENEX ファイルを選択する。
2. Web が `POST /api/enex/parse` へアップロードする。
3. API が XML を解析し、`importId` とノート情報を保持する。
4. Web が `GET /api/imports/:importId/notes` で一覧を取得する。
5. Web が `GET /api/imports/:importId/notes/:noteId` で詳細を取得する。

## 6. 技術方針

- TypeScript strict を維持する。
- API は入力バリデーションを行う。
- 本文描画は必ずサニタイズする。
- 契約先行（OpenAPI 固定）で Web/API を並列開発可能にする。
- 「再発明」を避け、標準 API または保守実績のあるライブラリを優先する。

## 7. 非機能観点

- 性能: 中〜大規模 ENEX でも一覧/検索/詳細の体感応答を維持する。
- セキュリティ: XSS を防止し、危険な HTML を除去する。
- 保守性: レイヤ分離とテストで変更影響範囲を限定する。

## 8. 関連ドキュメント

- 詳細設計: `docs/design/system-design.md`
- 要件定義: `docs/product/requirements.md`
- 仕様書: `docs/product/spec.md`
