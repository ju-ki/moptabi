# No.232 作成可能数等をユーザーごとで管理できるようにする 実装計画

Issue: https://github.com/ju-ki/moptabi/issues/232

## 1. 目的

- 定数（`APP_LIMITS` / `MAX_USER_LOCATIONS`）で一括管理している上限値を、ユーザーごとに DB で管理できるようにする
- 将来のサービス化（管理画面での上限変更など）に向けた基盤を整える
- 基本ユーザーの既定値を以下に変更する

| 項目 | 現状 | 変更後（基本ユーザー） |
| --- | --- | --- |
| 行きたいリストの最大登録数 | 100件 | 20件 |
| プランの最大作成数 | 20件 | 5件 |
| 1日あたりの最大スポット数 | 10件 | 5件 |
| プランの最大日数 | 7日 | 3日 |
| マイページの地点登録数（`MAX_USER_LOCATIONS`） | 5件 | 2件 |

- 既存データの移行は考慮しない（利用者が作者のみのため）
- 作者アカウントの上限引き上げは、データパッチファイルやリリース手順書への反映は行わず、実装時に SQL クエリを共有して手動で適用する
- 管理画面での上限編集 UI は本 Issue の対象外（後続対応）

## 2. 決定事項（レビューでの確認結果）

| # | 論点 | 決定 |
| --- | --- | --- |
| Q1 | 「マイページのプラン設定数」の対象 | `MAX_USER_LOCATIONS`（マイページの地点登録数）を 2件にする |
| Q2 | 上限の持ち方 | 別テーブル `UserLimit` で管理し、上限値はそのテーブルから判別する。新規ユーザー作成時に INSERT する |
| Q3 | データパッチ | パッチファイル・リリース手順書の更新は不要。実装時にクエリのみ共有する |
| Q4 | 上限取得 API のパス | `GET /api/user/limits` |
| Q5 | 更新時にプラン作成数チェックで弾かれる不具合 | 本 Issue で併せて修正する |
| Q6 | 上限判定の境界のずれ | backend（`count >= limit` で追加不可）が正。frontend を backend に合わせる |
| Q7 | 既に上限を超えているデータ | 閲覧は可能。保存時に backend で弾かれる挙動で良い |
| Q8 | ADMIN ロールの扱い | 一旦一般ユーザーと同一 |

## 3. 方針

- 上限値は新規テーブル `UserLimit`（`userId` を PK / FK）で保持する
- 新規ユーザー作成時（`backend/src/controllers/auth.ts` の `getAuthHandler`）に `DEFAULT_USER_LIMITS` の値で `UserLimit` を INSERT する
  - 既存ユーザー（作者のみ）には共有クエリで手動 INSERT する
  - `getUserLimits` は `UserLimit` が存在しない場合 `DEFAULT_USER_LIMITS` を返す（行が欠けていても基本ユーザーとして動くようにする防御）
- 既定値は `packages/shared-types` に `DEFAULT_USER_LIMITS` として 1 箇所に定義し、frontend / backend の重複定義（`APP_LIMITS` ×2、`MAX_USER_LOCATIONS` ×2）を解消する
- フロントは `GET /api/user/limits` から自分の上限を取得し、定数参照をすべて置き換える
- 上限エラーメッセージは上限値を引数に取る関数に変更する（現状はモジュール読み込み時に定数で文字列を確定しているため）
- 実装は TDD（Red → Green → Refactor）で進める。各ステップで「テストを書く → 失敗を確認 → 実装 → テスト成功 → リファクタ」の順に行う

## 4. TODO（TDD 順）

各ステップの観点番号は「5. テスト観点」を参照。

### Step 1. 共通型（packages/shared-types）

- [ ] 🔴 `UserLimitSchema` のスキーマテストを書く（観点 S-1〜S-3）
  - 置き場所: `backend/src/tests/schema/userLimit.spec.ts`（既存の `schema/userLocation.spec.ts` に倣う）
- [ ] 🟢 `packages/shared-types/src/user/schema.ts` に `UserLimitSchema` を追加
  - `maxWishlistSpots` / `maxPlans` / `maxSpotsPerDay` / `maxPlanDays` / `maxUserLocations`（すべて正の整数）
- [ ] 🟢 `packages/shared-types/src/user/types.ts` に `UserLimitType` と `DEFAULT_USER_LIMITS`（20 / 5 / 5 / 3 / 2）を追加
- [ ] 🟢 上限エラーメッセージ生成関数 `buildLimitErrorMessage(type, limit)` を shared-types に追加
- [ ] 🔵 `packages/shared-types/src/user/types.ts` の `MAX_USER_LOCATIONS = 5` を削除（参照箇所は後続 Step で置き換え）

### Step 2. DB（backend/src/db, backend/drizzle）

- [ ] 🟢 `backend/src/db/schema.ts` に `userLimit` テーブルを追加
  - `userId varchar(255) PK, FK -> User.id (onDelete: cascade)`
  - 上記 5 カラム（`integer notNull`）、`createdAt` / `updatedAt`
- [ ] 🟢 `bun run db:generate` でマイグレーション（`backend/drizzle/0016_add_user_limit.sql` 想定）を生成
- [ ] 🟢 `bun run db:push` / `bun run db:push:test` で dev / test DB に反映
- [ ] 🟢 `backend/src/tests/db-helper.ts` / `reset-test-db.ts` に `UserLimit` のクリーンアップと、テスト用に上限を設定するヘルパー（例: `upsertUserLimit(userId, partial)`）を追加
- [ ] 作者アカウント用の上限引き上げクエリを組み立ててスレッド / PR で共有する（ファイル化はしない。7-1 の雛形参照）
- [ ] `docs/DB設計書.md` に `UserLimit` テーブルを追記

### Step 3. Backend: 上限取得サービスと新規ユーザー作成時の INSERT

- [ ] 🔴 `backend/src/tests/userLimit.service.spec.ts` を作成（観点 B-1〜B-3）
- [ ] 🔴 `backend/src/tests/user.api.spec.ts` に新規ユーザー作成時の `UserLimit` INSERT のテストを追加（観点 B-4, B-5）
- [ ] 🟢 `backend/src/services/userLimit.ts` を新規作成
  - `getUserLimits(db, userId): Promise<UserLimitType>` … `UserLimit` を取得し、無ければ `DEFAULT_USER_LIMITS` を返す
  - `createDefaultUserLimit(db, userId)` … `DEFAULT_USER_LIMITS` で INSERT（`onConflictDoNothing`）
- [ ] 🟢 `backend/src/controllers/auth.ts` の `getAuthHandler` で、新規ユーザー INSERT 後に `createDefaultUserLimit` を呼ぶ（同一トランザクション）

### Step 4. Backend: 上限取得 API `GET /api/user/limits`

- [ ] 🔴 `backend/src/tests/userLimit.api.spec.ts` を作成（`describe('GET /api/user/limits')`、観点 B-6〜B-8）
- [ ] 🟢 `backend/src/routes/user.ts` を新規作成（`createRoute`、レスポンスは `UserLimitSchema`）
- [ ] 🟢 `backend/src/controllers/user.ts` を新規作成
- [ ] 🟢 `backend/src/index.ts` に `app.route('/user', userApp)` を追加
- [ ] `docs/API設計書.md` に新 API を追記

### Step 5. Backend: 既存の上限チェックを `UserLimit` 参照に置き換え

- [ ] 🔴 `backend/src/tests/limits.spec.ts` を書き換え（観点 B-9〜B-17）
  - `APP_LIMITS` 参照を `DEFAULT_USER_LIMITS` / `UserLimit` 設定値に置き換える
  - `UserLimit` 未登録 / 登録済み（既定値と異なる値）の両ケースを追加
  - 既存テスト「更新時も共通上限チェックにより、上限到達時は更新が拒否される」（`limits.spec.ts:270`）を「上限到達時でも既存プランは更新できる」に反転（Q5）
- [ ] 🔴 `backend/src/tests/userLocation.api.spec.ts` / `schema/userLocation.spec.ts` の上限 5 件前提を `UserLimit` 値に更新（観点 B-18, B-19）
- [ ] 🟢 `backend/src/services/limit.ts` の `validateLimit` を `getUserLimits` の値で判定するよう変更
  - 作成 / 更新を区別する引数（例: `{ isUpdate: boolean }`）を追加し、更新時（`backend/src/services/trip.ts:163`）はプラン作成数チェックをスキップ
- [ ] 🟢 `backend/src/services/wishlist.ts` の `getWishListCount` / `createWishList` を `getUserLimits` 参照に変更
- [ ] 🟢 `backend/src/controllers/trip.ts` の `getTripCount` の `limit` を `getUserLimits` 参照に変更
- [ ] 🟢 `backend/src/services/userLocation.ts:40` を `getUserLimits(...).maxUserLocations` 参照に変更
- [ ] 🔵 `backend/src/models/userLocation.ts` の `MAX_USER_LOCATIONS` を削除
- [ ] 🔵 `backend/src/constants/limits.ts` を削除（エラーメッセージは `buildLimitErrorMessage` へ移行）
- [ ] `bun run test` / `bun run typecheck` が通ること

### Step 6. Frontend: 判定ロジックと上限取得フック

- [ ] 🔴 `frontend/src/tests/lib/limits.spec.ts` を書き換え（観点 F-1〜F-3）
- [ ] 🔴 `frontend/src/tests/hooks/use-user-limits.spec.ts` を作成（観点 F-4, F-5）
- [ ] 🟢 `frontend/src/lib/limits.ts` の判定関数に `limit` 引数を追加し、判定を backend と同じ `current >= limit`（追加不可）に揃える（Q6）
  - `isWishlistLimitReached(current, limit)` / `isPlanLimitReached` / `isSpotsPerDayLimitReached`
  - `isPlanDaysLimitReached(days, limit)` は「日数が上限を超えているか」なので `days > limit` のまま（backend の `plans.length > MAX_PLAN_DAYS` と同じ）
  - `LIMIT_ERROR_MESSAGES` 定数 → `getLimitErrorMessage(type, limit)`（内部で `buildLimitErrorMessage` を使用）
- [ ] 🟢 `frontend/src/hooks/use-user-limits.ts` を新規作成（SWR で `GET /api/user/limits`、取得前は `DEFAULT_USER_LIMITS` をフォールバック）

### Step 7. Frontend: 画面の定数参照を置き換え

- [ ] 🔴 以下のテストを `UserLimit` 値（既定値とは異なる値）で検証するよう更新（観点 F-6〜F-13）
  - `frontend/src/tests/components/limits/SpotSelectionLimit.spec.tsx` / `LimitDisplay.spec.tsx`
  - `frontend/src/tests/components/mypage/UserLocationSection.spec.tsx`
  - `APP_LIMITS` を参照している `travel-plan/*.spec.tsx`、`hooks/use-planning.spec.ts`、`lib/plan.test.ts`、`lib/planning.spec.ts`
- [ ] 🟢 `frontend/src/data/constants.ts` の `APP_LIMITS` を削除し、以下の参照箇所を `useUserLimits()` の値に置き換え
  - [ ] `frontend/src/components/spot-selection/SpotSelectionDialog.tsx`
  - [ ] `frontend/src/components/DateRangePicker.tsx`（`maxDays` のデフォルト値を削除し、呼び出し側から渡す）
  - [ ] `frontend/src/components/CreatePlanButton.tsx`
  - [ ] `frontend/src/components/wishlist/SpotPreview.tsx`
  - [ ] `frontend/src/components/wishlist/Header.tsx`
  - [ ] `frontend/src/app/plan/create/page.tsx`
  - [ ] `frontend/src/app/plan/[id]/edit/page.tsx`
  - [ ] `frontend/src/app/plan/list/page.tsx`
- [ ] 🟢 `frontend/src/components/mypage/UserLocationSection.tsx` と `frontend/src/models/userLocation.ts` の `MAX_USER_LOCATIONS` を `useUserLimits().maxUserLocations` に置き換え
- [ ] 🔵 `frontend/src/hooks/use-mypage.ts:271-273` のフォールバック値（`20` / `100`）を `DEFAULT_USER_LIMITS` に置き換え
- [ ] `docs/pages/mypage.md` / `plan-create.md` / `plan-edit.md` / `plan-list.md` / `wishlist.md` の上限記述を更新
- [ ] `pnpm run test` / `pnpm run typecheck` が通ること

### Step 8. 仕上げ

- [ ] `grep -rn "APP_LIMITS\|MAX_USER_LOCATIONS" backend/src frontend/src packages` が 0 件
- [ ] `npm run lint` / `npm run format:check` / `npm run typecheck`
- [ ] 「7. 動作確認手順」を実施

## 5. テスト観点

### 5-1. 共通型（スキーマ）

| No. | 観点 | 期待結果 |
| --- | --- | --- |
| S-1 | 5 項目すべて正の整数 | パースに成功する |
| S-2 | いずれかが 0 / 負数 / 小数 / 文字列 | パースに失敗する |
| S-3 | 項目欠落 | パースに失敗する |

### 5-2. Backend

| No. | 対象 | 観点 | 期待結果 |
| --- | --- | --- | --- |
| B-1 | `getUserLimits` | `UserLimit` 登録済み | 登録値が返る |
| B-2 | `getUserLimits` | `UserLimit` 未登録 | `DEFAULT_USER_LIMITS` が返る |
| B-3 | `getUserLimits` | 他ユーザーの `UserLimit` のみ存在 | 他ユーザーの値ではなく既定値が返る |
| B-4 | `GET /api/auth`（新規ユーザー） | 初回ログイン | `User` と同時に `UserLimit` が既定値で作成される |
| B-5 | `GET /api/auth`（既存ユーザー） | 2 回目以降のログイン | `UserLimit` が重複作成・上書きされない |
| B-6 | `GET /api/user/limits` | 認証済み・`UserLimit` 登録済み | 200 と登録値 |
| B-7 | `GET /api/user/limits` | 認証済み・`UserLimit` 未登録 | 200 と既定値 |
| B-8 | `GET /api/user/limits` | 未認証 | 401 |
| B-9 | 行きたいリスト登録 | 件数 = 上限 − 1 | 登録できる |
| B-10 | 行きたいリスト登録 | 件数 = 上限 | 400 と上限値入りのエラーメッセージ |
| B-11 | 行きたいリスト件数取得 | - | `limit` がユーザーの上限値 |
| B-12 | プラン作成 | 作成数 = 上限 − 1 / = 上限 | 作成できる / 400 |
| B-13 | プラン更新 | 作成数 = 上限 | 更新できる（Q5 の修正） |
| B-14 | プラン件数取得 `GET /api/trips/count` | - | `limit` がユーザーの上限値 |
| B-15 | プラン作成・更新 | 日数 = 上限 / 上限 + 1 | 保存できる / 400 |
| B-16 | プラン作成・更新 | 1 日のスポット数 = 上限 / 上限 + 1 | 保存できる / 400 |
| B-17 | 既に上限を超えたプランの更新 | 日数が上限超過のまま保存 | 400（閲覧 `GET` は 200、Q7） |
| B-18 | 地点登録 | 件数 = 上限 − 1 / = 上限 | 登録できる / 400 |
| B-19 | 上限値の個別性 | ユーザー A（上限大）とユーザー B（既定値）で同件数 | A は登録でき、B は拒否される |

### 5-3. Frontend

| No. | 対象 | 観点 | 期待結果 |
| --- | --- | --- | --- |
| F-1 | `lib/limits.ts` 件数系判定 | `current = limit − 1` / `= limit` | `false` / `true`（backend と一致） |
| F-2 | `isPlanDaysLimitReached` | `days = limit` / `= limit + 1` | `false` / `true` |
| F-3 | `getLimitErrorMessage` | 任意の上限値 | 渡した上限値がメッセージに含まれる |
| F-4 | `useUserLimits` | API 応答あり | API の値が返る |
| F-5 | `useUserLimits` | 取得中 / エラー | `DEFAULT_USER_LIMITS` が返る |
| F-6 | `SpotSelectionDialog` | スポット数 = 上限 | 追加不可・上限メッセージに上限値が表示される |
| F-7 | `SpotSelectionDialog` | 残り 3 件以下 | 残り件数の警告が表示される |
| F-8 | `DateRangePicker` | 上限日数を超える範囲を選択 | 選択できない |
| F-9 | `CreatePlanButton` | 日数・スポット数超過 | トーストにユーザー上限値入りのメッセージ |
| F-10 | `SpotPreview` | 行きたいリスト件数 = 上限 | 追加時にトーストが出て API が呼ばれない |
| F-11 | `wishlist/Header` / `plan/list` / `plan/create` / `plan/[id]/edit` | - | `LimitDisplay` にユーザー上限値が表示される |
| F-12 | `UserLocationSection` | 件数 = 上限 − 1 / = 上限 | 追加ボタン活性 / 非活性、`n / 上限` 表示 |
| F-13 | `UsageStatus`（マイページ） | - | プラン数・行きたいリスト数の上限がユーザー上限値で表示される |

## 6. 完了条件

- 上限値が `APP_LIMITS` / `MAX_USER_LOCATIONS` 定数から参照されていない（`grep` で 0 件）
- 新規ユーザー作成時に `UserLimit` が基本ユーザー値（20 / 5 / 5 / 3 / 2）で作成される
- `UserLimit` の値でユーザーごとに制限され、画面表示（`LimitDisplay`、マイページ `UsageStatus`、地点登録、エラーメッセージ）にもその値が出る
- 上限ちょうどのユーザーでも既存プランを編集・保存できる
- frontend と backend の上限判定の境界が一致している
- 「5. テスト観点」がすべてテストで担保され、`bun run test` / `pnpm run test` が通る

## 7. 動作確認手順

### 7-1. 事前準備

```bash
cd "$(git rev-parse --show-toplevel)"
make up
cd backend && bun run db:push && bun run dev   # 別ターミナル
cd frontend && pnpm run dev                     # 別ターミナル
```

1. ブラウザで http://localhost:3000 にログインする
2. `bun run db:studio` もしくは psql で自分の `User.id` を確認する
3. 確認用に上限を小さく設定する（以下は雛形。確定版は実装時に共有）

```sql
-- 上限値を変更する（確認用。値は適宜変更）
INSERT INTO "UserLimit" ("userId", "maxWishlistSpots", "maxPlans", "maxSpotsPerDay", "maxPlanDays", "maxUserLocations")
VALUES ('<自分の User.id>', 2, 1, 2, 2, 1)
ON CONFLICT ("userId") DO UPDATE SET
  "maxWishlistSpots" = EXCLUDED."maxWishlistSpots",
  "maxPlans"         = EXCLUDED."maxPlans",
  "maxSpotsPerDay"   = EXCLUDED."maxSpotsPerDay",
  "maxPlanDays"      = EXCLUDED."maxPlanDays",
  "maxUserLocations" = EXCLUDED."maxUserLocations",
  "updatedAt"        = CURRENT_TIMESTAMP;
```

以下の確認は上記の値（行きたいリスト 2 / プラン 1 / スポット 2 / 日数 2 / 地点 1）を前提にする。

### 7-2. 上限取得 API

1. ログイン状態で http://localhost:8787/api/doc を開き、`GET /api/user/limits` を実行する
2. 7-1 で設定した値が返ることを確認する
3. `UserLimit` の行を削除して再実行し、既定値（20 / 5 / 5 / 3 / 2）が返ることを確認する（確認後、7-1 のクエリを再実行）

### 7-3. 新規ユーザー作成時の INSERT

1. 別アカウント（またはシークレットウィンドウ）で初回ログインする
2. `SELECT * FROM "UserLimit" WHERE "userId" = '<新規ユーザーの id>';` で既定値の行があることを確認する
3. 同じアカウントで再ログインし、行が 1 件のままであることを確認する

### 7-4. 行きたいリスト（`/wishlist`）

1. ヘッダーの上限表示が `n / 2` になっていることを確認する
2. スポットを 2 件まで登録できることを確認する
3. 3 件目を登録しようとするとトーストで「行きたいリストの登録上限（2件）に達しています」が表示され、登録されないことを確認する

### 7-5. プラン作成数（`/plan/list`, `/plan/create`）

1. `/plan/list` の上限表示が `n / 1` になっていることを確認する
2. プランを 1 件作成できることを確認する
3. 2 件目を作成しようとすると「プランの作成上限（1件）に達しています」で保存できないことを確認する
4. 1 件目のプランを `/plan/[id]/edit` で編集し、保存できることを確認する（Q5 の修正）

### 7-6. プラン日数・1 日あたりのスポット数（`/plan/create`, `/plan/[id]/edit`）

1. 日付選択で 3 日以上の範囲を選べないこと、上限表示が 2 日になっていることを確認する
2. 1 日にスポットを 2 件まで追加できることを確認する
3. 3 件目を追加しようとすると追加できず、「本日のスポット数が上限（2件）に達しています」が表示されることを確認する
4. 上限を超えたプランの保存確認（Q7）
   1. 7-1 のクエリで `maxPlanDays` を 7 に戻し、3 日のプランを保存する
   2. `maxPlanDays` を 2 に戻す
   3. そのプランの詳細画面が閲覧できることを確認する
   4. 編集画面から保存すると「プランの日数上限（2日）を超えています」で弾かれることを確認する

### 7-7. マイページ（`/mypage`）

1. 利用状況（`UsageStatus`）のプラン数・行きたいリスト数の上限が 1 / 2 で表示されることを確認する
2. 地点登録の表示が `n / 1` になっていることを確認する
3. 地点を 1 件登録すると追加ボタンが非活性になることを確認する

### 7-8. 後片付け

- 7-1 のクエリで自分の上限を元に戻す（作者用の値は実装時に共有するクエリを使う）
