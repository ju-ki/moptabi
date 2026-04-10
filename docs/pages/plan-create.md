# プラン作成ページ（/plan/create）

## 概要

旅程プランを作成・編集するページ。出発地・目的地の設定、日程ごとのスポット追加・並び替え、ガントチャート表示などの機能を提供する。

## 主要コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `TravelPlan` | プラン全体のコンテナ。DayPlan一覧・プラン保存ボタンを管理 |
| `DayPlan` | 1日分のプラン（スポット一覧・追加ボタン・ガントチャート） |
| `Departure` | 出発地の表示・選択 |
| `Destination` | 目的地の表示・選択 |
| `DepartureAndDestination` | 出発地・目的地の連動ロジック（Zustandストア直接テスト） |
| `SpotCard` | プラン内のスポットカード表示・並び替え |
| `GanttChart` | スポットの時間軸グラフ表示 |
| `CreatePlanButton` | プランの保存ボタン |
| `SpotSelection` | スポット検索タブ（Google検索・行きたいリスト・過去スポット） |

## 対象仕様

### TravelPlan

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | プランデータあり | プランタイトル・日程タブ・DayPlan一覧が表示される |
| 日程なし | 日程数0 | 空状態のメッセージが表示される |
| プラン保存 | 保存ボタンクリック | 保存処理が呼ばれる |

### DayPlan

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | 日付・スポットデータあり | 日付・スポットカード一覧が表示される |
| スポットなし | スポット数0 | 空状態が表示される |
| スポット追加ボタン | スポット上限未満 | スポット追加ボタンが有効 |
| スポット追加ボタン | スポット上限達成 | スポット追加ボタンが無効 |
| スポットを追加 | 追加ボタンクリック | SpotSelectionモーダルが開く |

### Departure / Destination

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | デフォルト地点あり | デフォルト地点名が表示される |
| 初期表示 | 設定なし | デフォルトプレースホルダ(候補以外の地点を選択中)が表示される |
| 選択操作 | セレクトから地点を選択 | ストアの地点情報が更新される |
| 選択操作 | 地点の名前変更 | ストアの名前が更新される |
| 選択操作 | 住所検索 | ストアの地点情報が更新される |
| 選択操作 | 観光スポット周辺から地点を選択(観光スポットなし) | 非活性 |
| 選択操作 | 観光スポット周辺から地点を選択(観光スポットあり) | 活性<br>プルダウンから観光スポットの情報を選択可能 <br> スポット選択後スッポット同じ座標にストアが更新される |
| 選択操作 | 現在地をもとに設定する | 押下することで、現在地の座標にストアが更新される |

### DepartureAndDestination

| テストグループ | 確認内容 |
|---|---|
| 初期値の確認 | 単一日/複数日プランでの初期値のデフォルト設定 |
| スポット情報の保持 | 出発地・目的地選択時の地点情報更新 |
| 単一日の連動確認 | 出発地変更→目的地が連動。目的地変更→出発地が連動 |
| 複数日の連動確認 | 目的地変更→翌日出発地が連動。出発地変更→前日目的地は不変 |

### SpotCard

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | スポットデータあり | スポット名・時刻・アイコンが表示される |
| 出発地/目的地 | isDepartureOrDestination=true | 出発地/目的地専用の表示になる |
| 削除 | 削除ボタンクリック | スポット削除処理が呼ばれる |

### SpotSelection

| タブ | テストファイル |
|---|---|
| Google検索タブ | `tests/components/spot-selection/GoogleSpotSearch.spec.tsx` |
| 行きたいリストタブ | `tests/components/spot-selection/WishlistSpotSearch.spec.tsx` |
| 過去スポットタブ | `tests/components/spot-selection/VisitedSpotSearch.spec.tsx` |

## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| DepartureAndDestination（ストアロジック） | `frontend/src/tests/components/travel-plan/DepartureAndDestination.spec.tsx` |
| SpotDetailCard | `frontend/src/tests/components/travel-plan/SpotDetailCard.spec.tsx` |
| TravelPlan | `frontend/src/tests/components/TravelPlan.spec.tsx` |
| DayPlan | `frontend/src/tests/components/DayPlan.spec.tsx` |
| Departure | `frontend/src/tests/components/travel-plan/Departure.spec.tsx` |
| Destination | `frontend/src/tests/components/travel-plan/Destination.spec.tsx` |
| SpotCard | `frontend/src/tests/components/SpotCard.spec.tsx` |
| SpotSelection（Google検索） | `frontend/src/tests/components/spot-selection/GoogleSpotSearch.spec.tsx` |
| SpotSelection（行きたいリスト） | `frontend/src/tests/components/spot-selection/WishlistSpotSearch.spec.tsx` |
| SpotSelection（過去スポット） | `frontend/src/tests/components/spot-selection/VisitedSpotSearch.spec.tsx` |
