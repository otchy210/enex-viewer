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

| 完了 | ID    | レーン | 種別  | タスク                                                                 | 依存             | 受け入れ条件 |
| ---- | ----- | ------ | ----- | ---------------------------------------------------------------------- | ---------------- | ------------ |
| [ ]  | T-201 | P2-A   | API   | 1GB ストリーミング対応の `POST /api/enex/parse` と `ENEX_VIEWER_DATA` 設定導入 | 既存 Phase1 API | - busboy 等で 1GB ファイルをアップロードできる<br>- データディレクトリ設定に従い `<DATA_DIR>/enex-viewer.sqlite` が生成される<br>- 主要 API テスト (typecheck + `npm run test:api`) が通過 |
| [ ]  | T-202 | P2-A   | API   | SQLite 永続化とハッシュ重複判定 (`POST /api/imports/hash-lookup`)      | T-201            | - imports/notes/resources テーブルとユニークハッシュ制約を実装<br>- 同一ファイルを連続アップロードしても再パースせず importId を返す<br>- API integration test で hash lookup の挙動を検証 |
| [ ]  | T-203 | P2-B   | Web   | クライアント側ハッシュ計算とアップロードスキップ UX                    | T-201, T-202     | - ファイル選択時にハッシュ進捗/結果が表示される<br>- 既存 import の場合に API アップロードを呼ばず通知・再参照リンクを表示<br>- `npm run test:web` で新ロジックの unit/UI テストが通る |
| [ ]  | T-204 | P2-C   | API   | 添付リソースAPI（個別DL + 一括zip）とファイルシステム保存             | T-201, T-202     | - 個別 `GET /resources/:resourceId` が Content-Disposition 付きで動作<br>- 一括ダウンロード API で zip が生成される<br>- 添付ファイルは `<DATA_DIR>/resources/<hash>` に保存され hash と紐づく |
| [ ]  | T-205 | P2-C   | Web   | ノート詳細に添付ファイル一覧と個別ダウンロードリンクを表示             | T-204            | - Note Detail Panel にファイル名/サイズ/ダウンロードリンクが表示<br>- UI テストが添付リンクの表示を確認<br>- Manual docs に利用方法を追記 |
| [ ]  | T-206 | P2-C   | Web   | ノート一覧チェックボックス＋全選択＋一括ダウンロード UI               | T-204            | - 一覧各行にチェックボックスと全選択トグルがあり、状態管理と UI テストが整う<br>- 選択ノートの添付を zip ダウンロードできる<br>- アクセシビリティ（ラベル）が確保される |
| [ ]  | T-207 | P2-D   | Docs/QA | Phase 2 用手動テスト/README/spec 更新                                 | T-201〜T-206     | - 新シナリオ（1GB、重複スキップ、添付DL、一括zip）を `manual-test-scenarios` に追加<br>- README/INDEX/spec が Phase2 機能を案内<br>- 手動テスト結果テンプレートが更新される |
