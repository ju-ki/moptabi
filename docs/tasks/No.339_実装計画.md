# No.339 スポットの検索方法改善 実装計画

## 1. 目的

issue #339 の要件に基づき、スポット検索方法をアプリのコンセプト（旅行前・中・後を循環するAI旅行プランナー）に沿った形に改善する。

参照ドキュメント:
- docs/SpotSelection_コンポーネント設計書.md

## 2. 実装スコープ

- フロントエンドのみ（バックエンド変更なし）
- `GoogleSpotSearch.tsx` の大規模更新（検索中心点モード統合）
- `spotSearchStore.ts` への新規状態追加
- 新規フック `use-current-location.ts`
- 新規ユーティリティ `lib/geo.ts`
- 関連テスト

## 3. 変更対象ファイル

### 3-1. 新規作成

| ファイルパス | 内容 |
|---|---|
| `frontend/src/lib/geo.ts` | `calcMidpoint(a, b)` — 2座標の中間地点を計算するユーティリティ |
| `frontend/src/hooks/spot-search/use-current-location.ts` | Geolocation API ラッパー。`currentLocation / isLocating / error` を返す |

### 3-2. 更新

| ファイルパス | 変更内容 |
|---|---|
| `frontend/src/store/planning/spotSearchStore.ts` | `selectedThemes: string[]` / `planSpotSelection: string[]` / `setSelectedThemes` / `togglePlanSpotSelection` / `clearPlanSpotSelection` を追加。`searchCategories` は維持しつつ、Google検索側では `selectedThemes` を使用する形に移行 |
| `frontend/src/components/spot-selection/GoogleSpotSearch.tsx` | 内部に検索中心点モード選択（ラジオボタン）、プランスポットバッジ選択、検索パネル（キーワード＋テーマチップ＋高評価フィルター）を統合。`centerMode` props は廃止し単一コンポーネントに統合 |
| `frontend/src/components/spot-selection/SpotSelectionDialog.tsx` | Google検索タブへの `centerMode` props 渡しを削除（タブ構成は現行の3タブのまま維持） |

### 3-3. テスト（新規 or 拡張）

| ファイルパス | 内容 |
|---|---|
| `frontend/src/tests/lib/geo.spec.ts` | `calcMidpoint` の単体テスト |
| `frontend/src/tests/hooks/use-current-location.spec.ts` | Geolocation API モックを用いた取得成功・失敗・未対応ブラウザのテスト |
| `frontend/src/tests/components/GoogleSpotSearch.spec.tsx` | 既存テストを拡張。モード切替、プランスポット選択、テーマフィルター、キーワード入力の動作テスト |

## 4. 実装方針

### 4-1. `lib/geo.ts` — 中間地点計算

国内旅行スケール（数十〜数百km）では球面三角法ではなく単純平均（重心）で十分な精度が得られる。

```
calcMidpoint(a, b):
  lat = (a.lat + b.lat) / 2
  lng = (a.lng + b.lng) / 2
  id  = "midpoint-{a.id}-{b.id}"
  name = "{a.name}と{b.name}の中間"
```

### 4-2. `use-current-location.ts` — 現在地取得

- コンポーネントマウント時に `navigator.geolocation.getCurrentPosition` を1回呼ぶ
- タイムアウトは10秒
- ブラウザ非対応・ユーザー拒否・タイムアウトはそれぞれ `error` に格納し、UI側でハンドリング
- 返却型: `{ currentLocation: Coordination | null, isLocating: boolean, error: string | null }`

### 4-3. `spotSearchStore.ts` — 状態追加

既存の `searchCategories` は行きたいリスト・過去スポット側のフィルターとして残す。  
Google検索専用のテーマフィルターは `selectedThemes` で管理し、競合しないよう分離する。

追加するフィールドと制約:
- `selectedThemes: string[]` — 未選択時は全カテゴリ対象（空配列 = 絞り込みなし）
- `planSpotSelection: string[]` — 最大2件。`togglePlanSpotSelection` は3件目の追加を無視する
- `resetFilters` に `selectedThemes` と `planSpotSelection` のリセットを追加

### 4-4. `GoogleSpotSearch.tsx` — モード統合

コンポーネント内部で `centerMode: 'current-location' | 'plan-location' | 'plan-spot'` を `useState` で管理。

**中心点の決定ロジック:**

```
centerMode === 'current-location'
  → useCurrentLocation() の currentLocation を searchCenter にセット（useEffect）

centerMode === 'plan-location'
  → 初期値: tripInfo.departure.location
  → ユーザーが「出発地を中心」「目的地を中心」ボタンで切り替え可能

centerMode === 'plan-spot'
  → planSpotSelection.length === 1: 選択スポットのlocation
  → planSpotSelection.length === 2: calcMidpoint() の結果
  → 0件: effectiveCenter = null → 検索ボタン disabled
```

**検索実行ロジック:**

```
genreIds = selectedThemes.flatMap(t => THEME_TO_CATEGORIES[t])
// selectedThemes が空なら genreIds は undefined（全カテゴリ）

searchSpots({
  center: effectiveCenter,
  genreIds,
  searchWord: searchKeyword || undefined,  // テーマとキーワードは組み合わせ可
  radius: searchRadius[0],
  sortOption: centerMode === 'plan-spot' ? 'distance' : 'popularity',
  maxResultLimit: 20,
})
```

**テーマ→カテゴリマッピング（コンポーネント内に定数として定義）:**

| テーマID | Google Places型 |
|---|---|
| gourmet | restaurant, cafe, bakery |
| sightseeing | tourist_attraction, museum, art_gallery, zoo, aquarium |
| history | historical_place, shrine, temple, church |
| nature | park, natural_feature |
| shopping | shopping_mall, store |
| leisure | amusement_park, bowling_alley, movie_theater, spa |

### 4-5. 既存機能の維持

- `WishlistSpotSearch.tsx` / `VisitedSpotSearch.tsx` は変更しない
- `SpotSelectionDialog.tsx` の3タブ構成は維持
- `searchCategories` を参照している既存コードは変更しない
- `GoogleSpotSearch.tsx` の既存テストは拡張のみ（削除しない）

## 5. TDD 進行計画

### Phase 1: ユーティリティ・フック（新規）

**`lib/geo.ts`**

- Red: `calcMidpoint` が存在しないため失敗するテストを書く
  - 同一座標の場合は同じ座標が返る
  - 異なる座標の場合は中間値が返る
  - id と name が正しく組み立てられる
- Green: `calcMidpoint` を実装してテストを通す
- Refactor: 型の整合確認

**`use-current-location.ts`**

- Red: `navigator.geolocation` をモックして失敗するテストを書く
  - 成功時に `currentLocation` が設定される
  - 拒否時に `error` が設定される
  - 非対応ブラウザで `error` が設定される
- Green: フックを実装してテストを通す

### Phase 2: ストア更新

- Red: 追加フィールドが存在しないため失敗するテストを書く
  - `selectedThemes` の初期値が `[]`
  - `togglePlanSpotSelection` で3件目が追加されないこと
  - `clearPlanSpotSelection` でリセットされること
  - `resetFilters` で `selectedThemes` と `planSpotSelection` がクリアされること
- Green: ストアに追加実装してテストを通す

### Phase 3: `GoogleSpotSearch.tsx` 更新

- Red: モード選択UIが存在しないため失敗するテストを書く
  - モードラジオボタンが3つ表示される
  - `plan-location` モード選択時に出発地・目的地ボタンが表示される
  - `plan-spot` モード選択時にプランスポットのバッジが表示される
  - バッジを2つ選択すると「2スポットの中間地点付近を検索」の文言が出る
  - テーマチップを選択して検索実行すると `searchSpots` に正しい `genreIds` が渡る
  - キーワードとテーマを組み合わせて検索できる
- Green: 実装してテストを通す
- Refactor: 重複ロジックの整理

### Phase 4: 回帰確認

- 行きたいリスト・過去スポットタブの動作に変化がないことを確認
- 既存の `GoogleSpotSearch` テストが全て通ることを確認

## 6. 実装手順（推奨順）

1. `frontend/src/lib/geo.ts` を新規作成 → テスト作成・通過
2. `frontend/src/hooks/spot-search/use-current-location.ts` を新規作成 → テスト作成・通過
3. `frontend/src/store/planning/spotSearchStore.ts` に `selectedThemes` / `planSpotSelection` 関連を追加 → テスト作成・通過
4. `frontend/src/components/spot-selection/GoogleSpotSearch.tsx` を更新（モード選択・検索パネル統合）→ テスト拡張・通過
5. `frontend/src/components/spot-selection/SpotSelectionDialog.tsx` の `centerMode` props 渡し削除
6. 型チェック・リントを通す
7. 全テストを通す

## 7. 完了条件（DoD）

- 検索中心点モード（現在地 / 出発地・目的地 / プランスポット）が1タブ内で切り替えられる
- プランスポットをバッジで1〜2件選択でき、2件選択時は中間地点が検索中心になる
- テーマチップ・キーワード・高評価フィルターが組み合わせて機能する
- 行きたいリスト・過去スポットの既存機能に回帰がない
- 追加・更新ファイルのテストが全て通過する
- `pnpm run typecheck` がエラーなし
- `pnpm run lint` がエラーなし

## 8. 実行コマンド

### 8-1. 実装中（単体）

```bash
cd frontend
pnpm run test -- geo
pnpm run test -- use-current-location
pnpm run test -- spotSearchStore
pnpm run test -- GoogleSpotSearch
```

### 8-2. 最終確認

```bash
cd frontend
pnpm run test
pnpm run typecheck
pnpm run lint
```

以上。
