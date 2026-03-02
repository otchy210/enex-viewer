# エージェント実行ガイド

## 1. 目的

クラウド上の Codex エージェントへ並列タスク委譲するときの、最小かつ必須の運用ルールを定義する。

## 2. 基本原則

- 1 エージェントは原則 1 タスク ID を担当する（1タスク1PR）。
- スコープ外の変更は行わない。
- 破壊的変更（履歴改変、不要な大規模リネーム）は行わない。

## 3. タスク開始時に必ず確認すること

- `docs/tasks/implementation-tasks.md` の依存関係と完了条件
- `docs/tasks/workstreams.md` の担当レーンの注意事項
- `apps/api/openapi.yaml`（API 契約が関係する場合）

## 4. コミット規約

- コミットメッセージ先頭は必ず `T-00x: <summary>` 形式にする。
- 例:
  - `T-003: Add ENEX upload endpoint`
  - `T-013: Update OpenAPI and README`

## 5. ライブラリ選定ルール（再発明の回避）

- 実装前に、標準 API と既存ライブラリで解決可能かを確認する。
- 同等に解決できる場合は、自前実装より保守実績のある枯れたライブラリを優先する。
- 自前実装を選ぶ場合は、PR 説明に理由を明記する。

## 6. テスト基盤ルール

- 新規テストは既存基盤を使用する。
  - API: Vitest + Supertest
  - Web: Vitest + Testing Library + jsdom
- 新たなテストフレームワークは、明確な必要性と合意がない限り導入しない。

## 7. カバレッジ運用ルール

- 機能追加・仕様変更・リファクタ時は、必ずカバレッジを計測する。
- 実行コマンド:
  - 全体: `npm run test:coverage`
  - API: `npm run test:coverage -w apps/api`
  - Web: `npm run test:coverage -w apps/web`
- global 閾値（lines/functions/branches/statements）は 80% 以上を維持する。
- 進行中タスクのスコープを変えないため、是正は専用タスク（T-021）へ切り出してよい。

## 8. 完了判定チェックリスト

- [ ] `npm run typecheck` が通る
- [ ] 影響範囲のテストが通る
- [ ] `npm run test:coverage`（または対象 workspace coverage）が通る
- [ ] タスク受け入れ条件を満たす
- [ ] 必要なドキュメント更新を反映した

## 9. 進捗更新ルール

- タスク完了時に `docs/tasks/implementation-tasks.md` の該当行を `[ ]` から `[x]` に更新する。
- チェック更新は実装変更と同じ PR に含める。
- 担当外タスクのチェックは変更しない。

## 10. 並列実行での依存切り離し

- API と Web を並列化する場合は契約先行（OpenAPI 固定）で進める。
- Web は契約準拠モックで先行実装し、後段で実 API へ差し替える。


## 11. 大容量 ENEX（1GB クラス）回帰チェック

### 11.1 基本コマンド

- API 回帰の基準コマンドは `npm run test:api`。
- ローカルで 1GB クラス実ファイル検証まで行う場合は、`npm run dev:api`（必要なら `npm run dev:web`）を併用して手動シナリオ `MT-217` を再実行する。

### 11.2 ダミー大容量 ENEX の生成例

- 既存スクリプトが無い場合は、Node.js で繰り返しノートを出力して ENEX を生成してよい（新規依存は追加しない）。
- 例（約 1GB を目標に `NOTE_COUNT` / 添付サイズを調整）:

```bash
node -e '
const fs = require("node:fs");
const out = fs.createWriteStream("./tmp-large.enex");
out.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?><en-export>");
const payload = Buffer.alloc(512 * 1024, 0x41).toString("base64");
for (let i = 0; i < 1700; i += 1) {
  out.write(`<note><title>large-${i}</title><content><![CDATA[<?xml version=\"1.0\"?><!DOCTYPE en-note SYSTEM \"http://xml.evernote.com/pub/enml2.dtd\"><en-note>large-${i}</en-note>]]></content><resource><data encoding=\"base64\">${payload}</data><mime>application/octet-stream</mime><resource-attributes><file-name>blob-${i}.bin</file-name></resource-attributes></resource></note>`);
}
out.end("</en-export>");
'
```

### 11.3 実施・記録ルール

1. 最低限 `npm run test:api` を実行し、stream upload / incremental parse / WAL checkpoint まわりのテスト成功を確認する。
2. 可能な環境では `MT-217` を実施し、upload → note browsing → 個別 DL → 一括 ZIP DL を記録する。
3. PR 説明には「自動検証」と「手動検証」を分けて結果を書く。

### 11.4 ローカルスキップ可能条件

- 次のいずれかに該当する場合、1GB 実ファイル手動検証はスキップ可（ただし理由を PR に明記する）。
  - 実行環境の空き容量が不足（目安: 5GB 未満）。
  - CI/開発環境の実行時間制約で 1GB upload が現実的でない。
  - 本タスクがドキュメント更新のみで、既存テスト `npm run test:api` が成功している。
- スキップ時も `npm run test:api` は必須。
