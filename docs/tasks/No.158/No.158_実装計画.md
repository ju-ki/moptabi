# No.158 営業時間の制御 実装計画

- Issue: https://github.com/ju-ki/moptabi/issues/158
- 調査報告: [No.158_営業時間の制御_調査報告.md](./No.158_営業時間の制御_調査報告.md)
- 処理フロー: [No.158_処理フロー.md](./No.158_処理フロー.md)
- 動作確認手順: [No.158_動作確認手順.md](./No.158_動作確認手順.md)
- 前提ブランチ: `dev`（eaccd2d を `feature158` に取り込み済み）

## 1. スコープ

### 対応する

| No | 内容 | 出典 |
|---|---|---|
| R1 | スポット追加時の営業日判定（検索カードのバッジ + 追加時トースト） | Issue 要件 1 |
| R2 | スポット検索時の「計画日に営業」フィルター（Google 検索 / 行きたいリスト / 過去のスポット） | Issue 要件 2 |
| R3 | プランニング時の営業時間外メッセージとカードの強調表示 | Issue 要件 3 |
| R4 | 追加・更新・保存はブロックしない（警告のみ） | Issue 要件 4 |
| R5 | 「公式サイト等でご確認ください」系の文言 | Issue 要件 5 |
| R6 | 閉業・臨時休業（`businessStatus`）の警告 | 追加提案 1（採用） |
| R7 | 計画日の営業時間をカードに 1 行で常時表示 | 追加提案 2（採用） |
| R8 | 「祝日の営業は判定していません」の注記表示 | 追加提案 3 へのレビュー指摘 |

### 対応しない

- 祝日判定、`currentOpeningHours` の利用（追加提案 3・4）
- 営業時間に合わせた自動調整（#450 で別途対応）
- 画像の動的取得（追加提案 6）
- backend・DB の変更（スポット詳細は保存しないため不要）

### 推奨案で進める項目（レビューで回答なし）

- フィルターは「計画日に営業枠があるか」の日単位で判定する。滞在時間帯までは見ない。
- 営業時間情報がないスポットは警告を出さず、フィルターでも除外しない。

## 2. 型の追加

backend に送らない frontend 専用の値なので、`frontend/TYPE_GUIDE.md` に従い `packages/shared-types` は変更せず `frontend/src/types` に置く。

### `frontend/src/types/spot.ts`

```ts
/** Google Places の営業時間の 1 区間（day: 0=日〜6=土） */
export type OpeningPoint = { day: number; hour: number; minute: number };
/** close がない区間は 24 時間営業を表す */
export type OpeningPeriod = { open: OpeningPoint; close?: OpeningPoint };
export type BusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

export type SpotMetaType = {
  // ...既存
  openingPeriods?: OpeningPeriod[]; // 追加
  businessStatus?: BusinessStatus;  // 追加
};
```

### `frontend/src/types/plan.ts`

- `Spot` 型に `openingPeriods?` / `businessStatus?` を追加（`searchSpots` の戻り値と検索ストアで使う）。
- `ExtendSpotType` の拡張部分（`TripSpotType & SpotMetaType & { ... }`）にも同じ 2 項目を追加。

## 3. 判定ロジック（新規 `frontend/src/lib/opening-hours.ts`）

UI に依存しない純粋関数だけを置く。

| 関数 | 役割 |
|---|---|
| `normalizeOpeningPeriods(periods)` | `google.maps.places.OpeningHoursPeriod[] \| null` を `OpeningPeriod[]` に変換。取得なしは `undefined` |
| `normalizeBusinessStatus(status)` | `place.businessStatus` を `BusinessStatus \| undefined` に変換 |
| `getWeekday(date)` | `YYYY-MM-DD` から曜日（0〜6）を返す。`Date.UTC` で計算し端末のタイムゾーンに依存させない |
| `getOpeningHoursOfDay(periods, date)` | 計画日の営業時間の表示文字列（例: `10:00-17:00`、`11:00-14:00, 17:00-22:00`、`24時間営業`、`定休日`）。情報なしは `undefined` |
| `checkOpeningStatus({ periods, businessStatus, date, stayStart?, stayEnd? })` | 下記の判定結果を返す |

```ts
export type OpeningStatus =
  | { kind: 'OPEN' }
  | { kind: 'UNKNOWN' }                              // 営業時間情報なし → 何も表示しない
  | { kind: 'CLOSED_PERMANENTLY' }                   // 閉業
  | { kind: 'CLOSED_TEMPORARILY' }                   // 臨時休業中
  | { kind: 'CLOSED_DAY'; weekdayLabel: string }     // 定休日の可能性
  | { kind: 'OUTSIDE_HOURS'; hoursOfDay: string };   // 滞在時間に営業時間外が含まれる
```

判定順と仕様:

1. `businessStatus` が `CLOSED_PERMANENTLY` / `CLOSED_TEMPORARILY` ならそれを返す（曜日より優先）。
2. `periods` が `undefined` または空なら `UNKNOWN`。
3. `close` のない区間がある場合は 24 時間営業として `OPEN`。
4. `open.day` が計画日の曜日と一致する区間がなければ `CLOSED_DAY`。
5. `stayStart` / `stayEnd` が渡された場合のみ時間帯を判定する。
   - 週を「日曜 0:00 起点の分（0〜10079）」に展開し、各区間を `[open, close)` とする。`close` が `open` より前（土曜 22:00〜日曜 02:00 など）は週を跨ぐものとして 10080 を足す。
   - 滞在区間 `[stayStart, stayEnd)` が **いずれか 1 区間に完全に含まれれば** `OPEN`、そうでなければ `OUTSIDE_HOURS`。昼休憩をまたぐ滞在も `OUTSIDE_HOURS` になる。
   - `stayEnd <= stayStart` の不正値は判定せず `OPEN` を返す（警告を増やさない）。

`frontend/src/lib/google-maps.ts` の `formatOpeningHours`（表示用文字列）はそのまま残す。

## 4. 実装ステップ

各ステップはテストを先に書いてから実装する（`frontend/CLAUDE.md`）。

### Step 0: 設計書の更新

| ファイル | 変更 |
|---|---|
| `docs/画面設計書.md` | 「営業時間フィルターは後ほど追加」（293 行目付近）と各フィルター候補を、日単位判定・情報なしは除外しない仕様に置き換える |
| `docs/pages/plan-create.md` / `plan-edit.md` | スポットカードに「計画日の営業時間 1 行表示」「営業時間外 / 定休日 / 閉業バッジ」「祝日注記」の行を追加。スポット検索に営業フィルターの行を追加 |
| `docs/pages/plan-detail.md` | 「営業時間」行に 1 行表示・バッジ・祝日注記を追記 |

### Step 1: データの追加と判定関数

| ファイル | 変更 |
|---|---|
| `frontend/src/lib/opening-hours.ts`（新規） | 3 章の関数群 |
| `frontend/src/lib/google-maps.ts` | `convertPlaceToSpotMeta` に `openingPeriods` / `businessStatus` を追加。`PLACE_DETAIL_FIELDS` に `'businessStatus'` を追加 |
| `frontend/src/lib/plan.ts` | `searchSpots` の `placeToSpot` に `openingPeriods` / `businessStatus` を追加（`businessStatus` は既に `fields` で取得済み） |
| `frontend/src/hooks/spot-search/use-wishlist-spots.ts` / `use-visited-spots.ts` / `frontend/src/hooks/use-wishlist.ts` | `meta` から `openingPeriods` / `businessStatus` を引き継ぐ |
| `frontend/src/hooks/use-trip.ts` | `enrichTripWithPlaceDetails` で `regularOpeningHours: placeResult.openingHours` を明示的に設定する（下記） |
| `frontend/src/types/spot.ts` / `frontend/src/types/plan.ts` | 2 章の型追加 |

`use-trip.ts` について: 現在は `placeResult`（frontend の `SpotMetaType`、キーは `openingHours`）をそのまま展開しているため、プラン編集・詳細画面のスポットには `regularOpeningHours` が入らず、営業時間のアコーディオンが表示されていない（コードを読んだうえでの推測。Step 1 のテストと動作確認で確かめる）。R3・R7 を編集・詳細画面でも効かせるため、ここで合わせて直す。

テスト:
- `frontend/src/tests/lib/opening-hours.spec.ts`（新規）: 通常営業・定休日・日跨ぎ・土曜→日曜の週跨ぎ・24 時間営業・昼休憩・情報なし・閉業・臨時休業・不正な滞在時間・タイムゾーン非依存の曜日算出。
- `frontend/src/tests/google-maps.spec.ts`: `convertPlaceToSpotMeta` が 2 項目を返すこと。

### Step 2: 検索カードのバッジ・1 行表示と追加時トースト（R1・R6・R7）

| ファイル | 変更 |
|---|---|
| `frontend/src/components/spot-selection/OpeningStatusBadge.tsx`（新規） | `OpeningStatus` を受けてバッジを描画する共通部品（`CLOSED_DAY`: 定休日の可能性 / `CLOSED_TEMPORARILY`: 臨時休業中 / `CLOSED_PERMANENTLY`: 閉業 / それ以外は何も描画しない）。Step 4 でも使う |
| `frontend/src/components/spot-selection/cards/GoogleSpotCard.tsx` / `WishlistSpotCard.tsx` / `VisitedSpotCard.tsx` | `date` prop を追加し、バッジと「この日(土)の営業時間: 10:00-17:00」の 1 行を表示 |
| `frontend/src/components/spot-selection/GoogleSpotSearch.tsx` / `WishlistSpotSearch.tsx` / `VisitedSpotSearch.tsx` | 各カードに `date` を渡す |
| `frontend/src/components/spot-selection/SpotSelectionDialog.tsx` | `handleSpotSelect` で追加時（`!isDeleted`）に `checkOpeningStatus` を呼び、`CLOSED_DAY` / `CLOSED_*` ならトースト（`variant: 'default'`）を出す。`setSpots` は必ず呼ぶ |
| `frontend/src/data/constants.ts` | `OPENING_HOURS_MESSAGE`（6 章の文言）を追加 |

テスト:
- `frontend/src/tests/components/spot-selection/cards/*.spec.tsx`: 定休日・閉業でバッジが出る、営業日は出ない、1 行表示の内容。
- `frontend/src/tests/components/spot-selection/SpotSelectionDialog.spec.tsx`（新規）: 定休日のスポットを追加するとトーストが出て、かつスポットが追加されること。

### Step 3: 検索フィルター（R2）

| ファイル | 変更 |
|---|---|
| `frontend/src/store/planning/spotSearchStore.ts` | `openOnPlanDate: boolean`（初期値 `false`）と setter を追加。3 タブ共通の 1 つの値にする |
| `frontend/src/components/spot-selection/GoogleSpotSearch.tsx` | 高評価フィルターと同じ UI でチェックボックス「計画日に営業しているスポットのみ」を追加。`handleSearch` の絞り込み（`highRating` の直後）で `CLOSED_DAY` / `CLOSED_*` を除外 |
| `frontend/src/components/spot-selection/WishlistSpotSearch.tsx` / `VisitedSpotSearch.tsx` | 同じチェックボックスを追加し、描画前に同じ条件で除外。`// TODO: dateは営業時間のフィルターで使用予定` を削除 |

0 件になった場合は「計画日に営業しているスポットが見つかりませんでした」を表示する。

テスト: `frontend/src/tests/components/spot-selection/GoogleSpotSearch.spec.tsx` / `WishlistSpotSearch.spec.tsx` / `VisitedSpotSearch.spec.tsx` に、フィルター ON で定休日・閉業が消え、情報なしは残ることを追加。

### Step 4: プランニング警告とカードの強調（R3・R6・R7・R8）

| ファイル | 変更 |
|---|---|
| `frontend/src/data/constants.ts` | `PLANNING_MESSAGE_SEGMENT.OPENING_HOURS` を追加し、`PLANNING_MESSAGE_PRIORITY` では `OVER_TIME` の次（2）に置いて以降を 1 つずつ繰り下げる |
| `frontend/src/lib/planning.ts` | `buildOpeningHoursMessages(date, spots)` を追加し、`executePlanning` で `sortPlanningMessages` の前に `forwardResult.updatedSpots` を渡して `WARNING` を追加。`segmentKey` は `OPENING_HOURS:<spotId>` |
| `frontend/src/components/travel-plan/SpotSettingEditor.tsx` | `PlanSpotSettingCard` に `date` を渡す |
| `frontend/src/components/travel-plan/PlanSpotSettingCard.tsx` | `date` prop を追加。`checkOpeningStatus` を `useMemo` で算出し、`OPEN` / `UNKNOWN` 以外ならカード枠を `border-amber-400`、スポット名の横に `OpeningStatusBadge`（`OUTSIDE_HOURS` は「営業時間外の可能性」）、下に営業時間の 1 行と祝日注記を表示。プランニング結果ではなくカード自身で算出するので、滞在時間を手で変えた直後にも追従する |
| `frontend/src/components/travel-plan/SpotDetailCard.tsx` | 同じバッジ・1 行表示を追加。営業時間アコーディオンの末尾に祝日注記 |
| `frontend/src/components/DayPlan.tsx` / `frontend/src/components/SpotInfoCard.tsx` | `SpotInfoCard` に `date` を渡し、同じバッジ・1 行表示・祝日注記を追加（プラン詳細画面） |

`planErrors`、保存処理、backend のバリデーションには手を入れない（R4）。

テスト:
- `frontend/src/tests/lib/planning/messages.spec.ts`: 営業時間外・定休日・閉業のスポットで `WARNING` が出る、営業中・情報なしでは出ない、並び順。
- `frontend/src/tests/components/travel-plan/PlanSpotSettingCard.spec.tsx` / `SpotDetailCard.spec.tsx`、`frontend/src/tests/components/SpotInfoCard.spec.tsx`: 強調表示・バッジ・1 行表示・祝日注記。
- `frontend/src/tests/components/travel-plan/PlanningWarningList.spec.tsx`: 営業時間メッセージが一覧に並ぶ。
- 既存の優先度に依存するテストがあれば繰り下げに合わせて期待値を直す。

## 5. ブランチと PR

4 ステップは Step 1 にだけ依存し、互いには独立しているため、CLAUDE.md のブランチ戦略に沿って分割する。

| ブランチ | 内容 | PR の向き先 |
|---|---|---|
| `feature158` | 調査報告・本計画・設計書更新（Step 0） | dev（#437） |
| `feature158-core` | Step 1 | feature158 |
| `feature158-search` | Step 2・3 | feature158 |
| `feature158-planning` | Step 4 | feature158 |

## 6. 文言

`frontend/src/data/constants.ts` の `OPENING_HOURS_MESSAGE` に置く。`{name}` などは関数で差し込む。

| キー | 用途 | 文言 |
|---|---|---|
| `CLOSED_DAY` | 警告・トースト | 「{name}」はこの日（{曜日}）が定休日の可能性があります。公式サイト等で営業日をご確認ください。 |
| `OUTSIDE_HOURS` | 警告 | 「{name}」の滞在予定（{stayStart}〜{stayEnd}）に営業時間外の時間帯が含まれています（この日の営業時間: {hours}）。公式サイト等で営業時間をご確認ください。 |
| `CLOSED_TEMPORARILY` | 警告・トースト | 「{name}」は Google マップ上で臨時休業中と登録されています。公式サイト等で最新情報をご確認ください。 |
| `CLOSED_PERMANENTLY` | 警告・トースト | 「{name}」は Google マップ上で閉業と登録されています。公式サイト等で最新情報をご確認ください。 |
| `HOLIDAY_NOTE` | 営業時間の表示箇所 | 営業時間は Google マップの情報です。祝日の営業は判定していません。季節営業や最終入場時刻も反映されていない場合があります。 |
| バッジ | カード | 定休日の可能性 / 営業時間外の可能性 / 臨時休業中 / 閉業 |

カードの警告表示では、`url`（公式サイト）がある場合に「公式サイトを開く」リンクを添える。

## 7. 影響範囲とリスク

- backend・DB・`packages/shared-types` は変更なし。
- Places API のリクエストフィールドに `businessStatus` を足すのは `PLACE_DETAIL_FIELDS` だけ（`searchSpots` は取得済み）。`regularOpeningHours` を既に要求しているため請求 SKU は変わらない想定。実装時に Places API (New) の料金表で再確認する。
- `PLANNING_MESSAGE_PRIORITY` の繰り下げで、既存メッセージの相対順は変わらない。
- 営業時間情報がないスポット（公園・神社など）は何も表示しないため、既存の画面の見た目は変わらない。
- 最大 20 件の検索結果を絞り込むため、フィルター ON で件数が少なくなる。

## 8. 完了条件

- `pnpm run lint` / `pnpm run typecheck` / `pnpm run test`（frontend）がすべて通る。
- [No.158_動作確認手順.md](./No.158_動作確認手順.md) の全項目が期待結果どおり。
- UI 変更の前後スクリーンショットを PR に添付する。
