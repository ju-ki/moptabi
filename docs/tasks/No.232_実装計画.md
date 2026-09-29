# No.232 作成可能数等をユーザーごとで管理できるようにする 実装計画

Issue: https://github.com/ju-ki/moptabi/issues/232

## 1. 目的

- 定数（`APP_LIMITS` / `MAX_USER_LOCATIONS`）で一括管理している上限値を、ユーザーごとに DB で管理できるようにする
- 将来のサービス化（プラン別上限・管理画面での上限変更）に向けた基盤を整える
- 基本ユーザーの既定値を以下に変更する

| 項目 | 現状 | 変更後（基本ユーザー） |
| --- | --- | --- |
| 行きたいリストの最大登録数 | 100件 | 20件 |
| プランの最大作成数 | 20件 | 5件 |
| 1日あたりの最大スポット数 | 10件 | 5件 |
| プランの最大日数 | 7日 | 3日 |
| マイページの地点登録数（`MAX_USER_LOCATIONS`） | 5件 | 2件 ※疑問点 Q1 |

- 既存データの移行は考慮しない（利用者が作者のみのため）。作者分の上限はデータパッチで引き上げる
- 管理画面での上限編集 UI は本 Issue の対象外（後続対応）

## 2. 方針

- 上限値は新規テーブル `UserLimit`（`userId` を PK / FK）で保持する
- レコードが存在しないユーザーは **既定値（基本ユーザー値）** を使う。これにより新規ユーザー作成時の INSERT や既存ユーザーの移行が不要になる ※疑問点 Q2
- 既定値は `packages/shared-types` に `DEFAULT_USER_LIMITS` として 1 箇所に定義し、frontend / backend の重複定義（`APP_LIMITS` ×2、`MAX_USER_LOCATIONS` ×2）を解消する
- フロントは新設 API `GET /api/user/limits` から自分の上限を取得し、定数参照をすべて置き換える
- 上限エラーメッセージは上限値を引数に取る関数に変更する（現状はモジュール読み込み時に定数で文字列を確定しているため）

## 3. TODO

### 3-1. 共通型（packages/shared-types）

- [ ] `packages/shared-types/src/user/schema.ts` に `UserLimitSchema` を追加
  - `maxWishlistSpots` / `maxPlans` / `maxSpotsPerDay` / `maxPlanDays` / `maxUserLocations`（すべて正の整数）
- [ ] `packages/shared-types/src/user/types.ts` に `UserLimitType` と `DEFAULT_USER_LIMITS`（20 / 5 / 5 / 3 / 2）を追加
- [ ] 同ファイルの `MAX_USER_LOCATIONS = 5` を削除し、`DEFAULT_USER_LIMITS.maxUserLocations` に置き換え
- [ ] 上限エラーメッセージ生成関数 `buildLimitErrorMessage(type, limit)` を shared-types に置き、frontend / backend 双方で使う

### 3-2. DB（backend/src/db, backend/drizzle）

- [ ] `backend/src/db/schema.ts` に `userLimit` テーブルを追加
  - `userId varchar(255) PK, FK -> User.id (onDelete: cascade)`
  - 上記 5 カラム（`integer notNull`）、`createdAt` / `updatedAt`
- [ ] `bun run db:generate` でマイグレーション（`backend/drizzle/0016_add_user_limit.sql` 想定）を生成
- [ ] `bun run db:push` / `bun run db:push:test` で dev / test DB に反映
- [ ] 作者アカウント用のデータパッチ SQL を用意（例: `backend/drizzle/patches/No.232_owner_user_limit.sql`、`INSERT ... ON CONFLICT DO UPDATE`）。staging / production への適用手順を `docs/リリース手順書.md` に追記 ※疑問点 Q3
- [ ] `docs/DB設計書.md` に `UserLimit` テーブルを追記

### 3-3. Backend（backend/src）

- [ ] `backend/src/services/userLimit.ts` を新規作成
  - `getUserLimits(db, userId): Promise<UserLimitType>` … `UserLimit` を取得し、無ければ `DEFAULT_USER_LIMITS` を返す
- [ ] `backend/src/services/limit.ts` の `validateLimit` を `getUserLimits` の値で判定するよう変更
  - [ ] 更新時（`backend/src/services/trip.ts:163`）はプラン作成数チェックをスキップする（現状、上限ちょうどの時に既存プランを編集できない）※疑問点 Q5
- [ ] `backend/src/services/wishlist.ts` の `getWishListCount` / `createWishList` を `getUserLimits` 参照に変更
- [ ] `backend/src/controllers/trip.ts` の `getTripCount` の `limit` を `getUserLimits` 参照に変更
- [ ] `backend/src/services/userLocation.ts:40` を `getUserLimits(...).maxUserLocations` 参照に変更
- [ ] `backend/src/models/userLocation.ts` の `MAX_USER_LOCATIONS` を削除
- [ ] `backend/src/constants/limits.ts` を削除（エラーメッセージは 3-1 の関数へ移行）
- [ ] 自分の上限を返す API を追加
  - `backend/src/routes/auth.ts` に `GET /api/auth/limits`（または新規 `routes/userLimit.ts` で `GET /api/user/limits`）※疑問点 Q4
  - controller を `backend/src/controllers/auth.ts`（または新規 `controllers/userLimit.ts`）に追加
  - `backend/src/index.ts` にルート登録
- [ ] `docs/API設計書.md` に新 API を追記

### 3-4. Frontend（frontend/src）

- [ ] `frontend/src/hooks/use-user-limits.ts` を新規作成（SWR で `GET` 上限 API を取得、取得前は `DEFAULT_USER_LIMITS` をフォールバック）
- [ ] `frontend/src/lib/limits.ts` の各判定関数に `limit` 引数を追加し、`APP_LIMITS` 参照を除去 ※疑問点 Q6
  - `isWishlistLimitReached(current, limit)` / `isPlanLimitReached` / `isSpotsPerDayLimitReached` / `isPlanDaysLimitReached`
  - `LIMIT_ERROR_MESSAGES` 定数 → `getLimitErrorMessage(type, limit)` に変更
- [ ] `frontend/src/data/constants.ts` の `APP_LIMITS` を削除し、以下の参照箇所を `useUserLimits()` の値に置き換え
  - [ ] `frontend/src/components/spot-selection/SpotSelectionDialog.tsx`
  - [ ] `frontend/src/components/DateRangePicker.tsx`（`maxDays` のデフォルト値。呼び出し側から渡す）
  - [ ] `frontend/src/components/CreatePlanButton.tsx`
  - [ ] `frontend/src/components/wishlist/SpotPreview.tsx`
  - [ ] `frontend/src/components/wishlist/Header.tsx`
  - [ ] `frontend/src/app/plan/create/page.tsx`
  - [ ] `frontend/src/app/plan/[id]/edit/page.tsx`
  - [ ] `frontend/src/app/plan/list/page.tsx`
- [ ] `frontend/src/components/mypage/UserLocationSection.tsx` と `frontend/src/models/userLocation.ts` の `MAX_USER_LOCATIONS` を `useUserLimits().maxUserLocations` に置き換え
- [ ] `frontend/src/hooks/use-mypage.ts:271-273` のフォールバック値（`20` / `100`）を `DEFAULT_USER_LIMITS` に置き換え
- [ ] `docs/pages/mypage.md` / `plan-create.md` / `plan-edit.md` / `plan-list.md` / `wishlist.md` の上限記述を更新

### 3-5. テスト

- [ ] Backend
  - [ ] `backend/src/tests/limits.spec.ts` を「`UserLimit` 未登録 → 既定値」「`UserLimit` 登録済み → その値」の両ケースに拡張
  - [ ] `backend/src/tests/schema/userLocation.spec.ts` の上限 5 件前提を 2 件（または `UserLimit` 値）に更新
  - [ ] 上限取得 API のテストを追加（`describe('GET /api/...')`）
  - [ ] 更新時にプラン作成数上限で弾かれないことのテストを追加（Q5 の結論次第）
- [ ] Frontend
  - [ ] `frontend/src/tests/lib/limits.spec.ts` を引数追加に合わせて更新
  - [ ] `frontend/src/tests/components/limits/SpotSelectionLimit.spec.tsx` / `LimitDisplay.spec.tsx`
  - [ ] `frontend/src/tests/components/mypage/UserLocationSection.spec.tsx`
  - [ ] `APP_LIMITS` を参照している `travel-plan/*.spec.tsx`、`hooks/use-planning.spec.ts`、`lib/plan.test.ts`、`lib/planning.spec.ts` を修正
- [ ] `bun run test` / `pnpm run test` が通ること
- [ ] 最後に `npm run lint` / `npm run format:check` / `npm run typecheck`

## 4. 完了条件

- 上限値が `APP_LIMITS` / `MAX_USER_LOCATIONS` 定数から参照されていない（`grep` で 0 件）
- `UserLimit` 未登録ユーザーは基本ユーザー値（20 / 5 / 5 / 3 / 2）で制限される
- `UserLimit` を登録したユーザーは登録値で制限され、画面表示（`LimitDisplay`、マイページ `UsageStatus`、エラーメッセージ）にもその値が出る
- 作者アカウントはデータパッチ適用後、現状と同等以上の上限で利用できる

## 5. 疑問点・確認事項

- **Q1. 「マイページのプラン設定数 2件」は何を指すか**
  マイページで登録できる地点（`UserLocation`、現状 `MAX_USER_LOCATIONS = 5`）の上限を 2 件にする、という理解で計画しています。別の機能（例: マイページで固定表示するプラン数）を指す場合は計画を修正します。
- **Q2. 上限の持ち方**
  新規テーブル `UserLimit`（未登録なら既定値）を推奨しています。代替案は `User` テーブルにカラム追加、または「プラン（Free / Pro 等）テーブル + ユーザーへの紐付け」です。将来のサービス化で「プラン単位で上限を変える」想定が強いなら後者の方が自然なので、方向性を確認させてください。
- **Q3. データパッチの管理方法**
  作者アカウントの上限引き上げを SQL ファイルでリポジトリに残すか、手動実行のみにするか。残す場合の置き場所（`backend/drizzle/patches/` 案）とパッチ適用後の値（現状値 100 / 20 / 10 / 7 / 5 で良いか）を確認したいです。
- **Q4. 上限取得 API のパス**
  既存の `routes/auth.ts` 配下に `/api/auth/limits` として追加するか、`/api/user/limits` 用に新規ルートを切るか。
- **Q5. 既存の不具合らしき挙動**
  `backend/src/services/trip.ts:163` の更新処理でも `validateLimit` が「作成数 >= 上限」を判定しているため、プラン数が上限ちょうどのユーザーは既存プランを編集できません。上限が 5 件に下がると顕在化しやすいため、本 Issue で合わせて修正する前提にしています。
- **Q6. 上限値超過時のフロント判定の基準**
  `frontend/src/lib/limits.ts` の `isXxxLimitReached` は `current > limit`、backend（wishlist / プラン作成数）は `count >= limit` で判定しており境界がずれています。例えば `SpotSelectionDialog.tsx:37` や `SpotPreview.tsx:55` では上限ちょうどでも追加操作が可能に見え、backend で初めて弾かれます。今回の引数追加に合わせて「追加操作の判定は `>=`、保存時の件数判定は `>`」のように揃える前提ですが、現状維持が良ければ教えてください。
- **Q7. 既に上限を超えているデータの扱い**
  移行は考慮しない前提ですが、上限を下げた結果「既存プランが 3 日超」「行きたいリストが 20 件超」のユーザーが編集・閲覧時にどう振る舞うべきか（閲覧は可・保存時のみエラー、で良いか）。
- **Q8. ADMIN ロールの扱い**
  `User.role` に `ADMIN` があるため、ADMIN は上限なし（または別既定値）にするか。現状計画では ADMIN も `UserLimit` / 既定値で同様に扱います。
