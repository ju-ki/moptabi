# No.398 初回アクセス時に、謎の500エラーが多発する 実装計画

## 1. 事象

- Cloudflare 環境で、初回アクセス時に `trips` が絡む画面・API で 500 エラーが多発する。
- ローカル環境では再現しない。
- issue #345（transport / nearestStation の持ち方変更）以降のバックエンド変更が関連している可能性が高い。

## 2. 調査結果

### 2-1. trips 関連の API だけ DB 取得経路が異なる

- `backend/src/controllers/trip.ts`
  - `getTrips` / `createTrip` / `updateTrip` が `getPostgresDb(c)` を使用している。
  - `getTripDetail` / `deleteTrip` / `getTripCount` は `getDbFromContext(c)` を使用している。
- `backend/src/db/index.ts`
  - `getDbFromContext(c)` は Cloudflare Workers では `createDbForWorkers()`（`drizzle-orm/neon-http`）を使う。
  - 一方 `getPostgresDb(c)` は `c.env.DATABASE_URL` がある場合でも `createDevDb()` を返し、`pg` + `drizzle-orm/node-postgres` を使う。

### 2-2. Cloudflare だけ失敗し、ローカルで失敗しない説明がつく

- ローカルや既存 backend テストは `createDevDb()` ベースで動くため、`pg` 経路の不整合を検出しにくい。
- Cloudflare Workers では、同じ backend 内でも大半の API は `getDbFromContext()` 経由で Worker 向け DB ドライバを使う。
- そのため **trips 関連 API だけが Cloudflare 実行環境との差分を持つ** 状態になっている。

### 2-3. 500 エラーになるまでの経路

#### `GET /trips` の場合

1. `backend/src/controllers/trip.ts` の `getTrips()` は `getPostgresDb(c)` を呼ぶ。
2. `backend/src/db/index.ts` の `getPostgresDb(c)` は、`c.env.DATABASE_URL` がある Cloudflare 実行環境でも `createDevDb(c.env.DATABASE_URL)` を返す。
3. `createDevDb()` は `pg` の `Pool` を生成し、`db.query.trip.findMany(...)` 実行時にその接続経路を使う。
4. この例外は `getTrips()` 内では捕捉されず、`backend/src/index.ts` の `app.onError()` に到達する。
5. `app.onError()` は `HTTPException` 以外をそのまま 500 として返すため、結果としてクライアントからは「謎の 500」に見える。

#### `POST /trips/create` / `PATCH /trips/:id` の場合

1. `createTrip()` / `updateTrip()` も同じく `getPostgresDb(c)` を使うため、まず `GET /trips` と同じ DB 接続経路の問題を引き継ぐ。
2. 加えて `backend/src/services/trip.ts` では `db.transaction(...)` を前提にしているため、Cloudflare 向けの HTTP ドライバへ単純に切り替えるだけでも別の失敗要因が残る。
3. つまり trips 系は
   - **現状の `pg` 経路のままだと Cloudflare 実行環境で 500 化しうる**
   - **Worker 向け HTTP 経路へ寄せても transaction 戦略が未整理だと別要因で失敗しうる**
   という二段構えの問題を持っている。

### 2-4. issue #345 / PR #362 との関連

- issue #345 を閉じた PR は `#362 feature345 transportとnearestStationの持ち方変更`。
- PR #362 の差分上、`backend/src/controllers/trip.ts` で以下の変更が入っている。
  - `getTrips: getDbFromContext(c) -> getPostgresDb(c)`
  - `createTrip: getPostgresDb(c)` を利用
  - `updateTrip: getPostgresDb(c)` を利用
- つまり、今回の症状と一致する trips 系 API の DB 接続経路変更が issue #345 対応で入っている。

## 3. 最有力の根本原因

- **trips 系 API が Cloudflare Workers 上でも `pg` / `node-postgres` 側の DB 接続経路を通っていること** が最有力原因。
- 現状の設計では、Cloudflare Workers では `getDbFromContext()` に寄せて `neon-http` 経由で扱う前提になっているが、trips 系 API だけ例外になっている。
- その結果、`GET /trips` では **`getPostgresDb()` で解決した `pg` 経路の例外が未捕捉のまま `app.onError()` に流れ、500 になる**。
- `POST /PATCH` では同じ経路問題に加えて transaction 前提実装も残っているため、一覧より修正難易度が高い。

## 4. 「初回アクセスで多発」に見える理由

- `frontend/src/hooks/use-mypage.ts` では初回表示時に以下を並列取得する。
  - `/trips`
  - `/trips/count`
  - `/wishlist`
  - `/wishlist/count`
  - `/userLocation`
- このうち `/trips` だけが `getPostgresDb()` 経由のため、マイページ初回表示では trips 起点の 500 が混ざって見えやすい。
- `frontend/src/app/plan/list/page.tsx` も初回表示で `/trips` を叩くため、同系統の 500 が起きうる。

## 5. 既存テストで検出できなかった理由

- `backend/src/tests/trip.service.spec.ts` など既存 backend テストは `createDevDb(process.env.DATABASE_URL!)` を使用しており、ローカル相当の DB 経路しか通らない。
- そのため、**Cloudflare Workers 実行時だけ trips 系 API が別ドライバを通る差分** を検出できていない。
- 既存テストには `getPostgresDb()` / `getDbFromContext()` の使い分けを環境別に検証する回帰テストがない。

## 6. 最小修正方針

### 方針A（第一候補）

- trips 系 controller の DB 取得を Cloudflare 実行環境でも安全な経路へ統一する。
- 具体的には、`backend/src/controllers/trip.ts` の `getTrips` / `createTrip` / `updateTrip` で使う DB 解決方法を見直し、Worker 環境では `getDbFromContext()` 側に寄せる。

### 方針B（要追加検討）

- `createTrip` / `updateTrip` で transaction が必要な場合、Cloudflare での transaction 戦略を整理する。
- 現在 `createTrip` には `No transactions support in neon-http driver` を前提とした catch があり、ここが別設計を必要としている可能性がある。
- そのため、単純な差し替えだけでなく、**一覧取得 (`GET /trips`) と作成・更新 (`POST /trips/create`, `PATCH /trips/:id`) を分けて修正可否を判断する**。

## 7. 実装対象（予定）

### 7-1. 実装

- `backend/src/controllers/trip.ts`
  - trips 系各 handler の DB 取得戦略見直し
- `backend/src/db/index.ts`
  - 必要なら Cloudflare / local / test の DB 解決責務を整理
- `backend/src/services/trip.ts`
  - transaction 前提処理を Worker 対応方針に合わせて整理

### 7-2. テスト

- `backend/src/tests/trip.service.spec.ts`
  - trips 作成・更新・一覧取得の既存テスト拡張
- 必要に応じて新規テスト
  - `backend/src/tests/trip.controller.spec.ts` もしくは同等の API テスト
  - DB 解決関数の環境差分を検証する単体テスト

## 8. テスト実装計画

### 8-1. 優先度高

1. **`GET /trips` が Cloudflare 用 DB 経路で動くことを保証するテスト**
   - `getTrips` が Worker 向け経路を使うことを検証する。
   - 少なくとも `getPostgresDb()` に依存しないことを回帰として固定する。

2. **`GET /trips/count` と同種の環境差分がないことを比較できるテスト**
   - 既に正常系の `getTripCount` と同じ文脈で trips 一覧取得が動くことを確認する。

3. **Cloudflare 想定コンテキストで trips API が 500 を返さないことを確認する API テスト**
   - `c.env.DATABASE_URL` が存在する条件を再現し、一覧 API が内部例外にならないことを確認する。

### 8-2. 優先度中

4. **`POST /trips/create` の Worker 実行時の振る舞い確認**
   - transaction の扱いに応じて、成功させるのか、明示的な制約として扱うのかを固定する。
   - 少なくとも意図しない 500 が発生しないようにする。

5. **`PATCH /trips/:id` の Worker 実行時の振る舞い確認**
   - 作成と同じ DB 解決戦略で破綻しないことを確認する。

## 9. 実装時の確認手順

1. backend の対象テストを実行
   - `npm --prefix backend run test -- trip`
   - 必要に応じて個別 spec を絞る
2. `pnpm run wrangler:dev` / `npm --prefix backend run wrangler:dev` で Cloudflare 相当の挙動を確認
3. 初回アクセス導線として以下を重点確認
   - マイページ
   - プラン一覧
   - trips 作成・更新導線

## 10. 今回の調査結論

- 現時点では、**issue #345 対応で trips 系 API に導入された `getPostgresDb()` 利用が、Cloudflare 環境限定 500 の最有力原因** と判断する。
- 修正時は `GET /trips` を最優先で回帰テスト化し、その後に `POST` / `PATCH` の transaction 方針を切り分けて詰めるのが最小変更になる。
