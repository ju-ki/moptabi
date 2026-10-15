# No.451 Claude開発用の動作確認環境 調査報告

関連: #307（staging環境の一時環境版の作成機能）、No.202（staging プレビュー）、No.287（ログアウトできない）

## 1. 要件整理

### 目的
- 自宅PC以外（スマホ・外出先）から、Claude が実装したブランチを実機で動作確認できるようにし、PR の滞留を解消する。

### 要件
1. feature ブランチ（PR 未マージ）の内容を、ブラウザからアクセスできる URL で確認できる。
2. 構築は push ごとの自動実行ではなく、手動またはコマンドをトリガーにする。
3. #307 の「固有の問題（ログアウト不可など）を再現できる一時環境」も兼ねる。

### 懸念点（Issue 記載）
- commit & push の増加で「月のビルド回数の上限」に引っかかる可能性。

### 未確定事項
| # | 内容 | 本報告での仮置き |
|---|------|------------------|
| 1 | 「ビルド回数の上限」がどのサービスの上限か | 下記 2-4 の通り、現状 GitHub Actions には上限なし。Cloudflare Workers Builds の可能性が高いと推定 |
| 2 | 同時に確認したいブランチ数（環境の数） | まずは 1 枠 |
| 3 | DB を staging と共有してよいか（マイグレーションを含むブランチの扱い） | 共有 + マイグレーション含むブランチは拒否 → 後から Neon ブランチで分離 |
| 4 | 起動手段（GitHub 画面 / PR コメント / Claude から） | 3 つとも使えるようにする |

## 2. 現状調査

### 2-1. 既存の staging プレビュー（No.202）
`.github/workflows/staging-preview.yml` が、ほぼ今回欲しいものの部品を持っている。

| 処理 | 該当箇所 | 内容 |
|------|----------|------|
| トリガー | `staging-preview.yml:3-9` | `pull_request`（base=staging, opened/synchronize）のみ。feature ブランチでは動かない |
| 対象制限 | `staging-preview.yml:20` | `head.ref == 'dev'` のときだけ実行 |
| backend デプロイ | `staging-preview.yml:61-100` | `moptabi-backend-pr-<PR番号>` という Worker 名で wrangler deploy。`ALLOWED_ORIGIN_SUFFIXES:.pages.dev,.workers.dev` を注入 |
| DB | `staging-preview.yml:72-89` | `STAGING_DATABASE_URL` を secret 登録し、`db:migrate:staging` を実行（staging 固定DB） |
| frontend デプロイ | `staging-preview.yml:113-160` | Worker 名は `moptabi-frontend-staging` 固定。`NEXT_PUBLIC_API_BASE_URL` をビルド時に埋め込み、`AUTH_URL` を固定 URL で注入 |
| 認証 secret | `staging-preview.yml:173-197` | `STAGING_AUTH_SECRET` / `STAGING_AUTH_GOOGLE_ID` / `STAGING_AUTH_GOOGLE_SECRET` |
| 疎通確認・PRコメント | `staging-preview.yml:199-306` | `/api/health`, `/api/health/db`, frontend の応答を確認し、結果を PR コメントに集約 |

### 2-2. URL を固定しなければならない理由
- **Google ログイン**: `frontend/auth.ts:5` は Google プロバイダのみ。Google OAuth のリダイレクト URI はワイルドカード不可のため、確認環境の frontend URL は事前に Google Cloud Console へ登録できる**固定 URL**である必要がある（frontend Worker 名を固定している理由もこれと推定）。
- **API URL の埋め込み**: `NEXT_PUBLIC_API_BASE_URL` はビルド時に埋め込まれる（`frontend/src/hooks/use-plan-location.ts:18` ほか）。backend URL も固定の方が扱いやすい。
- **CORS**: `backend/src/index.ts:71-76` の固定リストに加え、`ALLOWED_ORIGINS` / `ALLOWED_ORIGIN_SUFFIXES`（`backend/src/index.ts:111-117`）で追加できるので、backend 側の変更は不要。

### 2-3. 既存 CI（`.github/workflows/ci.yml`）
- `ci.yml:3-12`: `feature**` / `fix**` / `dev` への push と、dev/master 向け PR で frontend + backend の lint・typecheck・test を毎回実行。
- `ci.yml:288-359`: CI 成功後に PR を自動作成（`create-pull-request` が `needs: [frontend, backend]`）。
- デプロイは含まない。

### 2-4. 「ビルド回数の上限」について（確認結果）
- リポジトリは **public**（GitHub API の `visibility: public`）。public リポジトリの GitHub Actions 標準ランナーは無料・分数上限なしのため、Actions 経由のデプロイは上限を気にしなくてよい。
- feature ブランチの PR（例: #454）のチェックは `frontend` / `backend` / `create-pull-request` の 3 つだけで、Cloudflare の Git 連携ビルド（Workers Builds）は feature ブランチでは動いていない。
- Cloudflare Workers Builds（Git 連携）を使う場合の上限は Free で **月 3,000 分・同時 1 ビルド**、Paid で月 6,000 分（[Cloudflare Docs: Limits & pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)）。
- **GitHub Actions から wrangler deploy する方式なら Workers Builds の枠は消費しない。** 本番 frontend（Worker 名 `moptabi`）が Workers Builds で Git 連携されているかはリポジトリからは判別できない（Cloudflare ダッシュボードで要確認）。

### 2-5. Claude の作業環境
- Claude のクラウド環境には `docker` / `psql` / `bun` / `pnpm` / Playwright 用 Chromium がある。ただし外部からはアクセスできないため、ユーザーがスマホで確認する用途には使えない（「追加の提案」参照）。
- この環境からは GitHub MCP の `actions_run_trigger` で `workflow_dispatch` を起動できるので、**Claude が実装完了後に確認環境のデプロイまで起動する**運用が可能。

## 3. 実現案

### 案A: 手動トリガーのワークフローで「固定スロット」にデプロイ（推奨）
新規 `.github/workflows/sandbox-deploy.yml` を作り、`staging-preview.yml` の手順を流用して、指定ブランチを固定名の Worker にデプロイする。

- トリガー
  - `workflow_dispatch`（入力: `ref` = ブランチ名）… GitHub の Actions 画面（スマホのブラウザ可）や Claude（MCP）から起動
  - PR コメント `/sandbox`（`issue_comment`、`author_association == OWNER` のみ）… スマホの GitHub アプリから起動しやすい
- デプロイ先（固定）
  - backend: `moptabi-backend-sandbox`
  - frontend: `moptabi-frontend-sandbox`（`AUTH_URL` もこの URL）
  - `concurrency: sandbox` で同時実行を 1 本に制限
- DB: 当面 `STAGING_DATABASE_URL` を共有。ブランチに `backend/drizzle/` の新規マイグレーションが含まれる場合はデプロイを中止してメッセージを出す（staging DB を壊さないため）
- 結果: PR コメント（PR があれば）とジョブサマリーに URL・SHA・ブランチ名を出力

| 項目 | 内容 |
|------|------|
| 変更範囲 | `.github/workflows/sandbox-deploy.yml`（新規）、`docs/` に運用手順。アプリコードは変更なし |
| 事前作業（ユーザー） | Google OAuth クライアント（staging 用）にリダイレクト URI `https://moptabi-frontend-sandbox.<subdomain>.workers.dev/api/auth/callback/google` を追加 |
| メリット | push と分離されるので回数を完全に制御できる / Actions は public で無料 / 既存の secret と手順をそのまま流用 / URL 固定でログインも動く / #307 の一時環境も兼ねる |
| デメリット | 枠が 1 つなので、別ブランチをデプロイすると上書きされる / DB 共有のためマイグレーションを含むブランチは確認できない（案A+で解消） |
| 工数感 | 小〜中（0.5〜1日）。大半は staging-preview.yml の流用 |

**案A+（第2段階）: Neon ブランチで DB を分離**
- staging DB から `sandbox` という Neon ブランチを作り、デプロイ時に親（staging）からリセットしてからマイグレーションを流す（`neondatabase/reset-branch-action` 等）。
- マイグレーションを含むブランチも確認でき、staging DB を汚さない。
- 追加で `NEON_API_KEY` / プロジェクトID の secret が必要。工数は +0.5日程度。

### 案B: Cloudflare Workers Builds のブランチプレビュー（Git 連携）
Cloudflare 側の Git 連携で「非本番ブランチのビルド」を有効にし、ブランチごとのプレビュー URL を使う。

| 項目 | 内容 |
|------|------|
| 変更範囲 | Cloudflare ダッシュボード設定、wrangler 設定 |
| メリット | ワークフローを書かずに済む |
| デメリット | **push ごとに自動ビルドされ、Issue の懸念（月 3,000 分・同時 1 本の上限）そのもの** / プレビュー URL がブランチごとに変わり Google OAuth のリダイレクト URI を登録できない（ログイン不可）/ frontend と backend の組み合わせ（API URL の埋め込み）を対応付けにくい |
| 工数感 | 小だが、ログインできない時点で要件を満たさない |

### 案C: Claude の作業環境から直接 wrangler deploy するスクリプト
`scripts/sandbox-deploy.sh` を作り、Claude の環境（または自宅PC）から `pnpm run sandbox:deploy` で同じ固定スロットにデプロイする。

| 項目 | 内容 |
|------|------|
| 変更範囲 | スクリプト新規、Claude 環境の環境変数（Cloudflare API トークン・DB URL・Auth secret） |
| メリット | GitHub Actions を一切使わない |
| デメリット | Cloudflare トークンや DB 接続情報を Claude の環境に置く必要があり漏えい範囲が広がる / 環境のネットワーク許可（api.cloudflare.com 等）が必要 / スマホから直接起動できない |
| 工数感 | 中 |

### 推奨: 案A（第1段階）→ 案A+（第2段階）
- 「手動トリガー」「回数を気にしない」「スマホから確認」「Google ログインが動く」をすべて満たすのは案Aのみ。
- 既存の `staging-preview.yml` の手順・secret を流用でき、アプリコードの変更が不要。
- Claude から `workflow_dispatch` を起動できるため、「Claude が実装 → 確認環境にデプロイ → URL をスレッドで共有 → ユーザーがスマホで確認」という流れが作れる。
- マイグレーションを含むブランチが増えてきたら案A+で DB を分離する。

## 4. 追加の提案

1. **ドキュメントのみの push で CI を走らせない**
   - 調査報告だけのブランチでも `ci.yml` の frontend/backend が毎回走っている。`paths-ignore: ['docs/**']` を付けたいが、`create-pull-request` が CI に依存しているため、そのままだと PR が自動作成されなくなる。PR 作成ジョブを別ワークフローに分ける等の整理が必要。
2. **`ci.yml` に `concurrency`（cancel-in-progress）を追加**
   - 連続 push 時に古い CI を止め、待ち時間を減らす。
3. **Claude 自身の事前確認（Playwright）**
   - Claude の環境でも Docker の Postgres + backend + frontend を起動し、画面のスクリーンショットを撮って PR に添付できる。ユーザーに渡す前の手戻りが減る。ただし Google ログインが必要な画面は確認できないため、テスト用のログイン手段が必要になる（設計書にない機能のため要相談）。
4. **`docs/リリース手順書.md` が古い**
   - Prisma Accelerate / Clerk / Cloudflare Pages 前提の記述が残っており、現在の構成（Drizzle、Auth.js、Workers）と異なる。確認環境の運用手順を書くタイミングで整理したい。
5. **枠を複数にする場合**
   - `workflow_dispatch` の入力に `slot`（1〜3）を追加し、`moptabi-frontend-sandbox-1` のように増やせる。その分 Google OAuth のリダイレクト URI も事前登録が必要。

## 5. 確認したいこと
1. 「月のビルド回数の上限」は Cloudflare（Workers Builds）の上限のことか。
2. まずは確認環境 1 枠（上書き式）で良いか。
3. DB は当面 staging 共有（マイグレーション含むブランチは拒否）で良いか、最初から Neon ブランチで分離するか。
