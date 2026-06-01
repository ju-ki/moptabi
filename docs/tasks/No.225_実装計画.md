# No.225 フロント側のバリデーション強化 実装計画

## 1. 目的

本計画は、No.225 要件定義に基づき、プランニング後の編集で整合性が崩れた状態の保存を防止するための実装手順を定義する。

参照要件:
- docs/tasks/No.225_フロント側のバリデーション強化.md

---

## 2. 実装対象

- frontend
  - 再プランニング必要状態（dirty）の日付単位管理
  - 保存前バリデーション強化
  - 日付ごとの整合性解消アクション（保存ボタンとは別導線）
  - 前回プランニング結果への復元機構（スポット情報のみ）
- shared-types / backend / DB
  - spotRoutes の契約・処理・テーブル定義の削除
  - 旧payload互換（spotRoutesを含んでも無視して受理）
- docs
  - API設計書と plan-create の仕様更新

---

## 3. 確定仕様（実装時の判断固定）

1. dirty対象項目
- 画面から編集可能な項目のうち、以下を dirty 対象とする。
  - spot.order（並び順）
  - spot.stayDuration / stayStart / stayEnd
  - spot.nearestStation（placeId/stationType/transit関連）
  - spot.routeToNext
- spot.memo は dirty 対象外。

2. 別導線UIの配置
- 日付ごと（DayPlan単位）に表示する。

3. 復元対象
- 前回プランニング結果への復元対象はスポット情報のみ。

4. spotRoutes
- マイグレーションで物理削除する。
- 旧payloadで spotRoutes が来た場合は無視して受理する。

---

## 4. 変更対象ファイル（予定）

### 4-1. frontend 実装

- frontend/src/lib/plan.ts
  - dirty管理状態の追加（日付単位）
  - 前回プランニングスナップショット保存/復元ロジックの追加
  - setSpots / editSpots / 並び替え / 削除時の dirty 付与
- frontend/src/components/CreatePlanButton.tsx
  - 保存前の dirty 検証追加
  - 固定文言での保存ブロック表示
- frontend/src/components/DayPlan.tsx（または同等の日付単位コンテナ）
  - 別導線UI（再プランニング案内/復元操作）を日付単位に配置
- frontend/src/components/travel-plan/SpotSettingEditor.tsx
  - 並び替え/削除のdirty連携確認
- frontend/src/components/PlanningButton.tsx
  - 再プランニング成功時の dirty 解除とスナップショット更新

### 4-2. shared-types / backend / DB

- packages/shared-types/src/trip/schema.ts
  - spotRoutes 定義削除
- backend/src/models/trip.ts
  - 入力スキーマから spotRoutes 削除（未知キーは無視して受理）
- backend/src/controllers/trip.ts
  - createTrip の spotRoutes 保存処理削除
- backend/src/db/schema.ts
  - SpotRoute テーブル定義削除
- backend/src/db/relations.ts
  - SpotRoute 関連relation削除
- backend/drizzle/*
  - SpotRoute 物理削除マイグレーション追加

### 4-3. テスト

- frontend/src/tests/lib/plan.spec.ts
  - dirty付与/解除/復元
- frontend/src/tests/components/CreatePlanButton.spec.tsx
  - dirty時保存ブロック
- frontend/src/tests/components/travel-plan/*（必要ファイル）
  - 日付単位別導線UIの表示と操作
- backend/src/tests/trip.schema.spec.ts
  - spotRoutesを含むpayloadが受理されることの確認
- backend/src/tests/trip.service.spec.ts
  - spotRoutesなしで作成成功
- backend/src/tests/db-helper.ts
  - SpotRoute依存の後片付け処理削除

### 4-4. ドキュメント

- docs/pages/plan-create.md
  - 日付単位導線、dirty時保存不可仕様を追記
- docs/API設計書.md
  - spotRoutes 削除後の契約へ更新

---

## 5. 実装方針

### 5-1. dirty管理の一元化

- store内で日付単位に dirty を管理し、コンポーネント側で個別判定しない。
- dirty判定は「フィールド差分」ではなく「対象操作イベント」で付与する。

### 5-2. 復元の責務分離

- 前回プランニング結果のスナップショット保持は store に寄せる。
- UI は「復元アクションを呼ぶだけ」にし、復元ロジックを持たない。

### 5-3. 保存ガード

- CreatePlanButton で既存チェックに dirty チェックを加える。
- dirtyが1日でもある場合は保存APIを呼ばず、固定文言を表示する。

### 5-4. spotRoutes 削除の安全性

- 先に shared-types / backendスキーマ / controller を更新し、テストで契約を固定する。
- その後 DBテーブル削除を反映し、relation/fixtures を追従させる。

---

## 6. TDD 進行計画

### Phase 1: frontend store（dirty/restore）

- Red
  - dirty状態が付かない、復元できないテストを追加する。
- Green
  - plan.ts に dirty とスナップショット機構を実装し、テストを通す。
- Refactor
  - dirty付与ロジックを共通化し、分岐重複を削減する。

### Phase 2: frontend UI/保存ブロック

- Red
  - dirtyでも保存できてしまうテストを追加する。
  - 日付単位導線UIが表示されないテストを追加する。
- Green
  - 保存ブロックと別導線UI、復元アクション呼び出しを実装する。
- Refactor
  - 表示文言とバリデーション分岐を整理する。

### Phase 3: spotRoutes削除（契約・実装）

- Red
  - 新契約（spotRoutesなし）前提で失敗するテストを追加する。
- Green
  - shared-types/backend/controller を更新しテストを通す。
- Refactor
  - spotRoutes依存コード・不要型を削除して整理する。

### Phase 4: DB削除と回帰

- Red
  - SpotRoute定義が残っている状態を検知するテスト/型エラーを確認する。
- Green
  - マイグレーションとrelation更新で整合させる。
- Refactor
  - テストユーティリティと設計書を最終整備する。

---

## 7. テスト計画（観点）

1. dirty付与
- 追加、削除、並び替え、対象項目編集で dirty=true。
- memo編集のみでは dirty=false。

2. dirty解除
- 再プランニング成功で対象日付のみ dirty=false。
- 別日付のdirtyは保持される。

3. 復元
- 復元後、対象日付の spots が前回プランニング時点へ戻る。
- 復元後、対象日付のみ dirty=false。

4. 保存ガード
- dirtyあり: API未送信、固定文言表示。
- dirtyなし: 従来どおり保存API送信。

5. spotRoutes削除
- spotRoutesなしpayloadで作成成功。
- spotRoutesあり旧payloadでも無視して受理。

---

## 8. 完了条件（DoD）

1. No.225要件に沿って、dirty状態で保存できない。
2. 日付単位導線から復元操作ができ、保存可能状態へ戻せる。
3. memo編集のみはdirty対象外として動作する。
4. spotRoutes が shared-types / backend / DB から削除される。
5. 旧payload互換（spotRoutes無視受理）がテストで保証される。
6. docs/pages と API設計書が更新される。
7. テスト・型チェックが通る。

---

## 9. 実行コマンド（予定）

### 9-1. frontend

- cd frontend
- npm run test -- plan
- npm run test -- CreatePlanButton
- npm run test
- npm run typecheck

### 9-2. backend

- cd backend
- bun run test
- bun run typecheck

### 9-3. 最終確認

- frontend: npm run lint && npm run build
- backend: bun run lint && bun run build



以上。