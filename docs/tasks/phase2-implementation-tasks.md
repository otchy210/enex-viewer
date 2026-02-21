# 実装タスク運用ガイド

これまでの Phase 1 のタスク履歴は `docs/archive/phase1-implementation-tasks.md` に保存されています。今後は新規タスクを追加する際に、このガイドラインを参照してください。

## 1. タスク作成の原則

- 依存関係を明示し、可能な限り並列実行できる形で分割する。
- 1 タスク = 1 つの独立レビューを徹底し、大規模変更はサブタスクへ分割する。
- 受け入れ条件はテストやドキュメント更新まで含めて箇条書きで書く。
- コミットメッセージ/PR タイトルは `T-00x: <summary>` を守り、`docs/tasks/agent-execution.md` の手順に従う。

## 2. 進行方法

1. `docs/archive/phase1-implementation-tasks.md` を参照し、既存仕様との整合を確認する。
2. 新規タスクを決めたら `docs/tasks/agent-execution.md` に沿ってエージェントへ依頼する。
3. 作業が完了したら、受け入れ条件チェックの一環で `docs/testing/manual-test-scenarios.md` を更新または再実行する。
4. 記録が溜まったら、完了済みタスクの詳細を `docs/archive/` 以下に移し、このファイルには最新タスクのみを保持する。

## 3. 新規タスクのテンプレート

```
| ID | レーン/カテゴリ | 概要 | 依存 | 受け入れ条件 |
|----|-----------------|------|------|--------------|
| T-0xx | 例: Web / API | 一行で目的 | 例: T-041 | - 箇条書き |
```

必要に応じて `docs/archive` にテンプレートを複製して履歴を保存し、ここにはアクティブなタスクのみを記載してください。

## 4. 関連資料

- 実行ルール: `docs/tasks/agent-execution.md`
- 手動テスト: `docs/testing/manual-test-scenarios.md`
- 完了済タスク履歴: `docs/archive/phase1-implementation-tasks.md`
- ワークストリーム履歴: `docs/archive/phase1-workstreams.md`

---

## 5. Phase 2 アクティブタスク

| 完了 | ID    | レーン | 種別    | タスク                                                                         | 依存            | 受け入れ条件                                                                                                                                                                                   |
| ---- | ----- | ------ | ------- | ------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | T-201 | P2-A   | API     | 1GB ストリーミング対応の `POST /api/enex/parse` と `ENEX_VIEWER_DATA` 設定導入 | 既存 Phase1 API | - busboy 等で 1GB ファイルをアップロードできる<br>- データディレクトリ設定に従い `<DATA_DIR>/enex-viewer.sqlite` が生成される<br>- 主要 API テスト (typecheck + `npm run test:api`) が通過     |
| [x]  | T-202 | P2-A   | API     | SQLite 永続化とハッシュ重複判定 (`POST /api/imports/hash-lookup`)              | T-201           | - imports/notes/resources テーブルとユニークハッシュ制約を実装<br>- 同一ファイルを連続アップロードしても再パースせず importId を返す<br>- API integration test で hash lookup の挙動を検証     |
| [x]  | T-208 | P2-A   | API     | 重複ハッシュ再アップロード時の UNIQUE 制約違反を解消                          | T-201, T-202    | - `parseEnexFile`/`saveImportSession` が既存 hash を検出した際に再挿入せず既存 importId を返却<br>- `imports.hash` の UNIQUE 制約で例外が出ないことを再現テストで確認<br>- manual docs に既存 import 再利用手順を追記 |
| [x]  | T-203 | P2-B   | Web     | クライアント側ハッシュ計算とアップロードスキップ UX                            | T-201, T-202    | - ファイル選択時にハッシュ進捗/結果が表示される<br>- 既存 import の場合に API アップロードを呼ばず通知・再参照リンクを表示<br>- `npm run test:web` で新ロジックの unit/UI テストが通る         |
| [x]  | T-204 | P2-C   | API     | 添付リソースAPI（個別DL + 一括zip）とファイルシステム保存                      | T-201, T-202    | - 個別 `GET /resources/:resourceId` が Content-Disposition 付きで動作<br>- 一括ダウンロード API で zip が生成される<br>- 添付ファイルは `<DATA_DIR>/resources/<hash>` に保存され hash と紐づく |
| [x]  | T-205 | P2-C   | Web     | ノート詳細に添付ファイル一覧と個別ダウンロードリンクを表示                     | T-204           | - Note Detail Panel にファイル名/サイズ/ダウンロードリンクが表示<br>- UI テストが添付リンクの表示を確認<br>- Manual docs に利用方法を追記                                                      |
| [x]  | T-206 | P2-C   | Web     | ノート一覧チェックボックス＋全選択＋一括ダウンロード UI                        | T-204           | - 一覧各行にチェックボックスと全選択トグルがあり、状態管理と UI テストが整う<br>- 選択ノートの添付を zip ダウンロードできる<br>- アクセシビリティ（ラベル）が確保される                        |
| [ ]  | T-207 | P2-D   | Docs/QA | Phase 2 用手動テスト/README/spec 更新                                          | T-201〜T-206    | - 新シナリオ（1GB、重複スキップ、添付DL、一括zip）を `manual-test-scenarios` に追加<br>- README/INDEX/spec が Phase2 機能を案内<br>- 手動テスト結果テンプレートが更新される                    |
| [ ]  | T-209 | P2-C   | API     | 添付ダウンロード API の Null storagePath 実裝不備を修正                       | T-204           | - `fetchResourceDownload`/bulk zip が storagePath 未設定の添付でも 404 を返す or 正しく保存する<br>- ENEX 添付保存ロジックで storagePath/hash が常に設定されることを確認<br>- API integration test で `storage_path` null ケースを追加し、TypeError が発生しないことを検証<br>- MT-203/MT-204/MT-205/MT-206 が再実行できる状態にする |
| [x]  | T-210 | P2-B   | Web     | アップロード中の進捗 UI 改善（アップロードフェーズのプログレスバー）          | T-203           | - `UploadSection` にアップロード本体（ENEX POST）の進行状況を視覚化するプログレス/インジケータを追加（ハッシュ進捗とは別）<br>- API 呼び出し中は進捗/残りを表示しつつキャンセル可能か文言で案内<br>- 新 UI のテストを追加し、フェールセーフにより既存テストをパス |


### T-202 完了メモ
- `docs/tasks/agent-execution.md` の完了手順に沿って、API 実装・OpenAPI・manual scenario・タスクチェック更新を同一変更で反映。

### T-204 完了メモ
- 添付 resource を SHA-256 で `<DATA_DIR>/resources/<hash>` へ保存し、既存 hash ファイルを再利用する実装を追加。
- 個別 DL API と一括 ZIP DL API（zip コマンドによるストリーム生成）を実装し、OpenAPI / manual scenario を更新。


### T-205 完了メモ
- `NoteDetailPanel` に添付ファイル名・サイズ・MIME と個別 `Download` リンクを追加し、クリック時に API から blob ダウンロードする実装を追加。
- ダウンロード失敗時のアラート表示と、Web UI テスト/手動テストシナリオ（MT-205）を更新。


### T-206 完了メモ
- ノート一覧行にチェックボックスを追加し、ページ単位の全選択/全解除と選択数表示を実装。
- 選択ノートの添付を `POST /api/imports/:importId/resources/bulk-download` で ZIP ダウンロードする UI とエラー表示を追加。


### T-210 完了メモ
- `UploadSection` / `useEnexUpload` に ENEX POST フェーズ専用の進捗インジケータを追加し、アップロード中ボタンラベルとキャンセル不可案内を表示。
- アップロード失敗時は POST フェーズ表示をリセットして再アップロード可能な状態へ戻す実装と UI テストを追加。
- `MT-202` と README / 開発ガイドのアップロード手順を更新し、新 UI の確認観点を反映。
