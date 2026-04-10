# 管理画面（/admin）

## 概要

管理者向けのユーザー管理・お知らせ管理ページ。ユーザー一覧の閲覧とお知らせの作成・編集・配信を行う。

## 主要コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `Dashboard` | 総ユーザー数,プラン数, 行きたいリストの表示, 今月の追加数の表示 |
| `NotificationManagement` | お知らせの作成・編集・削除・配信管理 |
| `UserList` | ユーザー一覧の表示・検索・詳細閲覧 |

## テスト対象仕様

### NotificationManagement

| テストグループ | 確認内容 |
|---|---|
| 初期表示 | お知らせ一覧の表示・空状態確認 |
| 新規作成 | 作成フォームの表示・入力・バリデーション |
| 編集 | 既存データのフォームへの読み込み・保存 |
| 削除 | 削除確認・削除実行 |
| 配信対象設定 | 全ユーザー/特定ユーザー向けの設定 |
| 権限確認 | 管理者以外のアクセス制限 |

### UserList

| テストグループ | 確認内容 |
|---|---|
| 初期表示 | ユーザー一覧の表示・件数確認 |
| ページネーション | ページ切り替え・件数変更 |
| 検索 | ユーザー名・メールアドレスによる絞り込み |
| ユーザー詳細 | 行クリックでのモーダル表示 |
| 権限フィルター | 管理者/一般ユーザーのフィルター |

## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| NotificationManagement | `frontend/src/tests/components/admin/NotificationManagement.spec.tsx` |
| UserList | `frontend/src/tests/components/admin/UserList.spec.tsx` |

## 関連フック

| フック | テストファイル |
|---|---|
| `use-admin` | `frontend/src/tests/hooks/use-admin.spec.ts` |
| `use-notification-list` | `frontend/src/tests/hooks/use-notification-list.spec.ts` |

### use-admin

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| ダッシュボード取得 | 認証済み + API成功 | `dashboardData` が返される |
| ダッシュボード取得 | セッションまたはAPIローディング中 | `isLoading=true` |
| ダッシュボード取得 | APIエラー | `error` が設定される |
| 通知作成 | `postNotification` 実行 + API成功 | POSTで通知作成リクエストが送信される |
| 通知更新 | `updateNotification` 実行 + API成功 | PATCHで通知更新リクエストが送信される |
| 通知削除 | `deleteNotification` 実行 + API成功 | DELETEで通知削除リクエストが送信される |
| 通知操作失敗 | APIが `ok=false` | 対応するエラーメッセージで例外が投げられる |

### use-notification-list

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| お知らせ一覧取得 | API成功 | お知らせ一覧が返される |
| お知らせなし | API 空配列 | 空配列が返される |
| ローディング中 | API呼び出し中 | isLoading=true |
| エラー | APIエラー | errorが設定される |
| ページ変更 | `handlePageChange(page)` 実行 | `query.page` が更新される |
| 単一フィルター | `executeSingleFilter(key, value)` 実行 | 指定キー更新 + `page=1` にリセット |
| 複数フィルター | `executeFilter(filter)` 実行 | 各フィルター更新 + `page=1` にリセット |
| ソート変更 | `handleSortChange(sortBy, sortOrder)` 実行 | ソート条件更新 + `page=1` にリセット |
| クエリ生成 | 空文字フィルター | URLクエリに空パラメータが含まれない |
