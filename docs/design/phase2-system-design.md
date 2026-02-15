# ENEX Viewer Phase 2 システム設計

## 1. アーキテクチャ概要
- API は Express + SQLite (better-sqlite3 など) を採用し、Import/Note/Resource を永続化。
- Web は Vite + React で従来構成を維持しつつ、アップロードワーカーや ZIP 生成ユーティリティを追加。
- ファイルハッシュ計算は Node(API) と Browser 双方でストリーミング実装する。

## 2. データモデル
- `imports`: `id`, `hash`, `createdAt`, `noteCount`, `warnings`, `sourceFilePath?`
- `notes`: `id`, `importId`, `title`, `createdAt`, `updatedAt`, `tags`, `excerpt`, `contentHtml`
- `resources`: `id`, `noteId`, `fileName`, `mime`, `size`, `storagePath`, `hash`
- 添付本体は `<DATA_DIR>/resources/<hash>` に保存し、SQLite にはファイル名とハッシュを保持する。

## 3. ハッシュフロー
- Web: ファイル選択 -> `crypto.subtle.digest('SHA-256', stream)` -> `POST /api/imports/hash-lookup`。
- API: 同ハッシュが存在すれば importId を返却、無ければアップロード指示。
- API 側でもアップロード受付後にストリームで SHA-256 を再計算し、整合を確認。

## 4. アップロード処理
1. Web がハッシュを送信して存在確認。
2. 未登録なら `POST /api/enex/parse` にストリーム送信（1GB 対応のため `busboy` 等を利用）。
3. API は ENEX を逐次パースし、結果を SQLite とファイルシステムへ保存。
4. 成功後に importId と hash を返す。既存 import の場合は DB 参照のみ。
- 現状の Phase 2 実装では、アップロード時点でのハッシュ計算と一時ファイルへの書き込みはストリーム処理だが、最終的な `parseEnexFile` で一度だけ全バッファを読み込む制約がある。1 GB までのファイルはメモリに展開する必要がある点を周知し、将来完全ストリーミング対応を行う際はこの箇所を置き換える。

## 5. 添付ダウンロード
- 個別: `GET /api/imports/:importId/notes/:noteId/resources/:resourceId` が `Content-Disposition` を設定しストリーミング。
- 一括: Web が選択ノートのリソース ID を API に送信し、API が zip を生成して返す。または Web で zip を生成する（小規模の場合）。Phase 2 では API 側 zip を想定。

## 6. フロントエンド改修
- アップロードフォームにハッシュ計算ステータス、既存 import メッセージを表示。
- Notes List にチェックボックスと全選択トグルを追加し、選択状態を Context/Hook で管理。
- 一括ダウンロードボタン押下で API へ zip リクエスト。
- Note Detail Panel に添付リスト（ダウンロードリンク）を表示。

## 7. テスト戦略
- API: sqlite を temp DB に向ける integration test 追加。大容量はモックファイルで分割テスト。
- Web: ハッシュ計算ロジックのユニットテスト、チェックボックス動作、ダウンロードボタン有効化などの UI テスト追加。
- 手動テスト: 1GB アップロード、重複スキップ、添付ダウンロード、一括 zip を新シナリオに追加。

## 8. 移行/互換
- Phase 1 との互換性として、既存 API エンドポイントのレスポンス互換を保ちつつ、新フィールド（hash 等）を追加する。
- インメモリ import を SQLite へ移す専用スクリプトは提供しない。必要に応じて再アップロードを推奨する。

## 9. オープン課題
- 1GB ファイルのアップロード時間が長い場合のキューイング戦略。
- zip 生成の圧縮率/速度バランス。
- CLI 等からの一括処理ニーズがあれば Phase 3 で検討。
