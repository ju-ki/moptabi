# AI旅行計画プランナー DB設計書

## 概要
AI旅行計画プランナーのデータベース設計書です。PostgreSQLを使用し、Prisma ORMで管理されています。

## データベース情報
- **DBMS**: PostgreSQL
- **ORM**: Prisma
- **接続文字列**: `postgresql://travel_user:travel_admin@dev-db:5432/ai_travel`

## ER図

```
User (1)
 ├─< Trip (1)
 │    ├─< Plan (1)
 │    │    ├─< PlanSpot (N)
 │    │    │    └─ spotId (Google Place ID参照)
 │    │    │    └─< PlanSpotNearestStation (N)  ← No.229追加
 │    │    ├─< PlanLocation (N)
 │    │    │    └─ locationType: DEPARTURE | DESTINATION
 │    │    │    └─< PlanLocationNearestStation (1) ← No.229追加
 ├─< Wishlist (N)
 └─< UserNotification (N) >─ Notification (1)
```

### テーブル関係図（No.229 関連）

```
PlanLocation
 ├─ id
 ├─ locationType: DEPARTURE | DESTINATION
 ├─ time: "HH:MM"  ← 出発時間 or 到着時間（No.229追加）
 └─ PlanLocationNearestStation (1:1) ← No.229追加
    ├─ placeId (Google Place ID of Station)
    └─ stationType: BUS | TRAIN | OTHER

PlanSpot
 ├─ id
 ├─ planId → Plan
 ├─ spotId (Google Place ID)
 ├─ order
 ├─ stayStart, stayEnd（既存）
 ├─ stayDuration: 分数            ← No.229追加
 └─< PlanSpotNearestStation (N)
    ├─ placeId (Google Place ID of Station)
    └─ stationType: BUS | TRAIN | OTHER

```

## テーブル詳細

### 1. User（ユーザー）
**目的**: アプリケーションのユーザー情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | VARCHAR(255) | PRIMARY KEY | ユーザーID（Clerkから取得） |

**リレーション**:
- Trip (1:N)

### 2. Trip（旅行）
**目的**: 旅行プランの基本情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 旅行ID |
| title | VARCHAR(50) | NOT NULL | 旅行タイトル |
| startDate | VARCHAR(10) | NOT NULL | 開始日 |
| endDate | VARCHAR(10) | NOT NULL | 終了日 |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| imageUrl | VARCHAR(255) | NULL | 画像URL |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**リレーション**:
- User (N:1)
- Plan (1:N)

### 3. TripInfo（旅行情報）
**目的**: 日別の旅行情報を管理

課題272で削除

**リレーション**:
- Trip (N:1)

### 4. Plan（プラン）
**目的**: 日別のプラン情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランID |
| tripId | INTEGER | NOT NULL, FK | 旅行ID |
| memo | TEXT | - | メモ |
| date | VARCHAR(10) | NOT NULL | 日付 |

**リレーション**:
- Trip (N:1)
- PlanSpot (1:N)
- Transport (1:N)

### 5. Spot（スポット）
**目的**: 観光スポットの基本情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | VARCHAR(255) | PRIMARY KEY | スポットID（Google Places API） |

**リレーション**:
- SpotMeta (1:1)
- PlanSpot (1:N)
- NearestStation (1:N)

### 6. SpotMeta（スポットメタデータ）
**目的**: スポットの詳細情報を管理

課題230で削除済み

**リレーション**:
- Spot (1:1)

### 7. PlanSpot（プランスポット）
**目的**: プランに含まれるスポット情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランスポットID |
| planId | INTEGER | NOT NULL, FK | プランID |
| spotId | VARCHAR(255) | NOT NULL | スポットID（Google Place ID） |
| stayStart | VARCHAR(5) | NOT NULL | 滞在開始時間（HH:MM） |
| stayEnd | VARCHAR(5) | NOT NULL | 滞在終了時間（HH:MM） |
| stayDuration | INTEGER | NOT NULL | 滞在時間（分単位）※No.229追加 |
| memo | TEXT | NULL | メモ |
| order | INTEGER | DEFAULT 0 | 順序 |

**リレーション**:
- Plan (N:1)
- PlanSpotNearestStation (1:N)

### 8. TransportMethod（移動手段）
**目的**: 移動手段のマスタ情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 移動手段ID |
| name | VARCHAR(50) | NOT NULL | 移動手段名 |

**リレーション**:
- TransportMethodOnTransport (1:N)

### 9. Transport（移動）
**目的**: スポット間の移動情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 移動ID |
| planId | INTEGER | NOT NULL, FK | プランID |
| fromType | TransportNodeType | NOT NULL | 出発地タイプ |
| toType | TransportNodeType | NOT NULL | 到着地タイプ |
| travelTime | TEXT | NULL | 移動時間 |
| cost | INTEGER | NULL | 費用 |
| fromSpotId | INTEGER | NULL, FK | 出発スポットID |
| toSpotId | INTEGER | NULL, FK | 到着スポットID |

**リレーション**:
- Plan (N:1)
- PlanSpot (N:1) - FromLocation
- PlanSpot (N:1) - ToLocation
- TransportMethodOnTransport (1:N)

### 10. TransportMethodOnTransport（移動手段中間テーブル）
**目的**: 移動と移動手段の多対多関係を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| transportId | INTEGER | NOT NULL, FK | 移動ID |
| transportMethodId | INTEGER | NOT NULL, FK | 移動手段ID |

**リレーション**:
- Transport (N:1)
- TransportMethod (N:1)

### 11. NearestStation（最寄り駅）
**目的**: ~~スポットの最寄り駅情報を管理~~ → **No.229で廃止。`PlanSpotNearestStation` に統合。**

> Spotテーブルが廃止となったため、Spotへの紐付けを前提とした本テーブルも廃止。
> プラン単位で最寄駅を管理する `PlanSpotNearestStation` を新設。

---

### 11-A. PlanSpotNearestStation（プランスポット最寄駅）※No.229新規
**目的**: PlanSpot（プラン内スポット）に紐づく最寄駅情報をプラン単位で管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| planSpotId | INTEGER | NOT NULL, FK | PlanSpot ID |
| placeId | TEXT | NOT NULL | 最寄駅のGoogle Place ID |
| stationType | StationType | NOT NULL | 駅種別（BUS / TRAIN / OTHER） |

**リレーション**:
- PlanSpot (N:1)

> ⚠️ 駅の名前・歩行時間・座標はDBに保存しない（Google Maps Platform利用規約 No.230準拠）。
> フロントエンドが `placeId` をもとにGoogle Places APIから都度取得する。

---

### 11-B. PlanLocationNearestStation（出発地・目的地最寄駅）※No.229新規
**目的**: PlanLocation（出発地・目的地）に紐づく最寄駅情報を管理する

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| planLocationId | INTEGER | NOT NULL, FK, UNIQUE | PlanLocation ID（1地点1最寄駅） |
| placeId | TEXT | NOT NULL | 最寄駅のGoogle Place ID |
| stationType | StationType | NOT NULL | 駅種別（BUS / TRAIN / OTHER） |

**リレーション**:
- PlanLocation (1:1)

> ⚠️ 駅の名前・歩行時間・座標はDBに保存しない（Google Maps Platform利用規約 No.230準拠）。
> フロントエンドが `placeId` をもとにGoogle Places APIから都度取得する。

**ユニーク制約**:
- planLocationId はユニーク（1つのPlanLocationに対して最大1つの最寄駅）

---

### 12. Wishlist(行きたいリスト)
**目的**: ユーザーのスポットの行きたいリストを管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 行きたいリストID |
| spotId | VARCHAR(255) | NOT NULL, FK | スポットID |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| memo | TEXT | NULL | メモ |
| priority | INT | NOT NULL | 優先度 |
| visited | INT | NOT NULL | 訪問済みフラグ |
| visitedAt | TIMESTAMP | NULL | 訪問時期 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updatedAt | TIMESTAMP | DEFAULT NOW() | 更新日時 |

**リレーション**:
- Spot (N:1)
- User (N:1)

### 13. Notification（お知らせ）
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

### 14. UserNotification（ユーザーお知らせ）
**目的**: ユーザーごとのお知らせ既読状態を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | ID |
| userId | VARCHAR(255) | NOT NULL, FK | ユーザーID |
| notificationId | INTEGER | NOT NULL, FK | お知らせID |
| isRead | BOOLEAN | DEFAULT FALSE | 既読フラグ |
| readAt | TIMESTAMP | NULL | 既読日時 |
| createdAt | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**リレーション**:
- User (N:1)
- Notification (N:1)

**ユニーク制約**:
- (userId, notificationId)

---

## Also参照：PlanLocation（出発地・目的地）
**目的（抜粋）**: プラン作成時の出発地・目的地履歴を管理する

No.229追加カラム:

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| time | VARCHAR(5) | NOT NULL | 出発時間または到着時間（HH:MM）。DEPARTURE なら出発時間、DESTINATION なら到着時間 |

## 列挙型

### TransportNodeType
- `DEPARTURE`: 出発地
- `DESTINATION`: 目的地
- `SPOT`: 観光スポット

### NotificationType
- `SYSTEM`: システムお知らせ（メンテナンス告知、新機能リリースなど）
- `INFO`: 一般情報（Tips、使い方ガイドなど）

### StationType ※No.229追加
- `BUS`: バス停
- `TRAIN`: 鉄道駅
- `OTHER`: その他

## インデックス
- `SpotMeta_spotId_key`: SpotMeta.spotId のユニークインデックス

## 外部キー制約
- Trip.userId → User.id (CASCADE DELETE)
- Plan.tripId → Trip.id (CASCADE DELETE)
- PlanSpot.planId → Plan.id (CASCADE DELETE)
- PlanLocation.userId → User.id (CASCADE DELETE)
- PlanLocation.planId → Plan.id (SET NULL)
- PlanSpotNearestStation.planSpotId → PlanSpot.id (CASCADE DELETE) ※No.229追加
- PlanLocationNearestStation.planLocationId → PlanLocation.id (CASCADE DELETE) ※No.229追加
- UserNotification.userId → User.id (CASCADE DELETE)
- UserNotification.notificationId → Notification.id (CASCADE DELETE)

## データベース設計の特徴
1. **正規化**: 適切な正規化によりデータの整合性を保証
2. **柔軟性**: 配列型を使用して複数の移動手段やカテゴリをサポート
3. **拡張性**: 将来の機能追加に対応できる設計
4. **パフォーマンス**: 適切なインデックスと外部キー制約の設定
5. **データ整合性**: CASCADE DELETEによるリレーションデータの自動削除
