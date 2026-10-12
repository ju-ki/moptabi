# No.411 出発地と目的地の連動バグ 実装計画

## PR #436 レビュー所見

調査報告書の内容・コードとの照合結果はすべて正確。実装前の判断事項（A・B）については下記の通り決定する。

- **A（ON 時の基準）**: 「出発地に合わせる」を採用。  
  画面の UI が出発地を起点に設計されており、ユーザーの直感とも一致する。
- **B（最寄駅のコピー範囲）**: 地点情報のみコピーし、発車時刻・待機時間等は連動先の現在値を保持する。  
  出発地・目的地では発車時刻やメモの意味が異なるため。

---

## 修正対象ファイル

| ファイル | 変更種別 |
|---|---|
| `frontend/src/lib/plan.ts` | 修正 |
| `frontend/src/tests/components/travel-plan/DepartureAndDestination.spec.tsx` | 修正（テスト追加） |

画面コンポーネント・hooks への変更は不要。

---

## 変更内容

### 1. `copyLinkedLocationPreservingTime` の修正（plan.ts:113-125）

**現状**: `{ ...source, name, time, locationType }` — 経路情報（`travelTime` / `transportMethod` / `transportMethodId` / `alternateRoutes`）もすべてコピーしてしまっている。

**修正後**: コピーするフィールドを地点情報のみに限定する。

コピーするフィールド:
- ベース: `latitude`, `longitude`, `userLocationId`
- 最寄駅の地点情報: `placeId`, `stationType`, `name`, `latitude`, `longitude`, `walkingTime`, `distance`
- `isSetSelectedNearestStation`

保持するフィールド（`current` の値を使う）:
- `travelTime`, `transportMethod`, `transportMethodId`, `alternateRoutes`
- `nearestStation.transitTime`, `scheduledDepartureTime`, `scheduledDepartureTimes`, `memo`, `waitingTime`, `transportMethodId`
- `time`（既存通り）

```ts
function copyLinkedLocationPreservingTime(
  source: ExtendPlanLocationType,
  current: ExtendPlanLocationType,
  name: string,
  locationType?: TransportNodeType,
): ExtendPlanLocationType {
  // 最寄駅: 地点情報のみコピー、発車時刻・メモは連動先の現在値を保持
  const nearestStation: ExtendNearestStationType | undefined = source.nearestStation
    ? {
        // 連動先に最寄駅情報がある場合はそちらの路線情報を保持
        ...(current.nearestStation ?? {}),
        // 地点情報のみ上書き
        placeId: source.nearestStation.placeId,
        stationType: source.nearestStation.stationType,
        name: source.nearestStation.name,
        latitude: source.nearestStation.latitude,
        longitude: source.nearestStation.longitude,
        walkingTime: source.nearestStation.walkingTime,
        distance: source.nearestStation.distance,
      }
    : current.nearestStation;

  return {
    ...current, // 経路情報（travelTime, transportMethod, alternateRoutes 等）は current を保持
    // 地点情報のみ source から上書き
    latitude: source.latitude,
    longitude: source.longitude,
    userLocationId: source.userLocationId,
    isSetSelectedNearestStation: source.isSetSelectedNearestStation,
    nearestStation,
    // メタ情報
    name,
    locationType: locationType ?? source.locationType,
  };
}
```

### 2. `setIsLocationLinked` に ON 時の即時同期を追加（plan.ts:317付近）

**現状**: フラグを切り替えるだけ。

**修正後**: `isLinked === true` のとき、同じ `set` の中で既存地点を同期する。

```ts
setIsLocationLinked: (isLinked) =>
  set((state) => {
    state.isLocationLinked = isLinked;
    if (!isLinked) return; // OFF 時は何もしない

    const dates = getDatesBetween(new Date(state.startDate), new Date(state.endDate));
    const isSingleDay = dates.length === 1;

    if (isSingleDay) {
      // 単日: 出発地 → 目的地へ同期
      const plan = state.plans.find((p) => p.date === dates[0]);
      if (!plan) return;
      const sourceName = plan.departure.name;
      const destName = resolveLinkedName(sourceName, TransportNodeType.DESTINATION, dates[0]);
      plan.destination = copyLinkedLocationPreservingTime(
        plan.departure,
        plan.destination,
        destName,
        TransportNodeType.DESTINATION,
      );
      if (state.planningSpotSnapshots[dates[0]]) {
        state.dirtyPlanningDates[dates[0]] = true;
      }
    } else {
      // 複数日: 各日の目的地 → 翌日の出発地へ同期
      for (let i = 0; i < dates.length - 1; i++) {
        const currentPlan = state.plans.find((p) => p.date === dates[i]);
        const nextPlan = state.plans.find((p) => p.date === dates[i + 1]);
        if (!currentPlan || !nextPlan) continue;
        const depName = resolveLinkedName(
          currentPlan.destination.name,
          TransportNodeType.DEPARTURE,
          dates[i + 1],
        );
        nextPlan.departure = copyLinkedLocationPreservingTime(
          currentPlan.destination,
          nextPlan.departure,
          depName,
          TransportNodeType.DEPARTURE,
        );
        if (state.planningSpotSnapshots[dates[i + 1]]) {
          state.dirtyPlanningDates[dates[i + 1]] = true;
        }
      }
    }
  }),
```

### 3. `resolveLinkedName` ヘルパー関数の追加

既定名（`出発地_日付` / `目的地_日付`）または空の場合、連動先の種別に合わせた既定名を返す。

```ts
function resolveLinkedName(
  sourceName: string,
  targetType: TransportNodeType,
  date: string,
): string {
  const defaultPattern = /^(出発地|目的地)_/;
  if (!sourceName || defaultPattern.test(sourceName)) {
    return targetType === TransportNodeType.DEPARTURE ? `出発地_${date}` : `目的地_${date}`;
  }
  return sourceName;
}
```

既存の `setDepartureAndDestination` 内の `linkedLocationName` 計算もこの関数に統一する。

---

## テスト追加（DepartureAndDestination.spec.tsx）

以下のケースを追加する。

| # | テストケース |
|---|---|
| T1 | 単日: チェック ON → 出発地の座標・名前が目的地へ即時コピーされる |
| T2 | 単日: チェック ON → 目的地の `travelTime` / `transportMethod` は変わらない |
| T3 | 単日: チェック ON → 出発地の名前が既定名のとき、目的地の名前は `目的地_日付` になる |
| T4 | 複数日: チェック ON → 1 日目目的地の座標が 2 日目出発地へ即時コピーされる |
| T5 | 単日 ON: プランニング結果書き戻し後に出発地の `travelTime` が目的地の値で上書きされない |
| T6 | 単日: チェック OFF → 地点は変わらない |

---

## 実装手順

1. `resolveLinkedName` ヘルパーを `plan.ts` に追加
2. `copyLinkedLocationPreservingTime` を修正
3. 既存 `setDepartureAndDestination` 内の `linkedLocationName` 計算を `resolveLinkedName` に置き換え
4. `setIsLocationLinked` を修正して ON 時同期を追加
5. テスト T1〜T6 を追加し、`bun run test` で全件グリーンを確認
6. `npm run typecheck` でエラーがないことを確認
