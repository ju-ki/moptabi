# API ドキュメント（簡易版）

最終更新: 2026-09-30

このファイルは、Swagger UI が動作しない／参照できない場合の代替として作成した簡易 API ドキュメントです。
バックエンドの `backend/src/routes` と `backend/src/models` に基づき、主要エンドポイント、リクエスト/レスポンスのスキーマ、認証要件をまとめています。

注意: 詳細なスキーマは `backend/src/models/*.ts` に定義されています。ここでは開発者が素早く API を参照できることを目的とした要約を記載します。

## 共通
- ベースパス: `/api`（実際のエンドポイントは `backend/src/index.ts` を確認してください）
- コンテンツタイプ: `application/json`
- 認証: 一部エンドポイントは認証が必要（Clerk）。認証が必要な場合は `Authorization: Bearer <token>` ヘッダを付与してください。

---

## Auth

ベースパス: `/api/auth`

### GET /auth/
- 概要: ユーザーの存在チェック（ログイン時の初回登録処理を兼ねる）
- 認証: 必須
- ステータス:
  - 200: ユーザーが存在する
  - 201: 新規ユーザー登録完了
  - 401: ユーザー登録失敗
  - 500: サーバーエラー

### GET /auth/list
- 概要: 登録ユーザー一覧を取得（ページネーション・検索・ソート対応）
- 認証: 必須（管理者のみ）
- クエリパラメータ: `UserListQuerySchema` 参照
- レスポンス 200: `UserListResponseSchema`
- ステータス:
  - 200: ユーザー一覧取得成功
  - 401: 認証エラー
  - 403: 権限エラー
  - 500: サーバーエラー

### GET /auth/dashboard
- 概要: ダッシュボード用の統計情報を取得（ユーザー数・アクティブユーザー数・総プラン数・行きたいリスト数など）
- 認証: 必須（管理者のみ）
- レスポンス 200: `StatsSchema`
- ステータス:
  - 200: 統計情報取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

---

## Wishlist（行きたいリスト）

ベースパス: `/api/wishlist`

### GET /wishlist/
- 概要: ユーザーの行きたいリスト一覧を取得
- 認証: 必須
- レスポンス 200: `WishlistListResponseSchema`

### POST /wishlist/
- 概要: 行きたいリストにスポットを追加
- 認証: 必須
- リクエストボディ: `WishlistCreateSchema`
  - spotId: string
  - memo?: string | null
  - priority: number (1-5)
- レスポンス 201: `WishlistSchema`
- ステータス:
  - 201: 追加成功
  - 500: サーバーエラー

### PATCH /wishlist/{id}
- 概要: 指定 ID の行きたいリストを更新
- 認証: 必須
- パスパラメータ: id
- リクエストボディ: `WishlistUpdateSchema`
- レスポンス 200: `WishlistSchema`
- ステータス:
  - 200: 更新成功
  - 404: 指定IDが存在しない
  - 500: サーバーエラー

### DELETE /wishlist/{id}
- 概要: 行きたいリストから削除
- 認証: 必須
- パスパラメータ: id
- ステータス:
  - 204: 削除成功
  - 404: 指定IDが存在しない
  - 500: サーバーエラー

### GET /wishlist/count
- 概要: 行きたいリストの登録数と上限を取得
- 認証: 必須
- レスポンス 200: `{ count: number, limit: number }`
- 備考: 上限 100件

モデル（主要フィールド）:
- WishlistSchema
  - id: number
  - spotId: string
  - userId: string
  - memo: string | null
  - priority: number
  - visited: number
  - visitedAt: string | null
  - spot: SpotSchema

---

## Trip（旅行計画）

ベースパス: `/api/trip`

### GET /trip/
- 概要: 旅行計画一覧を取得
- 認証: 必須
- レスポンス 200: `TripSchema[]`

### GET /trip/count
- 概要: プランの作成数と上限を取得
- 認証: 必須
- レスポンス 200: `{ count: number, limit: number }`
- 備考: 上限 20件

### GET /trip/{id}
- 概要: 特定の旅行計画詳細を取得
- 認証: 必須
- パスパラメータ: id（数値文字列）
- レスポンス 200: `TripSchema`
- ステータス:
  - 200: 取得成功
  - 404: 旅行計画が存在しない
  - 500: サーバーエラー

### POST /trip/create
- 概要: 新しい旅行計画を作成
- 認証: 必須
- リクエストボディ: `TripSchema`
  - plans[].spots[] 内に以下を含む:
    - nearestStation: { placeId, stationType } （任意。スポットの最寄駅）
  - plans[].departure / destination 内に以下を含む:
    - nearestStation: { placeId, stationType } （任意）
- レスポンス 201: `TripSchema`
- 備考: 最寄駅情報はプラン作成と同時に一括登録。駅名・歩行時間はDBに保存しない（Google Maps ToS準拠）

### PATCH /trip/{id}
- 概要: 旅行計画を更新
- 認証: 必須
- パスパラメータ: id（数値文字列）
- リクエストボディ: `TripSchema`
- レスポンス 200: `TripSchema`
- ステータス:
  - 200: 更新成功
  - 500: サーバーエラー

### DELETE /trip/{id}
- 概要: 旅行計画を削除
- 認証: 必須
- パスパラメータ: id（数値文字列）
- レスポンス 200: `{ message: string }`
- ステータス:
  - 200: 削除成功
  - 404: 旅行計画が存在しない
  - 500: サーバーエラー

### POST /trip/upload
- 概要: 旅行計画のサムネイル画像をアップロード
- 認証: 必須
- レスポンス 201: `{ url: string }`

### GET /trip/{fileName}
- 概要: アップロード済み画像を取得
- パスパラメータ: fileName
- レスポンス 200: 画像データ

モデル（TripSchema 主要フィールド）:
- title: string (1-50)
- imageUrl?: string
- startDate, endDate: string (YYYY-MM-DD)
- plans[]:
  - date: string
  - spots[]: { id, stayStart, stayEnd, stayDuration, transportMethodId, travelTime, order, memo, nearestStation? }
  - departure: { name, latitude, longitude, time, transportMethodId, travelTime, nearestStation? }
  - destination: { name, latitude, longitude, time }

---

## Spot

ベースパス: `/api/spot`

### GET /spot/unvisited
- 概要: 未訪問の行きたいリストに登録しているスポットを取得
- 認証: 必須
- クエリパラメータ: `UnvisitedSpotsQuerySchema`（都道府県・優先度フィルタ、優先度・追加日ソート）
- レスポンス 200: `UnvisitedSpotsResponseSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

### GET /spot/visited
- 概要: 訪問済みのスポットと過去の旅行計画に登録したスポットを取得（重複除外）
- 認証: 必須
- クエリパラメータ: `VisitedSpotsQuerySchema`（都道府県フィルタ、訪問日・追加日ソート）
- レスポンス 200: `VisitedSpotsResponseSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

---

## UserLocation（お気に入り地点）

ベースパス: `/api/user-location`

### GET /user-location/
- 概要: ユーザーのお気に入り地点一覧を取得
- 認証: 必須
- レスポンス 200: `UserLocationListSchema`
- ステータス:
  - 200: 取得成功
  - 500: サーバーエラー

### POST /user-location/
- 概要: お気に入り地点を追加
- 認証: 必須
- リクエストボディ: `CreateUserLocationSchema`
- レスポンス 201: `UserLocationListSchema`
- ステータス:
  - 201: 追加成功
  - 500: サーバーエラー

### PATCH /user-location/{id}
- 概要: お気に入り地点の内容を更新
- 認証: 必須
- パスパラメータ: id
- リクエストボディ: `UpdateUserLocationSchema`
- レスポンス 200: `UserLocationListSchema`
- ステータス:
  - 200: 更新成功
  - 404: 指定IDが存在しない
  - 500: サーバーエラー

### DELETE /user-location/{id}
- 概要: お気に入り地点から削除
- 認証: 必須
- パスパラメータ: id
- ステータス:
  - 204: 削除成功
  - 404: 指定IDが存在しない
  - 500: サーバーエラー

---

## PlanLocation（出発地・目的地履歴）

ベースパス: `/api/plan-locations`

### GET /plan-locations/
- 概要: プラン作成時の出発地・目的地履歴を取得
- 認証: 必須
- クエリパラメータ: `locationType?: 'DEPARTURE' | 'DESTINATION'`
- レスポンス 200: `PlanLocationListSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

### GET /plan-locations/candidates
- 概要: 出発地・目的地の候補を取得（お気に入り地点 + 履歴の両方を返す）
- 認証: 必須
- クエリパラメータ: `PlanLocationCandidateQuerySchema`
- レスポンス 200: `PlanLocationCandidateResponseSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

### POST /plan-locations/
- 概要: 出発地・目的地履歴を登録（または使用回数を更新）
- 認証: 必須
- リクエストボディ: `CreatePlanLocationSchema`
  - name: string
  - latitude: number
  - longitude: number
  - time: string (HH:MM) — DEPARTURE: 出発時刻, DESTINATION: 到着予定時刻
  - locationType: 'DEPARTURE' | 'DESTINATION'
  - planId: number
  - transportMethodId?: number
  - travelTime?: number
  - nearestStation?: { placeId: string, stationType: StationType }
- レスポンス 201: `PlanLocationSchema`
- ステータス:
  - 201: 登録成功
  - 400: リクエストが不正
  - 401: 認証エラー
  - 500: サーバーエラー

### DELETE /plan-locations/{id}
- 概要: 出発地・目的地履歴を削除
- 認証: 必須
- パスパラメータ: id
- レスポンス 200: `PlanLocationSchema`
- ステータス:
  - 200: 削除成功
  - 401: 認証エラー
  - 404: 指定されたIDが存在しない
  - 500: サーバーエラー

---

## Notification（お知らせ）

ベースパス: `/api/notification`

### GET /notification/
- 概要: ユーザーのお知らせ一覧を取得（公開日時が現在以前のもの、公開日時降順）
- 認証: 必須
- レスポンス 200: `NotificationListResponseSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

### GET /notification/admin
- 概要: 管理者向けお知らせ一覧を取得（未来の公開日も含む・既読率情報付き）
- 認証: 必須（管理者のみ）
- クエリパラメータ: `NotificationAdminQuerySchema`（ページネーション・検索・フィルター・ソート）
- レスポンス 200: `NotificationAdminPaginatedResponseSchema`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 403: 権限エラー
  - 500: サーバーエラー

### GET /notification/unread-count
- 概要: 未読のお知らせ件数を取得（ヘッダーのバッジ表示などに使用）
- 認証: 必須
- レスポンス 200: `UnreadCountResponseSchema` → `{ count: number }`
- ステータス:
  - 200: 取得成功
  - 401: 認証エラー
  - 500: サーバーエラー

### POST /notification/
- 概要: お知らせを作成し全ユーザーに配信（管理者向け）
- 認証: 必須（管理者のみ）
- リクエストボディ: `NotificationCreateSchema`
- レスポンス 201: `NotificationResponseSchema`
- ステータス:
  - 201: 作成成功
  - 400: バリデーションエラー
  - 401: 認証エラー
  - 500: サーバーエラー

### PATCH /notification/{id}/read
- 概要: 指定IDのお知らせを既読にする
- 認証: 必須
- パスパラメータ: id (notificationId)
- レスポンス 200: `MarkReadResponseSchema` → `{ success: true }`
- ステータス:
  - 200: 既読更新成功
  - 401: 認証エラー
  - 404: お知らせが見つからない
  - 500: サーバーエラー

### PATCH /notification/read-all
- 概要: 全ての未読お知らせを一括既読にする
- 認証: 必須
- レスポンス 200: `MarkAllReadResponseSchema` → `{ success: true, count: number }`
- ステータス:
  - 200: 全て既読更新成功
  - 401: 認証エラー
  - 500: サーバーエラー

### PATCH /notification/{id}
- 概要: お知らせを更新し全ユーザーに再配信（管理者向け）
- 認証: 必須（管理者のみ）
- パスパラメータ: id (notificationId)
- リクエストボディ: `NotificationUpdateSchema`
- レスポンス 200: `NotificationResponseSchema`
- ステータス:
  - 200: 更新成功
  - 400: バリデーションエラー
  - 401: 認証エラー
  - 404: お知らせが見つからない
  - 500: サーバーエラー

### DELETE /notification/{id}
- 概要: お知らせを削除（関連する UserNotification も削除。管理者向け）
- 認証: 必須（管理者のみ）
- パスパラメータ: id (notificationId)
- レスポンス 200: `{ success: boolean }`
- ステータス:
  - 200: 削除成功
  - 401: 認証エラー
  - 404: お知らせが見つからない
  - 500: サーバーエラー

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

---

## スキーマ参照（モデルファイル）
- Spot: `backend/src/models/spot.ts`
- Trip: `backend/src/models/trip.ts`
- Wishlist: `backend/src/models/wishlist.ts`
- Notification: `backend/src/models/notification.ts`
- UserLocation: `backend/src/models/userLocation.ts`
- PlanLocation: `backend/src/models/planLocation.ts`
- User: `backend/src/models/user.ts`
- Auth: `backend/src/models/auth.ts`

---

## 上限設定

| 項目 | 上限値 | 説明 |
|------|--------|------|
| 行きたいリスト登録数 | 100件 | ユーザーが行きたいリストに登録できる最大スポット数 |
| プラン作成数 | 20件 | ユーザーが作成できる旅行プランの最大数 |
| 1日あたりスポット数 | 10件 | 1日のプランに追加できる最大スポット数 |
| プラン日数 | 7日 | 1つのプランの最大日数 |

上限に達した場合:
- バックエンド: 400エラーを返し、適切なエラーメッセージを含む
- フロントエンド: ユーザーに通知を表示し、操作を制限

---

## エラーとステータスコード

| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（No Content） |
| 400 | リクエスト不正（バリデーションエラー、上限超過） |
| 401 | 認証失敗 |
| 403 | 権限エラー（認証済みだが権限不足） |
| 404 | リソースが見つからない |
| 500 | サーバー内部エラー |

---

## データ保存方針（Google Maps ToS準拠）

駅名・歩行時間・緯度経度などの場所詳細情報はDBに保存しない（Google Maps Platform利用規約準拠）。
保存するのは `placeId` と `stationType` のみで、表示時にフロントエンドがGoogle Places APIから都度取得する。

対象テーブル: `PlanSpotNearestStation`, `PlanLocationNearestStation`, `UserLocationNearestStation`
