# No.341 地図からスポットを探す 処理フロー

実装後の処理の流れ。詳細は [No.341_実装計画.md](./No.341_実装計画.md) を参照。

## 1. ダイアログを開く

```mermaid
flowchart TD
  A["SpotSelectionDialog を開く<br/>date"] --> B{"date が前回と違う"}
  B -->|"違う"| C["syncSearchDate<br/>プランの地点選択（P-5）と地図の中心をリセット"]
  B -->|"同じ"| D["useUserLimits<br/>limits / limitsError"]
  C --> D
  D --> E{"spotSearchStore.searchMode"}
  E -->|"list"| F["SearchModeSwitch"]
  F --> G["OpenOnPlanDateFilter<br/>3タブ共通で1か所"]
  G --> H["Tabs: Google検索 / 行きたいリスト / 過去のスポット<br/>中身は従来どおり"]
  E -->|"map"| I["SearchModeSwitch"]
  I --> J["MapSpotSearch<br/>date, selectedSpotIds, onSpotSelect=handleSpotSelect,<br/>isLimitReached, limitsError"]
  F -. "切替を押す" .-> K["setSearchMode<br/>ストアに残り、次に開いたときも同じ探し方"]
  I -. "切替を押す" .-> K
```

- 地図は `searchMode === 'map'` のときだけマウントされる。リストで探すのままなら地図は読み込まない。

## 2. 地図で探すの初期表示

```mermaid
flowchart TD
  A["MapSpotSearch をマウント"] --> B["use-map-center-candidates(date)<br/>出発地 / 目的地 / その日のスポット ①② /<br/>他の日のスポット / 現在地（押下時に取得）"]
  B --> C{"mapCenter が既にある"}
  C -->|"ある"| E["その中心で表示"]
  C -->|"ない"| D{"初期中心"}
  D -->|"目的地あり"| D1["目的地"]
  D -->|"目的地なし・出発地あり"| D2["出発地"]
  D -->|"どちらもなし"| D3["defaultLocation（東京駅）"]
  D1 --> E
  D2 --> E
  D3 --> E
  E --> F["GoogleMap<br/>zoom=MAP_FOCUS_ZOOM, clickableIcons=true"]
  F --> G["アプリ側のピンを描画（API なし）<br/>S / G、その日のスポットの番号ピン"]
  G --> H{"checkOpeningStatus<br/>stayStart / stayEnd 付き"}
  H -->|"警告あり"| H1["番号ピンに「営業時間外」の印"]
  H -->|"なし"| H2["通常の番号ピン"]
  F --> I["pinLayers を lib/map-pin-layers から復元<br/>読めないときは両方 OFF"]
  I --> J{"行きたいリスト ON"}
  J -->|"ON"| J1["WishlistPinLayer をマウント<br/>useWishlistSpots（ユーザー別上限の件数まで詳細取得、リスト側とキャッシュ共有）"]
  I --> K{"過去のスポット ON"}
  K -->|"ON"| K1["VisitedPinLayer をマウント<br/>use-map-visited-pins"]
  K1 --> M["spotId の一覧を取得<br/>/spots/visited（API 費用なし）"]
  M --> N{"getCachedCoordinates(spotId)"}
  N -->|"座標キャッシュあり"| N1["そのままピンにする<br/>API なし"]
  N -->|"なし"| N2["最大20件まで fetchPlaceDetailsWithRetry"]
  N2 --> N3{"残りがある"}
  N3 -->|"ある"| N4["「位置を取得していないスポットが n 件」+「さらに表示」"]
  N4 -. "さらに表示" .-> N2
  J1 --> L{"計画日に休み<br/>詳細を取得済みのものだけ判定"}
  N1 --> L
  N2 --> L
  L -->|"休み かつ openOnPlanDate ON"| L1["描かない"]
  L -->|"休み かつ openOnPlanDate OFF"| L2["不透明度 0.4 で描く"]
  L -->|"営業 または 情報なし"| L3["通常どおり描く"]
```

## 3. 中心を移す

```mermaid
flowchart TD
  A{"操作"} -->|"候補チップ（PC）/ 住所欄フォーカス時の候補リスト（スマホ）"| B["mapCenter = 候補の座標<br/>mapCenterLabel = 候補名"]
  A -->|"住所欄で Enter / blur"| C["AddressSearch → useGeocoding.searchByAddress<br/>Geocoding 1回、同じ住所は5分キャッシュ"]
  C --> C1{"結果"}
  C1 -->|"見つかった"| C2["mapCenter = 結果<br/>mapCenterLabel = null（「中心から」）"]
  C1 -->|"見つからない"| C3["AddressSearch のエラー表示<br/>中心は動かさない"]
  A -->|"現在地"| D["navigator.geolocation.getCurrentPosition"]
  D --> D1{"結果"}
  D1 -->|"成功"| D2["mapCenter = 現在地<br/>mapCenterLabel = 現在地"]
  D1 -->|"拒否・失敗"| D3["エラー文言<br/>中心は動かさない"]
  A -->|"地図をドラッグ（onDragEnd）"| E["mapCenter = map.getCenter()<br/>mapCenterLabel = null"]
  B --> F["map.panTo + map.setZoom(15)"]
  C2 --> F
  D2 --> F
```

## 4. スポットを選ぶ

```mermaid
flowchart TD
  A{"クリックされたもの"} -->|"Google 標準の POI<br/>e.placeId あり"| B["e.stop()<br/>Google 標準の吹き出しを出さない"]
  B --> C["use-map-poi-selection.select(placeId)<br/>fetchPlaceDetailsWithRetry"]
  C --> D{"メモリキャッシュ"}
  D -->|"あり"| E["API を呼ばない"]
  D -->|"なし"| F["Place Details<br/>最大3回リトライ"]
  F --> G{"結果"}
  G -->|"成功"| E
  G -->|"失敗"| G1["カードに「情報を取得できませんでした」"]
  E --> H["ExtendSpotType に変換<br/>openingPeriods / businessStatus を含む"]
  A -->|"アプリ側のピン<br/>番号 / ハート / 過去"| I0{"詳細を取得済み"}
  I0 -->|"済み"| I["持っているデータを使う<br/>API なし"]
  I0 -->|"座標だけ"| C
  A -->|"地図の何もない所"| J["selectedSpot を解除"]
  H --> K["selectedSpot にセット → SelectedSpotCard"]
  I --> K
```

## 5. カードの表示

```mermaid
flowchart TD
  A["SelectedSpotCard(selectedSpot)"] --> B["distance = formatDistance(calcDistanceKm(mapCenter, spot))<br/>basis = mapCenterLabel ?? 中心<br/>status = checkOpeningStatus(openingPeriods, businessStatus, date)"]
  B --> C{"画面幅"}
  C -->|"スマホ"| C1["名前 + バッジ<br/>★評価 ・ {basis}から{distance} ・ 営業時間 or 休みの短文<br/>ボタン"]
  C -->|"PC"| C2["名前 + バッジ / 評価・住所<br/>{basis}から約{distance} / 計画日の営業時間 / HolidayNote<br/>ボタン"]
  C1 --> D{"ボタンの状態"}
  C2 --> D
  D -->|"selectedSpotIds に含まれる"| D1["選択解除"]
  D -->|"limitsError または isLimitReached"| D2["計画に追加（disabled）+ 理由"]
  D -->|"それ以外"| D3["計画に追加"]
```

## 6. 追加・取り消し

```mermaid
sequenceDiagram
  actor U as 利用者
  participant Card as SelectedSpotCard
  participant Dialog as SpotSelectionDialog.handleSpotSelect
  participant Store as プランのストア
  participant Map as MapSpotSearch

  Note over Card: 描画時点で limitsError または isLimitReached なら<br/>ボタンは disabled で押せない（UI 側の制御）
  U->>Card: 計画に追加（ボタンが有効なときだけ）
  Card->>Dialog: onSpotSelect(setStartTimeAutomatically(spot, planSpots), false)
  Note over Dialog: 呼び出し時点の limitsError / isLimitReached で再確認する<br/>（上限の再取得はしない。描画後に別の操作で上限に達した場合などに働く）
  alt 呼び出し時点で上限取得失敗 または 上限到達
    Dialog-->>U: トーストで止める
  else 追加できる
    Dialog->>Store: setSpots(date, spot, false)
    opt 休み・閉業
      Dialog-->>U: 確認トースト（#158）
    end
    Store-->>Map: plans 更新
    Map-->>U: その位置に番号ピン
    Card-->>U: 追加しました + 取り消す（ダイアログは閉じない）
  end

  U->>Card: 取り消す / 選択解除
  Card->>Dialog: onSpotSelect(spot, true)
  Dialog->>Store: setSpots(date, spot, true)
  Store-->>Map: plans 更新
  Map-->>U: 番号ピンが消える
  Card-->>U: 計画に追加 に戻る
```

## 7. 表示するピンの切替

```mermaid
flowchart TD
  A["MapPinLayerToggle<br/>PC: 左パネルのチェック<br/>スマホ: ピン（n）ボタン → 下部シート"] --> B{"操作"}
  B -->|"行きたいリスト ON/OFF"| C["setPinLayers"]
  B -->|"過去のスポット ON/OFF"| C
  C --> D["lib/map-pin-layers.save<br/>localStorage、失敗しても無視"]
  C --> E["レイヤーのマウント / アンマウント"]
  B -->|"計画日に休みのピンを隠す"| F["setOpenOnPlanDate<br/>リスト側のフィルターと同じ状態"]
```
