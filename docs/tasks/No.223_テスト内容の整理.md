# No.223 テスト内容の整理


## 背景

フロントエンドのテストコードは현在37ファイル・約500件以上のテストケースが存在するが、以下の問題が発生している。

- テストファイルが煩雑化しており、何がカバーできていて、どこが漏れているかが把握できない
  - コンポーネントのテストカバレッジは約47%（ui/コンポーネントを除く64コンポーネント中30コンポーネント）にとどまる
  - 旅程計画系のコアコンポーネント（`TravelPlan`, `DayPlan`, `Departure`, `Destination` 等）が未テストである
  - `describe` / `it` の命名が統一されておらず、テスト名から仕様を読み取れないケースが散在する
- `SpotSelection.spec.tsx`（1026行・12モック）や `wishlist.spec.tsx`（690行）等の統合テストでタイムアウトが発生している
  - `waitFor` / `findBy` 等の非同期待機の多用により、`it` 単体で0.5秒を超えるケースが存在する
- 仕様変更・機能追加の際にどのテストが影響を受けるかを特定しにくく、デグレ調査の工数が大きい

## 目的

1. `describe` / `it` の命名規則と階層を統一し、テスト名から各機能の仕様が読み取れる状態にする
2. 仕様が複雑または網羅性が分かりづらい機能については、`docs/pages/` 配下に機能設計書（Markdown）を作成し、テストケース設計を表形式で整理する
3. `it` 単体の実行時間を最大0.5秒未満に改善する。超過する場合はテストケースの分割・外部依存のモック化を行う
4. 仕様変更・機能追加の際に影響範囲を特定しやすいテスト構造を整える

## 変更の内容

### 対象ページ

| ページ | URLパス | 主な対象コンポーネント・フック |
|---|---|---|
| 行きたいリスト | `/wishlist` | `AreaSearch`, `KeywordSearchWithMap`, `MapView`, `ListView`, `WishlistCreateModal`, `WishlistSpotInfoCard`, `SpotPreview` |
| プラン作成 | `/plan/create` | `TravelPlan`, `DayPlan`, `Departure`, `Destination`, `SpotCard`, `GanttChart`, `CreatePlanButton` |
| プラン詳細 | `/plan/[id]` | `TripDetail`, `TravelMap`, `SpotInfoCard`, `RouteSummary`, `Transportation` |
| プランリスト | `/plan/list` | `TripCard`, `TripSearchForm`, `DateRangePicker` |
| マイページ | `/mypage` | `ProfileSection`, `NextTripSection`, `RecentTrips`, `TripSummaryCards`, `UsageStatus`, `UserLocation` |
| 管理画面 | `/admin` | `NotificationManagement`, `UserList`（既存テストのリファクタリング） |

---

### アプローチ

#### Phase 1: テスト命名・構造の統一（全ファイル共通）

**現状の問題:**
- `describe` の粒度が粗く、1ブロックに複数の懸念事項が混在している
- `it` の説明が「〜できること」等の曖昧な表現で統一されていない

**対応方針:**
- `describe` はコンポーネント名または機能名を最上位とし、その下に操作・状態・ユースケースの階層を設ける
- `it` は「〔条件〕の場合〔結果〕になること」の形式に統一する

```typescript
describe('コンポーネント名 / 機能名')
  describe('操作またはユースケース名')
    it('〔条件〕の場合〔結果〕になること')
```

- 命名だけでは仕様が読み取れない場合は、後述の設計書を `docs/pages/` に作成する

---

#### Phase 2: 機能設計書の作成（`docs/pages/`）

テスト対象の各ページについて、`docs/pages/{ページ名}.md` を新規作成する。
設計書に記載する内容は以下の通りである。

- ページの概要と主要コンポーネント一覧
- 各コンポーネントのテスト対象仕様（表形式）
  - テスト対象の状態・操作
  - 入力条件
  - 期待する出力・動作
- テストファイルとの対応関係

作成対象ファイル:

| 設計書ファイル | 対象ページ |
|---|---|
| `docs/pages/wishlist.md` | 行きたいリストページ |
| `docs/pages/plan-create.md` | プラン作成ページ |
| `docs/pages/plan-detail.md` | プラン詳細ページ |
| `docs/pages/plan-list.md` | プランリストページ |
| `docs/pages/mypage.md` | マイページ |
| `docs/pages/admin.md` | 管理画面 |

---

#### Phase 3: 統合テストの分割と高速化

**対象:**
- `SpotSelection.spec.tsx`（1026行・12モック・タイムアウト発生中）
- `wishlist.spec.tsx`（690行・統合テスト）

**対応方針:**
- 統合テスト（画面全体のユーザーフロー）は別ブランチ（別課題）で対応するため、今回は単体レベルのテストに分解することを優先する
- `SpotSelection.spec.tsx` はタブ（Google検索 / 行きたいリスト / 過去スポット）ごとに下記3ファイルに分割する
  - `GoogleSpotSearch.spec.tsx`
  - `WishlistSpotSearch.spec.tsx`
  - `VisitedSpotSearch.spec.tsx`
- 各分割後ファイルはデータの持ち方（props・状態の変化）に焦点を当て、外部API呼び出しは原則モック化する
- `waitFor` の使用は最小限とし、状態変化は `act()` + 同期的な検証に置き換える

**モック化の方針:**
- Google Maps API（`@react-google-maps/api`）→ 必ずモック化
- Clerk認証（`@clerk/nextjs`）→ 必ずモック化
- SWR（`useSWR`）→ モック化可
- Zustand ストア → 実装ベースで検証（モックは原則行わない）
- データのフロー（props/状態変化）が担保できるのであればモック化は問題なし

---

#### Phase 4: 未カバーコンポーネントへのテスト追加

優先度順に新規テストを追加する。

**優先度: 高（機能重要度が高い）**

| コンポーネント | テストファイル（新規作成先） | 主なテスト観点 |
|---|---|---|
| `TravelPlan` | `tests/components/TravelPlan.spec.tsx` | プラン全体の表示、DayPlan一覧のレンダリング |
| `DayPlan` | `tests/components/DayPlan.spec.tsx` | 日付・スポット一覧の表示、スポット追加ボタンの状態 |
| `Departure` | `tests/components/travel-plan/Departure.spec.tsx` | 出発地の表示・入力、データの持ち方 |
| `Destination` | `tests/components/travel-plan/Destination.spec.tsx` | 目的地の表示・入力、データの持ち方 |
| `SpotCard` | `tests/components/SpotCard.spec.tsx` | スポット情報の表示、選択状態 |
| `TripCard` | `tests/components/TripCard.spec.tsx` | 旅行情報カードの表示 |
| `use-trip` | `tests/hooks/use-trip.spec.ts` | 旅程の取得・作成ロジック |
| `use-google` | `tests/hooks/use-google.spec.ts` | Google Maps/Places API連携ロジック |

**優先度: 中（カバレッジ補強）**

| コンポーネント | テストファイル（新規作成先） | 主なテスト観点 |
|---|---|---|
| `TravelMap` | `tests/components/TravelMap.spec.tsx` | 地図表示（Maps API モック）、マーカー表示条件 |
| `ProfileSection` | `tests/components/mypage/ProfileSection.spec.tsx` | プロフィール情報の表示 |
| `NextTripSection` | `tests/components/mypage/NextTripSection.spec.tsx` | 次の旅の表示・データなし時の表示 |
| `RecentTrips` | `tests/components/mypage/RecentTrips.spec.tsx` | 最近の旅一覧の表示 |
| `TripSummaryCards` | `tests/components/mypage/TripSummaryCards.spec.tsx` | 統計カード（旅日数・スポット数等）の表示 |
| `DestinationDetailCard` | `tests/components/travel-plan/DestinationDetailCard.spec.tsx` | 目的地詳細カードの表示 |
| `use-admin` | `tests/hooks/use-admin.spec.ts` | 管理機能のデータ取得・操作ロジック |
| `use-notification-list` | `tests/hooks/use-notification-list.spec.ts` | 通知リストの取得・既読管理 |

**優先度: 低（共通UIの保証）**

| コンポーネント | テストファイル（新規作成先） | 主なテスト観点 |
|---|---|---|
| `LoadingState` | `tests/components/common/LoadingState.spec.tsx` | ローディング表示の状態 |
| `GanttChart` | `tests/components/GanttChart.spec.tsx` | スポット時間軸の表示 |
| `Transportation` | `tests/components/Transportation.spec.tsx` | 交通手段・移動時間の表示 |
| `TripSearchForm` | `tests/components/TripSearchForm.spec.tsx` | 検索フォームの入力・バリデーション |
| `DateRangePicker` | `tests/components/DateRangePicker.spec.tsx` | 日付範囲の選択・バリデーション |

---

#### Phase 5: 不要・重複テストの削除と既存テストのリファクタリング

- 現在の統合テスト（`SpotSelection.spec.tsx`）をPhase 3の分割後に削除する
- `wishlist.spec.tsx` はページ全体の統合テストとして別課題で管理し、今回は単体テストへの切り替えを行う
- `beforeEach` で毎回全モックをリセットしている箇所を整理し、テストの独立性を保ちながらセットアップを簡潔にする
- 各テストファイルで重複しているモック定義は共通の `tests/__mocks__/` ディレクトリに集約することを検討する

---

### 作業優先順位

| 優先度 | 内容 |
|---|---|
| 1 | Phase 1: 全既存テストの命名・構造統一 |
| 2 | Phase 2: docs/pages/ 設計書作成 |
| 3 | Phase 3: SpotSelection統合テストの分割・高速化 |
| 4 | Phase 4（高）: TravelPlan / DayPlan / Departure / Destination の新規テスト追加 |
| 5 | Phase 4（中）: TravelMap / mypage系コンポーネントの新規テスト追加 |
| 6 | Phase 5: 不要・重複テストの削除 |
| 7 | Phase 4（低）: 共通UIの新規テスト追加 |