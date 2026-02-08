# ワークストリーム定義

この文書は、レーンごとの成果物と実装時の注意点を定義する。進捗管理は `implementation-tasks.md` を参照する。

## レーン A: API 基盤（T-001, T-006, T-007）
- 目的: API の責務分離、ENEX 解析、本文サニタイズの基盤を固める。
- 主成果物:
  - `apps/api/src` のレイヤ分割
  - ENEX 解析サービス
  - 本文サニタイズユーティリティ
- 受け入れ観点:
  - `npm run typecheck -w apps/api` が通る
  - 危険な HTML を除去できるテストがある

## レーン B: Web 基盤（T-002）
- 目的: Web 側の責務分割を確立する。
- 主成果物:
  - `apps/web/src` のディレクトリ分割（pages/features/api/state）
- 受け入れ観点:
  - ビルド/型チェックが通り、既存画面が崩れない

## レーン C: API エンドポイント（T-003, T-004, T-005）
- 目的: MVP API 契約を実装へ反映する。
- 主成果物:
  - `POST /api/enex/parse`
  - `GET /api/imports/:importId/notes`
  - `GET /api/imports/:importId/notes/:noteId`
- 受け入れ観点:
  - 正常系/異常系レスポンスを返せる
  - `apps/api/openapi.yaml` と実装が一致する

## レーン D: Web 機能（T-008, T-009, T-010）
- 目的: アップロードから閲覧までの UX を提供する。
- 主成果物:
  - アップロード UI
  - 一覧/検索 UI
  - 詳細表示 UI
- 受け入れ観点:
  - `npm run typecheck -w apps/web` が通る
  - API 接続エラー時の表示がある

## レーン E: 品質/文書/最終確認（T-011, T-012, T-013, T-021, T-014）
- 目的: テスト・ドキュメント・人間検証で最終品質を担保する。
- 主成果物:
  - API/Web テスト
  - OpenAPI/README/docs 更新
  - カバレッジ閾値達成（global 80%以上）
  - 手動テスト結果（`docs/testing/manual-test-scenarios.md`）
- 受け入れ観点:
  - typecheck/build/test の主要コマンドが通る
  - `npm run test:coverage` が通り閾値を満たす

## レーン F: テスト基盤移行（T-015, T-016, T-017, T-018）
- 目的: テスト運用を Vitest 基準へ統一する。
- 主成果物:
  - API 既存テストの Vitest 移行
  - API 統合テスト（Supertest）
  - Web テスト（Testing Library + jsdom）
  - テスト運用ドキュメント
- 受け入れ観点:
  - `npm run test:api` `npm run test:web` `npm run test` が通る

## レーン G: リファクタ（T-019, T-020）
- 目的: 重複ロジックを共通化して保守性を高める。
- 主成果物:
  - API 入力解析ヘルパー共通化
  - Web ユーティリティ共通化（エラー整形、表示フォーマッタ、テスト補助）
- 受け入れ観点:
  - 型チェック/テストが通る
  - 外部仕様（UI 文言、API 契約、HTTP 挙動）を壊さない

## 未完了タスクの補足（スコープ明確化）
- T-020:
  - `apps/web/src/api/enex.ts` と `apps/web/src/api/notes.ts` のエラー整形ロジックは共通化候補。
  - `apps/web/src/features/notes/NoteDetailPanel.tsx` の表示フォーマッタ（日時/リソース）は共通化候補。
  - テスト内の `createDeferred` など非同期テスト補助は `apps/web/src/test-utils/` 等への切り出し候補。
- T-021:
  - 低カバレッジ領域を `npm run test:coverage` で特定し、原則テスト追加で閾値達成する。
  - 実装修正が必要な場合は最小変更に限定し、理由を PR 説明に記載する。

## 横断ルール
- 契約先行 + モック: API 契約固定後、Web はモックで先行実装可。
- 再発明回避: 標準 API / 枯れたライブラリを優先する。
- 進捗更新: 完了チェックは `implementation-tasks.md` のみ更新する。
