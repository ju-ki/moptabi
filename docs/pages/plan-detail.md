# プラン詳細ページ（/plan/[id]）

## 概要

作成済み旅程プランの詳細を閲覧・共有するページ。旅程の地図表示、スポット情報一覧、移動時間・交通手段の確認機能を提供する。

## 主要コンポーネント一覧

| コンポーネント | 役割 | 備考 |
|---|---|---|
| `DayPlan` | 日単位のプラン表示 |  |
| `TravelMap` | 登録されたのスポットとルートを地図上に表示する, DistanceInfo(移動時間や移動手段、移動距離を表示) |  |
| `SpotInfoCard` | スポットの詳細情報カード（訪問日時・移動情報を含む） |  |
| `DepartureInfoCard` | 出発地の詳細情報カード（訪問日時・移動情報を含む） |  |
| `DestinationInfoCard` | 目的地の詳細情報カード（訪問日時・移動情報を含む） |  |
| `RouteSummary` | プラン全体の移動ルートサマリー |  |

## 対象仕様

### TravelMap

#### 基本表示

| 項目名 | イベント概要 | 条件 | 期待する出力・動作 |
|---|---|---|---|
| 地図表示 | 初期表示 | 出発地・スポット・目的地あり | GoogleMap を表示 |
| マーカー（出発地） | 初期表示 | - | 出発地マーカーを表示（独自色） |
| マーカー（スポット） | 初期表示 | - | 各スポットのマーカーを表示（独自色） |
| マーカー（目的地） | 初期表示 | - | 目的地マーカーを表示（独自色） |
| マーカー（最寄駅） | 初期表示 | 最寄駅設定済みの区間あり | 最寄駅マーカーを表示（既存マーカーと同形状・最寄駅専用色）。同一最寄駅は区間ごとに重複表示せず1つに統合する |
| 情報ウィンドウ | 選択操作 | マーカー押下 | 該当地点名を表示 |
| ルート表示（最寄駅なし） | 初期表示 | ルート計算成功 / 最寄駅未設定区間 | 区間ごとのポリラインを RouteType に応じた色で表示 |
| ルート表示（最寄駅あり） | 初期表示 | ルート計算成功 / 最寄駅設定済み区間 | スポット→最寄駅（TO_STATION）、最寄駅→最寄駅（STATION_TO_STATION）の区間ポリラインを追加表示 |
| 移動手段反映 | 初期表示 | ルート計算成功 | 各区間の移動手段と移動時間をストアへ反映 |
| 距離情報 | 初期表示 | - | 右上コントロール領域にDistanceInfoを表示 |

#### ルートの種類と色定義

| RouteType | 区間 | 色 |
|---|---|---|
| `DEPARTURE_TO_SPOT` | 出発地 → スポット | `#34A853`（緑） |
| `SPOT_TO_SPOT` | スポット間 | `#4285F4`（青） |
| `SPOT_TO_DESTINATION` | スポット → 目的地 | `#FF0000`（赤） |
| `TO_STATION` | スポット/出発地/目的地 → 最寄駅（徒歩） | `#FACC15`（黄） |
| `STATION_TO_STATION` | 最寄駅 → 最寄駅（公共交通） | `#F97316`（オレンジ） |

### DistanceInfo

| 項目名 | 条件 | 期待する出力・動作 |
|---|---|---|
| 最寄駅なし区間 | 最寄駅未設定 | 移動手段・移動時間・移動距離を1行で表示 |
| 最寄駅あり区間 | 最寄駅設定済み | 区間ごとに分割して「出発地→最寄駅（徒歩Xm） / 最寄駅→最寄駅（電車Y分） / 最寄駅→スポット（徒歩Zm）」のように列挙 |
| 距離・時間の算出元 | - | 基本的に Google Map の取得結果を使用する |

### MapLegend（共通コンポーネント）

TravelMap および詳細画面で共通利用する凡例コンポーネント。地図の外側（下部）に別ブロックとして表示する。

| 凡例種別 | 表示内容 |
|---|---|
| マーカー種別 | 出発地 / スポット / 目的地 / 最寄駅 の各マーカー色とラベル |
| ルートカラー | DEPARTURE_TO_SPOT / SPOT_TO_SPOT / SPOT_TO_DESTINATION / TO_STATION / STATION_TO_STATION の各色とラベル |

### DepartureInfoCard / DestinationInfoCard

| 項目名 | 条件 | 期待する出力・動作 |
|---|---|---|
| タイムライン(アイコン) | 初期表示 | Home(Flag)アイコンを表示 |
| タイムライン(移動時間手段) | 初期表示 | 移動手段によってアイコンを変える(徒歩/車/自転車/電車(最寄駅設定時))|
| タイムライン(移動時間) | 初期表示 | 出発地から最初(最後のスポットから目的地)のスポットまでの移動時間を表示 |
| スポット名 | 初期表示 | プランニング時に登録したPlanLocationのnameを表示 |
| 出発時間/到着時間 | 初期表示 | プランニング時に登録したPlanLocationのtimeを表示 |
| 最寄り駅からの所要時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているplaceIdと対象の出発地/目的地の座標から算出された所要時間 |
| 最寄り駅名 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているplaceIdを元にGoogle Map APIから取得した名前 |
| 最寄り駅アイコン | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているstationTypeに基づいたアイコン(BUS:バス / TRAIN:電車 / OTHER:?) |
| 最寄り駅からの所要時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているtransitTimeを表示 |
| 最寄り駅の出発時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているscheduledDepartureTimeを表示(DepartureInfoCardのみ) |
| 最寄り駅のメモ | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanLocationNearestStationに登録されているmemoを表示(DepartureInfoCardのみ) |

### SpotInfoCard

| 項目名 | 条件 | 期待する出力・動作 |
|---|---|---|
| タイムライン(滞在時間) | 初期表示 | PlanSpotに登録されているstayStart-stayEndを表示 |
| タイムライン(移動時間手段) | 初期表示 | 移動手段によってアイコンを変える(徒歩/車/自転車/電車(最寄駅設定時))|
| タイムライン(移動時間) | 初期表示 | 今のスポットから次のスポットまでの移動時間を表示 |
| スポット名 | 初期表示 | GoogleMapのAPIから取得したスポットの名称を表示 |
| カテゴリ名 | 初期表示 | GoogleMapのAPIから取得したスポットのカテゴリ(最大3つ)を表示 |
| 画像 | 初期表示 | GoogleMapのAPIから取得したスポットの画像(現在はダミー画像)を表示 |
| 評価 | 初期表示 | GoogleMapのAPIから取得したスポットの評価を画像の右上に表示 |
| 滞在時間 | 初期表示 | プランニングで登録したPlanSpotから取得したスポットの滞在時間を表示 |
| 最寄り駅からの所要時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているplaceIdと対象のspotIdから算出された所要時間 |
| 最寄り駅名 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているplaceIdを元にGoogle Map APIから取得した名前 |
| 最寄り駅アイコン | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているstationTypeに基づいたアイコン(BUS:バス / TRAIN:電車 / OTHER:?) |
| 最寄り駅の出発時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているscheduledDepartureTimeを表示(現在のスポットの次のスポットまたは目的地に格納されている情報を表示) |
| 最寄り駅からの所要時間 | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているtransitTimeを表示(現在のスポットの次のスポットまたは目的地に格納されている情報を表示)|
| 最寄り駅のメモ | 初期表示,最寄駅が設定されている場合 | プランニングで登録したPlanSpotNearestStationに登録されているmemoを表示(現在のスポットの次のスポットまたは目的地に格納されている情報を表示) |
| 住所 | 初期表示 | GoogleMapのAPIから取得したスポットの住所を表示 |
| 外部サイトリンク | 初期表示 | GoogleMapのAPIから取得したスポットの外部サイトリンクを表示 |
| 営業時間 | 初期表示 | GoogleMapのAPIから取得したスポットの営業時間をアコーディオン形式で表示 |



## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| SpotInfoCard | `frontend/src/tests/components/SpotInfoCard.spec.tsx` |
| SpotDetailCard | `frontend/src/tests/components/travel-plan/SpotDetailCard.spec.tsx` |
| TravelMap | `frontend/src/tests/components/TravelMap.spec.tsx` |
| Transportation | `frontend/src/tests/components/Transportation.spec.tsx`（未作成） |
