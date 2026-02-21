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


### MT-202: hash lookup によりアップロードをスキップできる
- 前提
  - API と Web が起動している。
  - 検証用 ENEX ファイルが 1 つ用意されている。
- 手順
  1. Web で ENEX ファイルを選択し、`Calculating SHA-256 hash...` の進捗表示とハッシュ値表示を確認する。
  2. 初回は `POST /api/imports/hash-lookup` が `shouldUpload=true` を返し、Upload ボタンが有効になることを確認する。
  3. Upload を実行して import を作成し、表示された `importId` を記録する。
  4. 同じ ENEX ファイルを再度選択する。
  5. `POST /api/imports/hash-lookup` が `shouldUpload=false` を返し、Upload ボタンが無効化され、既存 `importId` 再利用導線が表示されることを確認する。
- 期待結果
  - 1 回目 lookup は `importId=null` かつ `shouldUpload=true` を返し、`POST /api/enex/parse` を案内する。
  - 2 回目 lookup は既存 `importId` と `shouldUpload=false` を返し、再アップロード不要であることが UI で明示される。

### MT-203: ノート詳細から添付ファイルを個別ダウンロードできる
- 前提
  - 添付ファイルを含む ENEX が import 済みで、対象 `importId/noteId/resourceId` が特定できる。
- 手順
  1. `GET /api/imports/:importId/notes/:noteId/resources/:resourceId` を実行する。
  2. レスポンスヘッダー `Content-Type` / `Content-Length` / `Content-Disposition` を確認する。
  3. ダウンロードされたファイル内容が ENEX 内の添付と一致することを確認する。
- 期待結果
  - 200 でストリーミング返却される。
  - `Content-Disposition` に元ファイル名が設定される。
  - 存在しない添付 ID では `404 RESOURCE_NOT_FOUND` を返す。


### MT-204: 複数添付の一括 ZIP ダウンロード
- 前提
  - 2 つ以上の添付が import 済みで、`noteId/resourceId` の組を取得できる。
- 手順
  1. `POST /api/imports/:importId/resources/bulk-download` に `resources` 配列を送る。
  2. レスポンス `Content-Type: application/zip` と zip ファイルのダウンロードを確認する。
  3. ZIP を展開し、`<noteId>/` 配下に添付ファイルが出力されることを確認する。
  4. 不正入力（空配列）と未存在 resourceId を送ってエラーを確認する。
- 期待結果
  - 正常時 200 で ZIP がストリーム返却される。
  - 空配列は `400 INVALID_REQUEST`、未存在添付は `404 RESOURCE_NOT_FOUND` を返す。

### MT-205: ノート詳細 UI で添付ファイルを個別ダウンロードできる
- 前提
  - API と Web が起動している。
  - 添付ファイルを含む ENEX が import 済みで、ノート詳細画面を開ける。
- 手順
  1. Web のノート一覧から添付付きノートを選択し、詳細パネルの `Resources` セクションを表示する。
  2. 添付ごとにファイル名・サイズ・MIME 種別と `Download` リンクが表示されることを確認する。
  3. `Download` をクリックし、`GET /api/imports/:importId/notes/:noteId/resources/:resourceId` が呼び出されることを DevTools の Network で確認する。
  4. ダウンロードされたファイル名と内容が ENEX 添付と一致することを確認する。
  5. （異常系）存在しない resourceId を返す状態で `Download` を押し、エラーメッセージが表示されることを確認する。
- 期待結果
  - 各添付に個別ダウンロード導線があり、成功時はファイル保存できる。
  - 失敗時はユーザーが再試行可能なエラー表示（アラート）が出る。
