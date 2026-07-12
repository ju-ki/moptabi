# No.287 ログアウトができない 実装計画

## 1. 目的

本計画は、ステージング環境・本番環境で発生している「ログアウトできない」問題を解消するための実装手順を定義する。

参照資料:
- docs/tasks/No.287_ログアウトができない.md（本書）
- docs/リリース手順書.md
- docs/pages/mypage.md

---

## 2. 現象と想定原因

### 2-1. 現象

- ログアウトボタン押下後に未ログイン状態へ遷移しない。
- `/api/auth/session` にユーザー情報が残り続ける。

### 2-2. 想定原因

1. Auth.js の URL 設定不整合
- ステージングデプロイ時に `AUTH_URL` が固定ドメインで注入され、実際のアクセスホストと不一致になるケースがある。
- この不一致により、サインアウト時の Cookie 破棄や CSRF 判定が正常に働かない可能性がある。

2. ログアウト導線の実装差異
- `signOut({ redirect: false })` の後に手動遷移する実装が複数画面に散在しており、環境差分で反映タイミングの不安定さが出る可能性がある。

---

## 3. 実装対象

### 3-1. frontend

- Auth.js のログアウト導線統一
- ログアウト失敗時のユーザー通知

### 3-2. CI/CD（staging preview）

- `AUTH_URL` 運用の見直し
- デプロイ変数の注入方法の見直し

### 3-3. docs

- リリース手順書の Auth.js 環境変数運用追記

---

## 4. 変更対象ファイル（予定）

### 4-1. 実装

- frontend/src/components/common/header.tsx
	- ログアウト処理を Auth.js 標準のリダイレクト方式へ統一
	- エラー時のトースト通知を追加

- frontend/src/app/mypage/page.tsx
	- ヘッダーと同じログアウト処理へ統一
	- エラー時のトースト通知を追加

### 4-2. デプロイ設定

- .github/workflows/staging-preview.yml
	- `AUTH_URL` の固定注入見直し
	- `AUTH_TRUST_HOST` の運用整理
	- 既存変数残存リスク（`--keep-vars`）の回避策を追加

### 4-3. ドキュメント

- docs/リリース手順書.md
	- ステージング/本番での Auth.js 必須環境変数と設定方針を追記

---

## 5. 実装方針

### 5-1. ログアウト処理の統一

- すべてのログアウト導線で以下に統一する。
	- `await signOut({ callbackUrl: '/' })`
- `redirect: false` + 手動 `router.push` / `router.refresh` は廃止する。

### 5-2. 環境変数の責務を明確化

- 原則:
	- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` は必須。
	- `AUTH_TRUST_HOST=true` を設定。
- `AUTH_URL` は「実アクセス URL と確実に一致させられる場合のみ」設定し、固定値の使い回しを禁止する。

### 5-3. 失敗時の可観測性強化

- ログアウト失敗時にトーストで明示し、「何も起きない」を防ぐ。
- 失敗時はコンソールにエラー内容を記録し、調査可能にする。

---

## 6. TDD 進行計画

### Phase 1: ログアウト処理の単体修正（frontend）

- Red
	- 既存テストに「ログアウト押下時に `signOut({ callbackUrl: '/' })` が呼ばれる」期待を追加し失敗させる。
- Green
	- `header.tsx`, `mypage/page.tsx` のログアウト実装を統一する。
- Refactor
	- 共通化可能であれば `useLogout` 等の小さな共通関数へ集約する（過剰設計はしない）。

### Phase 2: エラー通知の追加

- Red
	- `signOut` 失敗時に通知が出ないテストを追加する。
- Green
	- 失敗時トースト通知を実装する。
- Refactor
	- 通知文言を定数化し重複を排除する。

### Phase 3: staging-preview ワークフロー修正

- Red
	- 固定 `AUTH_URL` 注入前提のままでは運用ミスが起きることをレビュー観点で明文化する。
- Green
	- ワークフローを修正し、環境変数注入ルールを統一する。
- Refactor
	- 変数名・注入手順のコメントを追記し、誰でも保守できる状態にする。

### Phase 4: ドキュメント更新

- Red
	- リリース手順に Auth.js 運用ルールが不足している状態を確認する。
- Green
	- 必須変数、設定例、検証手順を追記する。
- Refactor
	- Staging/Production の差分を表形式で整理する。

---

## 7. テスト計画（観点）

1. フロント単体
- ログアウトボタン押下で `signOut({ callbackUrl: '/' })` が呼ばれる。
- `signOut` が例外を投げた場合にエラー通知が表示される。

2. ステージング結合確認
- ログイン後、`/api/auth/session` がユーザー情報を返す。
- ログアウト後、`/api/auth/session` が `null` を返す。
- ログアウト後に保護ページ（`/mypage`, `/plan/create`）へ直接アクセスすると認証導線へ遷移する。

3. 本番確認
- ステージングと同一シナリオでセッション破棄を確認する。

---

## 8. 作業手順（誰でも実施できる手順）

1. 実装
- `header.tsx` と `mypage/page.tsx` のログアウト処理を統一する。
- 失敗時トーストを追加する。

2. テスト（frontend）
- `cd frontend`
- `npm run test`
- `npm run typecheck`

3. ワークフロー更新
- `.github/workflows/staging-preview.yml` の Auth.js 変数注入部分を修正する。

4. ドキュメント更新
- `docs/リリース手順書.md` に Auth.js 環境変数方針を追記する。

5. ステージング検証
- デプロイ後、ブラウザ開発者ツール Network で以下を確認する。
	- `POST /api/auth/signout` が 2xx
	- レスポンスにセッション Cookie 削除指示（Set-Cookie）が含まれる
	- 直後の `GET /api/auth/session` が `null`

6. 本番検証
- ステージングと同じ手順で確認し、結果を記録する。

---

## 9. 完了条件（DoD）

1. ステージング・本番の両方でログアウト後にセッションが破棄される。
2. ログアウト後に保護ページへアクセスできない（未認証として扱われる）。
3. フロントテストと型チェックが通過する。
4. staging-preview の Auth.js 変数運用ルールがドキュメント化されている。

---

## 10. 実行コマンド（予定）

### 10-1. frontend

- cd frontend
- pnpm run test
- pnpm run typecheck

### 10-2. 参考（デプロイ後確認）

- ブラウザの Network で `/api/auth/signout`, `/api/auth/session` を確認


以上。
