# API ドキュメント（簡易版）

最終更新: 2025-11-24

このファイルは、Swagger UI が動作しない／参照できない場合の代替として作成した簡易 API ドキュメントです。
バックエンドの `backend/src/routes` と `backend/src/models` に基づき、主要エンドポイント、リクエスト/レスポンスのスキーマ、実行例、認証要件をまとめています。

注意: 詳細なスキーマは `backend/src/models/*.ts` に定義されています。ここでは開発者が素早く API を参照できることを目的とした要約を記載します。

## 共通
- ベースパス: `/api`（アプリの実装により違う場合があります。実際のエンドポイントは `backend/src/index.ts` を確認してください）
- コンテンツタイプ: application/json
- 認証: 一部エンドポイントは認証が必要（Clerk などを利用）。認証が必要な場合は `Authorization: Bearer <token>` ヘッダを付与してください。



## Auth

- GET /auth/
  - 概要: ユーザーの存在チェック
  - ステータス:
    - 200: ユーザーが存在
    - 201: 新規ユーザー登録完了
    - 401: ユーザー登録失敗
    - 500: サーバーエラー
  - 備考: 実装では Clerk 等の外部認証連携を行っているため、リクエストには認証ヘッダが必要な可能性があります。詳細は `backend/src/controllers/auth.ts` を参照してください。

---

## Wishlist (行きたいリスト)

ベースパス: `/api/wishlist`（実際の prefix はアプリ側ルーティングに依存）

- GET /
  - 概要: ユーザーの行きたいリスト一覧を取得
  - レスポンス 200: `WishlistListResponseSchema` (配列)

- POST /
  - 概要: 行きたいリストにスポットを追加
  - リクエストボディ: `WishlistCreateSchema`
    - spotId: string
    - spot: SpotSchema
    - memo?: string | null
    - priority: number (1-5)
  - レスポンス 201: 作成した `WishlistSchema`

- PATCH /{id}
  - 概要: 指定 ID の wishlist を更新
  - パスパラメータ: id
  - リクエストボディ: `WishlistUpdateSchema`
  - レスポンス 200: 更新された `WishlistSchema`
  - 404: 指定IDが存在しない

- DELETE /{id}
  - 概要: wishlist を削除
  - パスパラメータ: id
  - レスポンス 204: 削除成功

モデル（主要フィールド）:
- WishlistSchema
  - id: number
  - spotId: string
  - userId: string
  - memo: string | null
  - priority: number
  - visited: number
  - visitedAt: date | null
  - spot: SpotSchema

---

## Trip（旅行計画）

ベースパス: `/api/trip`（実際の prefix はアプリ側ルーティングに依存）

- GET /
  - 概要: 旅行計画一覧を取得
  - レスポンス 200: `TripSchema[]`

- GET /{id}
  - 概要: 特定の旅行計画詳細を取得
  - パスパラメータ: id（数値文字列）
  - レスポンス 200: `TripSchema`
  - 404: 取得できない

- POST /create
  - 概要: 新しい旅行計画を作成
  - リクエストボディ: `TripSchema`（作成に必要なフィールド）
  - レスポンス 201: 作成された `TripSchema`

- DELETE /{id}
  - 概要: 旅行計画を削除
  - レスポンス 200: { message: string }

Image 関連
- POST /upload
  - 概要: 画像アップロード
  - レスポンス 201: { url: string }

- GET /{fileName}
  - 概要: 画像取得
  - レスポンス 200: 画像データ

モデル（主要フィールド / TripSchema 抜粋）:
- title: string (1-50)
- imageUrl?: string
- startDate, endDate: string
- tripInfo: array of { date, genreId, transportationMethod[], memo? }
- plans: array of { date, spots[] }
  - spot: { id, location: { name, lat, lng }, stayStart, stayEnd, transports: { transportMethodIds[], fromType, toType, travelTime?, cost? }, order }

注: `fromType` / `toType` は Prisma の enum (`TransportNodeType`) を使用するため、テスト環境では enum を mock する必要があります。

---

## Image
- 画像アップロードと配信は上記 Trip の Image のエンドポイントで提供されます。

---


## Spot
ベースパス: `/api/spot`（実際の prefix はアプリ側ルーティングに依存）
---
 - GET /{wishlist}
  - 概要: ユーザーが行きたいリストに登録しているスポットの一覧を取得
  - レスポンス 200 {`WishlistSchema[]`}: 行きたいリストに登録している未訪問のスポット情報といきたいリストのプロパティ情報
- GET /{visited}
  - 概要: ユーザーが訪問済みまたは過去に計画に追加したスポットの一覧を取得
  - レスポンス 200 {`WishlistSchema[]`}: いきたいリストに登録している訪問済みのスポット情報と過去に計画に追加したスポット情報
  - レスポンス 200 {`WishlistSchema[] + `}: いきたいリストに登録している訪問済みのスポット情報と過去に計画に追加したスポット情報


---

## スキーマ参照（モデルファイル）
- Spot: `backend/src/models/spot.ts`
- Trip: `backend/src/models/trip.ts`
- Wishlist: `backend/src/models/wishlist.ts`

---

## エラーとステータスコード
- 200: 成功
- 201: 作成成功
- 204: 削除成功（No Content）
- 400: リクエスト不正（バリデーションエラー）
- 401: 認証失敗（認証が必要な場合）
- 404: リソースが見つからない
- 500: サーバー内部エラー


作成者: 自動生成（リポジトリ内の route/model 定義を元に要約作成）
