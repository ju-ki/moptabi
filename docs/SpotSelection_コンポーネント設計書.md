# SpotSelection コンポーネント設計書

## 概要

### 背景（issue #339 対応）
現行の検索方法はアプリのコンセプト（AI × Google Maps でプランを最適化する）からずれており、以下の問題がある：
- 検索中心点が常に手動設定で、プランの文脈（出発地・目的地・登録スポット）を活かせていない
- エリア検索とキーワード検索が同一UI内に混在しておりわかりにくい
- 「現在地から探す」「プランに既にあるスポットの近くで探す」という自然な使い方ができない

### 改善方針（issue #339 確定要件）
- 現在地から検索できる（主に即時探索向け）
- 出発地・目的地・登録スポットを統合した「プランの地点付近」から検索できる
  - 1点選択 → その地点付近を検索
  - 2点選択 → 中間地点を自動計算して検索（出発地とスポット間など）
  - 地点選択方式は**バッジ選択**を採用。プランデータは既に座標を持つため候補リスト化できる。

### タブ構成
Google検索のモード（現在地 / プランの地点付近）は**1タブ内にまとめ**、ラジオボタンで切り替える。3タブ構成とする。

| タブ | 内容 |
|---|---|
| Google検索 | モード選択（現在地 / プランの地点付近）+ 検索パネル |
| 行きたいリスト | 登録済みウィッシュリストから選ぶ |
| 過去スポット | 訪問済み・過去プランのスポットから選ぶ |

### 検索パネル（Google検索タブ共通）
Google検索タブに**共通の検索パネル**を配置。キーワードと高評価フィルターを横並びに、テーマチップをその下に配置。

| 要素 | 配置 | 説明 |
|---|---|---|
| キーワード入力 | 横並び左 | テキスト検索（テーマと組み合わせ可） |
| 高評価フィルター | 横並び右 | 評価4.0以上のみ表示 |
| テーマチップ | 下段 | 複数選択可。未選択時は全カテゴリ対象 |

### テーマ・カテゴリフィルター
カテゴリを旅行目的ベースのテーマに束ねる。

| テーマ | 対応カテゴリ（Google Places型） |
|---|---|
| グルメ | restaurant, cafe, bakery |
| 観光・文化 | tourist_attraction, museum, art_gallery, zoo, aquarium |
| 歴史・神社仏閣 | historical_place |
| 自然・公園 | park |
| ショッピング | shopping_mall, store |
| 体験・レジャー | amusement_park, bowling_alley, movie_theater, spa |

---

現在の `SpotSelection.tsx` は以下の責務を持っており、テストやメンテナンスが困難な状態です：
- 検索条件の状態管理
- スポット検索のロジック
- UI の描画
- 検索結果の表示
- 地図表示

この設計書では、Next.js 15 と React 18 のベストプラクティスに則り、責務を分離した保守性の高いコンポーネント構成を提案します。

## 設計方針

### 1. 単一責任の原則（SRP）
各コンポーネントは1つの責務のみを持つように分割します。

### 2. Server Components と Client Components の分離
- **Server Components**: データフェッチ、初期状態の準備
- **Client Components**: ユーザーインタラクション、状態管理

### 3. カスタムフックによるロジックの分離
ビジネスロジックをコンポーネントから分離し、再利用性とテスタビリティを向上させます。

### 4. 型安全性の確保
Zod スキーマによるバリデーションとTypeScriptの厳格な型チェックを活用します。

### 5. 既存実装の最大活用
- **Wishlist コンポーネントの再利用**: `AreaSearch.tsx`, `KeywordSearchWithMap.tsx`, `SearchResultsView.tsx` などの実装パターンを活用
- **Zustand ストアの統合**: `useStoreForPlanning` と `useWishlistStore` のパターンを統一
- **共通ロジックの抽出**: `searchSpots` 関数など既に実装されているユーティリティを最大限活用

### 6. テストコマンド
```sh
pnpm run test:watch SpotSelection.spec.tsx
```

## 推奨技術スタック

### 現在利用中の技術（継続利用）
- **状態管理**: Zustand（軽量、シンプル、Immer middleware対応）
- **データフェッチング**: SWR（キャッシュ、リアルタイム同期）
- **フォームバリデーション**: Zod + react-hook-form
- **UIコンポーネント**: Radix UI + Tailwind CSS + shadcn/ui

### 新規提案技術
- **@tanstack/react-query**: SWRの代替として検討可能（より高度なキャッシュ戦略、オプティミスティックUI）
  - 現状: SWR を使用しているため、一貫性のため SWR を継続推奨
- **React Hook Form**: フォーム管理の効率化（既存依存関係に含まれている）
- **cmdk**: コマンドパレット風のUI（既に依存関係に含まれている）

## コンポーネント構成

### 既存実装の活用

#### Wishlist から再利用可能なコンポーネント
- ✅ `SearchResultsView.tsx`: リスト/地図/分割ビューの切り替え (**そのまま再利用**)
- ✅ `AreaSearch.tsx`: エリア検索の実装パターン (**参考に改修**)
- ✅ `KeywordSearchWithMap.tsx`: キーワード検索のUI (**参考に改修**)
- ✅ `LocationAdjustModal.tsx`: 地図での位置調整。`subPoints?: Coordination[]` を追加し、2点間検索時に両地点をサブマーカーとして地図上に表示できるよう拡張済み。

#### 既存の Zustand ストア
- ✅ `useStoreForPlanning`: 計画全体の状態管理（spots, plans, tripInfo など）
- ✅ `useWishlistStore`: 検索関連の状態管理（searchCenter, searchRadius, viewMode など）

#### 既存の共通ロジック
- ✅ `searchSpots()` in `plan.ts`: Google Places API 検索ロジック
- ✅ `useFetcher()`: 認証付きAPI呼び出しフック
- ✅ `use-wishlist.ts`: Wishlist CRUD操作

### 新規実装が必要な部分

```
src/
├── components/
│   ├── spot-selection/
│   │   ├── SpotSelectionDialog.tsx              # 🆕 NEW: メインダイアログ（既存SpotSelection.tsxをリファクタ）
│   │   ├── GoogleSpotSearch.tsx                 # 🔄 UPDATE: モード選択＋検索パネルを内包した統合コンポーネント
│   │   ├── WishlistSpotSearch.tsx               # ✅ EXISTING: そのまま維持
│   │   ├── VisitedSpotSearch.tsx                # ✅ EXISTING: そのまま維持
│   │   └── index.ts                             # エクスポート
│   │
│   └── common/                                  # 共通コンポーネント
│       ├── SearchResultsView.tsx                # ♻️ REUSE: wishlist から移動して共通化
│       └── LocationAdjustModal.tsx              # ♻️ REUSE: wishlist から移動して共通化
│
├── hooks/
│   ├── spot-search/
│   │   ├── use-current-location.ts              # 🆕 NEW: Geolocation API で現在地取得
│   │   ├── use-wishlist-spots.ts                # ✅ EXISTING: そのまま維持
│   │   └── use-visited-spots.ts                 # ✅ EXISTING: そのまま維持
│   │
│   └── use-wishlist.ts                          # ✅ EXISTING: そのまま利用
│
├── lib/
│   ├── api/
│   │   └── spots.ts                             # ✅ EXISTING: /api/spots/* API呼び出し
│   │
│   ├── plan.ts                                  # ✅ EXISTING: searchSpots()を継続利用
│   │
│   └── geo.ts                                   # 🆕 NEW: 中間地点計算ユーティリティ（2座標の重心）
│
└── store/
    ├── planning/
    │   └── spotSearchStore.ts                   # 🔄 UPDATE: searchCenterMode / planSpotSelection 追加
    │
    └── wishlist/
        └── wishlistStore.ts                     # ✅ EXISTING: 変更なし
```

## 詳細設計

### 1. メインコンポーネント: `SpotSelectionDialog.tsx`

**責務**: ダイアログの表示制御とタブ切り替え

**既存との差分**: 現在の `SpotSelection.tsx` からリファクタリング

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Heart, History } from 'lucide-react';
import { GoogleSpotSearch } from './GoogleSpotSearch';
import { WishlistSpotSearch } from './WishlistSpotSearch';
import { VisitedSpotSearch } from './VisitedSpotSearch';
import { useStoreForPlanning } from '@/lib/plan';

type SpotSelectionDialogProps = {
  date: string;
};

export function SpotSelectionDialog({ date }: SpotSelectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { setSpots, plans, planErrors } = useStoreForPlanning();
  
  // 選択済みスポットIDを取得
  const selectedSpotIds = plans
    .find((plan) => plan.date === date)
    ?.spots.map((s) => s.id) ?? [];

  const handleSpotSelect = (spot: Spot, isSelected: boolean) => {
    setSpots(date, spot, isSelected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" id="spot-search">
          <span>観光地を検索</span>
          <Search className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>観光地を検索</DialogTitle>
        </DialogHeader>

        {/* エラー表示 */}
        {planErrors[date]?.spots && (
          <div className="text-sm text-red-600">{planErrors[date].spots}</div>
        )}

        {/* タブ切り替え: 3タブ構成 */}
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">
              <Search className="mr-1 h-4 w-4" />
              Google検索
            </TabsTrigger>
            <TabsTrigger value="wishlist">
              <Heart className="mr-1 h-4 w-4" />
              行きたいリスト
            </TabsTrigger>
            <TabsTrigger value="visited">
              <History className="mr-1 h-4 w-4" />
              過去のスポット
            </TabsTrigger>
          </TabsList>

          {/* Google検索タブ: モード選択＋検索パネル（SearchPanel）をまとめて内包 */}
          <TabsContent value="google" className="mt-4">
            <GoogleSpotSearch
              date={date}
              selectedSpotIds={selectedSpotIds}
              onSpotSelect={handleSpotSelect}
            />
          </TabsContent>

          {/* 行きたいリスト */}
          <TabsContent value="wishlist" className="mt-4">
            <WishlistSpotSearch 
              date={date}
              selectedSpotIds={selectedSpotIds}
              onSpotSelect={handleSpotSelect}
            />
          </TabsContent>

          {/* 過去のスポット */}
          <TabsContent value="visited" className="mt-4">
            <VisitedSpotSearch 
              date={date}
              selectedSpotIds={selectedSpotIds}
              onSpotSelect={handleSpotSelect}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Google検索タブ: `GoogleSpotSearch.tsx`

**責務**: Google Places API を使用した検索。内部にモード選択（現在地 / プランの地点付近）と検索パネルを持つ統合コンポーネント。

**実装済みの主要ロジック**:
- `CenterMode = 'current-location' | 'plan-location'`（2モード）
- `PlanPoint` 型で出発地・目的地・スポットを統合して保持
- `useEffect` でモード・バッジ選択変化時に `searchCenter` を同期
- 2点選択時は `calcMidpoint` で中間地点を計算し `searchCenter` に反映
- `mapSubPoints`: 2点選択時に地図モーダルで両地点をサブマーカー表示
- `LocationAdjustModal` は両モード共通で表示（`subPoints` で2点マーカーを渡す）
- `sortOption`: `plan-location` モードは `'distance'`、`current-location` は `'popularity'`

**検索パネルのレイアウト**:
- 横並び: キーワード入力（左・flex-1）+ 評価4.0以上チェックボックス（右）
- 下段: テーマチップ（flex-wrap）

**型定義**:
```typescript
type CenterMode = 'current-location' | 'plan-location';
type PlanPoint = { id: string; name: string; lat: number; lng: number };
```

**主要 props/state**:
```typescript
type GoogleSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void;
};
```

**`planPoints` の構成**（出発地→目的地→スポットの順）:
```typescript
const planPoints = useMemo((): PlanPoint[] => {
  const points: PlanPoint[] = [];
  const dep = currentPlan?.departure;
  if (dep?.latitude != null && dep?.longitude != null) {
    points.push({ id: 'departure', name: dep.name + ' (出発地)', lat: dep.latitude, lng: dep.longitude });
  }
  const dest = currentPlan?.destination;
  if (dest?.latitude != null && dest?.longitude != null) {
    points.push({ id: 'destination', name: dest.name + ' (目的地)', lat: dest.latitude, lng: dest.longitude });
  }
  for (const s of planSpots) {
    points.push({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude });
  }
  return points;
}, [currentPlan, planSpots]);
```

**`LocationAdjustModal` の呼び出し例**（2点マーカー付き）:
```typescript
<LocationAdjustModal
  open={mapSelectOpen}
  onOpenChange={setMapSelectOpen}
  searchCenter={searchCenter}
  onSearchCenterChange={setSearchCenter}
  searchRadius={searchRadius}
  onConfirm={handleSearch}
  subPoints={mapSubPoints}  // 2点選択時に両地点をマーカー表示
/>
```

### 3. 行きたいリストタブ: `WishlistSpotSearch.tsx`

**責務**: 未訪問の行きたいリストからのスポット選択

**新規実装**: バックエンドAPIと連携

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { useWishlistSpots } from '@/hooks/spot-search/use-wishlist-spots';
import { prefectures } from '@/data/constants';
import { Spot } from '@/types/plan';

type WishlistSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: Spot, isSelected: boolean) => void;
};

export function WishlistSpotSearch({ date, selectedSpotIds, onSpotSelect }: WishlistSpotSearchProps) {
  const { spots, isLoading, error } = useWishlistSpots({ visited: false });
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);
  const [prefectureFilter, setPrefectureFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    let filtered = [...spots];

    // 都道府県フィルター
    if (prefectureFilter !== 'all') {
      filtered = filtered.filter(s => s.prefecture === prefectureFilter);
    }

    // 優先度フィルター
    if (priorityFilter !== 'all') {
      const priority = parseInt(priorityFilter);
      filtered = filtered.filter(s => s.priority === priority);
    }

    setFilteredSpots(filtered);
  }, [spots, prefectureFilter, priorityFilter]);

  const handleSpotClick = (spot: Spot) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    onSpotSelect(spot, isSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader className="animate-spin" size={24} />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>都道府県</Label>
          <Select value={prefectureFilter} onValueChange={setPrefectureFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {prefectures.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>優先度</Label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="1">低</SelectItem>
              <SelectItem value="2">中</SelectItem>
              <SelectItem value="3">高</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 検索結果 */}
      <SearchResultsView 
        searchResults={filteredSpots}
        mapCenter={filteredSpots[0]?.location}
        selectedSpotIds={selectedSpotIds}
        onSpotClick={handleSpotClick}
      />

      {filteredSpots.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          行きたいリストにスポットが登録されていません
        </div>
      )}
    </div>
  );
}
```

### 4. 過去スポットタブ: `VisitedSpotSearch.tsx`

**責務**: 訪問済み＋過去の計画に含まれたスポットからの選択

**新規実装**: バックエンドAPIと連携

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Loader, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SearchResultsView } from '@/components/common/SearchResultsView';
import { useVisitedSpots } from '@/hooks/spot-search/use-visited-spots';
import { prefectures } from '@/data/constants';
import { Spot } from '@/types/plan';

type VisitedSpotSearchProps = {
  date: string;
  selectedSpotIds: string[];
  onSpotSelect: (spot: Spot, isSelected: boolean) => void;
};

export function VisitedSpotSearch({ date, selectedSpotIds, onSpotSelect }: VisitedSpotSearchProps) {
  const { spots, isLoading, error } = useVisitedSpots();
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);
  const [prefectureFilter, setPrefectureFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  useEffect(() => {
    let filtered = [...spots];

    // 都道府県フィルター
    if (prefectureFilter !== 'all') {
      filtered = filtered.filter(s => s.prefecture === prefectureFilter);
    }

    // 期間フィルター（訪問日・計画日から）
    if (periodFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch(periodFilter) {
        case '1month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case '1year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(s => {
        const visitDate = s.visitedAt ? new Date(s.visitedAt) : null;
        const planDate = s.planDate ? new Date(s.planDate) : null;
        const targetDate = visitDate || planDate;
        
        return targetDate && targetDate >= filterDate;
      });
    }

    setFilteredSpots(filtered);
  }, [spots, prefectureFilter, periodFilter]);

  const handleSpotClick = (spot: Spot) => {
    const isSelected = selectedSpotIds.includes(spot.id);
    onSpotSelect(spot, isSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader className="animate-spin" size={24} />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>都道府県</Label>
          <Select value={prefectureFilter} onValueChange={setPrefectureFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {prefectures.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            <Calendar className="inline mr-1 h-4 w-4" />
            期間
          </Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="1month">1ヶ月以内</SelectItem>
              <SelectItem value="3months">3ヶ月以内</SelectItem>
              <SelectItem value="1year">1年以内</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 検索結果 */}
      <SearchResultsView 
        searchResults={filteredSpots}
        mapCenter={filteredSpots[0]?.location}
        selectedSpotIds={selectedSpotIds}
        onSpotClick={handleSpotClick}
      />

      {filteredSpots.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          過去に訪問・計画したスポットがありません
        </div>
      )}
    </div>
  );
}
```

### 5. カスタムフック: `use-wishlist-spots.ts`

**責務**: 未訪問の行きたいリストの取得

**実装パターン**: 既存の `use-wishlist.ts` を参考に、SWR で実装

```typescript
import useSWR from 'swr';
import { useFetcher } from '@/hooks/use-fetcher';
import { Spot } from '@/types/plan';

type WishlistSpot = {
  id: number;
  spotId: string;
  userId: string;
  memo: string | null;
  priority: number;
  visited: number;
  visitedAt: string | null;
  spot: {
    id: string;
    meta: {
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      categories: string[];
      image: string;
      url: string | null;
      prefecture: string | null;
      address: string;
      rating: number | null;
      catchphrase: string | null;
      openingHours: string | null;
    };
  };
};

export function useWishlistSpots(options?: { visited?: boolean }) {
  const { getFetcher } = useFetcher();
  
  const endpoint = options?.visited 
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/visited`
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/unvisited`;

  const { data, error, isLoading, mutate } = useSWR<WishlistSpot[]>(
    endpoint,
    getFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
    }
  );

  // バックエンドのレスポンスを Spot 型に変換
  const spots: Spot[] = (data ?? []).map(item => ({
    id: item.spotId,
    location: {
      id: item.spotId,
      name: item.spot.meta.name,
      lat: item.spot.meta.latitude,
      lng: item.spot.meta.longitude,
    },
    image: item.spot.meta.image,
    url: item.spot.meta.url ?? undefined,
    rating: item.spot.meta.rating ?? undefined,
    category: item.spot.meta.categories,
    description: item.spot.meta.description,
    prefecture: item.spot.meta.prefecture ?? undefined,
    address: item.spot.meta.address,
    catchphrase: item.spot.meta.catchphrase ?? undefined,
    regularOpeningHours: item.spot.meta.openingHours,
    // wishlist 固有のデータ
    priority: item.priority,
    memo: item.memo ?? undefined,
    visitedAt: item.visitedAt ?? undefined,
    // デフォルト値
    stayStart: '09:00',
    stayEnd: '10:00',
    transports: {
      transportMethodIds: [0],
      name: 'DEFAULT',
      travelTime: '不明',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
    order: 0,
  }));

  return {
    spots,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

### 6. カスタムフック: `use-visited-spots.ts`

**責務**: 訪問済み＋過去の計画に含まれたスポットの取得

**実装パターン**: `use-wishlist-spots.ts` と同様に SWR で実装

```typescript
import useSWR from 'swr';
import { useFetcher } from '@/hooks/use-fetcher';
import { Spot, TransportNodeType } from '@/types/plan';

type VisitedSpotResponse = {
  id: number;
  spotId: string;
  userId: string;
  memo: string | null;
  priority: number;
  visited: number;
  visitedAt: string | null;
  spot: {
    id: string;
    meta: {
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      categories: string[];
      image: string;
      url: string | null;
      prefecture: string | null;
      address: string;
      rating: number | null;
      catchphrase: string | null;
      openingHours: string | null;
    };
  };
  // 計画から取得した場合に含まれる可能性のある情報
  plan?: {
    date: string;
    trip: {
      title: string;
    };
  };
};

export function useVisitedSpots() {
  const { getFetcher } = useFetcher();
  
  const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/spots/visited`;

  const { data, error, isLoading, mutate } = useSWR<VisitedSpotResponse[]>(
    endpoint,
    getFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
    }
  );

  // バックエンドのレスポンスを Spot 型に変換
  const spots: Spot[] = (data ?? []).map(item => ({
    id: item.spotId,
    location: {
      id: item.spotId,
      name: item.spot.meta.name,
      lat: item.spot.meta.latitude,
      lng: item.spot.meta.longitude,
    },
    image: item.spot.meta.image,
    url: item.spot.meta.url ?? undefined,
    rating: item.spot.meta.rating ?? undefined,
    category: item.spot.meta.categories,
    description: item.spot.meta.description,
    prefecture: item.spot.meta.prefecture ?? undefined,
    address: item.spot.meta.address,
    catchphrase: item.spot.meta.catchphrase ?? undefined,
    regularOpeningHours: item.spot.meta.openingHours,
    // 訪問・計画情報
    visitedAt: item.visitedAt ?? undefined,
    planDate: item.plan?.date,
    planTitle: item.plan?.trip.title,
    // デフォルト値
    stayStart: '09:00',
    stayEnd: '10:00',
    transports: {
      transportMethodIds: [0],
      name: 'DEFAULT',
      travelTime: '不明',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
    order: 0,
  }));

  return {
    spots,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

### 7. Zustand ストア: `store/planning/spotSearchStore.ts`

**責務**: スポット検索関連の状態管理

**変更点**: `selectedThemes`（テーマ横断フィルター）・`planSpotSelection`（プランスポット選択）を追加。既存フィールドは維持。

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { Coordination, Spot } from '@/types/plan';

interface SpotSearchState {
  // 検索条件
  searchCenter: Coordination | undefined;
  searchRadius: number[];
  searchKeyword: string;
  highRating: boolean;

  // テーマ横断フィルター（Google検索3タブ共通）
  selectedThemes: string[];

  // プランスポット基準検索: 選択中スポットID（最大2件）
  planSpotSelection: string[];

  // 検索結果
  searchResults: Spot[];
  mapCenter: Coordination;

  // UI状態
  mapSelectOpen: boolean;
  selectedSpot: Spot | null;

  // アクション
  setSearchCenter: (center: Coordination | undefined) => void;
  setSearchRadius: (radius: number[]) => void;
  setSearchKeyword: (keyword: string) => void;
  setHighRating: (value: boolean) => void;
  setSelectedThemes: (themes: string[]) => void;
  togglePlanSpotSelection: (spotId: string) => void; // 最大2件までトグル
  clearPlanSpotSelection: () => void;
  setSearchResults: (results: Spot[]) => void;
  setMapCenter: (center: Coordination) => void;
  setMapSelectOpen: (open: boolean) => void;
  setSelectedSpot: (spot: Spot | null) => void;
  resetFilters: () => void;
}

const defaultCenter: Coordination = {
  id: 'tokyo-station',
  lat: 35.6812,
  lng: 139.7671,
  name: '東京駅',
};

export const useSpotSearchStore = create<SpotSearchState>()(
  immer(
    devtools((set) => ({
      searchCenter: undefined,
      searchRadius: [5],
      searchKeyword: '',
      highRating: false,
      selectedThemes: [],
      planSpotSelection: [],
      searchResults: [],
      mapCenter: defaultCenter,
      mapSelectOpen: false,
      selectedSpot: null,

      setSearchCenter: (center) => set((state) => { state.searchCenter = center; }),
      setSearchRadius: (radius) => set((state) => { state.searchRadius = radius; }),
      setSearchKeyword: (keyword) => set((state) => { state.searchKeyword = keyword; }),
      setHighRating: (value) => set((state) => { state.highRating = value; }),
      setSelectedThemes: (themes) => set((state) => { state.selectedThemes = themes; }),

      togglePlanSpotSelection: (spotId) => set((state) => {
        const idx = state.planSpotSelection.indexOf(spotId);
        if (idx >= 0) {
          state.planSpotSelection.splice(idx, 1);
        } else if (state.planSpotSelection.length < 2) {
          state.planSpotSelection.push(spotId);
        }
        // 3件目以降は無視（最大2件制約）
      }),

      clearPlanSpotSelection: () => set((state) => { state.planSpotSelection = []; }),
      setSearchResults: (results) => set((state) => { state.searchResults = results; }),
      setMapCenter: (center) => set((state) => { state.mapCenter = center; }),
      setMapSelectOpen: (open) => set((state) => { state.mapSelectOpen = open; }),
      setSelectedSpot: (spot) => set((state) => { state.selectedSpot = spot; }),

      resetFilters: () => set((state) => {
        state.searchCenter = undefined;
        state.searchRadius = [5];
        state.searchKeyword = '';
        state.highRating = false;
        state.selectedThemes = [];
        state.planSpotSelection = [];
      }),
    })),
  ),
);
```

---

### 8. 新規フック: `use-current-location.ts`

**責務**: Geolocation API で現在地を取得し、`Coordination` 型で返す。

```typescript
import { useState, useEffect } from 'react';
import { Coordination } from '@/types/plan';

export function useCurrentLocation() {
  const [currentLocation, setCurrentLocation] = useState<Coordination | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('このブラウザは位置情報をサポートしていません');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          id: 'current-location',
          name: '現在地',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setError('位置情報の取得に失敗しました');
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  }, []);

  return { currentLocation, isLocating, error };
}
```

---

### 9. 新規ユーティリティ: `lib/geo.ts`

**責務**: 2座標の中間地点を計算する。PlanSpotSearch で利用。

```typescript
import { Coordination } from '@/types/plan';

// 2座標の重心（単純平均）を返す。近距離（国内旅行スケール）では十分な精度。
export function calcMidpoint(a: Coordination, b: Coordination): Coordination {
  return {
    id: `midpoint-${a.id}-${b.id}`,
    name: `${a.name}と${b.name}の中間`,
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}
```

## テスト戦略

### 1. ユニットテスト（Vitest + React Testing Library）

#### カスタムフックのテスト
```typescript
// hooks/spot-search/__tests__/use-spot-search.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useSpotSearch } from '../use-spot-search';
import { SWRConfig } from 'swr';

describe('useSpotSearch', () => {
  it('検索実行後に結果が取得できる', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        {children}
      </SWRConfig>
    );

    const { result } = renderHook(() => useSpotSearch(), { wrapper });

    await act(async () => {
      await result.current.executeSearch({
        searchCenter: { id: 'test', lat: 35.6812, lng: 139.7671, name: 'テスト' },
        genreIds: ['tourist_attraction'],
        radius: 5,
        sortOption: 'popularity',
        maxResultLimit: 10,
      });
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(10);
    });
  });
});
```

#### コンポーネントのテスト
```typescript
// components/spot-selection/__tests__/SpotSearchForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpotSearchForm } from '../SpotSearchForm';

describe('SpotSearchForm', () => {
  it('検索ボタンをクリックすると onSearch が呼ばれる', async () => {
    const mockOnSearch = vi.fn();
    
    render(<SpotSearchForm onSearch={mockOnSearch} isLoading={false} />);
    
    const searchButton = screen.getByRole('button', { name: /検索実行/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalled();
    });
  });

  it('キーワード入力が正しく動作する', () => {
    render(<SpotSearchForm onSearch={vi.fn()} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/観光スポット名や特徴を入力/i);
    fireEvent.change(input, { target: { value: '東京タワー' } });

    expect(input).toHaveValue('東京タワー');
  });
});
```

### 2. 統合テスト
```typescript
// components/spot-selection/__tests__/SpotSelectionDialog.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpotSelectionDialog } from '../SpotSelectionDialog';

describe('SpotSelectionDialog 統合テスト', () => {
  it('ダイアログを開いて検索し、スポットを選択できる', async () => {
    const mockOnSpotSelect = vi.fn();
    
    render(
      <SpotSelectionDialog 
        date="2025-01-01" 
        onSpotSelect={mockOnSpotSelect} 
        selectedSpotIds={[]} 
      />
    );

    // ダイアログを開く
    const triggerButton = screen.getByRole('button', { name: /観光地を検索/i });
    fireEvent.click(triggerButton);

    // 検索実行
    const searchButton = screen.getByRole('button', { name: /検索実行/i });
    fireEvent.click(searchButton);

    // 結果を待つ
    await waitFor(() => {
      expect(screen.getByText(/東京タワー/i)).toBeInTheDocument();
    });

    // スポットを選択
    const spotCard = screen.getByText(/東京タワー/i);
    fireEvent.click(spotCard);

    expect(mockOnSpotSelect).toHaveBeenCalled();
  });
});
```

## パフォーマンス最適化

### 1. メモ化
```typescript
// 検索結果リストのメモ化
import { memo } from 'react';

export const SpotSearchResultCard = memo(function SpotSearchResultCard({ spot, onSelect }: Props) {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.spot.id === nextProps.spot.id && 
         prevProps.isSelected === nextProps.isSelected;
});
```

### 2. 仮想化（大量データ表示時）
```typescript
// react-virtual を使用した仮想スクロール（必要に応じて）
import { useVirtualizer } from '@tanstack/react-virtual';

export function SpotSearchResultList({ spots }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: spots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // カードの高さ
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <SpotSearchResultCard spot={spots[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. デバウンス（キーワード検索）
```typescript
import { useDebouncedCallback } from 'use-debounce';

export function SpotSearchForm({ onSearch }: Props) {
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      onSearch({ ...currentParams, searchWord: value });
    },
    500 // 500ms 待機
  );

  return (
    <Input 
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="キーワード検索"
    />
  );
}
```

## マイグレーション計画（issue #339 対応版）

### フェーズ1: ストア・ユーティリティ更新（0.5週）
1. `spotSearchStore.ts` に `selectedThemes` / `planSpotSelection` を追加
2. `lib/geo.ts`（`calcMidpoint`）を新規作成
3. `use-current-location.ts` を新規作成

### フェーズ2: 新規コンポーネント実装（1週）
1. `ThemeFilter.tsx` 実装
2. `GoogleSpotSearch.tsx` に `centerMode` props を追加し、現在地・出発地目的地モードに対応
3. `PlanSpotSearch.tsx` を新規実装
4. `SpotSelectionDialog.tsx` を5タブ構成に変更

### フェーズ3: テスト・調整（0.5週）
1. `use-current-location` のユニットテスト
2. `calcMidpoint` のユニットテスト
3. `PlanSpotSearch` の統合テスト（スポット選択→中心点計算→検索）
4. 既存のWishlist・Visited検索のリグレッションテスト

### 削除・非推奨
- `searchCategories` フィールド（`spotSearchStore` から削除、`selectedThemes` に統一）
- `GoogleSpotSearch` 内のカテゴリチェックボックスUI（`ThemeFilter` に移行）

## 既存実装との統合ポイント

### ✅ 再利用する既存コンポーネント
1. **SearchResultsView** (wishlist)
   - リスト/地図/分割ビューの切り替え
   - マーカーのホバー・選択状態管理
   - **移動先**: `components/common/SearchResultsView.tsx`（共通化）

2. **LocationAdjustModal** (wishlist)
   - 地図上での位置調整モーダル
   - **移動先**: `components/common/LocationAdjustModal.tsx`（共通化）

### ✅ 活用する既存ロジック
1. **searchSpots()** (`lib/plan.ts`)
   - Google Places API の Nearby Search / Text Search
   - **そのまま利用**

2. **setStartTimeAutomatically()** (`lib/algorithm.ts`)
   - スポット追加時の自動時刻設定
   - **そのまま利用**

3. **useFetcher()** (`hooks/use-fetcher.ts`)
   - 認証付きAPI呼び出し
   - **そのまま利用**

### ✅ 統合する Zustand ストア
1. **useStoreForPlanning** (`lib/plan.ts`)
   - `setSpots()`: スポット追加・削除
   - `plans`: 現在の計画状態
   - `planErrors`: バリデーションエラー
   - **既存のまま活用**

2. **useSpotSearchStore** (新規作成)
   - `useWishlistStore` のパターンを踏襲
   - 検索条件・結果の管理
   - **新規作成だが、既存パターンを活用**

## まとめ

### ✅ 1週間実装のメリット
1. **迅速な価値提供**: 最短で新機能（行きたいリスト・過去スポット選択）をリリース
2. **リスク最小化**: 既存コードへの影響を最小限に抑制
3. **段階的改善**: まず動くものを作り、後からリファクタリング
4. **学習コスト低**: 既存の `SearchResultsView` をそのまま再利用
5. **テスタビリティ**: カスタムフックは独立してテスト可能

### 📊 1週間実装のスコープ

| 実装内容 | 新規/変更 | 規模 | 優先度 |
|---------|---------|------|-------|
| `use-wishlist-spots.ts` | 🆕 新規 | 30行 | ⭐⭐⭐ 必須 |
| `use-visited-spots.ts` | 🆕 新規 | 30行 | ⭐⭐⭐ 必須 |
| `SpotSelection.tsx` タブ追加 | 🔧 変更 | +150行 | ⭐⭐⭐ 必須 |
| カスタムフックのテスト | 🆕 新規 | 100行 | ⭐⭐ 推奨 |
| 統合テスト | 🆕 新規 | 50行 | ⭐ 任意 |

**合計**: 約 360行（テストを含む）

### 🚀 即座に得られる機能
1. ✅ **行きたいリストからの選択**
   - 未訪問スポットを優先度順に表示
   - 都道府県・優先度でフィルタリング
   - 地図とリスト表示の切り替え

2. ✅ **過去スポットからの選択**
   - 訪問済み＋過去の計画スポットを表示
   - 都道府県・期間でフィルタリング
   - 重複除外済み

3. ✅ **既存機能の完全維持**
   - Google Places API 検索（エリア・キーワード）
   - 既存のフィルター機能
   - 既存のUI/UX

### ⚠️ 1週間実装の制約（将来改善）
1. **コンポーネント分割なし**: `SpotSelection.tsx` が大きくなる（300-400行程度）
2. **新規ストアなし**: `useWishlistStore` を参考にするが、新規作成はしない
3. **共通化は延期**: `SearchResultsView` の移動は次フェーズ
4. **テストカバレッジ**: 基本的なテストのみ（カバレッジ50-60%程度）

### 🔮 将来のリファクタリング（別タスクで実施）
段階的に以下を実施し、保守性を向上：

1. **Week 2-3: コンポーネント分割**（必要に応じて）
   - `SpotSelection.tsx` を複数ファイルに分割
   - テスト容易性の向上

2. **Week 4: 共通化**（必要に応じて）
   - `SearchResultsView` を `common/` へ移動
   - Wishlist との完全な統合

3. **Week 5: 状態管理の改善**（必要に応じて）
   - `useSpotSearchStore` の導入
   - より洗練された状態管理

### 🎯 1週間実装の成功基準
- ✅ 行きたいリストからスポット選択が動作する
- ✅ 過去スポットからスポット選択が動作する
- ✅ 既存のGoogle検索機能に影響がない
- ✅ 基本的なテストが通る
- ✅ ユーザーが3つの検索方法を使い分けられる

### 📋 1週間での実装計画（最小限のリファクタリング）

#### 優先順位付けの方針
- ✅ **最優先**: バックエンドAPIとの連携（行きたいリスト・過去スポット）
- ⚠️ **後回し**: 既存のGoogle検索機能は現状維持
- 🔧 **最小限**: コンポーネント分割は必要最小限に留める

#### Day 1-2: バックエンドAPI連携の準備
**目標**: データ取得のための基盤整備

```
実装項目:
□ use-wishlist-spots.ts の実装（未訪問取得）
□ use-visited-spots.ts の実装（訪問済み・過去取得）
□ 簡単な単体テスト作成

成果物:
- hooks/spot-search/use-wishlist-spots.ts
- hooks/spot-search/use-visited-spots.ts
- tests/hooks/use-wishlist-spots.test.ts
- tests/hooks/use-visited-spots.test.ts
```

#### Day 3-4: タブUI追加（既存コンポーネント内）
**目標**: SpotSelection.tsx にタブを追加（大規模リファクタは避ける）

```
実装項目:
□ SpotSelection.tsx にタブUIを追加
  - 既存のGoogle検索はそのまま維持
  - 「行きたいリスト」タブを追加
  - 「過去のスポット」タブを追加
□ SearchResultsView を wishlist から import して再利用

変更ファイル:
- components/SpotSelection.tsx（タブ追加のみ）
- ※新規コンポーネントは作らない
```

#### Day 5-6: 行きたいリスト・過去スポットタブの実装
**目標**: タブ内容の実装

```
実装項目:
□ 行きたいリストタブの実装
  - use-wishlist-spots でデータ取得
  - 都道府県・優先度フィルター
  - SearchResultsView で表示
□ 過去スポットタブの実装
  - use-visited-spots でデータ取得
  - 都道府県・期間フィルター
  - SearchResultsView で表示
□ スポット選択時の既存ロジックとの統合

変更ファイル:
- components/SpotSelection.tsx（タブ内容の実装）
```

#### Day 7: テスト・調整・ドキュメント
**目標**: 品質確保とリリース準備

```
実装項目:
□ 統合テスト作成
□ 既存機能のリグレッションテスト
□ バグフィックス
□ 簡易ドキュメント更新

成果物:
- tests/components/SpotSelection.test.tsx（追加テスト）
- README更新（新機能の説明）
```

### 📝 簡略化した実装方針

#### ❌ 今回は実装しない（将来のリファクタリング候補）
- コンポーネントの細かい分割（`GoogleSpotSearch.tsx` など）
- 新規 Zustand ストア（`useSpotSearchStore`）の作成
- 共通コンポーネントへの移動（`components/common/`）
- 既存のGoogle検索部分のリファクタリング

#### ✅ 今回実装する（最小限のスコープ）
1. **2つのカスタムフック**
   - `use-wishlist-spots.ts`（30行程度）
   - `use-visited-spots.ts`（30行程度）

2. **SpotSelection.tsx へのタブ追加**
   - 既存コードはできるだけ維持
   - タブUIコンポーネント（Radix UI）を追加
   - タブ毎のコンテンツを条件分岐で実装

3. **最小限のテスト**
   - カスタムフックの単体テスト
   - タブ切り替えの統合テスト

### 🎯 期待される成果（1週間後）

#### 機能面
- ✅ 行きたいリストからスポット選択可能
- ✅ 過去の訪問・計画スポットから選択可能
- ✅ 既存のGoogle検索機能は完全に維持
- ✅ タブで切り替えながら複数の検索方法を利用可能

#### 技術面
- ✅ バックエンドAPIとの連携完了
- ✅ 既存コードへの影響を最小限に抑制
- ✅ 基本的なテストカバレッジを確保
- ⚠️ 大規模なリファクタリングは次のフェーズへ延期

#### コード規模
- **新規ファイル**: 2ファイル（フック2つ）
- **変更ファイル**: 1ファイル（SpotSelection.tsx のみ）
- **追加行数**: 約200-300行
- **テストコード**: 約100-150行

### 🔮 将来のリファクタリング計画（別タスク）

1週間実装が完了し、機能が安定してから以下を検討：

1. **コンポーネント分割**（2-3日）
   - `GoogleSpotSearch.tsx`
   - `WishlistSpotSearch.tsx`
   - `VisitedSpotSearch.tsx`

2. **Zustand ストア追加**（1-2日）
   - `useSpotSearchStore` の実装
   - 検索状態の集中管理

3. **共通化**（1-2日）
   - `SearchResultsView` を `common/` へ移動
   - `LocationAdjustModal` を `common/` へ移動

4. **テスト充実**（2-3日）
   - カバレッジ80%以上
   - E2Eテスト追加
