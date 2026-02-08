# ENEX Viewer 詳細設計

## 1. API 内部構成（提案）
`apps/api/src` を以下の責務で分割する。

- `routes/`: HTTP ルーティング
- `controllers/`: request/response 変換
- `services/`: ENEX 解析、検索、取得ユースケース
- `repositories/`: インメモリデータアクセス
- `models/`: ドメイン型定義
- `lib/`: サニタイズ、日時変換、ID 生成など共通処理

## 2. Web 内部構成（提案）
`apps/web/src` を以下の責務で分割する。

- `pages/`: 画面単位のコンポーネント
- `features/notes/`: ノート一覧・詳細関連 UI
- `api/`: API クライアント
- `state/`: 状態管理（importId、検索条件、選択ノート）
- `components/`: 再利用 UI 部品

## 3. ドメインモデル
- `ImportSession`
  - `id`, `createdAt`, `noteCount`, `warnings[]`
- `NoteSummary`
  - `id`, `title`, `createdAt`, `updatedAt`, `tags[]`, `excerpt`
- `NoteDetail`
  - `summary` + `contentHtml`, `resources[]`
- `ResourceMeta`
  - `id`, `fileName`, `mime`, `size`

## 4. ENEX 解析方針
- XML パーサーでノート単位に変換。
- Evernote の `content`（ENML）を表示用 HTML に変換し、サニタイズ。
- 解析不能ノートは警告として `warnings[]` に蓄積し、処理全体は継続。

## 5. 検索方針
- MVP はインメモリの単純部分一致。
- 正規化ルール（大文字小文字、前後空白）を共通化。
- 将来的に全文検索エンジンへ差し替え可能なインターフェースを作る。

## 6. テスト戦略
- API unit: パーサー、変換、検索ロジック
- API integration: 各エンドポイントの正常系/異常系
- Web unit: 主要コンポーネント描画、状態遷移
- E2E（任意）: アップロードから閲覧までの最小シナリオ

## 7. 並列開発の設計ルール
- API 契約（OpenAPI）を実装前に確定し、Web/API の共通前提にする。
- Web の `api/` 層は、実 API クライアントとモック実装を切り替え可能な形で設計する。
- モック実装は契約の代表レスポンスと代表エラーを再現する。
- 結合フェーズでモックを実 API に差し替え、差分があれば契約または実装を修正する。
