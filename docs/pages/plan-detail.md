# プラン詳細ページ（/plan/[id]）

## 概要

作成済み旅程プランの詳細を閲覧・共有するページ。旅程の地図表示、スポット情報一覧、移動時間・交通手段の確認機能を提供する。

## 主要コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `TravelMap` | 全スポットをGoogleマップ上でマーカー表示 |
| `SpotInfoCard` | スポットの詳細情報カード（訪問日時・移動情報を含む） |
| `SpotDetailCard` | スポットの詳細情報表示（旅程詳細ページ用） |
| `Transportation` | スポット間の移動手段・移動時間の表示 |
| `RouteSummary` | プラン全体の移動ルートサマリー |

## 対象仕様

### TravelMap

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | スポットデータあり | Googleマップが表示され、出発地・目的地・スポットのマーカーが表示される |
| スポットなし | スポットデータなし | 地図は表示され、出発地・目的地マーカーのみ表示される |
| マーカークリック | マーカークリック | 該当スポットのInfoWindowが表示される |
| ルート表示 | スポットデータあり | スポット間ルートのポリラインが表示される |
| InfoWindowクローズ | InfoWindow表示中に閉じる操作 | InfoWindowが非表示になる |

### SpotInfoCard

| テストグループ | 確認内容 |
|---|---|
| 初期表示 | スポット名・住所・評価・カテゴリ・URLの表示 |
| 訪問日時表示 | 訪問日時・滞在時間が正しく表示される |
| 訪問日時なし | 訪問日時なしの場合のデフォルト表示 |
| スポットタイプ | 出発地/目的地/通常スポットの表示切り替え |
| 移動時間 | 移動時間・距離の表示 |
| リンク | 外部リンクの表示・クリック |

### SpotDetailCard

| テストグループ | 確認内容 |
|---|---|
| 初期表示 | スポット詳細情報の表示 |
| 評価表示 | 評価値・評価数の表示 |
| カテゴリ | カテゴリラベルの表示 |

### Transportation

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | 移動データあり | 交通手段アイコン・移動時間・距離が表示される |
| データなし | 移動データなし | ローディング or 空状態が表示される |

## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| SpotInfoCard | `frontend/src/tests/components/SpotInfoCard.spec.tsx` |
| SpotDetailCard | `frontend/src/tests/components/travel-plan/SpotDetailCard.spec.tsx` |
| TravelMap | `frontend/src/tests/components/TravelMap.spec.tsx` |
| Transportation | `frontend/src/tests/components/Transportation.spec.tsx`（未作成） |
