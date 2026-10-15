# No.232 動作確認手順書

Issue: https://github.com/ju-ki/moptabi/issues/232  
対象ブランチ: `feature232`

---

## 概要

ユーザーごとの上限値を `UserLimit` テーブルで管理するようにした変更の動作確認。  
従来の定数（`APP_LIMITS` / `MAX_USER_LOCATIONS`）が撤廃され、DB 上の値で制御されることを確認する。

---

## 境界値早見表

| 項目 | 判定式 | 上限ちょうど（count = limit） | 上限+1 |
|------|--------|------------------------------|--------|
| 行きたいリスト登録 | `count >= limit` | **NG**（追加不可） | NG |
| プラン作成 | `count >= limit` | **NG**（作成不可） | NG |
| プラン更新 | チェックなし | **OK**（更新可・Q5修正） | OK |
| プラン日数・保存 | `length > limit` | **OK**（`limit` 日は保存可） | NG |
| スポット数/日・ダイアログ追加 | `count >= limit` | **NG**（追加ボタン無効化） | NG |
| スポット数/日・保存（backend） | `length > limit` | **OK**（`limit` 件は保存可） | NG |
| スポット数/日・保存（frontend） | `count >= limit` ← **⚠️ バグ** | **NG**（`CreatePlanButton` が弾く） | NG |
| 地点登録 | `count >= limit` | **NG**（追加不可） | NG |

> **スポット数/日のバグ**: `CreatePlanButton.tsx:99` が `isSpotsPerDayLimitReached`（`>=`）でチェックしているため、  
> スポット数がちょうど `maxSpotsPerDay` のとき frontend が保存を拒否する。  
> backend は `spots.length > limit`（`>`）なので上限ちょうどは保存可能。設計意図（B-16）も「= 上限 → 保存できる」。  
> → `CreatePlanButton.tsx:99` の判定を `actualSpotCount > limits.maxSpotsPerDay` に修正する必要がある。

---

## 1. 事前準備

### 1-1. 環境起動

```bash
cd "$(git rev-parse --show-toplevel)"
make up
# 別ターミナル1
cd backend && bun run db:push && bun run dev
# 別ターミナル2
cd frontend && pnpm run dev
```

### 1-2. テスト実行（実装の健全性確認）

```bash
# backend
cd backend && bun run test

# frontend
cd frontend && pnpm run test
```

すべてパスすることを確認する。

### 1-3. 確認用上限値の設定

1. ブラウザで http://localhost:3000 にログインする
2. `bun run db:studio` または psql で自分の `User.id` を確認する
3. 以下の SQL を実行して確認用の小さい上限値を設定する

```sql
-- 確認用上限値（行きたいリスト: 2 / プラン: 1 / スポット: 2 / 日数: 2 / 地点: 1）
INSERT INTO "UserLimit" ("userId", "maxWishlistSpots", "maxPlans", "maxSpotsPerDay", "maxPlanDays", "maxUserLocations", "createdAt", "updatedAt")
VALUES ('<自分の User.id>', 2, 1, 2, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("userId") DO UPDATE SET
  "maxWishlistSpots" = EXCLUDED."maxWishlistSpots",
  "maxPlans"         = EXCLUDED."maxPlans",
  "maxSpotsPerDay"   = EXCLUDED."maxSpotsPerDay",
  "maxPlanDays"      = EXCLUDED."maxPlanDays",
  "maxUserLocations" = EXCLUDED."maxUserLocations",
  "updatedAt"        = CURRENT_TIMESTAMP;
```

以降の確認は上記の値（行きたいリスト 2 / プラン 1 / スポット 2 / 日数 2 / 地点 1）を前提とする。

---

## 2. 上限取得 API（`GET /api/user/limits`）

| # | 操作 | 期待結果 |
|---|------|----------|
| 2-1 | ログイン状態で http://localhost:8787/api/doc を開き `GET /api/user/limits` を実行 | 1-3 で設定した値（2 / 1 / 2 / 2 / 1）が JSON で返る |
| 2-2 | `DELETE FROM "UserLimit" WHERE "userId" = '<自分のid>';` を実行してから再度 API を叩く | 既定値（maxWishlistSpots: 20 / maxPlans: 5 / maxSpotsPerDay: 5 / maxPlanDays: 3 / maxUserLocations: 2）が返る |
| 2-3 | 1-3 のクエリを再実行してから未認証状態（Cookie なし）で API を叩く | 401 が返る |

確認後、1-3 のクエリを再実行して確認用上限値を復元すること。

---

## 3. 新規ユーザー作成時の `UserLimit` 自動 INSERT

| # | 操作 | 期待結果 |
|---|------|----------|
| 3-1 | 別アカウント（またはシークレットウィンドウ）で初回ログイン | `SELECT * FROM "UserLimit" WHERE "userId" = '<新規ユーザーの id>';` で既定値の行が 1 件存在する |
| 3-2 | 同じアカウントで再ログイン（2 回目） | `UserLimit` の行が増えず 1 件のまま |

---

## 4. 行きたいリスト（`/wishlist`）

| # | 操作 | 期待結果 |
|---|------|----------|
| 4-1 | `/wishlist` を開く | ヘッダーの上限表示が `n / 2` |
| 4-2 | スポットを 1 件登録する | 登録できる、表示が `1 / 2` に更新される |
| 4-3 | もう 1 件登録する | 登録できる、表示が `2 / 2` に更新される |
| 4-4 | 3 件目を登録しようとする | トーストに「行きたいリストの登録上限（2件）に達しています」が表示され、登録されない |

---

## 5. プラン作成数（`/plan/list`、`/plan/create`）

| # | 操作 | 期待結果 |
|---|------|----------|
| 5-1 | `/plan/list` を開く | 上限表示が `n / 1` |
| 5-2 | プランを 1 件作成する | 作成できる |
| 5-3 | 2 件目を作成しようとする | 「プランの作成上限（1件）に達しています」で保存できない |
| 5-4 | 5-2 で作成したプランを `/plan/[id]/edit` で編集して保存する | 保存できる（上限ちょうどでも更新は可能：Q5 の修正確認） |

---

## 6. プラン日数・1 日あたりのスポット数（`/plan/create`、`/plan/[id]/edit`）

### 6-1. 日付選択の上限（maxPlanDays: 2）

| # | 操作 | 期待結果 |
|---|------|----------|
| 6-1-1 | 日付選択（DateRangePicker）を開く | 上限表示が 2 日になっている |
| 6-1-2 | 連続 3 日以上の日付範囲を選択しようとする | 選択できない（3 日目以降がグレーアウト等で選択不可） |
| 6-1-3 | 2 日以内の範囲を選択する | 選択できる |

### 6-2. 1 日あたりのスポット数（maxSpotsPerDay: 2）

> **判定ロジックの注意**  
> - ダイアログ追加: `isSpotsPerDayLimitReached` = `currentCount >= limit`（`>=`）  
>   → count が limit になった時点でダイアログ内の追加をブロック。count = limit まで追加可能。  
> - 保存（backend）: `spots.length > limit`（`>`）→ count = limit でも保存可。  
> - 保存（frontend CreatePlanButton）: `isSpotsPerDayLimitReached` = `>=` → **count = limit のとき保存もブロック（バグ）**。

| # | 操作 | 期待結果 |
|---|------|----------|
| 6-2-1 | プラン編集でスポットを 1 日に 1 件追加する | 追加できる（count=1 < limit=2） |
| 6-2-2 | さらに 1 件追加して合計 2 件にする | 追加できる（count=1 → 2 = limit。追加直後にダイアログが警告表示に切り替わる） |
| 6-2-3 | **⚠️ バグ確認** 2 件（= 上限）の状態で保存しようとする | **現状は frontend が `>=` チェックで弾いて保存できない**（設計意図 B-16 と不一致）。`CreatePlanButton.tsx:99` の修正後は保存できることを確認する |
| 6-2-4 | 3 件目を追加しようとする | 追加できない。ダイアログ内に「本日のスポット数が上限（2件）に達しています」が表示される |
| 6-2-5 | スポット 1 件（= 上限 - 1）の状態で保存する | 保存できる（count=1 < limit=2） |

### 6-3. 上限超過プランの編集（Q7 の確認）

| # | 操作 | 期待結果 |
|---|------|----------|
| 6-3-1 | `maxPlanDays` を 7 に一時変更して 3 日のプランを保存する | 保存できる |
| 6-3-2 | `maxPlanDays` を 2 に戻す | - |
| 6-3-3 | 6-3-1 のプランの詳細画面（`GET /api/trips/:id`）を開く | 閲覧できる（200） |
| 6-3-4 | 編集画面から保存する | 「プランの日数上限（2日）を超えています」で弾かれる（400） |

---

## 7. マイページ（`/mypage`）

| # | 操作 | 期待結果 |
|---|------|----------|
| 7-1 | `/mypage` を開く | 利用状況（UsageStatus）のプラン数上限が `1`、行きたいリスト上限が `2` で表示される |
| 7-2 | 地点登録エリアを確認する | 表示が `n / 1` |
| 7-3 | 地点を 1 件登録する | 追加ボタンが非活性になる |

---

## 8. 上限値の個別性確認（オプション）

別ユーザーを用意できる場合のみ実施する。

| # | 操作 | 期待結果 |
|---|------|----------|
| 8-1 | ユーザー A（上限 5）とユーザー B（上限 2）で同じ 3 件を登録する | A は登録できる、B は 3 件目で拒否される |

---

## 9. 後片付け

動作確認完了後、以下のクエリで自分の上限値を作者用に戻す（値は実装時に共有されたものを使う）。

```sql
-- 作者用の上限値に戻す（値は適宜変更）
UPDATE "UserLimit"
SET
  "maxWishlistSpots" = <作者用の値>,
  "maxPlans"         = <作者用の値>,
  "maxSpotsPerDay"   = <作者用の値>,
  "maxPlanDays"      = <作者用の値>,
  "maxUserLocations" = <作者用の値>,
  "updatedAt"        = CURRENT_TIMESTAMP
WHERE "userId" = '<自分の User.id>';
```

---

## 10. チェックリスト（完了条件）

- [ ] `bun run test`（backend）がすべてパス
- [ ] `pnpm run test`（frontend）がすべてパス
- [ ] `npm run typecheck` がエラーなし
- [ ] `grep -rn "APP_LIMITS\|MAX_USER_LOCATIONS" backend/src frontend/src packages/shared-types/src` が 0 件
- [ ] セクション 2〜7 の全確認項目が期待結果と一致
- [ ] **バグ修正**: `frontend/src/components/CreatePlanButton.tsx:99` の判定を `actualSpotCount > limits.maxSpotsPerDay` に変更し、上限ちょうど（2件）でも保存できることを確認（6-2-3）
