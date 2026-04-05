# No.230 スポット情報のデータ保存方式変更

## 背景

現在、スポット情報はGoogle Maps Places APIから取得した詳細データ（名前、座標、評価、カテゴリ、営業時間、住所など）をSpotMetaテーブルに保存している。しかし、Google Maps Platform利用規約では、Place詳細情報のデータベースへの永続的保存は禁止されており、現在の実装は規約違反の状態である。

### 現状の問題点

1. **規約違反**: Google Maps Platform利用規約に違反したデータ保存を行っている
2. **データの陳腐化**: 保存されたスポット情報が古くなっても更新されない
3. **不要なDB負荷**: スポット詳細情報の保存・取得でDBリソースを消費している

### 理想の状態

1. DBにはGoogle Places IDのみを保存し、規約を遵守する
2. スポット詳細情報は画面アクセス時にGoogle Maps APIから都度取得する
3. **規約で許可された座標（lat/lng）のみ** 30日間 localStorage でキャッシュする
4. スポット詳細情報（name/address/rating 等）はセッション中のメモリキャッシュのみに保持し、永続ストレージには保存しない

## 目的

Google Maps Platform利用規約を遵守するため、DBに保存するスポット情報をPlace ID（placeId）のみに変更し、スポット詳細情報は画面表示時にGoogle Maps Place Details APIから取得する方式に変更する。

## 変更の内容

### 対象ページ

| ページ | 現状 | 変更後 |
|--------|------|--------|
| 旅行計画詳細 | DBからSpotMeta取得 | placeIdを元にGoogle Maps APIで取得 |
| 行きたいリスト | DBからSpotMeta取得 | placeIdを元にGoogle Maps APIで取得 |
| 訪問済みスポット一覧 | DBからSpotMeta取得 | placeIdを元にGoogle Maps APIで取得 |
| 旅行計画作成(スポット検索_行きたいリスト) | DBからSpotMeta取得 | placeIdを元にGoogle Maps APIで取得 |
| 旅行計画作成(スポット検索_訪問済み) | DBからSpotMeta取得 | placeIdを元にGoogle Maps APIで取得 |

### アプローチ

#### 1. フロントエンド改修

##### 1.1 Place Details取得ユーティリティの実装

フロントエンドにGoogle Maps Place Details APIを呼び出すユーティリティ関数を実装する。

```typescript
// frontend/src/lib/place-details.ts
interface PlaceDetailsOptions {
  placeId: string;
  fields?: string[];
}

interface PlaceDetailsResult {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  rating?: number;
  ratingCount?: number;
  address?: string;
  categories?: string[];
  openingHours?: OpeningHoursType;
  url?: string;
}

async function fetchPlaceDetails(options: PlaceDetailsOptions): Promise<PlaceDetailsResult>
```

##### 1.2 キャッシュ機構の実装

Google Maps Platform 利用規約に準拠した 2 層キャッシュを実装する。

| キャッシュ層 | 対象データ | 保存先 | 有効期間 | 根拠 |
|------------|----------|-------|---------|-----|
| localStorage | `latitude` / `longitude` のみ | localStorage (`place_latlng_` prefix) | 30日間 | 規約 Section 10.3 |
| メモリキャッシュ | スポット詳細全体（name, address 等） | モジュールスコープ Map | セッション中（ページリロードでクリア） | 永続ストレージ保存禁止のため |

> **⚠️ 規約上の制約（Places API Section 10.3）**
> `latitude` と `longitude` のみ最大 30 日間の一時キャッシュが許可されている。
> `name`・`address`・`rating`・`categories` 等の詳細情報は localStorage 等の永続ストレージへの保存が禁止されている。

```typescript
// frontend/src/lib/place-fetcher.ts

/** localStorage に保存する lat/lng のみのキャッシュエントリ */
interface LatLngCache {
  lat: number;
  lng: number;
  cachedAt: number;
}

/** セッション中のメモリキャッシュ（スポット詳細全体） */
const memoryCache = new Map<string, SpotMetaType>();

/** キャッシュキープレフィックス */
const LATLNG_CACHE_PREFIX = 'place_latlng_'; // lat/lng専用
const LEGACY_CACHE_PREFIX = 'place_cache_';  // 旧形式（削除対象）
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30日

function cleanExpiredPlaceCache(): void // 期限切れ + 旧形式エントリを削除
function getCachedCoordinates(placeId: string): { lat: number; lng: number } | null
function clearMemoryCache(): void // テスト用
```

##### 1.3 リトライ機能付きフェッチャーの実装

API取得失敗時のリトライ機能を実装する。最大3回までリトライを行い、全て失敗した場合はエラー表示を行う。

```typescript
// frontend/src/lib/place-fetcher.ts
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

/**
 * キャッシュ戦略:
 * 1. セッション内メモリキャッシュを確認 → ヒットしたら即返す
 * 2. なければ Google Maps API から取得
 * 3. lat/lng のみ localStorage に保存（規約準拠）
 * 4. 詳細情報はメモリキャッシュにのみ保存
 */
async function fetchPlaceDetailsWithRetry(placeId: string): Promise<{
  data: SpotMetaType | null;
  hasError: boolean;
  errorMessage?: string;
}>
```

##### 1.4 スポット表示コンポーネントの改修

placeIdを受け取り、詳細情報を取得して表示するコンポーネントに改修する。

**対象コンポーネント:**
- `GoogleSpotCard.tsx`
- `SpotSelectionDialog.tsx`
- `WishlistSpotCard.tsx`
- `VisitedSpotCard.tsx`

**改修内容:**
- propsとしてplaceIdを受け取る
- useEffectまたはuseSWRでPlace詳細を取得
- ローディング状態の表示
- エラー時は「情報を取得できませんでした」と表示（placeIdは表示）

#### 2. バックエンド改修

##### 2.1 DBスキーマ変更

**削除対象:**
- `SpotMeta`テーブル
- `Spot`テーブル
- 関連する外部キー制約

**変更対象:**
- `PlanSpot.spotId`: 外部キー制約を削除し、placeIdを直接格納するカラムとして維持
- `Wishlist.spotId`: 外部キー制約を削除し、placeIdを直接格納するカラムとして維持

```typescript
// backend/src/db/schema.ts 変更後

// PlanSpotテーブル
export const planSpot = pgTable('PlanSpot', {
  id: varchar({ length: 255 }).primaryKey(),
  planId: text().notNull().references(() => plan.id, { onDelete: 'cascade' }),
  spotId: text().notNull(), // 外部キー制約を削除、placeIdを格納
  order: integer().notNull(),
});

// Wishlistテーブル
export const wishlist = pgTable('Wishlist', {
  id: varchar({ length: 255 }).primaryKey(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  spotId: text().notNull(), // 外部キー制約を削除、placeIdを格納
  visited: integer().notNull().default(0),
});
```

##### 2.2 APIレスポンス変更

**Trip詳細取得API (`GET /trips/:id`):**
SpotMetaの情報を返さず、placeIdのみを返す。

```typescript
// 変更前
{
  spots: [{
    id: "xxx",
    spotId: "ChIJ...",
    name: "東京タワー",
    latitude: 35.6585,
    longitude: 139.7454,
  }]
}

// 変更後
{
  spots: [{
    id: "xxx",
    placeId: "ChIJ...",
    order: 1,
    stayDuration: 60,
  }]
}
```

##### 2.3 Trip作成API変更

Trip作成時にSpot/SpotMetaへのINSERTを削除する。PlanSpotにplaceIdを直接格納する。

#### 3. マイグレーション

##### 3.1 スキーマ変更マイグレーション

```sql
-- 外部キー制約の削除
ALTER TABLE "PlanSpot" DROP CONSTRAINT IF EXISTS "PlanSpot_spotId_Spot_id_fk";
ALTER TABLE "Wishlist" DROP CONSTRAINT IF EXISTS "Wishlist_spotId_Spot_id_fk";

-- テーブル削除
DROP TABLE IF EXISTS "SpotMeta";
DROP TABLE IF EXISTS "Spot";
```

##### 3.2 既存データの扱い

既存のPlanSpot.spotId、Wishlist.spotIdはそのまま維持する（placeIdが格納されているため）。Spot、SpotMetaテーブルのデータは削除する。

#### 4. テスト

##### 4.1 バックエンドテスト

- Trip作成APIテスト: SpotMeta登録がないことを確認
- Trip詳細取得APIテスト: placeIdのみが返ることを確認
- Wishlist APIテスト: placeIdのみが返ることを確認

##### 4.2 フロントエンドテスト

ファイル: `frontend/src/tests/place-fetcher.spec.ts`

| テストグループ | テスト内容 | 結果 |
|-------------|----------|------|
| `fetchPlaceDetailsWithRetry` - API取得と返却値 | APIからスポット詳細を取得して返すこと | ✅ pass |
| `fetchPlaceDetailsWithRetry` - 規約準拠のキャッシュ動作 | localStorage には lat/lng のみ保存されること（name や address は保存しない） | ✅ pass |
| `fetchPlaceDetailsWithRetry` - 規約準拠のキャッシュ動作 | localStorage のキープレフィックスが place_latlng_ であること | ✅ pass |
| `fetchPlaceDetailsWithRetry` - 規約準拠のキャッシュ動作 | 2回目の呼び出しではメモリキャッシュを利用してAPIを呼び出さないこと | ✅ pass |
| `fetchPlaceDetailsWithRetry` - 規約準拠のキャッシュ動作 | ページリロード相当（メモリキャッシュクリア後）は再度APIを呼び出すこと | ✅ pass |
| `fetchPlaceDetailsWithRetry` - リトライ動作 | API失敗時に最大3回リトライすること | ✅ pass |
| `fetchPlaceDetailsWithRetry` - リトライ動作 | 3回失敗後にエラーメッセージを返すこと | ✅ pass |
| `fetchPlaceDetailsWithRetry` - リトライ動作 | 1回失敗した後に成功した場合は正常に返すこと | ✅ pass |
| `cleanExpiredPlaceCache` | 有効期限内のエントリは削除しないこと | ✅ pass |
| `cleanExpiredPlaceCache` | 期限切れ（30日超）のエントリを削除すること | ✅ pass |
| `cleanExpiredPlaceCache` | 旧形式（place_cache_*）のエントリを無条件で削除すること | ✅ pass |
| `cleanExpiredPlaceCache` | 他のキーには影響しないこと | ✅ pass |
| `getCachedCoordinates` | APIで取得後、lat/lng がキャッシュされていること | ✅ pass |
| `getCachedCoordinates` | 未取得の placeId では null を返すこと | ✅ pass |

**実行結果: 14 passed / 0 failed**

フロントエンド全テスト: **489 passed / 1 skipped / 0 failed**（37 test files）

### 対象外

- **NearestStationテーブル**: 別課題で対応する
- **スポット画像の取得**: Photos API課金対策として現状のデフォルト画像を維持する

### 影響範囲

| 対象 | 影響 |
|------|------|
| PlanSpotテーブル | 外部キー削除、カラム維持 |
| Wishlistテーブル | 外部キー削除、カラム維持 |
| Spotテーブル | **削除** |
| SpotMetaテーブル | **削除** |
| Trip作成API | Spot/SpotMeta登録処理削除 |
| Trip詳細取得API | SpotMeta情報を返さない |
| Wishlist API | SpotMeta情報を返さない |
| Trip詳細ページ | API取得ロジック追加 |
| 行きたいリスト | API取得ロジック追加 |
| 訪問済みスポット一覧 | API取得ロジック追加 |

### リスク

| リスク | 対策 |
|--------|------|
| Google Maps API障害時の表示不可 | リトライ機能（3回）とエラー表示で対応 |
| API呼び出し数増加による課金 | lat/lng の 30 日 localStorage キャッシュとセッションメモリキャッシュで軽減 |
| 初回表示の遅延 | ローディング表示、並列取得で対応 |
| ローカルストレージ容量制限 | 期限切れキャッシュの自動クリアで対応（旧形式エントリも合わせて削除） |
| ページリロード時の再取得 | セッションメモリキャッシュが失われるため、毎セッション初回はGoogle Maps APIを呼び出す（規約準拠のトレードオフ） |

### 規約準拠の確認（2026年4月時点）

対応前後の規約準拠状況を以下にまとめる。

| データ | 対応前 | 対応後 | 根拠 |
|--------|--------|--------|------|
| place_id | DBに永続保存 | DBに永続保存（変更なし） | 規約 Section A.3 で明示的に許可 |
| latitude / longitude | SpotMetaとしてDBに永続保存 ❌ | localStorage に最大30日 ✅ | 規約 Section 10.3 |
| name / address / rating 等 | SpotMetaとしてDBに永続保存 ❌ | メモリキャッシュのみ（ページリロードで消滅）✅ | いかなる永続ストレージへの保存も禁止されているため |