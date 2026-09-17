# No.355 precommit時にformat:checkも組み込む 実装計画

## 1. 目的

pre-commit 実行時に lint だけでなく format:check も必須化し、どちらか一方でも失敗した場合はコミットできない状態にする。

## 2. 変更対象

- `/home/runner/work/moptabi/moptabi/.husky/pre-commit`
  - pre-commit で lint と format:check の両方を順番に実行する
- `/home/runner/work/moptabi/moptabi/package.json`
  - ルートから frontend / backend の format:check をまとめて実行できる script を追加する

## 3. 実装方針

1. 既存の Husky pre-commit hook は lint のみを実行しているため、format:check も同じ hook に追加する。
2. hook 内で frontend / backend を個別に直接呼ぶのではなく、ルート `package.json` の集約 script を経由して実行する。
3. lint 失敗時はその時点でコミットを中断し、lint 成功時のみ format:check を実行する。
4. format:check 失敗時もコミットを中断し、lint と format:check の両方が成功した場合のみコミットを続行する。

## 4. 完了条件

- `lint` と `format:check` の両方が成功した場合のみ pre-commit が成功する
- `lint` が失敗した場合にコミットできない
- `format:check` が失敗した場合にコミットできない

## 5. 動作確認手順

事前準備:

```bash
cd /home/runner/work/moptabi/moptabi
```

### 5-1. 正常系

1. 依存関係が導入済みの状態で以下を実行する。

```bash
npm run lint
npm run format:check
.husky/pre-commit
```

2. `All lint and format checks passed. Proceeding with commit.` が表示されることを確認する。

### 5-2. lint NG を再現する手順

1. 任意のブランチで `frontend/src/components/CreatePlanButton.tsx` の import 群の直後などに、構文エラーになる 1 行を追加する。

```tsx
const lintVerification = ;
```

2. 以下を実行する。

```bash
npm run lint
.husky/pre-commit
```

3. lint が失敗し、`Lint failed` を含むメッセージが表示されてコミットできないことを確認する。
4. 確認後は追加した構文エラーの 1 行を削除して元に戻す。

### 5-3. format NG を再現する手順

1. 任意のブランチで `frontend/src/components/CreatePlanButton.tsx` の 1 行目を以下のように変更する。

```tsx
import React from "react";
```
2. 以下を実行する。

```bash
npm run format:check
.husky/pre-commit
```

3. format:check が失敗し、`Format check failed` を含むメッセージが表示されてコミットできないことを確認する。
4. 確認後は `npm --prefix frontend run format` または手動修正で元に戻す。

## 6. 実行コマンド

```bash
cd /home/runner/work/moptabi/moptabi
npm run lint
npm run format:check
.husky/pre-commit
```
