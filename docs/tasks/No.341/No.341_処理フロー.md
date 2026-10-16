# No.341 地図からスポットを探す 処理フロー

- 実装計画: [No.341_実装計画.md](./No.341_実装計画.md)

## 1. ダイアログを開く

```
SpotSelectionDialog（date）
  ├─ date が前回と違う → clearPlanSpotSelection()（P-5）
  ├─ useUserLimits() → limits / limitsError
  └─ spotSearchStore.searchMode
       ├─ 'list' → SearchModeSwitch
       │            OpenOnPlanDateFilter（3タブ共通、1か所）
       │            Tabs: Google検索 / 行きたいリスト / 過去のスポット（従来どおり）
       └─ 'map'  → SearchModeSwitch
                    MapSpotSearch（date, selectedSpotIds, onSpotSelect=handleSpotSelect,
                                   isLimitReached, limitsError）
```

- 切替を押すと `setSearchMode` を呼ぶ。ストアに残るので、次に開いたときも同じ探し方で開く。
- 地図は `searchMode === 'map'` のときだけマウントされる（それまで地図は読み込まない）。

## 2. 地図で探すの初期表示

```
MapSpotSearch
  ├─ use-map-center-candidates(date)
  │    plans から候補を作る:
  │      出発地 / 目的地 / その日のスポット(①②…) / 他の日のスポット(10/19 …) / 現在地(押下時取得)
  │    初期中心: 目的地 → 出発地 → defaultLocation（東京駅）
  ├─ mapCenter・mapCenterLabel を初期中心にセット（既に値があればそれを使う）
  ├─ GoogleMap（center=mapCenter, zoom=MAP_FOCUS_ZOOM, clickableIcons=true）
  ├─ アプリ側のピンを描画（API 呼び出しなし）
  │    出発地・目的地: S / G
  │    その日のスポット: 番号ピン（checkOpeningStatus が警告なら「営業時間外」の印）
  └─ pinLayers を lib/map-pin-layers から復元
       ├─ wishlist ON → WishlistPinLayer をマウント → useWishlistSpots（Place Details、キャッシュ共有）
       └─ visited  ON → VisitedPinLayer をマウント → useVisitedSpots（同上）
            各ピン: 計画日に休み → 不透明度 0.4
                    openOnPlanDate ON かつ休み → 描かない
```

## 3. 中心を移す

```
候補チップ（PC）/ 住所欄フォーカス時の候補リスト（スマホ）を選ぶ
  → mapCenter = 候補の座標, mapCenterLabel = 候補名
  → map.panTo(), map.setZoom(15)

住所欄で Enter / blur
  → AddressSearch → useGeocoding.searchByAddress（Geocoding 1回、同じ住所は5分キャッシュ）
  → 見つかった: mapCenter = 結果, mapCenterLabel = null（「中心から」）→ panTo / setZoom(15)
  → 見つからない: AddressSearch のエラー表示（中心は動かさない）

現在地を押す
  → navigator.geolocation.getCurrentPosition
  → 成功: mapCenter = 現在地, mapCenterLabel = '現在地' → panTo / setZoom(15)
  → 失敗: エラー文言を出す（中心は動かさない）

地図をドラッグ（onDragEnd）
  → mapCenter = map.getCenter(), mapCenterLabel = null
```

## 4. スポットを選ぶ

```
地図のクリック（GoogleMap onClick）
  ├─ e.placeId あり（Google 標準の POI）
  │    e.stop()（Google 標準の InfoWindow を出さない）
  │    use-map-poi-selection.select(placeId)
  │      → fetchPlaceDetailsWithRetry(placeId)
  │           メモリキャッシュあり → API を呼ばない
  │           なし → Place Details（最大3回リトライ）
  │      → 成功: ExtendSpotType に変換して selectedSpot にセット
  │      → 失敗: カードに「情報を取得できませんでした」
  └─ placeId なし → selectedSpot を解除

アプリ側のピン（番号 / ハート / 過去）のクリック
  → 持っているデータで selectedSpot をセット（API なし）
```

## 5. カードの表示

```
SelectedSpotCard(selectedSpot)
  distance = formatDistance(calcDistanceKm(mapCenter, selectedSpot))
  basis    = mapCenterLabel ?? '中心'
  status   = checkOpeningStatus({ openingPeriods, businessStatus, date })

  スマホ: 名前 + バッジ / 「★評価 ・ {basis}から{distance} ・ {営業時間 or 休みの短文}」/ ボタン
  PC   : 名前 + バッジ / 評価・住所 / 「{basis}から約{distance}」/ 計画日の営業時間 / HolidayNote / ボタン

  ボタン:
    selectedSpotIds に含まれる → 「選択解除」
    limitsError または isLimitReached → 「計画に追加」disabled + 理由
    それ以外 → 「計画に追加」
```

## 6. 追加・取り消し

```
「計画に追加」
  → onSpotSelect(setStartTimeAutomatically(spot, planSpots), false)
       = SpotSelectionDialog.handleSpotSelect
           上限取得失敗 → トーストで止める
           上限到達     → トーストで止める
           setSpots(date, spot, false)
           休み・閉業 → 確認トースト（#158）
  → プランのストア更新 → その位置に番号ピンが出る
  → カード: 「追加しました」+「取り消す」（ダイアログは閉じない）

「取り消す」/「選択解除」
  → onSpotSelect(spot, true) → setSpots(date, spot, true)
  → 番号ピンが消え、カードは「計画に追加」に戻る
```

## 7. 表示するピンの切替

```
MapPinLayerToggle（PC: 左パネルのチェック / スマホ: 「ピン（n）」ボタン → 下部シート）
  行きたいリスト ON/OFF → setPinLayers → lib/map-pin-layers.save()（localStorage、失敗しても無視）
  過去のスポット ON/OFF → 同上
  計画日に休みのピンを隠す → setOpenOnPlanDate（リスト側のフィルターと同じ状態）
```
