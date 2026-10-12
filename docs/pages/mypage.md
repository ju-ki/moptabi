# マイページ（/mypage）

## 概要

ユーザーのプロフィールと旅行統計を表示するページ。次の旅程・カレンダー・利用状況などの情報を確認できる。

## 主要コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `MyPage` | マイページ全体のコンテナ |
| `ProfileSection` | ユーザープロフィール情報の表示 |
| `TripScheduleSection` | 次の旅（最大3件）とカレンダーの統合セクション |
| `TripCalendar` | 全プランをカレンダー表示するコンポーネント |
| `TripSummaryCards` | 旅行統計カード（旅日数・スポット数・訪問地数） |
| `UserLocation` | ユーザーの現在地・よく行く場所の管理 |
| `UsageStatus` | プラン数・ウィッシュリスト数などの利用状況 |

---

## テスト対象仕様

### MyPage

| テストグループ | 確認内容 |
|---|---|
| 初期表示 | 各セクションの表示確認 |
| ログイン状態 | 認証済みユーザーのデータ表示 |
| データなし | プランなし・ウィッシュリストなし時の空状態 |

---

### ProfileSection

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | ユーザーデータあり | アバター・ユーザー名・メールアドレスが表示される |
| データなし | ユーザーデータなし | ローディングまたはデフォルト表示 |

---

### TripScheduleSection

> **テストファイル**: `frontend/src/tests/components/mypage/TripScheduleSection.spec.tsx`
> **方針**: `TripCalendar` はモック化し、`TripScheduleSection` 自体の表示ロジックのみ検証する

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 次の旅なし | `nextTrips=[]` `wishlistCount=0` | 「旅を計画しよう」ヘッダーが表示される |
| 次の旅なし | `nextTrips=[]` `wishlistCount=0` | 「次の旅を計画しませんか？」メッセージが表示される |
| 次の旅なし | `nextTrips=[]` `wishlistCount=0` | プラン作成ページ（`/plan/create`）へのリンクが表示される |
| 次の旅なし（補足） | `nextTrips=[]` `wishlistCount=8` | 「行きたいリストに8件のスポットがあります」が表示される |
| 次の旅なし（補足） | `nextTrips=[]` `wishlistCount=0` | ウィッシュリスト件数テキストが表示されない |
| 次の旅あり（1件） | `nextTrips=[{id:1, title:'京都旅行', startDate:'2025-12-20', daysUntil:14}]` | 「次の旅」ヘッダーが表示される |
| 次の旅あり（1件） | 上記と同じ | タイトル・出発日・「あと14日」・詳細リンク（`/plan/1`）が表示される |
| 次の旅あり（3件） | `nextTrips` に3件 | 3件分のタイトルがすべて表示される |
| 次の旅あり（3件超） | `nextTrips` に4件以上渡してもhook側で3件に絞るため、コンポーネントは渡された件数を全件表示する | 渡された件数がすべて表示される |
| カレンダー表示 | `trips` と `defaultCalendarDate` を渡す | `TripCalendar` が描画される |

---

### TripCalendar

> **テストファイル**: `frontend/src/tests/components/mypage/TripCalendar.spec.tsx`
> **方針**: `useRouter` はモック化する。日付計算はテスト内で固定値を使用する

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | `defaultDate=new Date('2025-12-01')` | 「2025年12月」のヘッダーが表示される |
| 初期表示 | 上記と同じ | 前月・次月ボタンが表示される |
| イベント表示 | `trips` に12月のプランあり | そのプランのタイトルが表示される（長い場合はtruncateされる） |
| イベント表示 | 複数日跨ぎプラン（12/10〜12/12） | 12/10・12/11・12/12 それぞれのセルにイベントが表示される |
| 月ナビゲーション | 次月ボタン押下 | 「2026年1月」に切り替わる |
| 月ナビゲーション | 前月ボタン押下 | 「2025年11月」に切り替わる |
| 月ナビゲーション | 次月に切り替え後 | 12月のプランは表示されず、1月のプランが表示される |
| リンク | プランのイベントをクリック | `/plan/${id}` へのリンクになっている |

---

### TripSummaryCards

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 統計あり | プラン・スポットデータあり | 旅日数・スポット数・訪問地数が正しく表示される |
| データなし | プランデータなし | 各カードが0で表示される |

---

### UserLocation（UserLocationSection）

| 状態・操作 | 入力条件 | 期待する出力・動作 |
|---|---|---|
| 初期表示 | データなし | 空の状態のメッセージが表示される |
| 初期表示 | データあり | 地点名・デフォルトフラグの有無・ラベル・住所・使用回数が表示されている |
| 初期表示 | データあり | デフォルトフラグがonの地点の座標にピンが立っていること |
| 選択操作 | データなし | 追加ボタンを押下することで、Location作成のモーダルが表示されること |
| 選択操作 | データあり（上限超過未満） | 追加ボタンを押下することで、Location作成のモーダルが表示されること |
| 選択操作 | データあり（上限超過） | 上限を超過している場合、非活性になっていること |
| 選択操作 | 名前の入力 | 入力することでformのデータが更新されていること |
| 選択操作 | ラベルの選択 | ラベルを選択することでformのデータが更新されていること |
| 選択操作 | 住所の入力 | 住所を入力することでformのデータが更新されていること<br>住所を入力後、その地点の座標が更新されること<br>更新された座標を元にGoogle Mapのピンが動いていること |
| 選択操作 | デフォルト選択 | checkboxで切り替えることでformのデータが更新されていること |
| 選択操作 | 追加ボタン | 名前が入力されていない場合は非活性 |
| 選択操作 | 追加ボタン | 名前が入力されている場合は活性 |
| 選択操作 | 更新ボタン | 更新ボタンを押下することで、対象の情報が全て入力された状態で表示されること |
| 選択操作 | 削除ボタン | 削除ボタンを押下することで確認モーダルが表示される<br>モーダルの「はい」を押下することで削除される |
| DBの状態 | デフォルト切り替え | 基本的にデフォルトはユーザー単位で一つのみ<br>すでにデフォルトOnとなっている状態で追加または更新時には新しく更新した方にデフォルトフラグが立つ |

---

## テストファイルとの対応関係

| コンポーネント | テストファイル |
|---|---|
| MyPage | `frontend/src/tests/components/mypage/MyPage.spec.tsx` |
| UserLocation（UserLocationSection） | `frontend/src/tests/components/mypage/UserLocationSection.spec.tsx` |
| ProfileSection | `frontend/src/tests/components/mypage/ProfileSection.spec.tsx` |
| TripScheduleSection | `frontend/src/tests/components/mypage/TripScheduleSection.spec.tsx` |
| TripCalendar | `frontend/src/tests/components/mypage/TripCalendar.spec.tsx` |
| TripSummaryCards | `frontend/src/tests/components/mypage/TripSummaryCards.spec.tsx` |
