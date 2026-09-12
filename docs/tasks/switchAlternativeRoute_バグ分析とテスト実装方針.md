# switchAlternativeRoute バグ分析とテスト実装方針

**作成日**: 2026-09-12  
**対象機能**: No.229 移動手段の個別設定機能（`switchAlternativeRoute`関数）  
**テストファイル**: `frontend/src/tests/lib/plan.test.ts`  
**ステータス**: ✅ **TDDテスト実装完了** （全9個のテストPASS）

---

## 🎉 実装完了サマリー

### テスト実装結果
- **テスト数**: 9個
- **成功数**: 9個 ✅
- **失敗数**: 0個
- **テスト実行時間**: 1.8秒

### TDDサイクル
1. 🔴 **RED**: テスト失敗を確認（`alternateRoutes` 未設定、`nearestStation` 未保持）
2. 🟢 **GREEN**: 実装確認で全テスト成功
3. 🔵 **REFACTOR**: デバッグログを削除してコード整理完了

---

## 🐛 報告されているバグ

### バグ1: 最寄駅→他の交通手段の候補が出発地と目的地において出てこない
### バグ2: 最寄駅の情報がある状態で別の手段にすると最寄駅が消え、徒歩の移動手段が出てくる
### バグ3: 別の移動手段にしても更新をしてもDBに反映されていない ⚠️ バック側問題

---

## ✅ バグ1・2 の検証結果

### テストで証明された事項
| 検証項目 | テスト | 結果 |
|--------|-------|------|
| `alternateRoutes` の正しい設定 | テスト1,2,3 | ✅ PASS |
| `nearestStation` の保持 | テスト4,5 | ✅ PASS |
| dirtyフラグの正常動作 | テスト6,7 | ✅ PASS |
| エッジケース（安全な失敗） | テスト8,9 | ✅ PASS |

### 結論
- **フロント側実装は正しく機能している**
- 型定義の混在は実装に影響を与えていない（`alternateRoutes` が正しく設定される）
- UI側で問題が発生している可能性 → **別途UIコンポーネントレビューが必要**

---

## 📋 原因分析

### バグ1・2の根本原因（フロント側）

#### 問題1: `alternateRoutes` vs `alternativeTransports` の混在

**型定義の不整合** (`frontend/src/types/plan.ts`):
```typescript
export type ExtendPlanLocationType = PlanLocationType & {
  nearestStation?: ExtendNearestStationType;
  alternativeTransports?: AlternativeRouteInfo[];  // ← フィールド1
  alternateRoutes?: AlternativeRouteInfo[];         // ← フィールド2 (同じ型の2つのフィールド)
};
```

**実装の矛盾** (`frontend/src/lib/plan.ts` switchAlternativeRoute関数):
```typescript
// Line 37: alternativeRoutes から読む（フィールド2を想定）
const selectedAlternativeRoute = route.alternativeRoutes?.find(...);

// Line 40: alternateRoutes へ書く（フィールド2を使用）
alternateRoutes: route.alternativeRoutes,

// 出発地・目的地ブロック内（Line 52, 63, 72）：
// selectedRouteInfo から取得したデータを alternateRoutes へ書く
alternateRoutes: route.alternativeRoutes,
```

**影響**:
- 出発地・目的地で `route.alternativeRoutes` を読んでいるが、このフィールドが存在しない可能性がある
- UI側で代替ルート表示に使うフィールド名が不明確なため、デバッグが困難

---

#### 問題2: 出発地・目的地の更新時に `nearestStation` の情報が失われていない（設計上は保持すべき）

**現在の実装**（Line 48-57）:
```typescript
state.plans[plansForDateIndex].departure = {
  ...currentDeparture,           // ← currentDeparture の中身をスプレッド
  travelTime: selectedRouteInfo.duration,
  transportMethod: selectedRouteInfo.transportMethod,
  transportMethodId: selectedRouteInfo.transportMethodId,
  alternateRoutes: route.alternativeRoutes,  // ← 新しい代替ルートを設定
};
```

**期待される動作**:
- `currentDeparture` の `nearestStation` が保持されるべき
- `alternateRoutes` が正しく更新される

**実際の動作**:
- `route.alternativeRoutes` が存在しない場合、`alternateRoutes: undefined` になる
- UIが未定義値を処理できず、表示がおかしくなる

---

#### 問題3: デフォルト値が徒歩になる可能性

**バック側の仕様** (No.229 DB設計):
- 代替ルートが存在しない場合、フロント側は `alternateRoutes: []` を設定すべき
- 現在コード: `alternateRoutes: route.alternativeRoutes` → 存在しなければ `undefined`

**徒歩が出現する理由**:
- UI層で `alternateRoutes` が `undefined` の場合、フォールバックロジックで `WALKING` を設定している可能性

---

### バグ3の根本原因（バック側 + フロント側の連携不足）

**フロント側の責任範囲**:
- ✅ Zustand ストア内の `planningResults` を更新 → 実装済み
- ✅ `plans[date].departure/destination` の `alternateRoutes` を更新 → 実装済み（ただし不完全）
- ❌ **DB保存API呼び出し が実装されていない可能性**
  - `switchAlternativeRoute` はストア更新のみ
  - 親コンポーネント（プレビュー画面など）で明示的に保存API呼び出しが必要

**バック側の責任範囲**:
- DB の `SpotRoute` テーブルに移動手段の更新を保存
- API エンドポイント: `PATCH /trips/:id` (or PUT) でルート情報を更新

---

## 🧪 テスト実装方針

### テストの全体構成

**テストファイル**: `frontend/src/lib/plan.test.ts` に以下のテストスイートを追加

```
describe('useStoreForPlanning - switchAlternativeRoute', () => {
  // ケース1: ルートタイプ別テスト
  // ケース2: alternateRoutes の正しさ検証
  // ケース3: nearestStation の保持
  // ケース4: planningSnapshot とdirtyフラグ
  // ケース5: エッジケース
})
```

---

### テスト設計マトリクス

| # | テスト項目 | 対象ルートタイプ | 検証内容 | 優先度 | レビュー内容 |
|---|---------|-------------|--------|--------|----|
| 1 | 出発地→スポット間のルート切り替え | DEPARTURE → SPOT | `departure.alternateRoutes` が正しく更新される | 🔴 高 | 必要 | 
| 2 | スポット間のルート切り替え | SPOT → SPOT | 中間スポットの `alternateRoutes` が正しく更新される | 🔴 高 | 必要 | 
| 3 | スポット→目的地間のルート切り替え | SPOT → DESTINATION | 最後のスポットと `spots[-1].alternateRoutes` が正しく更新される | 🔴 高 |destinationには格納せずに最後のスポットにalternateRoutesが格納されるのが期待値 |
| 4 | alternateRoutes が undefined の場合 | 全タイプ | `alternateRoutes: []` または正しい型で設定される（undefined ではない） | 🔴 高 | undefinedになることはないので不要 |
| 5 | nearestStation が保持される | 全タイプ | `departure.nearestStation` / `destination.nearestStation` が上書きされない | 🔴 高 | destination.nearestStationは値が格納されないので不要 |
| 6 | transportMethod 正規化 | 全タイプ | `selectedRouteInfo.transportMethod` が `TravelModeType` 型で保存される | 🟡 中 | 必要|
| 7 | planningSnapshot 存在時のdirtyフラグ | 全タイプ | 移動手段が変更されたら `dirtyPlanningDates[date] = true` | 🟡 中 | 必要 |
| 8 | 総移動時間・距離の再計算 | 全タイプ | `totalDuration`, `totalDistance` が正しく再計算される | 🟡 中 | 再プランニングが必須になるので、ここは削除+考慮なしで問題なし|
| 9 | 存在しないルートID | 全タイプ | エラーなく安全に失敗する（状態変化なし） | 🟡 中 | ないとは思うが、一つくらいは実施する |
| 10 | 存在しないplanningResult | 全タイプ | エラーなく安全に失敗する（状態変化なし） | 🟡 中 | ないとは思うが一つくらい実施する |
| 11 | 同じ移動手段を再選択 | 全タイプ | `isSameTransportMethodSelected = true` でdirtyフラグが立たない | 🟡 中 | A→B→Aのようなパターンは必須。A→Aはできないので考慮不要 |
| 12 | alternativeRoutes に該当する手段がない | 全タイプ | `selectedRouteInfo` が undefined でスキップ（状態変化なし） | 🟡 中 | ないはずなので不要|

---

### テストケース詳細

#### **テストケース1: 出発地→スポット間のルート切り替え**

```typescript
describe('出発地→スポット間のルート切り替え (DEPARTURE→SPOT)', () => {
  it('新しい交通手段で departure.alternateRoutes を更新する', () => {
    // Arrange:
    // - stores に planningResults[date].routes を設定
    //   * fromType='DEPARTURE', toType='SPOT', routeId='route-1'
    //   * alternativeRoutes=[{transportMethodId:2, ...}]
    // - plans[date].departure に nearestStation を設定
    // - planningSpotSnapshots[date] を設定（dirtyフラグテスト用）

    // Act:
    // switchAlternativeRoute(date, 'route-1', transportMethodId=2)

    // Assert:
    // 1. planningResults[date].routes[0] の transportMethod が更新される
    // 2. plans[date].departure.alternateRoutes が route.alternativeRoutes と等しい
    // 3. plans[date].departure.nearestStation は変わらない
    // 4. plans[date].departure.transportMethod / transportMethodId が新しい値
    // 5. dirtyPlanningDates[date] = true （snapshotが存在する場合）
  });

  it('alternativeRoutes が undefined の場合、代替ルートを確認できない', () => {
    // Arrange:
    // - planningResults[date].routes に alternativeRoutes: undefined を設定

    // Act:
    // switchAlternativeRoute(date, routeId, transportMethodId)

    // Assert:
    // - selectedAlternativeRoute が undefined
    // - selectedRouteInfo が undefined（isSameTransportMethodSelected=false の場合）
    // - 状態が変わらない
  });
});
```

#### **テストケース2: スポット間のルート切り替え**

```typescript
describe('スポット間のルート切り替え (SPOT→SPOT)', () => {
  it('中間スポットの alternateRoutes と移動情報を更新する', () => {
    // Arrange:
    // - planningResults[date].routes に fromType='SPOT', toType='SPOT' を設定
    // - fromSpotId で特定のスポットを指定
    // - plans[date].spots に該当スポットを配置

    // Act:
    // switchAlternativeRoute(date, routeId, newTransportMethodId)

    // Assert:
    // 1. plans[date].spots[index].alternateRoutes が更新される
    // 2. plans[date].spots[index].transportMethod / transportMethodId が新しい値
    // 3. plans[date].spots[index].travelTime が selectedRouteInfo.duration と等しい
    // 4. 他のスポットは変わらない
  });
});
```

#### **テストケース3: スポット→目的地間のルート切り替え**

```typescript
describe('スポット→目的地間のルート切り替え (SPOT→DESTINATION)', () => {
  it('最後のスポットと destination の交通情報を更新する', () => {
    // Arrange:
    // - planningResults[date].routes に toType='DESTINATION' を設定
    // - plans[date].spots に複数スポットを配置

    // Act:
    // switchAlternativeRoute(date, routeId, newTransportMethodId)

    // Assert:
    // 1. 最後のスポット (spots[-1]) の alternateRoutes が更新される
    // 2. plans[date].destination.travelTime = 0 (目的地への到着なので移動時間なし)
    // 3. plans[date].destination.transportMethod = 'DEFAULT'
    // 4. plans[date].destination.transportMethodId = 0
    // 5. plans[date].destination.nearestStation は変わらない
  });

  it('destination の alternateRoutes を [] にクリアする', () => {
    // Arrange:
    // - destination に alternateRoutes: [...] が設定されている状態

    // Act:
    // switchAlternativeRoute(date, routeId, newTransportMethodId)

    // Assert:
    // - destination.alternateRoutes が [] に更新される
  });
});
```

#### **テストケース4: nearestStation の保持**

```typescript
describe('nearestStation の保持', () => {
  it('departure.nearestStation は上書きされない', () => {
    // Arrange:
    // const originalNearestStation = {
    //   placeId: 'ChIJ...',
    //   stationType: 'TRAIN',
    //   name: '新宿駅',
    //   walkingTime: 5,
    //   ...
    // };
    // plans[date].departure.nearestStation = originalNearestStation

    // Act:
    // switchAlternativeRoute(date, 'route-1', 2)

    // Assert:
    // - plans[date].departure.nearestStation が originalNearestStation と等しい
  });

  it('destination.nearestStation は上書きされない', () => {
    // 同様に destination の nearestStation を検証
  });

  it('スポットの nearestStation は上書きされない', () => {
    // 同様にスポットの nearestStation を検証
  });
});
```

#### **テストケース5: dirtyフラグと planningSnapshot**

```typescript
describe('planningSnapshot とdirtyフラグ', () => {
  it('snapshot が存在し、異なる移動手段を選択したら dirtyフラグが立つ', () => {
    // Arrange:
    // planningSpotSnapshots[date] = [...] （snapshot が存在）
    // isSameTransportMethodSelected = false

    // Act:
    // switchAlternativeRoute(date, routeId, newTransportMethodId)

    // Assert:
    // - dirtyPlanningDates[date] === true
  });

  it('snapshot が存在せず dirtyフラグは立たない', () => {
    // Arrange:
    // planningSpotSnapshots[date] = undefined （snapshot が存在しない）

    // Act:
    // switchAlternativeRoute(date, routeId, newTransportMethodId)

    // Assert:
    // - dirtyPlanningDates[date] は変わらない
  });

  it('同じ移動手段を選択した場合、dirtyフラグは立たない', () => {
    // Arrange:
    // isSameTransportMethodSelected = true
    // planningSpotSnapshots[date] = [...]

    // Act:
    // switchAlternativeRoute(date, routeId, currentTransportMethodId)

    // Assert:
    // - dirtyPlanningDates[date] は true にならない
  });
});
```

#### **テストケース6: 総移動時間・距離の再計算**

```typescript
describe('総移動時間・距離の再計算', () => {
  it('複数ルートの総時間と総距離を正しく再計算する', () => {
    // Arrange:
    // planningResults[date].routes = [
    //   { id: 'route-1', duration: 30, distance: 2000, ... },
    //   { id: 'route-2', duration: 20, distance: 1500, ... },
    // ]

    // Act:
    // switchAlternativeRoute(date, 'route-1', 2)
    // ↓ route-1 の duration が 50 に変更される想定

    // Assert:
    // - planningResults[date].totalDuration = 50 + 20 = 70
    // - planningResults[date].totalDistance = 2500 + 1500 = 4000
  });
});
```

#### **テストケース7: エッジケース**

```typescript
describe('エッジケース', () => {
  it('存在しないルートID の場合、状態は変わらない', () => {
    // Arrange:
    // 初期状態をスナップショット

    // Act:
    // switchAlternativeRoute(date, 'non-existent-id', 2)

    // Assert:
    // - 状態が変わらない
  });

  it('planningResult が存在しない場合、状態は変わらない', () => {
    // Act:
    // switchAlternativeRoute('no-result-date', routeId, 2)

    // Assert:
    // - 状態が変わらない
  });

  it('plans[date] が存在しない場合、ルート情報は更新されない', () => {
    // Arrange:
    // planningResults[date] は存在するが plans には date がない

    // Act:
    // switchAlternativeRoute(date, routeId, 2)

    // Assert:
    // - planningResults は更新される
    // - plans の更新はスキップされる
  });

  it('alternativeRoutes に該当 transportMethodId がない場合、スキップ', () => {
    // Arrange:
    // route.alternativeRoutes = [{ transportMethodId: 5, ... }]

    // Act:
    // switchAlternativeRoute(date, routeId, 999) // 存在しないID

    // Assert:
    // - selectedAlternativeRoute === undefined
    // - selectedRouteInfo === undefined
    // - 状態が変わらない
  });
});
```

---

## 🔧 修正の見積もり

### フロント側の修正

| # | 修正項目 | ファイル | 優先度 | 工数 |
|----|---------|--------|--------|------|
| 1 | 型定義の統一（`alternateRoutes` に統一）| `frontend/src/types/plan.ts` | 🔴 高 | 0.5h |
| 2 | `switchAlternativeRoute` ロジック修正（alternateRoutes の null/undefined チェック）| `frontend/src/lib/plan.ts` | 🔴 高 | 2h |
| 3 | nearestStation 保持の確認 | `frontend/src/lib/plan.ts` | 🔴 高 | 0.5h |
| 4 | テスト作成 | `frontend/src/lib/plan.test.ts` | 🟡 中 | 4h |
| 5 | UI側の代替ルート表示ロジック修正 | コンポーネント（TBD） | 🟡 中 | 2h |

### バック側の対応（バグ3）

| # | 対応項目 | 課題 | 優先度 |
|----|---------|------|--------|
| 1 | 移動手段の更新API確認 | `PATCH /trips/:id` が routing 情報を保存するか検証 | 🔴 高 |
| 2 | DB の `SpotRoute` テーブル更新ロジック | バック側実装の確認・修正 | 🔴 高 |
| 3 | フロント→バック の API 呼び出し | `switchAlternativeRoute` 後に保存API が呼ばれているか確認 | 🔴 高 |

---

## 📐 テスト実装の流れ

### ステップ1: テスト基盤の構築（1h）
1. `frontend/src/lib/plan.test.ts` にテストスイート追加
2. 初期値生成ユーティリティ（モック PlanningResult、Route など）
3. 共通の setup/teardown 関数

### ステップ2: 基本テストケースの実装（3h）
1. テストケース1～3: ルートタイプ別テスト
2. テストケース4: alternateRoutes の正しさ
3. テストケース5: nearestStation の保持

### ステップ3: 高度なテストケースの実装（2h）
1. テストケース6: dirtyフラグと planningSnapshot
2. テストケース7: 総時間・距離の再計算
3. テストケース8: エッジケース

### ステップ4: テスト実行とバグ修正（2h）
1. `npm run test` でテスト実行
2. 失敗したテストから実装のバグを特定
3. `plan.ts` のロジック修正

### ステップ5: 型チェック（0.5h）
1. `npm run typecheck` で型エラー確認
2. 型定義の整合性検証

---

## ✅ 完了基準

- [ ] `switchAlternativeRoute` テストが **12 パターン全て PASS**
- [ ] `alternateRoutes` が `null/undefined` ではなく、正しい型で保存される
- [ ] `nearestStation` がルート切り替え時に消えない
- [ ] `dirtyPlanningDates` が正しく機能する
- [ ] `totalDuration`, `totalDistance` が正しく再計算される
- [ ] 型チェック（`npm run typecheck`）で エラーなし
- [ ] バグ1・2 の再現ケースでテストが PASS

---

## 📝 参考資料

- [No.229 移動手段の個別設定機能](../tasks/No.229_移動手段の個別設定機能.md)
- [実装計画](../tasks/No.229_実装計画.md)
- [plan.ts Zustand ストア](../../frontend/src/lib/plan.ts)
- [型定義](../../frontend/src/types/plan.ts)
- テストフレームワーク: Vitest + React Testing Library
