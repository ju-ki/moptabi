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
 │    ├─< TripInfo
 │    ├─< Plan (1)
 │    │    ├─< PlanSpot (N)
 │    │    │    └─< Spot (1)
 │    │    │         ├─< SpotMeta
 │    │    │         ├─< NearestStation (N)
 │    │    │         └─< Wishlist (N) >─ User (1)
 │    │    └─< Transport (N)
 │    │         └─< TransportMethodOnTransport (N)
 │    │              └─< TransportMethod
 └─< Wishlist (N) >─ Spot (1)

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
- TripInfo (1:N)
- Plan (1:N)

### 3. TripInfo（旅行情報）
**目的**: 日別の旅行情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 旅行情報ID |
| tripId | INTEGER | NOT NULL, FK | 旅行ID |
| date | VARCHAR(10) | NOT NULL | 日付 |
| genreId | INTEGER | NOT NULL | ジャンルID |
| transportationMethods | INTEGER[] | NOT NULL | 移動手段ID配列 |
| memo | TEXT | NULL | メモ |

**リレーション**:
- Trip (N:1)

### 4. Plan（プラン）
**目的**: 日別のプラン情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランID |
| tripId | INTEGER | NOT NULL, FK | 旅行ID |
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

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | VARCHAR(255) | PRIMARY KEY | メタデータID |
| spotId | VARCHAR(255) | NOT NULL, UNIQUE, FK | スポットID |
| name | VARCHAR(255) | NOT NULL | スポット名 |
| latitude | DOUBLE PRECISION | NOT NULL | 緯度 |
| longitude | DOUBLE PRECISION | NOT NULL | 経度 |
| image | TEXT | NULL | 画像URL |
| rating | DOUBLE PRECISION | NULL | 評価 |
| url | TEXT | NULL | ウェブサイトURL |
| prefecture | VARCHAR(50) | NULL | 都道府県 |
| address | VARCHAR(255) | NULL | 住所 |
| categories | TEXT[] | NULL | カテゴリ配列 |
| catchphrase | TEXT | NULL | キャッチフレーズ |
| description | TEXT | NULL | 説明 |
| openingHours | JSON | NULL | 営業時間 |

**リレーション**:
- Spot (1:1)

### 7. PlanSpot（プランスポット）
**目的**: プランに含まれるスポット情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | プランスポットID |
| planId | INTEGER | NOT NULL, FK | プランID |
| spotId | VARCHAR(255) | NOT NULL, FK | スポットID |
| stayStart | VARCHAR(5) | NOT NULL | 滞在開始時間 |
| stayEnd | VARCHAR(5) | NOT NULL | 滞在終了時間 |
| memo | TEXT | NULL | メモ |
| order | INTEGER | DEFAULT 0 | 順序 |

**リレーション**:
- Plan (N:1)
- Spot (N:1)
- Transport (1:N) - FromLocation
- Transport (1:N) - ToLocation

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
**目的**: スポットの最寄り駅情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | 最寄り駅ID |
| spotId | VARCHAR(255) | NULL, FK | スポットID |
| name | VARCHAR(255) | NOT NULL | 駅名 |
| walkingTime | INTEGER | NOT NULL | 徒歩時間（分） |
| latitude | DOUBLE PRECISION | NOT NULL | 緯度 |
| longitude | DOUBLE PRECISION | NOT NULL | 経度 |

**リレーション**:
- Spot (N:1)


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


## 列挙型

### TransportNodeType
- `DEPARTURE`: 出発地
- `DESTINATION`: 目的地
- `SPOT`: 観光スポット

## インデックス
- `SpotMeta_spotId_key`: SpotMeta.spotId のユニークインデックス

## 外部キー制約
- Trip.userId → User.id (CASCADE DELETE)
- TripInfo.tripId → Trip.id (CASCADE DELETE)
- Plan.tripId → Trip.id (CASCADE DELETE)
- PlanSpot.planId → Plan.id (CASCADE DELETE)
- PlanSpot.spotId → Spot.id (CASCADE DELETE)
- SpotMeta.spotId → Spot.id (RESTRICT DELETE)
- Transport.planId → Plan.id (CASCADE DELETE)
- Transport.fromSpotId → PlanSpot.id
- Transport.toSpotId → PlanSpot.id
- NearestStation.spotId → Spot.id

## データベース設計の特徴
1. **正規化**: 適切な正規化によりデータの整合性を保証
2. **柔軟性**: 配列型を使用して複数の移動手段やカテゴリをサポート
3. **拡張性**: 将来の機能追加に対応できる設計
4. **パフォーマンス**: 適切なインデックスと外部キー制約の設定
5. **データ整合性**: CASCADE DELETEによるリレーションデータの自動削除
