# No.202 stagingプレビュー機能 実装計画（再現可能版）

## 1. この計画書の目的

このドキュメントは、担当者が変わっても同じ結果を再現できるように、No.202 の実装手順を具体的な作業単位まで分解したものです。

前提となる要件定義:
- `docs/tasks/No.202_staging環境でのプレビュー機能.md`

今回の確定方針:
- base が `staging` かつ head が `dev` の PR を対象にする
- 起動タイミングは PR 作成時（opened）のみとする
- 同一PRでは同じURLを更新し続ける
- PR close / merge で cleanup はしない
- PR環境は期限なしで残す
- staging固定DBを使い、複数PRの並列確認を許容する

---

## 2. 完了条件（この計画のDoD）

1. base=`staging` かつ head=`dev` のPRで、frontend / backend の staging 確認用URLが自動作成される。
2. 同一PRでは毎回同じURLを使い、最新デプロイ内容に更新される。
3. PRコメントに以下が表示される。
- frontend URL
- backend URL
- commit SHA
- 実行結果（成功 / 失敗）
- 実行時刻
4. workflow は staging 用Secretだけを参照し、本番用Secretを参照しない。
5. frontend / backend の両方で shared-types を参照できる状態でビルド・デプロイできる。
6. staging固定DBの運用ルールに沿って、識別子付きテストデータと運用ログを使った確認ができる。

---

## 3. 実装対象ファイル

1. 新規作成
- `.github/workflows/staging-preview.yml`

2. 必要に応じて更新
- `.github/workflows/ci.yml`
- `docs/tasks/No.202_staging環境でのプレビュー機能.md`
- `docs/tasks/No.202_実装計画.md`

3. 任意で追加
- `docs/tasks/No.202_staging運用ログテンプレート.md`

---

## 4. 体制と責務

1. 実装担当
- workflow作成・修正
- staging向け環境変数の設定
- PRコメント更新ロジックの実装

2. レビュー担当
- トリガー条件、permissions、Secret参照先のレビュー
- URLが同一PRで固定になっているかの確認
- 要件定義との整合確認

3. 運用担当
- DBスナップショット取得・復元手順の運用
- staging確認時の運用ログ管理
- 障害時のロールバック実行

---

## 5. 事前準備（Phase 0）

### 5-1. ブランチとローカル確認

1. 作業ブランチを作成する。
例:
```bash
git checkout dev
git pull origin dev
git checkout -b feature202-staging-preview
```

2. 既存のCI相当コマンドが通ることを確認する。

frontend:
```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
```

backend:
```bash
cd backend
bun install
bun run lint
bun run typecheck
bun run test
```

完了条件:
- 既存の frontend / backend の lint, typecheck, test が通る

### 5-2. Secret / Variable の準備

1. GitHub の `staging` Environment を使う。
2. `staging` Environment に必要なSecretを登録する。
- frontend デプロイ用トークン
- backend デプロイ用トークン
- staging DB接続情報
- PRコメント投稿用トークン
3. 本番Environment / 本番Secretは `staging-preview.yml` から参照しない。

レビュー観点:
- workflow 内に `production` 用のSecret名が出てこないこと
- `environment: staging` もしくは staging用Secret参照に限定されていること

### 5-3. 命名ルールの固定

1. 環境名は `staging` のみ使う。
2. PR識別子は `pr-<number>` を使う。
例: `pr-123`
3. テストデータ識別子は `pr<番号>_` プレフィックスを使う。
例: `pr123_`
4. 同一PRのURLは固定にする。

---

## 6. ワークフロー全体設計（Phase 1）

### 6-1. トリガー

対象workflow:
- `.github/workflows/staging-preview.yml`

トリガー:
```yml
on:
　　pull_request:
　　branches:
　　　　- staging
　　types:
　　　　- opened
```

job 条件:
```yml
if: ${{ github.event.pull_request.head.ref == 'dev' }}
```

採用理由:
- `closed` は使わない
- PR close / merge 後も環境を残す方針のため cleanup job は持たない

### 6-2. concurrency

設定方針:
```yml
concurrency:
	group: staging-preview-${{ github.event.pull_request.number }}
	cancel-in-progress: true
```

採用理由:
- 同一PRで push が連続した場合、古い実行を止めて最新結果だけ残すため

### 6-3. Job構成

1. `deploy-backend`
- backend を staging 向けにデプロイ
- backend URL を output に保存

2. `deploy-frontend`
- frontend を staging 向けにデプロイ
- frontend URL を output に保存
- build 時に `NEXT_PUBLIC_API_BASE_URL` へ backend URL を注入する

3. `comment-preview`
- `deploy-frontend`, `deploy-backend` の結果を受けて PRコメントを更新

4. `verify-routing`
- frontend URL と backend URL を使った軽量確認
- 必須ではないが、可能なら追加する

補足:
- frontend は build 時に backend URL を必要とするため、実装順序は `deploy-backend` を先に実行する
- backend deploy 後に確定した URL を frontend job の環境変数へ渡す

### 6-4. permissions

最小権限:
```yml
permissions:
	contents: read
	pull-requests: write
```

追加が必要な場合のみ明示的に足す。

---

## 7. shared-types の扱い（Phase 2）

### 7-1. 前提

shared-types は frontend だけでなく backend でも参照している。
そのため、frontend側だけで shared-types をビルドする計画にはしない。

確認できている内容:
- frontend の `prebuild` は `../packages/shared-types` を参照している
- backend の `prebuild` も `../packages/shared-types` を参照している

### 7-2. 実装方針

各job内で必要な shared-types ビルドを行う。

理由:
- frontend job は Node ベースで動く
- backend job は Bun ベースで動く
- job 間で成果物を共有するより、各jobで確実にビルドした方が再現しやすい

### 7-3. 実行コマンド

frontend job で実行する候補:
```bash
npm ci
cd frontend
npm ci
npm exec -- tsc -p ../packages/shared-types/tsconfig.json
```

backend job で実行する候補:
```bash
cd backend
bun install
bunx tsc -p ../packages/shared-types/tsconfig.json
```

完了条件:
- frontend build 時に shared-types の解決エラーが出ない
- backend build 時に shared-types の解決エラーが出ない

---

## 8. frontendデプロイ詳細（Phase 3）

### 8-1. 実施手順

1. Node をセットアップする
2. root の依存を入れる
3. frontend の依存を入れる
4. shared-types をビルドする
5. frontend を build する
6. staging向けに deploy する
7. URL を job output に保存する

### 8-2. 実行コマンド案

```bash
npm ci
cd frontend
npm ci
npm exec -- tsc -p ../packages/shared-types/tsconfig.json
npm run build:staging
```

デプロイ部分は既存 script をベースに実装する。
既存 script:
- `npm run deploy:staging`

### 8-3. URL方針

1. PRごとに固定のURL識別子を使う
2. 同じPRでは常に同じURLへ更新する
3. PR番号からURLを逆引きできるようにする

例:
- `pr-123` を識別子として扱う
- コメントにも `PR: 123` を残す

### 8-4. 完了条件

1. `deploy-frontend` job が成功する
2. URL を `outputs.frontend_url` に格納できる
3. PR更新時に同じURLが使われる

---

## 9. backendデプロイ詳細（Phase 4）

### 9-1. 実施手順

1. Bun をセットアップする
2. backend の依存を入れる
3. shared-types をビルドする
4. 必要なら staging 用の環境変数を生成する
5. backend を build / deploy する
6. URL を job output に保存する

### 9-2. 実行コマンド案

```bash
cd backend
bun install
bunx tsc -p ../packages/shared-types/tsconfig.json
bun run build
```

DB変更を伴う場合の追加コマンド候補:
```bash
cd backend
bun run db:migrate:staging
```

### 9-3. staging固定DBの扱い

1. 接続先は staging DB 固定にする
2. PRごとにDBは分けない
3. データ操作は `pr<番号>_` 識別子付きで行う

### 9-4. 完了条件

1. `deploy-backend` job が成功する
2. backend URL を `outputs.backend_url` に格納できる
3. frontend から接続する backend のURLが staging 用になっている

---

## 10. PRコメント更新（Phase 5）

### 10-1. 更新方式

1. 固定マーカーを使う
例:
```html
<!-- staging-preview-report -->
```
2. 既存コメントがある場合は更新する
3. ない場合は新規作成する
4. 同じPRで複数コメントを増やさない

### 10-2. コメント本文テンプレート

必須項目:
- frontend URL
- backend URL
- commit SHA
- deploy status
- 実行時刻

推奨項目:
- 失敗時のエラー要約
- 実行した workflow 名

本文例:
```md
<!-- staging-preview-report -->
## Staging Preview

- Frontend: <frontend_url>
- Backend: <backend_url>
- SHA: <commit_sha>
- Status: Success
- Updated At: <timestamp>
```

### 10-3. 完了条件

1. PR opened でコメントが作成される
2. PR synchronize で同じコメントが更新される
3. 失敗時もコメントが更新される

---

## 11. 疎通確認と失敗時の扱い（Phase 6）

### 11-1. 軽量疎通確認

実施内容:
1. backend の health 相当エンドポイントを叩く
2. frontend 側のトップページまたは代表ページにアクセスする

確認コマンド例:
```bash
curl -f "$BACKEND_URL/health"
curl -I "$FRONTEND_URL"
```

### 11-2. 失敗時ルール

1. frontend deploy 失敗時は workflow を失敗にする
2. backend deploy 失敗時は workflow を失敗にする
3. コメントには最低限の失敗理由を残す
4. cleanup は存在しないため、closed 起因の失敗パターンは考慮しない

---

## 11.5 運用中に追加した必須対策

### 11.5-1. CORSとエラーレスポンスの整合

1. `c.env` が未定義でも CORS 判定が落ちない実装にする。
2. `onError` のレスポンスにも `Access-Control-Allow-Origin` を付与する。
3. `NODE_ENV` の判定は `c.env?.NODE_ENV ?? process.env.NODE_ENV` で実行する。

### 11.5-2. plan-location のDB接続安定化

1. `plan-location` 系はグローバル `db` を直接使わず、`getDbFromContext(c)` で取得したDBを使用する。
2. サービス層では request-scoped DB を受け取れる構造にする。
3. 既存テスト互換のため、旧シグネチャ呼び出しも受け付ける。

### 11.5-3. neon-http の transaction 非対応対策

1. `POST /api/trips/create` は transaction 実行を試みる。
2. `No transactions support in neon-http driver` の場合のみ非transaction処理へフォールバックする。
3. それ以外の例外は握りつぶさずに失敗として扱う。

### 11.5-4. staging DB マイグレーション運用

1. CIでは `generate` を行わず、生成済みSQLを `migrate` で適用する。
2. staging 設定の migration out は履歴管理済みの `./drizzle` を参照する。
3. 既存スキーマDBへの初回適用ではベースライン登録を行い、`already exists` を回避する。

---

## 12. staging固定DB運用（Phase 7）

### 12-1. 並列確認時のルール

1. 書き込みデータには必ず PR識別子を含める
2. 他PRが作成したデータを更新しない
3. 共有マスターデータの更新は原則禁止
4. 大量更新・一括削除は staging確認中に実行しない

### 12-2. マイグレーション実行ルール

1. 実行前にスナップショットを取得する
2. 運用ログに以下を記録する
- PR番号
- 実行者
- 実行時刻
- 適用順序
- 成否
3. DB変更PRが複数ある場合も、マイグレーション適用は同時に行わない
4. DB定義変更によるエラー発生は許容するが、発生内容は運用ログに残す

### 12-3. ロールバック手順

1. frontend / backend を直前安定版へ再デプロイする
2. 必要な場合のみ staging DB をスナップショットから復元する
3. スモークテストを実施する
4. PRコメントと運用ログに復旧結果を記録する

---

## 13. テスト計画（Phase 8）

### 13-1. 正常系

1. base=`staging` かつ head=`dev` のPR opened で frontend / backend URL が出る
2. 同じPRで同じURLが維持される
3. PRコメントにSHAと実行時刻が更新される

### 13-2. 異常系

1. frontend デプロイ失敗時に Checks が失敗表示になる
2. backend デプロイ失敗時に Checks が失敗表示になる
3. backend 疎通失敗時にコメントへ失敗内容が出る

### 13-3. セキュリティ

1. staging用Secretのみ参照している
2. 本番Environment / 本番Secret を参照していない

### 13-4. 運用系

1. DB変更PRでスナップショット取得手順が実施できる
2. `pr<番号>_` 付きテストデータで並列確認できる
3. 運用ログを残せる

---

## 14. 実行チェックリスト

### 実装前

- [ ] `staging` Environment と Secrets を準備した
- [ ] 命名ルール（`pr-<number>` / `pr<番号>_`）を共有した
- [ ] frontend / backend の既存CIが通ることを確認した

### 実装中

- [ ] `.github/workflows/staging-preview.yml` を作成した
- [ ] `concurrency` を設定した
- [ ] frontend / backend の両jobで shared-types をビルドする方針にした
- [ ] frontend URL を output に保存できる
- [ ] backend URL を output に保存できる
- [ ] PRコメント更新が上書き方式になっている

### 実装後

- [ ] opened のみで起動することを確認した
- [ ] base=`staging` かつ head=`dev` 以外では起動しないことを確認した
- [ ] 同一PRで同じURLが維持されることを確認した
- [ ] 本番Secret未参照をレビューで確認した
- [ ] ロールバック手順を1回リハーサルした

---

## 15. 想定スケジュール

1. Day 1
- Phase 0: 事前準備
- Phase 1: workflow骨格作成

2. Day 2
- Phase 2: shared-types の両job対応
- Phase 3: frontend デプロイ
- Phase 4: backend デプロイ

3. Day 3
- Phase 5: PRコメント更新
- Phase 6: 疎通確認
- Phase 7: staging DB運用手順の整理

4. Day 4
- Phase 8: 総合テスト
- 手順書修正

---

## 16. 変更管理

1. 要件差分が出た場合は、先に `No.202_staging環境でのプレビュー機能.md` を更新する
2. その後に workflow 実装を修正する
3. 要件と実装の不一致を放置しない
