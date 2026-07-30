# No.327 新宿駅を設定したのに何故か東京駅になる_調査報告

## 事象

- プラン作成時に出発地または目的地の最寄駅として `新宿駅` を設定して保存しても、詳細画面を開き直した際に `東京駅` と表示されることがある。

## 調査結果

- 主因は保存時ではなく、保存済みプランを詳細画面で再取得した後のフロントエンド再構築処理にある。
- `frontend/src/hooks/use-trip.ts` の `mapPlanLocationToFrontend` で、API から返却された `nearestStation` を画面用データへ変換する際に、駅名と座標を `defaultLocation` で上書きしている。
- `defaultLocation` は `frontend/src/data/constants.ts` で `東京駅` に定義されているため、再表示時に保存済みの最寄駅情報が `東京駅` に置き換わる。

```ts
nearestStation: nearestStation
  ? {
      ...nearestStation,
      name: defaultLocation.name,
      placeId: nearestStation.placeId ?? '',
      latitude: defaultLocation.lat,
      longitude: defaultLocation.lng,
      stationType: nearestStation.stationType ?? 'OTHER',
    }
  : undefined,
```

## 根本原因

- `enrichNearestStation` は `placeId` を使って Google Maps API から最寄駅情報を補完し、取得できた `name` / `latitude` / `longitude` を返している。
- しかしその直後の `mapPlanLocationToFrontend` で、補完済みの値を使わず `defaultLocation` を強制代入している。
- そのため、DB に保存された `placeId` や補完結果が正しくても、詳細画面の正規化処理だけで `東京駅` に見えてしまう。

## 切り分け内容

### 1. 保存時のデフォルト値混入

- プラン作成側のストア初期値やフォールバックも確認したが、それだけでは「保存後に必ず `東京駅` という文字列へ置換される」挙動は説明できなかった。
- 実際に `東京駅` という固定値を代入しているのは、詳細取得後の再構築処理だった。

### 2. バックエンド保存データ

- 画面再表示時の不整合は、フロントエンドが取得結果を変換する過程で発生しているため、主因は保存 API ではなく表示前の正規化処理と判断した。

## 既存テストで検出できなかった理由

- `useFetchTripDetail` 周辺の既存テストは、取得処理の成否や API 呼び出し自体の確認が中心で、正規化後の `nearestStation.name` / `latitude` / `longitude` までは検証していなかった。
- 最寄駅表示の UI テストもストアへ直接データを注入する形が中心で、永続化済みデータを再取得して表示する経路を通っていなかった。
- そのため、「保存済みプランの再表示時だけ `東京駅` へ上書きされる」回帰がテストから漏れていた。

## 最小修正方針

- `mapPlanLocationToFrontend` で `nearestStation` を組み立てる際、`defaultLocation` による `name` / `latitude` / `longitude` の強制上書きをやめる。
- あわせて `useFetchTripDetail` もしくは同等の正規化経路に対し、保存済みの最寄駅情報が再取得後も保持されることを確認する回帰テストを追加する。
