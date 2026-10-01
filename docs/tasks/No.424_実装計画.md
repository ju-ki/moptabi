# No.424 初回編集時に謎の500エラー 実装計画

## 1. 事象

- Cloudflare 環境で、プランの編集（`PATCH /trips/:id`）を初回に実行すると 500 になる。2回目は成功する。
- #398 と同系統の事象。#398 の修正（`7e8d0d9`）は `GET /trips` を `getDbFromContext()` に切り替えただけで、作成・更新は `getPostgresDb()` のまま残っている。

## 2. 原因

### 2-1. Workers 上で `pg` の Pool をリクエストをまたいで使い回している

- `backend/src/controllers/trip.ts:87`（`createTrip`）と `:105`（`updateTrip`）は、トランザクションのために `getPostgresDb(c)` を使う。
- `getPostgresDb()` → `createDevDb()` は `pg` の `Pool` を `globalThis` に1つだけ作り、以降のリクエストでも同じ Pool を返す（`backend/src/db/index.ts:54`）。
- Cloudflare Workers では、あるリクエストの中で開いたソケット（I/O オブジェクト）を別のリクエストから使えない。
- そのため、前のリクエストで作られて Pool に返却された接続を次のリクエストが使うと、クエリが応答を返さずハングし、ランタイムがリクエストを打ち切って 500 になる。
- 失敗した接続は Pool から破棄されるので、直後のリトライでは新しい接続が作られて成功する。これが「初回だけ 500、2回目は成功」に見える理由。

### 2-2. ローカルで再現しない理由

- ローカル（Node.js / Docker）やテストは Node 上で動くため、リクエストをまたいだソケットの再利用に制限がない。
- 既存テスト（`backend/src/tests/*.spec.ts`）は Workers ランタイムを通らないので検出できない。

### 2-3. 再現確認

`wrangler dev`（workerd）+ ローカル Postgres で、現行と同じ「`globalThis` に Pool をキャッシュして drizzle の `transaction` を実行する」最小 Worker を作り、連続でリクエストした。

| 方式 | 結果 |
| --- | --- |
| 現行（Pool をグローバルに保持） | `200 500 200 500 200 500`（1回おきに失敗） |
| 修正案（リクエストごとに Pool を作り、レスポンス後に `end()`） | 連続 8回、並列 5回、15秒空けた後 3回すべて 200 |

失敗時のログ: `The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.`

修正案でも、終了後に Postgres 側に残る接続は 0 件だった（`pg_stat_activity` で確認）。

本番の Cloudflare ログ（`wrangler tail`）では未確認。リリース前に同じメッセージが出ているか確認すると確実。

## 3. 修正方針

トランザクションが必要なので `pg`（node-postgres）は使い続け、**接続のライフサイクルをリクエスト単位にする**。

### 方針（採用）: リクエストごとに Pool を作成し、レスポンス後に閉じる

- `getPostgresDb(c)` が Workers 上（`c.env.DATABASE_URL` あり）で呼ばれたら、そのリクエスト専用の `Pool` を作る。
- 作った Pool はリクエスト（`c.req.raw`）をキーにした `WeakMap` に保持し、同一リクエスト内で `getPostgresDb(c)` が複数回呼ばれても同じ Pool を返す。
- レスポンス後に `c.executionCtx.waitUntil(pool.end())` で閉じる。閉じる処理は全ルート共通の middleware（`backend/src/middleware/db.ts` の `postgresDbLifecycle`）で `await next()` の後に行う。
- ローカル・テスト（`c.env.DATABASE_URL` なし、または `executionCtx` がない）では今のグローバル Pool のままにする。Hono は Node 上で `c.executionCtx` を参照すると例外を投げるため、取得は try/catch でガードする。

### 検討したが採用しない案

- **`drizzle-orm/neon-serverless`（WebSocket の Pool）に切り替える**: トランザクションは使えるが、Workers ではこれも「リクエストごとに作って閉じる」必要があり、根本対策は同じ。ドライバ変更の分だけ差分とリスクが増える。
- **Hyperdrive を導入する**: 接続プールの問題は解決するが、Cloudflare 側の設定追加が必要で今回の最小修正の範囲を超える。将来の改善候補。
- **`neon-http`（`getDbFromContext`）に寄せる**: トランザクション非対応のため不可。

## 4. 実装対象

### 4-1. `backend/src/db/index.ts`

- `getPostgresDb(c)` を以下の挙動にする。
  1. `WeakMap` に `c.req.raw` の Pool があればそれを使って drizzle を返す。
  2. `c.env.DATABASE_URL` があり、`executionCtx` が取れる（= Workers）なら、新しい `Pool({ connectionString })` を作って `WeakMap` に登録して返す。
  3. それ以外（ローカル・テスト）は現行どおり `createDevDb()`。
- リクエスト終了時に Pool を閉じるヘルパー`closeRequestPostgresDb(c)` を追加する。

### 4-2. `backend/src/middleware/db.ts`（新規）と `backend/src/index.ts`

- `await next()` の後で `closeRequestPostgresDb(c)` を呼ぶ middleware `postgresDbLifecycle` を追加する。例外時も閉じるよう `try/finally` にする。
- `backend/src/index.ts` で `app.use('*', postgresDbLifecycle)` として全ルートに適用する（Pool を作っていないリクエストでは何もしない）。

### 4-3. `backend/src/controllers/trip.ts`

- `createTrip` の `No transactions support in neon-http driver` の catch は、`pg` 経由では発生しないため削除する。

### 4-4. 型

- 現状 Hono の `Variables` 型定義がないため、`c.set` ではなく `WeakMap<Request, Pool>` で保持し、型の追加は不要にする。

## 5. テスト計画

### 5-1. 単体テスト（`backend/src/tests/db.spec.ts` を新規作成）

1. `c.env.DATABASE_URL` と `executionCtx` があるとき、`getPostgresDb(c)` がグローバル Pool ではなくリクエスト専用 Pool を返すこと。
2. 同一コンテキストで2回呼んだら同じ Pool を返すこと。
3. 別コンテキストでは別の Pool になること（リクエスト間で共有しない回帰テスト）。
4. `postgresDbLifecycle` が、レスポンス後（例外時も含む）に `waitUntil` で `pool.end()` を呼ぶこと。
5. `executionCtx` がない（Node / テスト）ときは現行のグローバル Pool を返すこと。

### 5-2. API テスト（`backend/src/tests/trip.workers.api.spec.ts` を新規作成）

- `env.DATABASE_URL` と `executionCtx` を渡して `POST /api/trips/create` と `PATCH /api/trips/:id`（3回連続）を呼び、毎回成功してリクエストごとに接続プールが閉じられること。

### 5-3. 既存テスト

- `npm --prefix backend run test -- trip` で作成・更新の既存テストが通ること（ローカル経路は変わらない）。

### 5-4. Workers 上の動作確認（手動）

1. `npm --prefix backend run wrangler:dev` を起動する。
2. 同じプランを連続で編集（`PATCH /trips/:id`）し、すべて 200 になること。
3. プラン作成（`POST /trips/create`）も連続で成功すること。
4. 確認後、Postgres の接続数が増え続けていないこと（`select count(*) from pg_stat_activity`）。

## 6. 影響範囲

- 影響するのは `getPostgresDb()` を使う `POST /trips/create` と `PATCH /trips/:id` のみ（`backend/src/controllers/trip.ts:87, 105`）。他の API は `getDbFromContext()`（neon-http）で影響なし。
- リクエストごとに TCP + TLS 接続を張るため、作成・更新は数十ms程度遅くなる可能性がある。頻度の低い操作なので許容範囲と判断。気になる場合は Hyperdrive を後続で検討する。
