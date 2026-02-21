# ENEX Viewer Phase 2 仕様

## 1. ユースケース
- UC-201: 1GB までの ENEX をアップロードし、永続化されたインポートを再利用する。
- UC-202: ENEX を解析済みの場合は、クライアントがアップロード前に通知しスキップする。
- UC-203: ノート詳細で添付ファイルを確認し、個別にダウンロードする。
- UC-204: ノート一覧から複数ノートの添付を選択し、一括ダウンロードする。

## 2. 画面仕様（Phase 2）
### 2.1 アップロードセクション
- 進捗バーとサイズ表示を追加。大容量処理中にキャンセルボタンを表示。
- ファイル選択後、クライアント側でハッシュ計算し、既存 Import がある場合はメッセージと「再参照」ボタンを表示（ボーナス）。

### 2.2 ノート一覧
- 各行にチェックボックスを追加。
- ヘッダー部に「All / None」トグル。
- 選択ノート数を表示し、「Download Selected Attachments」ボタンを有効化。

### 2.3 ノート詳細
- 添付リソース一覧にダウンロードリンク（`GET /api/imports/:importId/notes/:noteId/resources/:resourceId`）を追加。
- リンク押下時にファイル名で保存されるよう `Content-Disposition` を指定。

## 3. API 仕様（Phase 2）
- 既存エンドポイントに加え、以下を拡張:
  - `POST /api/enex/parse`: 1GB まで許可。レスポンスに `hash` フィールドを追加。既存 `imports.hash` が見つかった場合は新規 INSERT を行わず既存 importId を返す。
  - `GET /api/imports/:importId`: Import メタデータ（hash、noteCount、createdAt）を返す。
  - `GET /api/imports/:importId/notes/:noteId/resources/:resourceId`: 添付ファイルをストリーミングで返す。
  - `POST /api/imports/:importId/resources/bulk-download`: `resources[{noteId,resourceId}]` を受け取り ZIP をストリーミングで返す。
  - `POST /api/imports/hash-lookup`: `hash` を受け取り、`importId | null` と `shouldUpload`、次アクション案内 `message` を返す（クライアントのアップロードスキップ用）。

### 3.1 ハッシュ事前判定フロー
- Web はファイル選択後に SHA-256 を計算し、`POST /api/imports/hash-lookup` を呼び出す。
- `shouldUpload=true` の場合のみ `POST /api/enex/parse` を実行する。
- `shouldUpload=false` の場合は返却された `importId` をそのまま再利用し、アップロードをスキップする。

## 4. エラーハンドリング
- ファイルサイズ超過: `413 FILE_TOO_LARGE`。
- ハッシュ計算失敗: `400 INVALID_HASH`。
- 添付ダウンロード失敗: `404 RESOURCE_NOT_FOUND`。
- 一括ダウンロードで zip 生成失敗時は `500 ZIP_GENERATION_FAILED` を返し、UI にリトライを提示。
- 一括ダウンロードの入力不正は `400 INVALID_REQUEST`、添付未存在は `404 RESOURCE_NOT_FOUND` を返す。

## 5. データ保持
- デフォルトのデータディレクトリは `~/enex-viewer-data/`（ホーム直下）。環境変数 `ENEX_VIEWER_DATA` が設定されている場合はそのパスをルートとして利用する。
- SQLite ファイルは `<DATA_DIR>/enex-viewer.sqlite` に配置し、Import/Notes/Resources の 3 テーブルを定義。ハッシュ列にユニーク制約を設定。
- 添付データは常にファイルシステムに保存し、SQLite には `fileName` と `hash`（SHA-256）を保持する。物理ファイル名はハッシュ値とし、保存先は `<DATA_DIR>/resources/<hash>`。
- 既存 hash の物理ファイルがある場合は再利用し、重複書き込みを行わない。

## 6. 並列実装とモック
- ハッシュ API やリソースダウンロード API のモックを `apps/web/src/api/mocks/` に追加。
- Web は SQLite 実装が未完でもモックレスポンスで先行可能。

## 7. 参照
- 要件: `docs/product/phase2-requirements.md`
- システム設計: `docs/design/phase2-system-design.md`
