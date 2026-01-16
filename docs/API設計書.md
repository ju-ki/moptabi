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

ベースパス: `/api/auth`（実際の prefix はアプリ側ルーティングに依存）

- GET /auth/
  - 概要: ユーザーの存在チェック
  - ステータス:
    - 200: ユーザーが存在
    - 201: 新規ユーザー登録完了
    - 401: ユーザー登録失敗
    - 500: サーバーエラー
  - 備考: 実装では Clerk 等の外部認証連携を行っているため、リクエストには認証ヘッダが必要な可能性があります。詳細は `backend/src/controllers/auth.ts` を参照してください。

- GET /auth/list
  - 概要: 登録ユーザーの取得
  - ステータス:
    - 200: ユーザー一覧取得
    - 401: 認証エラー
    - 500: サーバーエラー
  - 備考: 実装では Clerk 等の外部認証連携を行っているため、リクエストには認証ヘッダが必要な可能性があります。詳細は `backend/src/controllers/auth.ts` を参照してください。

- GET /auth/dashboard
  - 概要: ダッシュボードに必要なユーザー数とプラン数と行きたいリスト総数とお知らせ数を取得する(前月比も合わせて)
  - ステータス:
    - 200: 情報取得(ユーザー数とアクティブユーザー数(最近1ヶ月)と総プラン数と行きたいリスト)
    - 401: 認証エラー
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

- GET /count
  - 概要: 行きたいリストの登録数と上限を取得
  - レスポンス 200: { count: number, limit: number }
  - 備考: 上限チェックに使用（上限: 100件）

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

- GET /count
  - 概要: プランの作成数と上限を取得
  - レスポンス 200: { count: number, limit: number }
  - 備考: 上限チェックに使用（上限: 20件）

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
- Notification: `backend/src/models/notification.ts`

---

## Notification（お知らせ）

ベースパス: `/api/notification`

- GET /
  - 概要: ユーザーのお知らせ一覧を取得（公開日時が現在以前のもの）
  - レスポンス 200: `NotificationListResponseSchema` (配列)
  - 備考: 未読/既読状態を含む。公開日時降順でソート

- GET /admin
  - 概要: お知らせ一覧を取得（公開日時が現在以前のもの）
  - レスポンス 200: `NotificationListResponseSchema` (配列)
  - 備考: 未来の公開日も含めて取得

- GET /unread-count
  - 概要: 未読のお知らせ件数を取得
  - レスポンス 200: { count: number }

- POST /
  - 概要: 管理者向けのお知らせ作成をし、全ユーザーに配信をする
  - レスポンス 201: なし(mutateを使用して一覧再取得する)

- PATCH /{id}/read
  - 概要: 指定IDのお知らせを既読にする
  - パスパラメータ: id (notificationId)
  - レスポンス 200: { success: true }
  - 404: 指定IDが存在しない

- PATCH /{id}
  - 概要: お知らせを更新し、全ユーザーに再配信する
  - パスパラメータ: id (notificationId)
  - レスポンス 200: { success: true }
  - 404: 指定IDが存在しない

- PATCH /read-all
  - 概要: 全てのお知らせを既読にする
  - レスポンス 200: { success: true, count: number }

- DELETE /{id}
  - 概要: お知らせの削除
  - パスパラメータ: id (notificationId)
  - レスポンス 200: { success: true }
  - 404: 指定IDが存在しない

モデル（主要フィールド）:
- NotificationSchema
  - id: number
  - title: string
  - content: string
  - type: 'SYSTEM' | 'INFO'
  - publishedAt: string (ISO8601)
  - createdAt: string (ISO8601)
  - isRead: boolean
  - readAt: string | null (ISO8601)

将来対応（リアルタイム通知）:
- WebSocket接続用エンドポイント: `/api/notification/ws`
- イベント: `notification:new`, `notification:read`

---

## 上限設定

アプリケーション全体で以下の上限値が設定されています:

| 項目 | 上限値 | 説明 |
|------|--------|------|
| 行きたいリスト登録数 | 100件 | ユーザーが行きたいリストに登録できる最大スポット数 |
| プラン作成数 | 20件 | ユーザーが作成できる旅行プランの最大数 |
| 1日あたりスポット数 | 10件 | 1日のプランに追加できる最大スポット数 |
| プラン日数 | 7日 | 1つのプランの最大日数 |

上限に達した場合:
- バックエンド: 400エラーを返し、適切なエラーメッセージを含む
- フロントエンド: ユーザーに通知を表示し、操作を制限

## エラーとステータスコード
- 200: 成功
- 201: 作成成功
- 204: 削除成功（No Content）
- 400: リクエスト不正（バリデーションエラー、上限超過）
- 401: 認証失敗（認証が必要な場合）
- 404: リソースが見つからない
- 500: サーバー内部エラー


作成者: 自動生成（リポジトリ内の route/model 定義を元に要約作成）
