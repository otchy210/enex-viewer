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

- 目的: Phase 1 API 契約を実装へ反映する。
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

## レーン H: API リファクタ拡張（T-022〜T-024）

- 目的: API の構造品質・再利用性・テスト安定性を高める。
- 主成果物:
  - `createApp` 抽出による本番/テストの初期化共通化
  - import データ保存モデルの一本化
  - multipart 解析の middleware 分離
  - query/path 解析ユーティリティの責務分離
  - エラーレスポンス生成 helper の共通化
  - ENEX リソースサイズ算出ロジックの厳密化
  - 統合テストのストア初期化強化
- 受け入れ観点:
  - `npm run typecheck -w apps/api` が通る
  - `npm run test -w apps/api` が通る
  - リファクタ後に既存 API テストを実行し、リグレッションがない
  - 既存の HTTP ステータス/レスポンス形式/OpenAPI 契約を壊さない

## レーン I: Web リファクタ拡張（T-029〜T-031）

- 目的: Web の再利用性と責務分離を高め、表示/通信/state 管理の重複を減らす。
- 主成果物:
  - `NoteBrowser` と `useNotesList` の重複取得ロジック整理
  - 日時フォーマッタの共通化
  - API クライアントのエラー処理統一（`ensureOk` ベース）
  - 非同期 state 管理パターンの整理
  - `NoteContent` など表示責務の分離
- 受け入れ観点:
  - `npm run typecheck -w apps/web` が通る
  - `npm run test -w apps/web` が通る
  - リファクタ後に既存 Web テストを実行し、リグレッションがない
  - 既存の UI 文言/状態遷移/HTTP 挙動を壊さない

## レーン K: API lint 改善（T-033, T-034）

- 目的: API ランタイム/テスト/設定コードに strict lint を適用し、品質を底上げする。
- 主成果物:
  - `apps/api/src`（本体）の lint エラー解消（T-033）
  - `apps/api/src/__tests__` や `apps/api/vitest.config.ts`（テスト/設定）の lint エラー解消（T-034）
- 受け入れ観点:
  - `npm run lint -- apps/api` など対象範囲の lint が通る
  - `npm run typecheck -w apps/api` が通る
  - `npm run test:api` が通る
  - 本体/テスト/設定の責務を混ぜず、段階的に適用する

## レーン L: Web lint 改善（T-035, T-036）

- 目的: Web ランタイム/テスト/設定コードに strict lint を適用し、品質を底上げする。
- 主成果物:
  - `apps/web/src`（本体）の lint エラー解消（T-035）
  - `apps/web/src/**/*.test.tsx` や `apps/web/vitest.config.ts`（テスト/設定）の lint エラー解消（T-036）
- 受け入れ観点:
  - `npm run lint -- apps/web` など対象範囲の lint が通る
  - `npm run typecheck -w apps/web` が通る
  - `npm run test:web` が通る
  - 本体/テスト/設定の責務を混ぜず、段階的に適用する

## レーン M: lint 最終収束（T-037）

- 目的: API/Web の lint タスク完了後に CI 相当の総合確認を行い、後続タスクが安心して進める状態にする。
- 主成果物:
  - `npm run lint`（リポジトリ全体）の完走
  - API/Web の typecheck/test が再確認され、結果が記録される
- 受け入れ観点:
  - `npm run lint` `npm run typecheck -w apps/api` `npm run typecheck -w apps/web` `npm run test:api` `npm run test:web` のコマンドがすべて通る
  - 追加の lint エラーや型/テスト失敗が出た場合は、前段タスクに差し戻して再調整する

## レーン J: 横断リファクタ最適化（T-032）

- 目的: API/Web を横断して、重複ロジックの削減・共通化・実行効率改善をまとめて実施する。
- 主成果物:
  - ノート一覧の二重取得解消（UI 構成の整理または state 共有）
  - 一覧検索/整形の前計算による API 側処理コスト低減
  - import データ変換の重複削減（不要な全件 map/コピー削減）
  - resource size 算出と multipart 処理の効率改善
  - 非同期 state 実装の最終統一（実装ゆれの削減）
- 受け入れ観点:
  - `npm run typecheck -w apps/api` が通る
  - `npm run typecheck -w apps/web` が通る
  - `npm run test -w apps/api` が通る
  - `npm run test -w apps/web` が通る
  - 既存の API 契約/UI 挙動を壊さない

## 未完了タスクの補足（スコープ明確化）

- T-020:
  - `apps/web/src/api/enex.ts` と `apps/web/src/api/notes.ts` のエラー整形ロジックは共通化候補。
  - `apps/web/src/features/notes/NoteDetailPanel.tsx` の表示フォーマッタ（日時/リソース）は共通化候補。
  - テスト内の `createDeferred` など非同期テスト補助は `apps/web/src/test-utils/` 等への切り出し候補。
- T-021:
  - 低カバレッジ領域を `npm run test:coverage` で特定し、原則テスト追加で閾値達成する。
  - 実装修正が必要な場合は最小変更に限定し、理由を PR 説明に記載する。
- T-022:
  - `index.ts` とテストヘルパーの app 初期化重複を解消し、初期化ロジックのドリフトを防ぐ。
  - controller 内の `{ code, message }` リテラル重複を helper 化してメンテ性を上げる。
  - API 統合テストで必要ストア初期化を統一し、順序依存を防ぐ。
- T-023:
  - `importRepository` / `importSessionRepository` の二重保存を解消し、整合性リスクを下げる。
  - path param と query param の解析 API を用途別に整理し、曖昧な関数を減らす。
- T-024:
  - controller での multipart 解析を分離し、テスト可能性と可読性を改善する。
  - Base64 サイズ推定を厳密化し、リソース `size` の信頼性を高める。
- T-029:
  - `NoteBrowser` と `useNotesList` の一覧取得重複を解消する。
  - ノート一覧/詳細での日時表示フォーマットを共通化する。
- T-030:
  - `message.ts` を含む API クライアントのエラー処理を `ensureOk` に統一する。
  - 失敗時メッセージの表示挙動を既存仕様の範囲で揃える。
- T-031:
  - `useMessage`/`useEnexUpload`/`useNotesList` の async state パターンの実装ゆれを縮小する。
  - `NoteDetailPanel` 内の `NoteContent` を責務分離し、テストしやすい構成にする。
- T-032:
  - `HomePage` で同時表示しているノート一覧 UI の二重取得を解消する。
  - API の一覧処理で繰り返し計算している検索キー/抜粋/ソートキーを前計算または再利用する。
  - repository/service 間の重複変換を削減し、不要な全件コピーを減らす。
  - resource size 算出と multipart 解析のメモリ効率を改善する。
  - Web の非同期 state パターンを最終統一し、同等実装の重複を減らす。

## 横断ルール

- 契約先行 + モック: API 契約固定後、Web はモックで先行実装可。
- 再発明回避: 標準 API / 枯れたライブラリを優先する。
- 進捗更新: 完了チェックは `implementation-tasks.md` のみ更新する。
