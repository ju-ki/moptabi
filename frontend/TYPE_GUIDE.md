# Frontend 型配置ガイド

## 目的

frontend 内で型の置き場所を揃え、修正時に参照経路を追いやすくする。

## 配置ルール

### `packages/shared-types`

API の request / response 契約として frontend / backend で共通利用する型を置く。

例:

* 通知の契約型
* wishlist の契約型
* trip の共有契約型

### `frontend/src/models`

frontend で複数箇所から参照する「画面・hook・store の共通型」を置く。
shared 契約型をそのまま使えない場合は、ここで frontend 用の補強型を定義する。

例:

* `models/admin.ts`: 管理画面の一覧・クエリ型
* `models/mypage.ts`: マイページ集約データ型
* `models/trip.ts`: Trip 作成型、一覧型、detail 補強型

### `frontend/src/types`

frontend 専用で、主に UI 状態・地図表示・検索条件・描画補助に使う型を置く。
API 契約型の再定義は置かない。

例:

* `types/plan.ts`: 計画作成画面の状態型、地図・経路表示型
* `types/spot.ts`: Google Places 補助型
* `types/wishlist.ts`: view/filter/sort など UI 状態型

### component / hook ローカル

そのファイルでしか使わない props や一時的な UI 状態型だけを置く。
他ファイルでも使い始めたら `models` か `types` へ移す。

## 判断基準

1. backend と共有したい契約か
   `packages/shared-types` を使う
2. frontend 内で複数ファイルが参照するか
   `frontend/src/models` に置く
3. UI 状態や表示専用か
   `frontend/src/types` に置く
4. そのファイルでしか使わないか
   ローカル定義のままにする

## 避けること

* API レスポンス型を `component` や `hook` の中で再定義する
* shared 契約型をそのまま使えないのに、無理に型アサーションで合わせる
* 同じ概念の型を `models` と `types` に重複配置する

## 今の残置方針

* `types/plan.ts` は計画作成・地図表示・経路計算の frontend 中心型として維持する
* `types/spot.ts` は Google Places 補助型として維持する
* `types/wishlist.ts` は view/filter/sort など UI 状態型を維持する

## 追加時の確認

* まず shared 契約型で足りるか確認する
* 足りない場合は frontend のどこで再利用されるか確認する
* `models` へ置くなら API 補強理由をコメントで短く残す
* `types` へ置くなら UI 専用であることを意識する