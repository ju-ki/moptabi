# AI旅行計画プランナー DB設計書

## 概要
AI旅行計画プランナーのデータベース設計書です。PostgreSQLを使用し、Drizzle ORMで管理されています。

## データベース情報
- **DBMS**: PostgreSQL
- **ORM**: Drizzle ORM
- **接続文字列**: `postgresql://travel_user:travel_admin@dev-db:5432/ai_travel`

## ER図

```
User (1)
 ├─< Trip (1:N)
 │    └─< Plan (1:N)
 │         ├─< PlanSpot (1:N)
 │         │    └─ PlanSpotNearestStation (1:1)
 │         └─< PlanLocation (1:N)
 │              └─ PlanLocationNearestStation (1:1)
 ├─< Wishlist (1:N)
 ├─< UserNotification (1:N) >─ Notification (1)
 └─< UserLocation (1:N)
      └─ UserLocationNearestStation (1:1)
```

## テーブル詳細

### 1. User（ユーザー）
**目的**: アプリケーションのユーザー情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | VARCHAR(255) | PRIMARY KEY | ユーザーID（Clerkから取得） |
| role | RoleType | NOT NULL, DEFAULT 'USER' | ロール（ADMIN / USER / GUEST） |
| email | VARCHAR(255) | NULL | メールアドレス |
| image | VARCHAR(500) | NULL | プロフィール画像URL |
| name | VARCHAR(255) | NULL | 表示名 |
| lastLoginAt | TIMESTAMP | NULL | 最終ログイン日時 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**リレーション**:
- Trip (1:N)
- Wishlist (1:N)
- UserNotification (1:N)
- UserLocation (1:N)
- PlanLocation (1:N)

---

### 2. Trip（旅行）
**目的**: 旅行プランの基本情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 旅行ID |
| title | VARCHAR(50) | NOT NULL | 旅行タイトル |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| imageUrl | VARCHAR(255) | NULL | 画像URL |
| startDate | VARCHAR(10) | NOT NULL | 開始日（YYYY-MM-DD） |
| endDate | VARCHAR(10) | NOT NULL | 終了日（YYYY-MM-DD） |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**リレーション**:
- User (N:1)
- Plan (1:N)

---

### 3. Plan（プラン）
**目的**: 日別のプラン情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランID |
| tripId | INTEGER | NOT NULL, FK | 旅行ID |
| date | VARCHAR(10) | NOT NULL | 日付（YYYY-MM-DD） |
| memo | TEXT | NULL | メモ |

**リレーション**:
- Trip (N:1)
- PlanSpot (1:N)
- PlanLocation (1:N)

---

### 4. PlanSpot（プランスポット）
**目的**: プランに含まれるスポット情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランスポットID |
| planId | INTEGER | NOT NULL, FK | プランID |
| spotId | TEXT | NOT NULL | スポットID（Google Place ID） |
| memo | TEXT | NULL | メモ |
| order | INTEGER | NOT NULL, DEFAULT 0 | 表示順序 |
| stayStart | VARCHAR(5) | NOT NULL | 滞在開始時間（HH:MM） |
| stayEnd | VARCHAR(5) | NOT NULL | 滞在終了時間（HH:MM） |
| stayDuration | INTEGER | NOT NULL | 滞在時間（分単位） |
| transportMethodId | INTEGER | NOT NULL, DEFAULT 0 | 次の地点への移動手段ID（目的地は0） |
| travelTime | INTEGER | NOT NULL, DEFAULT 0 | 次の地点への移動時間（分単位。目的地は0） |

**ユニーク制約**:
- (planId, spotId)

**リレーション**:
- Plan (N:1)
- PlanSpotNearestStation (1:1)

---

### 5. PlanSpotNearestStation（プランスポット最寄駅）
**目的**: PlanSpot（プラン内スポット）に紐づく最寄駅情報をプラン単位で管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| planSpotId | INTEGER | NOT NULL, FK, UNIQUE | PlanSpot ID（1スポット1最寄駅） |
| placeId | TEXT | NOT NULL | 最寄駅のGoogle Place ID |
| stationType | StationType | NOT NULL | 駅種別（BUS / TRAIN / OTHER） |
| transitTime | INTEGER | NULL | 最寄駅間の移動時間（分単位）。下記注記の「歩行時間」とは別 |
| scheduledDepartureTime | VARCHAR(5) | NULL | 予定出発時刻（HH:MM） |
| memo | TEXT | NULL | メモ |

**リレーション**:
- PlanSpot (1:1)

> ⚠️ 駅の名前・歩行時間・座標はDBに保存しない（Google Maps Platform利用規約 No.230準拠）。
> フロントエンドが `placeId` をもとにGoogle Places APIから都度取得する。

---

### 6. PlanLocation（出発地・目的地）
**目的**: プラン作成時の出発地・目的地情報を管理する。履歴として扱うため、UserLocationを編集しても影響なし。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| planId | INTEGER | NOT NULL, FK | プランID |
| name | VARCHAR(100) | NOT NULL | 地点名 |
| latitude | DOUBLE PRECISION | NOT NULL | 緯度 |
| longitude | DOUBLE PRECISION | NOT NULL | 経度 |
| time | VARCHAR(5) | NOT NULL | 出発時間または到着時間（HH:MM）。DEPARTURE なら出発時間、DESTINATION なら到着時間 |
| locationType | LocationType | NOT NULL | 地点種別（DEPARTURE / DESTINATION） |
| transportMethodId | INTEGER | NOT NULL, DEFAULT 0 | 次の地点への移動手段ID（目的地は0） |
| travelTime | INTEGER | NOT NULL, DEFAULT 0 | 次の地点への移動時間（分単位。目的地は0） |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**ユニーク制約**:
- (planId, locationType)：1プランにつき出発地・目的地はそれぞれ1件のみ

**リレーション**:
- User (N:1)
- Plan (N:1)
- PlanLocationNearestStation (1:1)

---

### 7. PlanLocationNearestStation（出発地・目的地最寄駅）
**目的**: PlanLocation（出発地・目的地）に紐づく最寄駅情報を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| planLocationId | INTEGER | NOT NULL, FK, UNIQUE | PlanLocation ID（1地点1最寄駅） |
| placeId | TEXT | NOT NULL | 最寄駅のGoogle Place ID |
| stationType | StationType | NOT NULL | 駅種別（BUS / TRAIN / OTHER） |
| transitTime | INTEGER | NULL | 最寄駅間の移動時間（分単位）。下記注記の「歩行時間」とは別 |
| scheduledDepartureTime | VARCHAR(5) | NULL | 予定出発時刻（HH:MM） |
| memo | TEXT | NULL | メモ |

**リレーション**:
- PlanLocation (1:1)

> ⚠️ 駅の名前・歩行時間・座標はDBに保存しない（Google Maps Platform利用規約 No.230準拠）。
> フロントエンドが `placeId` をもとにGoogle Places APIから都度取得する。

---

### 8. UserLocation（ユーザーお気に入り地点）
**目的**: マイページでユーザーが登録したお気に入り地点を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| latitude | DOUBLE PRECISION | NOT NULL | 緯度 |
| longitude | DOUBLE PRECISION | NOT NULL | 経度 |
| name | VARCHAR(255) | NULL | 地点名 |
| label | VARCHAR(255) | NULL | ラベル（自宅・職場など） |
| usageCount | INTEGER | NOT NULL, DEFAULT 0 | 利用回数 |
| isDefault | BOOLEAN | NOT NULL, DEFAULT false | デフォルト地点フラグ |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**リレーション**:
- User (N:1)
- UserLocationNearestStation (1:1)

---

### 9. UserLocationNearestStation（ユーザーお気に入り地点最寄駅）
**目的**: UserLocationに紐づく最寄駅情報を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| userLocationId | INTEGER | NOT NULL, FK, UNIQUE | UserLocation ID（1地点1最寄駅） |
| placeId | TEXT | NOT NULL | 最寄駅のGoogle Place ID |
| stationType | StationType | NOT NULL | 駅種別（BUS / TRAIN / OTHER） |

**リレーション**:
- UserLocation (1:1)

> ⚠️ 駅の名前・歩行時間・座標はDBに保存しない（Google Maps Platform利用規約 No.230準拠）。

---

### 10. Wishlist（行きたいリスト）
**目的**: ユーザーのスポットの行きたいリストを管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 行きたいリストID |
| spotId | VARCHAR(255) | NOT NULL | スポットID（Google Place ID） |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| memo | TEXT | NULL | メモ |
| priority | INTEGER | NOT NULL, DEFAULT 1 | 優先度 |
| visited | INTEGER | NOT NULL, DEFAULT 0 | 訪問済みフラグ |
| visitedAt | TIMESTAMP | NULL | 訪問時期 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**ユニーク制約**:
- (userId, spotId)

**リレーション**:
- User (N:1)

---

### 11. Notification（お知らせ）
**目的**: システムからのお知らせ情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | お知らせID |
| title | VARCHAR(100) | NOT NULL | タイトル |
| content | TEXT | NOT NULL | 本文 |
| type | NotificationType | NOT NULL | お知らせ種類 |
| publishedAt | TIMESTAMP | NOT NULL | 公開日時 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**リレーション**:
- UserNotification (1:N)

---

### 12. UserNotification（ユーザーお知らせ）
**目的**: ユーザーごとのお知らせ既読状態を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| notificationId | INTEGER | NOT NULL, FK | お知らせID |
| isRead | BOOLEAN | NOT NULL, DEFAULT false | 既読フラグ |
| readAt | TIMESTAMP | NULL | 既読日時 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**ユニーク制約**:
- (userId, notificationId)

**リレーション**:
- User (N:1)
- Notification (N:1)

---

## 廃止済みテーブル

以下のテーブルは過去のバージョンで廃止されています。

| テーブル名 | 廃止理由 |
|-----------|---------|
| TripInfo | 課題272で削除 |
| Spot | 課題230でDBへの保存を廃止。Google Place IDを直接参照する方式に変更 |
| SpotMeta | 課題230でSpotテーブルとともに削除 |
| NearestStation | 課題229でPlanSpotNearestStationに統合 |
| Transport | 移動情報をPlanSpot/PlanLocationのカラムに統合 |
| TransportMethod | 同上 |
| TransportMethodOnTransport | 同上 |

---

## 列挙型

### RoleType
- `ADMIN`: 管理者
- `USER`: 一般ユーザー
- `GUEST`: ゲスト

### NotificationType
- `SYSTEM`: システムお知らせ（メンテナンス告知、新機能リリースなど）
- `INFO`: 一般情報（Tips、使い方ガイドなど）

### TransportNodeType
- `DEPARTURE`: 出発地
- `DESTINATION`: 目的地
- `SPOT`: 観光スポット

### LocationType
- `DEPARTURE`: 出発地
- `DESTINATION`: 目的地
- `SPOT`: スポット

### StationType
- `BUS`: バス停
- `TRAIN`: 鉄道駅
- `OTHER`: その他

---

## インデックス・ユニーク制約一覧

| テーブル | インデックス名 | 対象カラム | 種別 |
|---------|--------------|----------|------|
| UserNotification | UserNotification_userId_notificationId_key | (userId, notificationId) | UNIQUE |
| UserLocationNearestStation | UserLocationNearestStation_userLocationId_key | userLocationId | UNIQUE |
| PlanSpot | PlanSpot_idx1 | (planId, spotId) | UNIQUE |
| PlanSpotNearestStation | PlanSpotNearestStation_planSpotId_key | planSpotId | UNIQUE |
| PlanLocationNearestStation | PlanLocationNearestStation_planLocationId_key | planLocationId | UNIQUE |
| Wishlist | Wishlist_userId_spotId_key | (userId, spotId) | UNIQUE |
| PlanLocation | PlanLocation_idx1 | (planId, locationType) | UNIQUE |

---

## 外部キー制約一覧

| テーブル | カラム | 参照先 | ON UPDATE | ON DELETE |
|---------|-------|-------|-----------|-----------|
| Trip | userId | User.id | CASCADE | CASCADE |
| Plan | tripId | Trip.id | CASCADE | CASCADE |
| PlanSpot | planId | Plan.id | CASCADE | CASCADE |
| PlanSpotNearestStation | planSpotId | PlanSpot.id | CASCADE | CASCADE |
| PlanLocation | userId | User.id | CASCADE | CASCADE |
| PlanLocation | planId | Plan.id | CASCADE | CASCADE |
| PlanLocationNearestStation | planLocationId | PlanLocation.id | CASCADE | CASCADE |
| UserLocation | userId | User.id | CASCADE | CASCADE |
| UserLocationNearestStation | userLocationId | UserLocation.id | CASCADE | CASCADE |
| Wishlist | userId | User.id | CASCADE | CASCADE |
| UserNotification | userId | User.id | CASCADE | CASCADE |
| UserNotification | notificationId | Notification.id | CASCADE | CASCADE |

---

## データベース設計の特徴

1. **Google Maps Platform準拠**: 駅名・座標などの場所情報はDBに保存せず、Google Place IDのみ保存。詳細はAPIから都度取得（利用規約No.230準拠）
2. **プラン履歴の独立性**: PlanLocationはUserLocationから独立して管理。UserLocationを後から変更してもプランに影響しない
3. **CASCADE DELETE**: 親レコード削除時に関連する子レコードも自動削除され、孤立データを防止
4. **移動情報の内包**: 移動手段・移動時間はPlanSpot/PlanLocationのカラムとして管理（目的地となるレコードは0）
5. **正規化**: 適切な正規化によりデータの整合性を保証
