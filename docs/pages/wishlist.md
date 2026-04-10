# 行きたいリストページ（/wishlist）

## 概要

ユーザーが「行きたいスポット」を管理するページ。スポットの検索・追加・削除・訪問状態の管理、フィルタリング・ソート機能を提供する。

## 主要コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `Header` | ビュー切り替え（リスト/マップ）・フィルター・ソート操作 |
| `ListView` | ウィッシュリスト一覧表示（リストビュー） |
| `MapView` | ウィッシュリスト地図表示（マップビュー） |
| `WishlistCreateModal` | スポット検索・追加モーダル |
| `AreaSearch` | エリア（都道府県）でスポットを検索するタブ |
| `KeywordSearchWithMap` | キーワードでスポットを検索するタブ |
| `SearchResultsView` | 検索結果の表示（リスト/マップ切り替え） |
| `SpotPreview` | 検索結果のスポット詳細プレビュー |
| `WishlistSpotInfoCard` | ウィッシュリスト内スポットの詳細カード |

## 対象仕様

### Header

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | 任意 | タイトル「行きたいリスト」・リスト/マップビュー切り替えボタンが表示される |
| ビュー切り替え | マップビューボタンクリック | `setViewMode('map')` が呼ばれる |
| ビュー切り替え | リストビューボタンクリック | `setViewMode('list')` が呼ばれる |
| フィルター操作 | 優先度セレクト変更 | `setPriorityFilter(値)` が呼ばれる |
| フィルター操作 | 評価セレクト変更 | `setRatingFilter(値)` が呼ばれる |
| フィルター操作 | 未訪問/訪問済みボタンクリック | `setFilteredType(値)` が呼ばれる |
| 状態の維持 | ビュー切り替え後 | フィルター状態・優先度・評価が維持される |

### ListView

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | ウィッシュリストアイテムあり | スポット名・評価がリスト表示される |
| メモ編集 | テキストエリア変更 + フォーカスアウト | `store.updateWishlist` と `api.updateWishlist` が呼ばれる |
| 訪問済みにする | 訪問済みにするボタンクリック | `store.updateWishlist` と `api.updateWishlist` が呼ばれる |
| 削除 | 削除ボタンクリック | `store.setWishlist` と `api.deleteWishlist` が呼ばれる |
| フィルター適用 | フィルター変更後 | フィルタ一致アイテムのみ表示される |

### MapView

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| マーカー表示 | ウィッシュリストアイテムあり | アイテム数分のマーカーが地図に表示される |
| スポット選択 | マーカークリック | `setSelectedWishlist(アイテム)` が呼ばれる |
| InfoWindow表示 | selectedWishlistあり | InfoWindowが表示されスポット情報が表示される |
| InfoWindow操作 | 訪問済みトグルクリック | `store.updateWishlist` と `api.updateWishlist` が呼ばれる |
| InfoWindow操作 | 削除ボタンクリック | `store.setWishlist` と `api.deleteWishlist` が呼ばれる |
| フィルター適用 | フィルター変更後 | フィルタ一致アイテムのみマーカーが表示される |

### WishlistCreateModal

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| モーダルを開く | スポットを検索ボタンクリック | 「行きたいスポットを追加」モーダルが表示される |
| 初期表示 | モーダル開時 | エリア検索タブ（AreaSearch）が表示される |
| タブ切り替え | キーワードで探すタブクリック | KeywordSearchWithMapが表示される |

### AreaSearch

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | 任意 | 場所選択・検索範囲・カテゴリ等の項目が表示される。検索ボタンは無効 |
| 地図確認モーダル | 地図で調整ボタンクリック | `setSelectMapOpen(true)` が呼ばれる |
| 検索範囲変更 | スライダー操作 | `setSearchRadius(値)` が呼ばれる |
| カテゴリ選択 | カテゴリボタンクリック | `setSearchCategories(カテゴリ名)` が呼ばれる |
| 詳細設定 | 詳細設定ボタンクリック | 高評価フィルターが表示される |
| 検索実行前 | 場所未選択 | 検索ボタンが無効のまま |
| 検索実行 | 場所選択後、検索ボタンクリック | `searchSpots` が呼ばれ結果が `setAreaSearchResults` にセットされる |
| 高評価フィルター | highRating=true | 評価4以上のスポットのみが結果にセットされる |
| エラー | searchSpots がエラー | `setAreaSearchResults` は呼ばれず、検索ボタンが再び有効になる |
| ローディング | 検索中 | 検索ボタンが無効化。完了後に再び有効 |
| 空結果 | 検索結果0件 | `setAreaSearchResults([])` が呼ばれ地図中心は変更されない |

### KeywordSearchWithMap

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | 任意 | 入力欄・検索ボタンが表示される。検索ボタンは無効 |
| キーワード入力 | 入力欄に文字入力 | `setSearchKeyword(値)` が呼ばれ検索ボタンが有効になる |
| 検索成功 | キーワードあり + 検索ボタンクリック | `setKeywordSearchResults(結果)` と `setKeywordMapCenter(1件目の位置)` が呼ばれる |
| ローディング | 検索中 | 検索ボタンが無効化。完了後に再び有効 |
| エラー | searchSpots がエラー | `setKeywordSearchResults` は呼ばれず、ボタンが再び有効になる |
| 空結果 | 結果0件 | `setKeywordSearchResults([])` が呼ばれ地図中心は変更されない |

### SearchResultsView

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 空状態 | 検索結果なし | 「検索結果がありません」が表示される |
| 結果表示 | 検索結果あり | 件数とリスト/マップが表示される |
| スポット選択（リスト） | リスト項目クリック | `setSelectedSpot(スポット)` が呼ばれる |
| スポット選択（マップ） | マーカークリック | `setSelectedSpot(スポット)` が呼ばれる |
| InfoWindow表示 | selectedSpotあり | InfoWindowが表示されスポット名・評価・住所が表示される |

### SpotPreview

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示（未選択） | selectedSpot なし | 「スポットを選択してください」プレースホルダが表示される |
| 初期表示（選択済み） | selectedSpotあり | スポット名・評価・住所・行きたいリスト追加ボタンが表示される |
| 追加成功 | 行きたいリストに追加ボタンクリック + `postWishlist` 成功 | `addWishlist` が呼ばれ、成功トーストが表示される |
| 追加失敗 | `postWishlist` が例外 | `addWishlist` は呼ばれず、エラートーストが表示される |

## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| Header | `frontend/src/tests/components/wishlist/Header.spec.tsx` |
| ListView | `frontend/src/tests/components/wishlist/ListView.spec.tsx` |
| MapView | `frontend/src/tests/components/wishlist/MapView.spec.tsx` |
| WishlistCreateModal | `frontend/src/tests/components/wishlist/WishlistCreateModal.spec.tsx` |
| AreaSearch | `frontend/src/tests/components/wishlist/AreaSearch.spec.tsx` |
| KeywordSearchWithMap | `frontend/src/tests/components/wishlist/KeywordSearchWithMap.spec.tsx` |
| SearchResultsView | `frontend/src/tests/components/wishlist/SearchResultsView.spec.tsx` |
| SpotPreview | `frontend/src/tests/components/wishlist/SpotPreview.spec.tsx` |
| WishlistSpotInfoCard | `frontend/src/tests/components/wishlist/WishlistSpotInfoCard.spec.tsx` |
