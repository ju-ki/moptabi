# No.150 実装計画：カレンダーで計画の日程を表示する

## 概要

マイページに全プランをカレンダー表示する機能を追加する。  
カレンダーはカスタム実装（ライブラリ不使用）。表示とリンクのみのシンプルな実装とする。  
`NextTripSection` をカレンダーと統合した新コンポーネントに刷新し、`RecentTrips` は廃止する。

---

## TODO

### 1. モデル・型の変更

- [ ] `frontend/src/models/mypage.ts`
  - [ ] `NextTrip` 型に `endDate: string` を追加（カレンダー表示に必要）
  - [ ] `MypageData` の `nextTrip: NextTrip | null` を `nextTrips: NextTrip[]` に変更
  - [ ] `RecentTrip` 型を削除（`RecentTrips` 廃止に伴い不要）

---

### 2. フック変更

- [ ] `frontend/src/hooks/use-mypage.ts`
  - [ ] `nextTrips` 計算ロジックを変更
    - 未来のプランを開始日昇順ソート、最大3件の配列を返す
    - 各要素に `endDate` を含める
  - [ ] `defaultCalendarDate` を計算して返す
    - `nextTrips[0]` がある場合はその月、なければ現在月
  - [ ] `recentTrips` 計算ロジックを削除
  - [ ] `MypageData` の返却値を更新（`nextTrip` → `nextTrips`、`recentTrips` 削除、`defaultCalendarDate` 追加）

---

### 3. カレンダーコンポーネント新規作成

- [ ] `frontend/src/components/mypage/TripCalendar.tsx`
  - [ ] props: `trips: TripSummary[]`、`defaultDate: Date`
  - [ ] 月単位のカレンダーグリッドを自前でレンダリング
  - [ ] 全プラン（過去・未来）をイベントとして表示
  - [ ] 複数日跨ぎのプランは開始日〜終了日をspanするレイアウト（セルを色帯でつなぐ）
  - [ ] イベントクリックで `router.push(`/plan/${id}`)` に遷移
  - [ ] 前月・次月ナビゲーションボタン
  - [ ] デフォルト表示月は `defaultDate` で制御

---

### 4. NextTripSection → TripScheduleSection にリネーム・統合

- [ ] `frontend/src/components/mypage/NextTripSection.tsx` を `TripScheduleSection.tsx` にリネーム
  - [ ] props: `nextTrips: NextTrip[]`、`wishlistCount: number`、`trips: TripSummary[]`、`defaultCalendarDate: Date`
  - [ ] 上部に「次の旅（最大3件）」リスト
    - `nextTrips` が0件の場合は「次の旅を計画しませんか？」＋ウィッシュリスト件数表示
    - 1件以上の場合は各プランの「タイトル・出発日・あとN日・詳細リンク」を表示
  - [ ] 下部に `<TripCalendar>` を配置
  - [ ] コンポーネント名を `TripScheduleSection` に変更

- [ ] `frontend/src/components/mypage/index.ts` の export を更新
  - [ ] `NextTripSection` → `TripScheduleSection` に変更

---

### 5. RecentTrips コンポーネント廃止

- [ ] `frontend/src/components/mypage/RecentTrips.tsx` を削除

---

### 6. マイページ本体の変更

- [ ] `frontend/src/app/mypage/page.tsx`
  - [ ] `useMypageData` から取得する値を更新（`nextTrip` → `nextTrips`、`recentTrips` 削除、`defaultCalendarDate` 追加）
  - [ ] `<NextTripSection>` を `<TripScheduleSection>` に置き換え（props更新）
  - [ ] `<RecentTrips>` を削除
  - [ ] import を整理

---

### 7. テスト

- [ ] `frontend/src/tests/components/mypage/TripCalendar.spec.tsx` 新規作成
  - [ ] 当月のカレンダーグリッドが表示される
  - [ ] プランがイベントとして表示される（タイトルが表示される(はみ出す場合はtruncateされる）)
  - [ ] 複数日跨ぎのプランが複数セルに表示される
  - [ ] イベントクリックでリンクが `/plan/${id}` になっている
  - [ ] 前月・次月ボタンで月が切り替わる
  - [ ] 前月と次月に該当するプランの情報が表示される

- [ ] `frontend/src/tests/components/mypage/TripScheduleSection.spec.tsx` 新規作成（`NextTripSection.spec.tsx` を置き換え）
  - [ ] nextTripsが0件：「次の旅を計画しませんか？」が表示される
  - [ ] nextTripsが0件かつwishlistCountが1以上：ウィッシュリスト件数が表示される
  - [ ] nextTripsが1〜3件：各プランのタイトル・出発日・「あとN日」・詳細リンクが表示される
  - [ ] nextTripsが3件以上の場合: 現在日付から数えて3件の情報が表示される
  - [ ] カレンダーコンポーネントが表示される

- [ ] `frontend/src/tests/components/mypage/NextTripSection.spec.tsx` を削除

- [ ] `frontend/src/tests/components/mypage/RecentTrips.spec.tsx` を削除（存在する場合）

---

### 8. ドキュメント更新

- [ ] `docs/pages/mypage.md`
  - [ ] `NextTripSection` → `TripScheduleSection` に更新
  - [ ] `RecentTrips` のセクションを削除
  - [ ] `TripCalendar` コンポーネントの説明・テスト仕様を追加

---

### 9. 最終確認

- [ ] `pnpm run typecheck`（フロントエンド）でエラーなし
- [ ] `pnpm run test` でテスト全件パス
- [ ] `pnpm run lint` でエラーなし
