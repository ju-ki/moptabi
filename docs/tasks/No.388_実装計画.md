# No.388 プランニングアルゴリズムの見直し 実装計画

- 元資料: `docs/tasks/No.388_プランニングアルゴリズムの見直し_調査報告.md`（以下「調査報告」）。バグ番号 B1〜B9、テスト観点 T1〜T14 は調査報告のものをそのまま使う。
- 計画時点のコード: `dev`（c5202a2）。調査時点（2eea03d）からプランニング関連のファイル（`planning.ts` / `plan.ts` / `use-planning.ts` / `travel-plan/*`）は変わっていない。
- ブランチ: `feature388`。実装前に `dev` を merge して最新化する（`Departure.tsx` が No.427 で `plan-location.ts` に切り出されているだけで、衝突はない見込み）。PR は `dev` 向け（#435 に積む）。

## 1. スコープ

調査報告「6. レビューでの決定事項」で「対応する」と決まったものだけを入れる。

| # | 内容 | 対応 |
| --- | --- | --- |
| B1 | 最寄駅 → 別手段に変えると最寄駅を再選択できない | 対応 |
| B2 | 最後のスポットの発車時間候補が無視され `['']` で上書きされる | 対応 |
| B3 | `scheduledDepartureTimes: ['']` がストアに保存される | 対応（#371 の前提） |
| B4 | プランの移動手段から外した手段が採用され続ける | 対応 |
| B5 | 23:59 を超えると到着超過が判定されない | 23:59 超過でエラーメッセージ |
| B6 | 後から最寄駅を設定しても前回の手段が残る | B1 と一緒に対応 |
| B7 | 並び替え後に手段・発車時間が別の区間に引き継がれる | 対応 |
| B9 | 片側だけ最寄駅がある区間が黙って直接移動になる | 警告メッセージを追加 |
| - | `calcDistance2` を `calcDistance` に置き換え | 対応 |
| - | テストを観点ごとに追える構造に組み直す | 対応 |

スコープ外: B8（最寄駅経由で成功しているのに取得失敗メッセージ）、乗車時間の初期見積もり（別 Issue）、全手段失敗時に時刻が進まない件。

## 2. 方針

### 2.1 区間計算を 1 つの関数にまとめる

`frontend/src/lib/planning.ts` の `runForwardPlanning` は、出発地／スポット間／目的地の 3 ブロックがほぼ同じ処理のコピーで、さらに `getOptimalRouteWithAlternatives` の中でも最寄駅計算をやり直している（調査報告 1.6）。B1・B2・B3 はどれもこの重複から生まれているので、個別にパッチを当てずに区間処理を 1 つにまとめる。

```ts
// planning.ts（内部関数。export はテスト用に限定）
type SegmentInput = {
  segmentKey: string;                 // DEPARTURE_TO_FIRST_SPOT / SPOT_{id}_TO_{id} / SPOT_{id}_TO_DESTINATION
  from: { name: string; lat: number; lng: number; nearestStation?: ExtendNearestStationType };
  to:   { name: string; lat: number; lng: number; nearestStation?: ExtendNearestStationType };
  currentMinutes: number;             // 区間開始時刻（通算分。24*60 を超えてよい）
  transportMethodIds: number[];       // プランで選んだ手段（1〜3）
  preferredMethodId?: number;         // 2.3 で検証済みの値だけが来る
  preferredDepartureTime?: string;
};

type SegmentResult = {
  route: RouteInfo;                   // 選択ルート + alternativeRoutes（ID4 を含む）
  travelMinutes: number;              // route.duration と常に一致
  stationResult?: {                   // 最寄駅経由を計算した場合のみ
    scheduledDepartureTime: string;
    waitingTime: number;
    transitTime: number;
  };
  messages: PlanningMessage[];
};

async function planSegment(input: SegmentInput): Promise<SegmentResult>
```

`planSegment` の中身:

1. 直接手段（`transportMethodIds` のうち 1〜3、2.3 の preferred を含む）を `getRoute` で取得する。
2. **両端に最寄駅があれば、最寄駅ルートを常に 1 回だけ計算する**（`buildNearestStationRouteInfo` を 1 回呼ぶ）。発車時間候補は**出発側ノード**の `scheduledDepartureTimes` を使い、空なら `[preferredDepartureTime]`、それも無ければ空配列で `selectDepartureCandidate` に渡す。
3. 選択:
   - `preferredMethodId` が 1〜3 で取得できていれば、それを選ぶ。
   - それ以外で最寄駅ルートがあれば、ID4 を選ぶ。
   - それ以外は優先度最上位（車＞自転車＞徒歩）。何も取れなければ、今と同じ徒歩フォールバック。
4. `alternativeRoutes` は、選択ルートと取得できた他の手段、**最寄駅ルート（ID4）** を必ず含める（B1）。ID4 の duration と、ID4 を選んだときの `travelMinutes` は同じ計算結果を使う（T12）。
5. メッセージ: 取得失敗／徒歩フォールバック／発車時間補正／長距離徒歩（今と同じ）＋ 片側だけ最寄駅（B9、2.5）。

`runForwardPlanning` は、区間ごとに `planSegment` を呼んで滞在時間を足すだけのループにする。ノードへの書き戻し（`travelTime` / `transportMethodId` / `nearestStation.scheduledDepartureTime` / `waitingTime`）もループ側で 1 か所にまとめる。

これに伴って消えるもの:
- `calculateTotalNearestStationDuration` の呼び出し元での再計算（3 か所）
- `getOptimalRouteWithAlternatives` の `useNearestStation && preferred` の到達不能な分岐
- `buildRouteInfo` の「`selectedNearestStationRoute` があれば ID4 を足す」処理（`planSegment` が常に入れるため）
- 目的地区間の `updatedDestination.nearestStation.transitTime = 0` の上書き

`getOptimalRouteWithAlternatives` は既存テストから直接呼ばれているので、直接手段の取得と選択（手順 1・3 の直接手段部分）だけを残し、シグネチャは変えない。

### 2.2 発車時間候補はユーザー入力のまま保存する（B2・B3）

- 計算用の候補（`[preferredDepartureTime]` などの補完を含む）と、ノードに保存する `scheduledDepartureTimes` を分ける。保存するのは**ユーザーが入力した配列そのまま**（空なら空のまま）。書き戻すのは `scheduledDepartureTime`（採用した時刻）と `waitingTime` だけにする。
- 目的地区間も出発側ノード（最終スポット）の候補を使う（B2）。今の UI では、最後の区間の発車時間の入力欄は最終スポットの `PlanSpotSettingCard` にしかなく、`NearestStationDestination` には入力欄が無いため。

> **設計書との差分（決定済み 2026-10-07）**: `docs/pages/plan-create.md` の NearestStationDestination の表（132〜136 行目）と PlanSpotSettingCard の表（154 行目）は、「最後の区間のフォームは目的地側」という書き方になっている。これを**実装に合わせて直す**ことに決まった。全区間で「出発側ノードが乗車時間と発車時間を持つ」に統一する。UI は変更しない。

### 2.3 再プランニングの preferred を作り直す（B4・B6・B7）

`use-planning.ts` の preferred 組み立てを純粋関数に切り出してテストできるようにする。

```ts
// frontend/src/lib/planning.ts
export function buildPreferredSelections(params: {
  spots: ExtendSpotType[];                 // order でソート済み
  departure: ExtendPlanLocationType;
  destination: ExtendPlanLocationType;
  previousResult?: PlanningResult;         // fields.getPlanningResult(date)
  transportMethodIds: number[];
}): {
  preferredTransportMethodIds: Record<string, number>;
  preferredDepartureTimes: Record<string, string>;
}
```

ルール:

1. **区間の組み合わせが前回と同じときだけ引き継ぐ（B7）**。前回結果 `previousResult.routes` の `fromSpotId` / `toSpotId` の組を見て、今回の区間と同じ組があればその `transportMethodId` と発車時間を使う。並び替えで組が変わった区間には preferred を渡さない（自動選択に戻る）。
   - 前回結果が無いとき（保存済みプランを編集画面で開いた直後など）は、今と同じくノードの `transportMethodId` から作る。保存時の並び順のままなので、組はずれない。
2. **プランで選んでいない手段は無視する（B4）**。preferred が 1〜3 で `transportMethodIds` に含まれなければ渡さない。ID4 は両端に最寄駅があるときだけ有効にする。
3. **前回の候補に ID4 が無かった区間で、今回は両端に最寄駅がある場合は preferred を渡さない（B6）**。後から最寄駅を設定した区間は、最寄駅経由が自動で選ばれる。ユーザーが ID4 のある状態で別の手段を選んだ区間は、設計書「再プランニング時の移動手段優先ルール」どおり、その手段を優先する。
4. `0`（DEFAULT）や `undefined` は「指定なし」として扱い、キー自体を作らない（調査報告 B6 付随）。

### 2.4 時刻を通算分で扱い、23:59 超過でエラーを出す（B5）

- `runForwardPlanning` 内の時刻は通算分（24*60 を超えてよい）のまま積み上げる。`minutesToTime` で HH:mm にするのは書き戻し・表示のときだけ。
- 最終到着、またはいずれかの滞在終了が 23:59（1439 分）を超えたら、`PLANNING_MESSAGE_SEGMENT.DAY_OVERFLOW` のメッセージを出す。
  - 文言（案）: 「到着時刻が23:59を超えています。出発時間を早めるか、スポットや滞在時間を見直してください。」
  - レベルは `WARNING`（`PlanningWarningList` では赤表示）。優先度は最上位（0）にし、`OVER_TIME` より上に出す。
  - 日付を跨いだ場合、`isOverTime` は通算分で判定する（`true` になる）。余裕時間メッセージは出さない。
- 保存はブロックしない（設計書「注意喚起／警告が表示されていても、プラン保存は常に可能」に合わせる）。保存も止めたい場合は `CreatePlanButton.tsx` にチェックを足す（別途判断）。
- 日付ごとに独立して計算しているので、他の日付への影響はない。

### 2.5 片側だけ最寄駅がある区間の警告（B9）

- 区間の片側だけに `nearestStation` があるとき、`PLANNING_MESSAGE_SEGMENT.NEAREST_STATION_ONE_SIDE` を出す。
  - 文言（案）: 「{未設定側の名前}の最寄駅が未設定のため、最寄駅を使わないルートで計算しました。」
  - レベル `WARNING`、優先度は「発車時間が全て空」の次（6）。長距離徒歩は 7、余裕時間は 8 に繰り下げる。
- 同じ区間では、長距離徒歩メッセージ（「最寄駅を推奨します」）は出さない。最寄駅を設定済みのユーザーに同じことを言わないため。

### 2.6 `calcDistance2` の置き換え

- `planning.ts` の `calcDistance2` を `calcDistance`（`frontend/src/lib/algorithm.ts`、中身は同じ）に置き換え、`calcDistance2` を削除する。他に使っている箇所は無い（`rg calcDistance2` で確認済み）。

## 3. テスト構造の組み直し

`frontend/src/tests/lib/planning.spec.ts`（1630 行・130 件）を観点ごとのファイルに分ける。

```
frontend/src/tests/lib/planning/
  fixtures.ts                  # createBaseParams / createTwoSpotParams / 駅・ルートのファクトリ / getRoute モック
  departure-candidate.spec.ts  # 発車時間候補の選択ルール（selectDepartureCandidate）
  transport-selection.spec.ts  # 手段の選択・フォールバック・重複除去
  nearest-station.spec.ts      # 最寄駅経由の時間計算、区間ごとの参照ノード（T4）、片側のみ（B9）
  replanning.spec.ts           # preferred・往復シナリオ（T1〜T3, T7, T11）、buildPreferredSelections（T6）
  output.spec.ts               # 出力形式、合計値、RouteInfo の整合（マトリクス）
  time.spec.ts                 # 滞在時刻、到着超過、余裕時間、日付跨ぎ（T8）
  messages.spec.ts             # メッセージ優先度、取得失敗、長距離徒歩
  dirty.spec.ts                # dirty 判定
```

- 区間（出発地／スポット間／目的地）で同じことを確かめるテストは `describe.each` で 1 本にし、区間ごとのコピーをやめる。
- `getRoute` のモックはこれまでどおり残す（Google Maps API を叩かないため）。理由はコメントに書く。
- `describe` / `it` は日本語のまま。

## 4. 実装ステップ（TDD）

1. **準備**: `feature388` に `dev` を merge。`pnpm install` 後、frontend のテストが全件通ることを確認する。
2. **テストの移設（挙動は変えない）**: 3 章の構成に既存テストを移す。件数が変わらず全件通ることを確認してコミット。ソースは触らない。
3. **Red: バグを再現するテストを追加**（調査報告の付録 A の検証テストを元にする）
   - `replanning.spec.ts`
     - T1: 初回プランニング → `switchAlternativeRoute` で 4→3 → 再プランニング → `alternativeRoutes` に ID4 が残り、3 に戻すと元の所要時間になる（B1）
     - T2: preferred=3 で両端に最寄駅 → 選択は 3、`alternativeRoutes` に ID4 があり、duration が preferred なしで計算した値と一致（B1・T12）
     - T3: 前回 ID4 なし → 両端に最寄駅を追加 → `buildPreferredSelections` がその区間の preferred を出さない（B6）
     - T6: `buildPreferredSelections` の単体テスト（0／undefined／4／直接手段、並び替えで組が変わった区間、前回結果なし）（B7）
     - T7: `transportMethodIds=[1]`、preferred=3 → 3 は採用されない（B4）
   - `nearest-station.spec.ts`
     - T4: 目的地区間で、最終スポットの候補 `['12:30']` が使われる（B2）
     - T5: 候補なしで計算しても、保存される `scheduledDepartureTimes` は空配列のまま（B3）
     - 片側だけ最寄駅で `NEAREST_STATION_ONE_SIDE` が出て、同じ区間の長距離徒歩メッセージは出ない（B9）
   - `time.spec.ts`
     - T8: 22:00 出発・滞在 90 分×2 → `DAY_OVERFLOW` が最上位、`isOverTime=true`、余裕時間メッセージなし（B5）
   - 既存テストのうち、B2 の前提で書かれている「travelTime+nearestStation の項目の検証(最寄駅あり) > 目的地」は、候補を最終スポット側に置く形に直す。
4. **Green: `planning.ts` を修正**
   - `planSegment` を追加して `runForwardPlanning` を書き換える（2.1・2.2）
   - 通算分での時刻計算と `DAY_OVERFLOW`（2.4）
   - `NEAREST_STATION_ONE_SIDE`（2.5）
   - `calcDistance2` → `calcDistance`（2.6）
   - `frontend/src/data/constants.ts`: `PLANNING_MESSAGE_SEGMENT` に `DAY_OVERFLOW` / `NEAREST_STATION_ONE_SIDE` を追加し、`PLANNING_MESSAGE_PRIORITY` を 2.4・2.5 の順に更新
5. **Green: preferred の組み立てを差し替え**
   - `planning.ts` に `buildPreferredSelections` を追加（2.3）
   - `frontend/src/hooks/use-planning.ts`: 67〜97 行目の preferred 組み立てを `buildPreferredSelections` の呼び出しに置き換える。`previousResult` は `fields.getPlanningResult(date)`、`transportMethodIds` は `fields.getPlanningInfo(date)?.transportationMethodId`
   - `use-planning.spec.ts` に「前回結果から preferred が作られて `executePlanning` に渡る」ケースを 1 件追加
6. **設計書の更新**: `docs/pages/plan-create.md`
   - 「表示メッセージ一覧」に `DAY_OVERFLOW`（優先度 0）と `NEAREST_STATION_ONE_SIDE` を追加し、優先度を振り直す
   - 「再プランニング時の移動手段優先ルール」に 2.3 のルール 1〜3 を追記する
   - NearestStationDestination の表（132〜136 行目）と PlanSpotSettingCard の表（154 行目）を、最後の区間のフォームは最終スポットのカードに出す形に直す（2.2）
7. **確認**: `pnpm run lint` / `pnpm run typecheck` / frontend の全テスト。手動では、最寄駅あり → 車に切り替え → 再プランニング → 最寄駅に戻せること、22:00 出発のプランでエラーが出ることを確認する。

各ステップでコミットを分ける（テスト移設／Red／Green／設計書）。

## 5. 確認したいこと

1. ~~最後の区間の移動情報フォームの位置~~ → 最終スポット側に決定（2026-10-07）
2. **23:59 超過時の保存**（2.4）: エラー表示だけにする（推奨。既存の警告と同じ扱い）か、保存も止めるか。
3. **メッセージ文言**: `DAY_OVERFLOW` と `NEAREST_STATION_ONE_SIDE` の文言は案なので、変えたい場合は指定してください。

返事を待つ間は推奨の方で進める。
