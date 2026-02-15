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
