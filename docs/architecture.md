# Architecture

## 1. 目的
ENEX Viewer の機能実装におけるシステム境界、責務、主要データフローを定義する。

## 2. コンテキスト
- Web (`apps/web`): ユーザー操作、表示、検索 UI
- API (`apps/api`): ENEX 解析、ノート取得 API、エラーハンドリング

## 3. コンテナ構成
- Browser
  - React + Vite の SPA
- API Server
  - Express + TypeScript
  - ENEX パーサー、検索サービス、一時ストア

## 4. 責務分離
- Web は表示責務のみ。ENEX の解析ロジックは持たない。
- API は XML 解析、モデル変換、検索を担当する。
- API 契約の正本は `apps/api/openapi.yaml`。

## 5. 主要データフロー
1. ユーザーが Web で ENEX ファイルを選択する。
2. Web が `POST /api/enex/parse` にアップロードする。
3. API が XML を解析し、`importId` とノート情報を一時保存する。
4. Web が `GET /api/imports/:importId/notes` で一覧を取得する。
5. Web が `GET /api/imports/:importId/notes/:noteId` で詳細を取得する。

## 6. 技術方針
- TypeScript strict を維持する。
- API は入力バリデーションを行う。
- 本文描画は必ずサニタイズする。
- 大規模 ENEX での性能課題に備え、解析処理をサービス層に分離する。
- API 契約（OpenAPI）を先に固定し、Web はモックで先行実装可能とする。

## 7. 詳細設計への参照
- 詳細設計: `docs/design/system-design.md`
- 要件定義: `docs/product/requirements.md`
- 仕様書: `docs/product/spec.md`
