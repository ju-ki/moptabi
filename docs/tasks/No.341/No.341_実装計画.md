# No.341 地図からスポットを探す 実装計画

- Issue: https://github.com/ju-ki/moptabi/issues/341
- 調査報告: [No.341_マップからスポット検索_調査報告.md](./No.341_マップからスポット検索_調査報告.md)
- 処理フロー: [No.341_処理フロー.md](./No.341_処理フロー.md)
- 動作確認手順: [No.341_動作確認手順.md](./No.341_動作確認手順.md)
- レイアウトのモック: https://claude.ai/artifact/MQ3kafiopuQxY9mUh5RCWC
- 前提ブランチ: `dev`（08517de を `feature341` に取り込み済み。#158 営業時間の制御・ユーザー別上限を含む）

## 0. 進捗

作業が中断したときは、ここのチェックが付いていない最初の項目から再開する。チェックは作業ブランチへのコミットと一緒に更新する。

- [x] Step 0: 設計書の更新（`feature341`）
  - [x] `docs/SpotSelection_コンポーネント設計書.md`
  - [x] `docs/pages/plan-create.md` / `plan-edit.md` の SpotSelection 節
  - [x] `docs/画面設計書.md` のスポット検索機能
- [x] Step 1: ダイアログの2段構成と小改善（`feature341-layout`）
  - [x] `spotSearchStore` に `searchMode` と日付切替時のリセット（P-5）
  - [x] `SpotSelectionDialog` の切替とスマホ全画面化
  - [x] 「計画日に営業」フィルターをリスト側の1か所に集約
  - [x] 検索半径の円を控えめに（P-6）
  - [x] lint / typecheck / test を通して push
- [x] Step 2: 地図の土台と中心点（`feature341-map`）
  - [x] `lib/geo.ts` に距離計算と表示用の整形
  - [x] `use-map-center-candidates.ts`（中心の候補）
  - [x] `MapSpotSearch` の地図・出発地/目的地・プランのスポットのピン
  - [x] 中心の候補チップ（PC）/ 住所欄の候補リスト（スマホ）と住所入力
  - [x] lint / typecheck / test を通して push
- [ ] Step 3: POI の選択と追加（`feature341-map`）
  - [ ] POI クリックで詳細取得（既存 `fetchPlaceDetailsWithRetry`）
  - [ ] 選択中スポットのカード（距離・営業状況・上限）
  - [ ] 追加・取り消し・選択解除
  - [ ] lint / typecheck / test を通して push
- [ ] Step 4: 行きたいリスト・過去のスポットのピン（`feature341-map`）
  - [ ] 表示するピンの切替と記憶
  - [ ] 休みのピンを薄く / 隠す、営業時間外の印
  - [ ] lint / typecheck / test を通して push
- [ ] 動作確認（[No.341_動作確認手順.md](./No.341_動作確認手順.md)）とスクリーンショット

## 1. スコープ

### 対応する

| No | 内容 | 出典 |
|---|---|---|
| R1 | スポット追加ダイアログを「リストで探す / 地図で探す」の2段構成にする。リスト側は既存3タブをそのまま入れる | Issue 要件 1、F-1 レビュー |
| R2 | 地図の中心を、出発地・目的地・その日のスポット・他の日のスポット・現在地・住所入力から選べる | Issue 要件 2〜4、中心点の候補レビュー |
| R3 | Google 標準の POI ピンをクリックして詳細を見て計画に追加できる。自動検索・エリア検索はしない | Q2・Q3 レビュー |
| R4 | 選択中スポットのカードに、今の中心点からの直線距離と計画日の営業状況を出す | ブラッシュアップ 5、#158 |
| R5 | 行きたいリスト・過去のスポットのピンを表示できる（初期 OFF、ON にした状態は記憶） | F-1、ブラッシュアップ 1 |
| R6 | 計画日に休みのピンを薄く表示し、フィルター ON で隠す。営業時間外になるプランのスポットに印を付ける | 調査報告 7-5・7-6 |
| R7 | 追加は `handleSpotSelect` を通す（ユーザー別上限・休みの確認トースト）。上限時は追加ボタンを押せない | 調査報告 7-3 |
| R8 | 追加後もダイアログを閉じず、ピンをその場で番号付きに変え、「追加しました・取り消す」を出す | ブラッシュアップ 2 |
| R9 | 中心を移したときはズーム 15 前後に合わせる | ブラッシュアップ 4 |
| R10 | スマホではダイアログを全画面にし、シートは名前・1行・追加ボタンの低い高さで出す | ブラッシュアップ 3、モック |
| R11 | `planSpotSelection` を日付切替時にリセット（P-5）、検索半径の円を控えめに（P-6） | P-5・P-6 レビュー |

### 対応しない

- 地図上でのエリア検索（Nearby Search）・テーマ・キーワード（Google 検索タブで行う）
- 検索回数の上限（Q4）
- プラン詳細画面からの利用（Q5）
- 都道府県での移動（住所入力に置き換え）
- ルート沿い検索・レコメンド（F-2・F-3）
- P-1〜P-4（Google 検索タブ側の現在地取得タイミング、検索結果マップの中心、未使用 state の整理）
- backend・DB の変更

## 2. 変更対象ファイル

### 新規

| ファイル | 内容 | Step |
|---|---|---|
| `frontend/src/components/spot-selection/SearchModeSwitch.tsx` | 「リストで探す / 地図で探す」の切替 | 1 |
| `frontend/src/components/spot-selection/MapSpotSearch.tsx` | 地図で探すの本体（PC は左パネル + 地図、スマホは上部 + 地図 + 下部シート） | 2〜4 |
| `frontend/src/components/spot-selection/map/MapCenterPicker.tsx` | 中心の候補チップ（PC）、住所欄 + 候補リスト（スマホ）。住所は既存 `AddressSearch` の `useGeocoding` を使う | 2 |
| `frontend/src/components/spot-selection/map/MapPinLayerToggle.tsx` | 表示するピンの切替（PC はチェック、スマホはボタン + シート） | 4 |
| `frontend/src/components/spot-selection/map/SelectedSpotCard.tsx` | 選択中スポットのカード（距離・営業状況・追加/取り消し/選択解除・上限表示） | 3 |
| `frontend/src/hooks/spot-search/use-map-center-candidates.ts` | プランから中心の候補を組み立て、初期中心を決める | 2 |
| `frontend/src/hooks/spot-search/use-map-poi-selection.ts` | POI クリック → `fetchPlaceDetailsWithRetry` → `ExtendSpotType` への変換 | 3 |
| `frontend/src/lib/map-pin-layers.ts` | ピンの表示設定を localStorage に保存・読込（try/catch。読めないときは既定値） | 4 |
| `frontend/src/hooks/spot-search/use-map-visited-pins.ts` | 過去のスポットの `spotId` 一覧を取り、座標キャッシュからピンを作る。キャッシュなしは1回20件まで詳細取得し、残り件数と「さらに表示」を返す | 4 |
| テスト一式 | 下記「4. テスト」 | 各 Step |

### 更新

| ファイル | 内容 | Step |
|---|---|---|
| `frontend/src/store/planning/spotSearchStore.ts` | `searchMode: 'list' \| 'map'` と `setSearchMode`。`mapCenter` を地図で探すの中心として使い、`mapCenterLabel`（距離表示の基準名）を追加。`pinLayers`（wishlist / visited の ON/OFF）と setter | 1・2・4 |
| `frontend/src/components/spot-selection/SpotSelectionDialog.tsx` | 切替の追加、リスト側を `searchMode === 'list'` で包む、`OpenOnPlanDateFilter` を2段目タブの上に1つ置く、`DialogContent` をスマホで全画面（`max-sm:` で `h-dvh w-screen max-w-none rounded-none`）、`date` 変化時に `clearPlanSpotSelection`（P-5）、`MapSpotSearch` に `onSpotSelect={handleSpotSelect}` と上限情報を渡す | 1・2・3 |
| `frontend/src/components/spot-selection/GoogleSpotSearch.tsx` / `WishlistSpotSearch.tsx` / `VisitedSpotSearch.tsx` | 各タブ内の `<OpenOnPlanDateFilter />` を削除（判定処理はそのまま） | 1 |
| `frontend/src/components/common/LocationAdjustModal.tsx` | `circleOptions` を枠線中心・塗り 0.08 程度に（P-6） | 1 |
| `frontend/src/lib/geo.ts` | `calcDistanceKm(a, b)`（ハバーサイン）と `formatDistance(km)`（1km 未満は m、以上は小数1桁 km） | 2 |
| `frontend/src/data/constants.ts` | `MAP_SEARCH_MESSAGE`（「〜から」「中心から」「追加しました」「取り消す」「上限」等の文言）、`MAP_FOCUS_ZOOM = 15` | 2・3 |
| 既存テスト | `SpotSelectionDialog.spec.tsx`（切替・フィルター位置）、3タブの spec からフィルターの存在確認を Dialog 側へ移す | 1 |

## 3. 実装方針

### Step 1: 2段構成（`feature341-layout`）
- `SpotSelectionDialog.tsx:153` の `Tabs` を、`searchMode === 'list'` のときだけ表示する。上に `SearchModeSwitch`、その下（2段目タブの上）に `OpenOnPlanDateFilter` を置く。
- `searchMode` はストアに持ち、ダイアログを閉じても同じセッション中は保持する（最後に使った探し方で開く）。
- `searchMode === 'map'` のときは `MapSpotSearch` を描画する。Step 1 では地図と出発地/目的地/プランのスポットのピンだけの最小構成にし、Step 2 以降で育てる。Radix Tabs と同じく非表示側はアンマウントされるので、地図を開くまで地図は読み込まれない。
- スマホの全画面化は `DialogContent` の className に `max-sm:` の指定を足すだけにする（PC の見た目は変えない）。

### Step 2: 地図の土台と中心点
- `use-map-center-candidates(date)` は `plans` から次の順で候補を作る。出発地、目的地、その日のスポット（訪問順の番号付き）、他の日のスポット（日付ラベル付き）、現在地（押したときに `useCurrentLocation` 相当で取得）。
- 初期中心は「目的地 → 出発地 → `defaultLocation`（東京駅）」の順で最初に取れたもの。
- 候補を選ぶ・住所で移動する・現在地を押すと、`mapCenter` と `mapCenterLabel` を更新し、`map.panTo` と `map.setZoom(MAP_FOCUS_ZOOM)` を呼ぶ。地図をドラッグしたとき（`onDragEnd`）は `mapCenter` を地図の中心に更新し、`mapCenterLabel` を `null`（「中心から」表示）にする。
- 住所入力は `AddressSearch` の `onCoordinateFound` を使う。Geocoding の呼び出しは Enter か blur の1回、同じ住所は既存の5分キャッシュ。
- PC: 左パネル（幅 320px）に候補チップと住所欄を並べる。スマホ: 上部は「住所欄 + ピンボタン」の1行だけにし、住所欄にフォーカスしたときに候補をドロップダウンで出す（モックの候補チップ行は出しっぱなしにしない）。
- ピンはアプリ側で描くもの（S/G、番号、ハート、過去）を `Marker` で描画する。Google 標準の POI は `clickableIcons: true` で表示される。

### Step 3: POI の選択と追加
- `GoogleMap` の `onClick` で `e.placeId` があれば `e.stop()` で Google 標準の InfoWindow を止め、`use-map-poi-selection` で `fetchPlaceDetailsWithRetry(placeId)` を呼ぶ（キャッシュ・リトライ付き）。取得結果を `ExtendSpotType` に変換する（`GoogleSpotSearch.tsx` の `convertToExtendSpotType` と同じ項目。`openingPeriods` / `businessStatus` を含める）。
- アプリ側のピン（行きたいリスト・過去・プランのスポット）をクリックしたときは、既に持っているデータでカードを出す（API を呼ばない）。
- `SelectedSpotCard` の中身:
  - 名前、営業状況バッジ（`OpeningStatusBadge`）
  - 1行: `★評価 ・ {基準名}から{距離} ・ {計画日の営業時間}`（スマホ。住所と祝日の注記は出さない）
  - PC は住所行、距離行、`HolidayNote` を加える
  - ボタン: 未追加なら「計画に追加」、追加済みなら「選択解除」
- 追加は `onSpotSelect(setStartTimeAutomatically(spot, planSpots), false)` を呼ぶ（`GoogleSpotSearch.tsx` の `handleSpotClick` と同じ）。上限チェックとトーストは `SpotSelectionDialog.handleSpotSelect` 側で行われる。
- 上限に達している（または上限取得失敗）ときは、カードのボタンを `disabled` にし、理由の文言を出す。判定は Dialog から渡す `isLimitReached` / `limitsError` を使う。
- 追加後はダイアログを閉じない。プランのストアが更新されるので POI 位置に番号ピンが出る。カードは「追加しました」と「取り消す」に切り替わり、取り消すで `onSpotSelect(spot, true)` を呼ぶ。

### Step 4: 行きたいリスト・過去のスポットのピン
- `pinLayers` の初期値は両方 OFF。`lib/map-pin-layers.ts` で localStorage（キー `moptabi:map-pin-layers`）に保存し、次に開いたときに復元する。localStorage が使えない環境では既定値で動く。
- 各レイヤーを子コンポーネントに分け、ON のときだけマウントする。
- 行きたいリストは `useWishlistSpots` をそのまま使う（ユーザー別上限で件数が抑えられ、リスト側とメモリキャッシュを共有。休みの判定に詳細が要る）。
- 過去のスポットは `useVisitedSpots` を使わない。全件の詳細を一度に取り、件数の上限もページングもないためである。代わりに `use-map-visited-pins` を使う。
- `use-map-visited-pins` の流れ: `/spots/visited` で `spotId` の一覧を取る → `getCachedCoordinates` で座標があるものはそのままピンにする → ないものは最大 20 件ずつ `fetchPlaceDetailsWithRetry` で取得する → 残りは件数と「さらに表示」で出す。
- ピンを押したときに詳細がなければ、そのスポットだけ `fetchPlaceDetailsWithRetry` で取る（メモリキャッシュあり）。座標キャッシュだけで描いたピンは、詳細を取るまで営業状況が分からないので通常の見た目で描く。
- 計画日に休み（`hasOpeningWarning(checkOpeningStatus(...))`）のピンは不透明度 0.4 で描く。`openOnPlanDate` が ON のときは描かない（リスト側のフィルターと同じ状態）。
- プランのスポットは `checkOpeningStatus({ ..., stayStart, stayEnd })` が `OUTSIDE_HOURS` などの警告なら番号ピンの横に「営業時間外」の印を付ける。

## 4. テスト

| Step | ファイル | 主な観点 |
|---|---|---|
| 1 | `tests/components/spot-selection/SpotSelectionDialog.spec.tsx` | 切替でリスト/地図が入れ替わる、最後の探し方を保持、フィルターがリスト側に1つだけ、日付が変わると `planSpotSelection` が空になる |
| 1 | `tests/components/spot-selection/{Google,Wishlist,Visited}SpotSearch.spec.tsx` | フィルターの絞り込み自体は従来どおり（チェック操作はストア経由で行う） |
| 1 | `tests/hooks/use-spot-search-store.spec.ts` | `setSearchMode`、`pinLayers` |
| 2 | `tests/lib/geo.spec.ts` | `calcDistanceKm`（既知の2点）、`formatDistance`（950m / 1.2km） |
| 2 | `tests/hooks/use-map-center-candidates.spec.ts` | 候補の並び、他の日のスポット、初期中心の優先順、出発地・目的地なし |
| 2 | `tests/components/spot-selection/MapSpotSearch.spec.tsx` | 候補を押すと中心と基準名が変わる、住所入力で中心が変わる、ドラッグで「中心から」になる |
| 3 | `tests/components/spot-selection/MapSpotSearch.spec.tsx` / `tests/components/spot-selection/map/SelectedSpotCard.spec.tsx` | POI クリックで詳細取得を1回だけ呼ぶ（同じ POI 2回目は呼ばない）、カードの1行表示、休みの表示、上限時に押せない、追加→「追加しました・取り消す」、取り消すで削除、追加済みは「選択解除」 |
| 4 | `tests/lib/map-pin-layers.spec.ts` | 保存・復元、localStorage が例外を投げても既定値 |
| 4 | `tests/hooks/use-map-visited-pins.spec.ts` | 座標キャッシュがあるものは詳細取得を呼ばない、キャッシュなしは20件で止まり残り件数を返す、「さらに表示」で次の20件 |
| 4 | `tests/components/spot-selection/MapSpotSearch.spec.tsx` | OFF のとき一覧取得も詳細取得も呼ばれない、休みのピンが薄い、フィルター ON で隠れる、営業時間外の印 |

- `@react-google-maps/api` は既存の spec（`GoogleSpotSearch.spec.tsx:49`）と同じモック方針で、`GoogleMap` の `onClick` / `onDragEnd` を呼び出せる形にする（地図 SDK を実行できないため。モックする理由をコメントに書く）。
- `fetchPlaceDetailsWithRetry` はモックし、呼び出し回数で API 呼び出しを確認する。
- テストは `TZ=Asia/Tokyo pnpm run test` で実行する（CI と同じ）。

## 5. 影響範囲とリスク

- リスト側の3タブは中身を変えないが、フィルターの位置が変わるため既存テストの一部を移す。
- 地図で探すで新たに発生する API 呼び出しは、POI クリック（Place Details、セッション内キャッシュあり）、住所入力（Geocoding）、行きたいリスト・過去のピンを ON にしたとき（行きたいリストはユーザー別上限の件数まで、過去のスポットは座標キャッシュがないものだけ1回最大20件の Place Details）だけ。地図の表示自体は「地図で探す」を開いたときだけ読み込まれる。
- Google 標準の POI は縮尺によって表示されないことがあるため、候補選択時にズーム 15 に合わせる。利用者がズームを引いた場合は POI が消えるが、仕様として扱う。
- スマホ全画面化は `max-sm:` のみで行い、PC の見た目は変えない。
