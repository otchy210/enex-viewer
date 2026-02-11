# テスト運用ガイドライン

新規実装・仕様変更・リファクタ時に、テスト品質と運用の一貫性を保つためのルールを定義する。

## 1. 標準コマンド

```bash
npm run test
npm run test:api
npm run test:web
npm run test:coverage
```

workspace 単体実行:

```bash
npm run test -w apps/api
npm run test -w apps/web
npm run test:coverage -w apps/api
npm run test:coverage -w apps/web
```

## 2. テスト基盤

- API: Vitest + Supertest
- Web: Vitest + Testing Library + jsdom
- 新しいテストフレームワークの追加は原則行わない。

## 3. カバレッジ基準

- Vitest coverage（v8 provider）を使用する。
- global 閾値（API/Web ともに共通）:
  - lines: 80%
  - functions: 80%
  - branches: 80%
  - statements: 80%
- 閾値未達は完了扱いにしない。必要なテストを追加する。

## 4. 命名規約

- 単体テスト: `*.vitest.test.ts`
- UI テスト: `*.vitest.test.tsx`

## 5. 配置規約

### API (`apps/api`)

- 単体テスト: 実装ファイルの近く（`apps/api/src/**`）
- 統合テスト: `apps/api/src/__tests__/`

### Web (`apps/web`)

- UI テスト: 対象コンポーネント/ページの近く（`apps/web/src/**`）
- 共通セットアップ: `apps/web/src/test/setup.ts`
- テスト補助: `apps/web/src/test-utils/`（必要に応じて）

## 6. 変更時ルール

- 変更箇所に対応するテストを同一 PR で更新/追加する。
- 失敗系（エラー表示、入力不正、例外系）を最低 1 ケース含める。
- タスク完了時は `docs/tasks/implementation-tasks.md` のチェック更新を忘れない。
