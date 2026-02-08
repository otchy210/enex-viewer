# WP-QUALITY-DOCS

## 対象タスク
- [x] T-011
- [x] T-012
- [ ] T-013
- [ ] T-021
- [ ] T-014

## 目的
品質保証と仕様同期を担保する。

## 成果物
- API/Web テスト
- Web API ラッパー層テスト（`apps/web/src/api/enex.ts` のエラー整形分岐）
- カバレッジ閾値達成（global 80%以上）
- OpenAPI 更新
- README/docs 更新
- 人間による動作テスト結果（手動シナリオ記録）

## 完了条件
- typecheck/build/test の主要コマンドが通過
- `npm run test:coverage`（または対象 workspace の coverage）が通過し、閾値を満たす
- `apps/web/src/api/enex.ts` の失敗時メッセージ整形（API message 優先 / `HTTP <status>` fallback）が直接テストで担保される
- ドキュメントが実装と矛盾しない
- 手動テスト主要シナリオ（アップロード、一覧、検索、詳細、エラー表示）が確認済み

## 更新ルール
- このワークパッケージを担当したエージェントは、担当タスク完了時に該当チェックボックスを `[x]` に更新する。
