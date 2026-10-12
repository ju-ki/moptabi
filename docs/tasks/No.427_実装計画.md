# No.427 マイページで最寄駅＋デフォルト設定時に最寄駅が選択されない 調査と実装計画

調査対象: `dev` (622c388)

## 1. 再現条件

1. マイページで出発地を登録し、最寄駅を選択して「デフォルト」にチェックを入れて保存する
2. プラン作成画面（`/plan/create`）を開く
3. 出発地にはデフォルト地点の名前・座標が入るが、最寄駅が未選択の状態になる
   （移動手段も `DEFAULT` のまま。出発地コンボボックスの表示も「出発地を選択」になる）

同じお気に入りをコンボボックスから手動で選び直すと最寄駅は正しく入る。

## 2. 原因

デフォルト地点をプランに流し込む処理が、最寄駅関連の項目を渡していない。

- `frontend/src/app/plan/create/page.tsx:54-90`
- `frontend/src/app/plan/[id]/edit/page.tsx:76-112`（新しく追加された日付に対して同じ処理）

この2か所は `defaultDeparture` から `name / latitude / longitude / planId` だけを取り出して
`addDateWithDefaultLocation` に渡しており、次の項目が抜けている。

| 項目 | 手動選択時（`Departure.tsx:149-181`） | デフォルト反映時 |
| --- | --- | --- |
| `userLocationId` | 候補の値 | なし（→ コンボボックスが「出発地を選択」表示、使用回数も更新されない） |
| `nearestStation` | 候補の最寄駅（名前・座標・徒歩時間・距離・`transitTime: 0`） | なし |
| `isSetSelectedNearestStation` | 最寄駅があれば `true` | なし |
| `transportMethod` / `transportMethodId` | 最寄駅があれば `TRANSIT` / `4` | 常に `DEFAULT` / `0` |

候補データ自体には最寄駅が入っている。バックエンド（`backend/src/services/planLocation.ts:116-131`）は
`placeId / stationType` を返し、`frontend/src/hooks/use-plan-location.ts:20-55` の
`enrichUserLocationWithNearestStation` が Place Details で名前・座標・徒歩時間を補完している。
つまり「データはあるのに、デフォルト反映のコードが拾っていない」だけで、バックエンドの変更は不要。

`NearestStationDeparture`（`SpotSettingEditor.tsx:190` で最初のスポットに表示）は `useState` の初期値を
`departureData.nearestStation` から作るが、プランはデフォルト反映後に作られるので、反映さえされれば初期表示は正しくなる。

## 3. 方針

お気に入り候補 → 出発地（`ExtendPlanLocationType`）への変換を純粋関数に切り出し、
手動選択・作成画面のデフォルト反映・編集画面のデフォルト反映の3か所で共通化する。
変換ロジックが1か所になるので、今後どれか1か所だけ項目が抜ける事故を防げる。

### 追加する関数（案）

`frontend/src/lib/plan-location.ts`（新規）

```ts
// お気に入り候補から出発地データを組み立てる。候補がなければ DEFAULT_DEPARTURE_AND_DESTINATION を使う
export function buildDepartureFromCandidate(candidate?: PlanLocationCandidateItemType): ExtendPlanLocationType
// 目的地版（Departure.tsx の目的地お気に入り選択と同じく最寄駅も引き継ぐ）
export function buildDestinationFromCandidate(candidate?: PlanLocationCandidateItemType): ExtendPlanLocationType
```

- 最寄駅あり: `nearestStation`（`distance` は `calculateDistance` で算出、`transitTime: 0`）、`isSetSelectedNearestStation: true`、`TRANSIT` / `4`
- 最寄駅なし（未登録、または Place Details の補完失敗で `null`）: 従来どおり `DEFAULT` / `0`、`nearestStation: undefined`
- `userLocationId` を必ず引き継ぐ

## 4. 実装ステップ（TDD）

ブランチ: `feature427`（`dev` から作成）、PR は `dev` 向け。

1. **Red**: `frontend/src/tests/lib/plan-location.spec.ts` を追加
   - 最寄駅付きのお気に入りから、`nearestStation`・`isSetSelectedNearestStation: true`・`TRANSIT`/`4`・`userLocationId` が入ること
   - 最寄駅なしのお気に入りでは `DEFAULT`/`0`、`nearestStation` が `undefined` であること
   - 候補が `undefined` のとき既定値（`DEFAULT_DEPARTURE_AND_DESTINATION`）になること
2. **Red**: `frontend/src/tests/app/plan-create/page.spec.tsx` にケースを追加
   - 最寄駅付きのデフォルト出発地を返す候補をモックし、`addDateWithDefaultLocation` が最寄駅・`isSetSelectedNearestStation: true` を含む出発地で呼ばれること
   - （既存テストは `usePlanLocationCandidates` を固定モックしているので、ケースごとに返り値を切り替えられる形に変更）
3. **Green**: `plan-location.ts` を実装し、`plan/create/page.tsx` と `plan/[id]/edit/page.tsx` のデフォルト反映をこの関数に置き換える
   - `plan/create/page.tsx:57-89` の `dates.forEach` 内で `addDateWithDefaultLocation` に渡している出発地・目的地のオブジェクトリテラルを、
     `buildDepartureFromCandidate(defaultDeparture)` / `buildDestinationFromCandidate(defaultDestination)` の呼び出しに置き換える
   - `plan/[id]/edit/page.tsx:79-111` の同じブロックも同様に置き換える
4. **Refactor**: `Departure.tsx` のお気に入り選択（出発地側）も同じ関数を使うように置き換え、既存の `DepartureAndDestination.spec.tsx` が通ることを確認
5. 編集画面のテストは見送り（理由は下記「編集画面のテスト」）
6. `pnpm run lint` / `pnpm run typecheck` / frontend のテストを通す

## 5. 確認したいこと・スコープ外

- **目的地の最寄駅**（実装時に訂正）: 当初「目的地は最寄駅を使っていない」と書いたが、根拠にした `Destination.tsx` は `PlanningComp.tsx` で import されているだけで描画されていなかった。実際に使われている `Departure.tsx` の目的地お気に入り選択は最寄駅を反映していたため、目的地のデフォルト反映も最寄駅を引き継ぐようにした。
- **編集画面のテスト**: `edit/page.tsx` は `React.use(params)` を使うが、テスト環境の React が 18.3 で `use` がないため描画テストを追加できなかった。変換処理は `plan-location.spec.ts` で検証している。
- 手動確認: staging 相当のデータ（最寄駅付きデフォルト地点）でプラン作成画面を開き、最初のスポットの「出発地の最寄駅」に駅が選択済みで表示されることを確認する。
