# タスクドキュメント入口

このディレクトリは、Codex エージェントが実装タスクを迷わず実行するための最小セットを提供する。

## 参照順序（エージェント向け）

1. `docs/tasks/implementation-tasks.md`
   - 進捗の正本（チェックボックス）
   - 依存関係と並列実行可能レーン
2. `docs/tasks/agent-execution.md`
   - 実行ルール（1タスク1PR、コミット規約、完了判定）
3. `docs/tasks/workstreams.md`
   - レーンごとの成果物、受け入れ観点、実装時の注意点

## 運用原則

- 進捗更新は `implementation-tasks.md` のみで行う。
- 詳細方針の更新は `workstreams.md` に集約する。
- 実行ルールの更新は `agent-execution.md` に集約する。
