# テスト運用ガイドライン

テスト基盤移行後の運用ルールをまとめたドキュメントです。新規テスト追加や実行時は本書を参照してください。

## 1. テスト実行コマンド

リポジトリの標準コマンドは以下の通りです。

```bash
npm run test
npm run test:api
npm run test:web
```

workspace 単体で実行したい場合は、以下のコマンドも使用します。

```bash
npm run test -w apps/api
npm run test -w apps/web
```

## 2. テストファイル命名規約

- API/Web ともに `*.vitest.test.ts` / `*.vitest.test.tsx` を基本とする。
- TypeScript の単体テストは `*.vitest.test.ts`、UI テストは `*.vitest.test.tsx` を使う。

## 3. 配置ルール

### API (`apps/api`)

- 単体テスト: 実装ファイルの近くに配置する（`apps/api/src/**`）。
- 統合テスト: `apps/api/src/__tests__/` に配置する。
- API 統合テストでは Supertest を使用する。

### Web (`apps/web`)

- UI テスト: 対象コンポーネント/ページの近くに配置する（`apps/web/src/**`）。
- テスト環境の共通セットアップは `apps/web/src/test/setup.ts` にまとめる。
- UI テストでは Testing Library + jsdom を使用する。

## 4. 新規テスト追加時の基本方針

- 既存基盤（API: Vitest + Supertest、Web: Vitest + Testing Library + jsdom）を優先する。
- 新しいテストフレームワークの追加は原則禁止し、既存の基盤を拡張して対応する。
- 既存のテスト実行コマンドで動作する状態を維持する。

