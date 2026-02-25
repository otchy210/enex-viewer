# Phase 2 手動テストシナリオ

## MT-201 (Pass): 重複ハッシュ再アップロード時に既存 import を再利用する（再起動後も維持）

- 前提
  - API が起動している。
  - 同一内容の ENEX ファイルを 2 回アップロードできる状態。
- 手順
  1. `POST /api/enex/parse` で ENEX をアップロードし `importId` を記録する。
  2. API/Web サーバーを Ctrl+C などで停止し、再度 `npm run dev` などで起動し直す。
  3. 同じ ENEX ファイルを再度 `POST /api/enex/parse` へアップロードする。
  4. 2 回目レスポンスが 200 で、`importId` が 1 回目と一致することを確認する。
  5. `~/enex-viewer-data/enex-viewer.sqlite`（または `ENEX_VIEWER_DATA` で指定した DB）の `imports` テーブルを確認し、1 回目 `importId` の行が残っていることを確認する。
- 期待結果
  - SQLite の UNIQUE 制約違反は発生しない。
  - サーバー再起動後でも既存 import が再利用され、クライアントは同一 importId を受け取る。
  - `imports` テーブルには 1 回目の `importId` エントリが残っている。

## MT-202 (Pass): hash lookup によりアップロードをスキップできる

- 前提
  - API と Web が起動している。
  - 検証用 ENEX ファイルが 1 つ用意されている。
- 手順
  1. Web で ENEX ファイルを選択し、`Calculating SHA-256 hash...` の進捗表示とハッシュ値表示を確認する。
  2. 初回は `POST /api/imports/hash-lookup` が `shouldUpload=true` を返し、Upload ボタンが有効になることを確認する。
  3. Upload を実行し、`Uploading ENEX (cannot cancel)...` ラベルと `Phase 2/2: Sending ENEX file to server and parsing...` インジケータが表示されることを確認する。
  4. アップロード完了後に上記インジケータが非表示となり、`Upload complete.` と `importId` が表示されることを確認する。
  5. 同じ ENEX ファイルを再度選択する。
  6. `POST /api/imports/hash-lookup` が `shouldUpload=false` を返し、Upload ボタンが無効化され、既存 `importId` 再利用導線が表示されることを確認する。
- 期待結果
  - 1 回目 lookup は `importId=null` かつ `shouldUpload=true` を返し、Upload 実行中は ENEX POST フェーズ専用の進捗インジケータと「キャンセル不可」文言が表示される。
  - 1 回目アップロード成功時は POST フェーズのインジケータが消え、結果（`importId` / ノート件数）が表示される。
  - 2 回目 lookup は既存 `importId` と `shouldUpload=false` を返し、再アップロード不要であることが UI で明示される。

## MT-203 (Fail): ノート詳細から添付ファイルを個別ダウンロードできる

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

## MT-204 (Fail): 複数添付の一括 ZIP ダウンロード

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

## MT-205 (Fail): ノート詳細 UI で添付ファイルを個別ダウンロードできる

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

## MT-206 (Fail): ノート複数選択 + 一括 ZIP ダウンロード UI

- 前提
  - API と Web が起動している。
  - 添付ファイルを含むノートが 2 件以上ある import が作成済み。
- 手順
  1. ノート一覧で複数ノートのチェックボックスを選択し、`n selected` 表示が更新されることを確認する。
  2. `Select all in page` を押し、現在ページの全ノートが選択されることを確認する。
  3. `Download selected attachments` を押し、ボタンが `Preparing ZIP...` になって処理中表示されることを確認する。
  4. ZIP ダウンロード完了後に展開し、選択ノート配下の添付が取得できることを確認する。
  5. （異常系）API エラーを返す状態で実行し、`role="alert"` のエラー表示が出ても選択状態が保持されることを確認する。
- 期待結果
  - 選択数と全選択/全解除トグルがページ単位で正しく動作する。
  - 一括ダウンロード成功時は ZIP が保存される。
  - 失敗時はアラート表示され、再試行可能。


## MT-203〜MT-206 再実行手順（T-209）

1. `npm run test:api` を実行し、以下の追加 integration test が成功することを確認する。
   - `GET /api/imports/:importId/notes/:noteId/resources/:resourceId returns 404 when storage_path is null`
   - `POST /api/imports/:importId/resources/bulk-download returns 404 when storage_path is null`
   - `POST /api/enex/parse excludes resources without binary data from persistence`
2. API/Web を起動し、MT-203〜MT-206 の手順を順に再実行する。
3. 異常系として storage_path が欠損した resource を作成した場合でも 404 (`RESOURCE_NOT_FOUND`) を返し、サーバーログに TypeError が出ないことを確認する。

# マニュアルテストメモ

- [CRITIAL] ファイルの Download リンクが働かない
- [CRITIAL] "Download selected attachments" ボタンも働かない

```
TypeError: Cannot read properties of null (reading 'length')
    at fetchResourceDownload (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/services/resourceDownloadService.ts:39:48)
    at resourceDownloadController (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/controllers/resourceDownloadController.ts:24:18)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at next (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at /Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:284:15
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:365:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
TypeError: Cannot read properties of null (reading 'length')
    at fetchResourceDownload (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/services/resourceDownloadService.ts:39:48)
    at resourceDownloadController (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/controllers/resourceDownloadController.ts:24:18)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at next (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at /Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:284:15
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:365:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
TypeError: Cannot read properties of null (reading 'length')
    at fetchResourceDownload (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/services/resourceDownloadService.ts:39:48)
    at resourceDownloadController (/Users/otchy/Dropbox/workspace/enex-viewer/apps/api/src/controllers/resourceDownloadController.ts:24:18)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at next (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/layer.js:95:5)
    at /Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:284:15
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:365:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
    at param (/Users/otchy/Dropbox/workspace/enex-viewer/node_modules/express/lib/router/index.js:376:14)
```

- [WANT] ファイルのアップロード中もプログレスバーがあった方が良い
