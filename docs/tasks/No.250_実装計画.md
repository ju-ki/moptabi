# No.250 プランニング画面における画面初期化 実装計画

## 1. 目的

本計画は、No.250 の要件定義に基づき、プラン作成画面の状態が次回作成へ混入しないようにするための実装手順を定義する。

参照要件:
- docs/tasks/No.250_プランニング画面における画面初期化.md

## 2. 実装対象

- フロントエンドのみ
- Zustand ストアの初期化機構
- プラン作成画面の離脱時処理
- 保存成功時の遷移処理
- 関連テスト

## 3. 変更対象ファイル（予定）

### 3-1. 実装

- frontend/src/lib/plan.ts
  - 全体初期化関数の追加
  - 初期値の定義を一元化
- frontend/src/app/plan/create/page.tsx
  - 画面離脱時の初期化処理の追加
- frontend/src/components/CreatePlanButton.tsx
  - 保存成功時遷移前の初期化処理追加

### 3-2. 設計書

- docs/pages/plan-create.md
  - 画面離脱時および保存成功時の初期化仕様を追記

### 3-3. テスト

- frontend/src/tests/lib/plan.spec.ts（新規または既存活用）
  - store 全体初期化の単体テスト
- frontend/src/tests/app/plan-create/page.spec.tsx（既存があれば拡張、なければ新規）
  - create 画面離脱時の初期化テスト
- frontend/src/tests/components/CreatePlanButton.spec.tsx（既存があれば拡張、なければ新規）
  - 保存成功時初期化のテスト

## 4. 実装方針

### 4-1. ストア初期化責務の一元化

- plan.ts に「初期値を返す関数」を用意し、初期状態の定義を一箇所に集約する。
- resetErrors/resetForm とは別に、画面作成コンテキスト全体を初期化する専用関数を追加する。
- 初期化対象は要件定義で規定したストア全体とする。

### 4-2. 離脱時初期化

- plan/create/page.tsx でアンマウント時に初期化関数を呼ぶ。
- ページ離脱経路（別画面遷移、保存後の遷移）に依存しない形で初期化が走るようにする。

### 4-3. 保存成功時初期化

- CreatePlanButton の保存成功ハンドリングに、遷移前初期化を追加する。
- 保存失敗時は初期化しない。

### 4-4. 既存挙動維持

- 候補取得後のデフォルト地点再設定フローは維持する。
- 保存 API 仕様や詳細画面表示には影響を与えない。

## 5. TDD 進行計画

### Phase 1: Store 初期化（Red -> Green -> Refactor）

- Red
  - 全体初期化関数が存在しないため失敗するテストを追加する。
  - 初期化後に title/plans/planningResults/errors が初期値へ戻ることを期待値に設定する。
- Green
  - plan.ts に全体初期化関数を実装し、テストを通す。
- Refactor
  - 初期値生成ロジックを関数化し、重複を排除する。

### Phase 2: 画面離脱時初期化（Red -> Green -> Refactor）

- Red
  - plan/create をアンマウントしても store が残ることを再現するテストを追加する。
- Green
  - page.tsx に cleanup 処理を実装し、テストを通す。
- Refactor
  - cleanup の依存関係を最小化し、不要な再実行を防ぐ。

### Phase 3: 保存成功時初期化（Red -> Green -> Refactor）

- Red
  - 保存成功後遷移ケースで store が残るテストを追加する。
- Green
  - CreatePlanButton で保存成功時のみ初期化する実装を追加する。
- Refactor
  - 保存成功判定と初期化呼び出しを整理し、可読性を上げる。

### Phase 4: 回帰確認

- 既存のプラン作成・詳細関連テストの回帰を確認する。
- 初期化後にデフォルト候補が再設定されることを確認する。

## 6. 設計書修正計画

要件レビュー（rev）完了後、以下を docs/pages/plan-create.md に追記する。

- 画面離脱時に作成ストアを初期化する仕様
- 保存成功時（詳細画面遷移時）に同等の初期化を行う仕様
- 再アクセス時に新規作成初期状態になること

## 7. 完了条件（DoD）

- 要件定義書と整合する初期化仕様が実装されている。
- 離脱時・保存成功時の初期化テストが追加され、全て通過する。
- 既存テストに回帰がない。
- 型チェックとコンパイルエラーがない。

## 8. 実行コマンド（予定）

### 8-1. 単体実行（実装中）

- npm run test -- plan
- npm run test -- CreatePlanButton
- npm run test -- plan-create

### 8-2. 最終確認

- npm run test
- npm run typecheck
- npm run lint
- npm run format
- npm run build


以上。
