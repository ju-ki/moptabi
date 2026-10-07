# No.411 出発地と目的地の連動が効いていない 調査報告

調査対象: `dev` (c5202a2)

## 1. Issue の内容

単日なら出発地と目的地、複数日なら前日の目的地と翌日の出発地が連動するはずだが、
チェックを付けて位置などを変えても変わらない。

仕様（`docs/画面設計書.md` 「連動機能（チェックボックス）」、`docs/pages/plan-create.md:169-170`）

| 条件 | ON 時の動作 |
| --- | --- |
| 単一日 | 出発地と目的地が同じ値になる（双方向）。時刻は連動させない |
| 複数日 | 前日の目的地を変えると翌日の出発地も変わる（片方向）。時刻は連動させない |

## 2. 結論

「チェックを付けた後に地点を変える」操作の連動処理そのものは動いている。
問題は次の 3 点で、1 が Issue の症状の主因と考えられる。

1. **チェックを付けた瞬間には何も同期されない**（主因）
2. **連動で地点以外の経路情報までコピーしている**ため、プランニング実行後に出発地の経路情報が目的地のもので上書きされる
3. 連動先の名前が空のとき、反対側の既定名（`出発地_日付`）が入る（軽微）

### 確認方法

- 既存のストア単体テスト `src/tests/components/travel-plan/DepartureAndDestination.spec.tsx` は 56 件すべて通過
- 一時的に `Departure` コンポーネントと `LocationLinkCheckbox` を描画するテストを書き（GoogleMap はモック）、
  画面のチェックボックスをクリック → 地図クリック、の操作で確認した（テストはコミットしていない）

| 操作 | 結果 |
| --- | --- |
| 単日: チェック ON → 出発地タブで地図クリック | 目的地も同じ座標になる（連動する） |
| 複数日: チェック ON → 1 日目の目的地タブで地図クリック | 2 日目の出発地も同じ座標になる（連動する） |
| 単日: 出発地と目的地が別の状態でチェック ON | **目的地は変わらない** |
| 単日・ON: プランニング結果の書き戻し（`use-planning.ts:112-117` と同じ順で 2 回呼ぶ） | **出発地の `travelTime / transportMethod / nearestStation` が目的地の値で上書きされる** |

## 3. 原因の詳細

### 3-1. ON にしたとき同期処理がない（主因）

- `frontend/src/lib/plan.ts:317` `setIsLocationLinked` はフラグを切り替えるだけ
- 連動は `setDepartureAndDestination`（`frontend/src/lib/plan.ts:362-460`）の中でだけ行われ、
  「地点を変更したとき」にしか動かない

プラン作成画面を開いた時点で、出発地・目的地にはそれぞれデフォルト地点（または東京駅）が入っている
（`frontend/src/app/plan/create/page.tsx:43-65`）。この状態でチェックを付けても目的地・翌日の出発地は変わらず、
画面上は「チェックを付けたのに連動していない」ように見える。
また、チェック後に変更したのが連動元ではない側（複数日で翌日の出発地、など）の場合も、仕様上片方向なので反映されない。

### 3-2. 経路情報までコピーしている

`frontend/src/lib/plan.ts:113-125` `copyLinkedLocationPreservingTime` は、時刻以外の全項目を反対側へコピーする。

```ts
return { ...source, name, time: current.time, locationType: ... };
```

出発地と目的地では次の項目の意味が違う。

| 項目 | 出発地での意味 | 目的地での意味 |
| --- | --- | --- |
| `travelTime` / `transportMethod` / `transportMethodId` | 出発地 → 最初のスポットの移動 | 最後のスポット → 目的地の移動 |
| `alternateRoutes` | 同上の代替ルート | 同上の代替ルート |
| `nearestStation.transitTime` / `scheduledDepartureTime(s)` / `memo` | 出発地側の発車時刻メモ等 | 目的地側の発車時刻メモ等 |

単日で ON のままプランニングすると、`frontend/src/hooks/use-planning.ts:112-117` が
出発地 → 目的地の順に結果を書き戻す。2 回目（目的地）の書き戻しで連動が働き、
出発地の `travelTime / transportMethod / nearestStation` が目的地の値で上書きされる。
この値はそのまま保存（`CreatePlanButton.tsx`）される。

### 3-3. 連動先の既定名

名前を付けていない出発地には `出発地_日付` という既定名が入っている（`plan.ts:532`, `plan.ts:397`）。
地図クリック等で座標だけ変えると、この既定名がそのまま「名前」として目的地へコピーされ（`plan.ts:414-415`）、
目的地の名前が `出発地_日付` になる（再現テストで確認）。表示上の違和感のみ。

### 補足（今回の対象外）

- `isLocationLinked` は DB に保存しておらず、編集画面を開くと常に OFF になる（`createPlanningInitialState`）。
  設計書に保存の記載はないため現状維持とする
- 複数日の連動条件 `nextDayPlanIndex > 0`（`plan.ts:442`）は、`addDateWithDefaultLocation` が日付順にソートするため実害はない

## 4. 修正方針（案）

修正対象は `frontend/src/lib/plan.ts` のみ（＋テスト）。画面側の変更は不要。

1. **ON にした時点で同期する**
   - `setIsLocationLinked(true)` のとき、同じ `set` の中で次を行う
     - 単日: 出発地 → 目的地へコピー（出発地を基準にする）
     - 複数日: 各日の目的地 → 翌日の出発地へコピー
   - OFF にしたときは何もしない（値はそのまま残す）
   - プランニング済みの日付は `dirtyPlanningDates` を立てる（既存の `hasDirtyDepartureAndDestinationChange` を利用）
2. **コピーする項目を地点情報に限定する**
   - `copyLinkedLocationPreservingTime` を、`name / latitude / longitude / userLocationId` と、最寄駅の地点情報
     （`nearestStation` の `placeId / stationType / name / latitude / longitude / walkingTime / distance`、`isSetSelectedNearestStation`）だけを
     コピーする形に変える
   - `travelTime / transportMethod / transportMethodId / alternateRoutes` と、最寄駅の発車時刻・メモ・`transitTime` は連動先の現在値を残す
3. **連動先の既定名**: コピー元の名前が既定名（`出発地_日付` / `目的地_日付`）または空のときは、連動先の種別・日付に合わせた既定名にする

### 判断してほしい点

- A. ON にした時の基準: 単日は「出発地に合わせる」でよいか（推奨。目的地に合わせる案もある）
- B. 最寄駅をコピーするか: 同じ地点なら最寄駅も同じになるので、地点情報としてはコピーする（推奨）。
  ただし最寄駅を使うか（`isSetSelectedNearestStation`）を出発地・目的地で別にしたい場合はコピーしない

方針が決まったら、`docs/tasks/No.411_実装計画.md`・`docs/test/No.411_動作確認手順.md`・処理フロー図を作成してから実装に入る。
