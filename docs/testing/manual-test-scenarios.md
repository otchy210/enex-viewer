# 手動テスト運用ノート

フェーズごとの手動テスト詳細は `docs/archive/phaseN-manual-test-scenarios.md` に保存します。Phase 1 の実施内容は `docs/archive/phase1-manual-test-scenarios.md` を参照してください。

## 1. 設計ポリシー

- 目的・前提・テストデータ・シナリオ・結果記録テンプレートを明確にする。
- 各シナリオは ID（例: MT-001）を付与し、タスクの受け入れ条件とリンクさせる。
- 実施ログは必ず保存し、完了したフェーズの記述はアーカイブへ移動する。

## 2. 新規フェーズでの手順

1. 既存のアーカイブを参照し、再利用できるテストデータや手順を選定する。
2. フェーズ固有のシナリオを `docs/testing/manual-test-scenarios.md` に記述する。
3. シナリオ完了後は `docs/archive/phaseN-manual-test-scenarios.md` に移し、結果テンプレートを残す。

## 3. アーカイブ参照

- Phase 1 手動テスト: `docs/archive/phase1-manual-test-scenarios.md`
- 新フェーズも `phaseN-manual-test-scenarios.md` の形式で追加し、このファイルからリンクする。


## 4. Phase 2 手動シナリオ（抜粋）

### MT-201: 重複ハッシュ再アップロード時に既存 import を再利用する
- 前提
  - API が起動している。
  - 同一内容の ENEX ファイルを 2 回アップロードできる状態。
- 手順
  1. `POST /api/enex/parse` で ENEX をアップロードし `importId` を記録する。
  2. 同じ ENEX ファイルを再度 `POST /api/enex/parse` へアップロードする。
  3. 2 回目レスポンスが 200 で、`importId` が 1 回目と一致することを確認する。
- 期待結果
  - SQLite の UNIQUE 制約違反は発生しない。
  - 既存 import が再利用され、クライアントは同一 importId を受け取る。
