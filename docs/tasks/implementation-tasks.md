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
