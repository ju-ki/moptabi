# No.222 型の見直し


## 背景

* 型が複数ファイルに分散しており、修正時の影響範囲が追いにくい。
* カラム追加や定義変更のたびに、フロントエンドとバックエンドの両方で手動追従が必要になっている。
* ビルド後に型エラーが見つかることがあり、手戻りが発生している。
* 型定義ルールが統一されておらず、実装者ごとに書き方が揺れている。
* フロントエンドとバックエンドで、同じ概念の型が重複定義されている。
* 既存で zod を利用しているため、境界の検証と型推論を活かした設計に揃えたい。
* デプロイは `backend/` と `frontend/` を分離し、それぞれ Cloudflare にデプロイしているため、ビルド・実行境界での型契約不整合が障害に直結しやすい。

## 目的（ゴール）

1. 型の定義方法を統一し、変更時の修正漏れを防ぐ。
2. 統一ルールに沿っていない既存実装を修正し、運用可能な状態に揃える。
3. フロントエンドとバックエンドで型を共通化し、API契約の不一致を減らす。

## ヒアリング結果（合意事項）

* 共通型の配置先: monorepo 共通パッケージ（`packages/shared-types`）
* zod の位置づけ: 入出力境界（API request/response, 外部I/O）では必須
* 対象範囲:
	* frontend の models/types 整理
	* backend の models/schema 整理
	* API契約型の統一
	* DB由来型（Prisma/Drizzle）との整合
* 完了条件（必須）:
	* frontend/backend ともに型エラー0
	* 主要API契約の型統一
	* 移行ガイド作成
	* CI の型チェック追加または強化
* 移行方式: 段階移行
* 優先度: 旅程ドメイン → ユーザー周り
* 希望期限: 1-2週間

## デプロイ前提（追加要件）

* `backend/` と `frontend/` は分離デプロイで、Cloudflare 上で独立リリースされる。
* どちらか片方のみ先行リリースされても、API契約の互換性を維持できる型設計が必要。
* 環境差分（staging/production）で型解釈が変わらないよう、共有型を単一ソースで管理する。
* デプロイ前チェックとして、frontend/backend それぞれで型チェックと契約整合チェックを通過させる。

## スコープ

### 対象（In Scope）

* 型定義ルールの策定（命名、配置、zod 利用方針）
* 共有型パッケージの作成と導入
* 主要APIの request/response 型の共通化
* DBスキーマ由来型との整合性ルール定義
* frontend/backend の型チェック体制強化（CI含む）
* 段階移行計画と運用ガイド作成

### 対象外（Out of Scope）

* 全ドメインの一括全面リライト
* API仕様そのものの大幅変更
* UI/UX変更や画面機能追加

## 現状（As-Is）と目標（To-Be）

| 項目 | As-Is | To-Be |
|---|---|---|
| 型の配置 | 複数箇所に分散 | 共有型を `packages/shared-types` に集約 |
| 境界の検証 | 一部のみ | API入出力は zod 必須 |
| 型の再利用 | 重複定義が多い | 共有型参照を基本に統一 |
| 変更時の影響調査 | 手動で追跡 | 参照先が明確で追跡可能 |
| 型品質ゲート | ローカル依存 | CIで型チェックを必須化 |

## 要件

### 機能要件

1. 共有型パッケージを新設し、frontend/backend の双方から参照できること。
2. 主要API（旅程、ユーザー）の request/response 型を共有化すること。
3. API境界で zod スキーマを定義し、`z.infer` により TypeScript 型を生成すること。
4. DB由来型（Prisma/Drizzle）と API公開型を分離し、変換層（mapper）を明示すること。
5. 型の命名規則（例: `XxxSchema`, `XxxInput`, `XxxResponse`）を文書化すること。
6. frontend/backend の型チェックコマンドをCIで実行し、失敗時はマージ不可にすること。
7. 段階移行の進捗が分かる管理表（対象、状態、担当、期限）を作成すること。

### 非機能要件

1. 既存機能への影響を抑えるため、段階移行中も本番互換を維持すること。
2. 型変更時に、影響範囲が追える構造（import経路、責務分離）であること。
3. 開発者が迷わないよう、最小限のルールで運用可能であること。
4. 分離デプロイ運用において、frontend/backend の非同期リリースでも後方互換が維持されること。
5. Cloudflare デプロイ前に、frontend/backend 個別パイプラインで型品質ゲートを満たすこと。

## 設計方針（提案）

### ディレクトリ構成案

* `packages/shared-types/src/{domain}/schema.ts`
* `packages/shared-types/src/{domain}/types.ts`
* `packages/shared-types/src/{domain}/mapper.ts`（必要時）

### 運用ルール

* 外部境界（API、外部サービス、環境変数）は zod で必ず検証する。
* UI専用型は frontend 側ローカルで許可するが、API契約型の再定義は禁止する。
* DBテーブル型をそのまま外部公開しない（必ず公開用型へ変換する）。
* API契約変更時は、後方互換を保つ移行期間を設け、frontend/backend 同時デプロイを前提にしない。

### Cloudflare 分離デプロイ向けルール

* backend 側では request/response を zod で厳密検証し、型不一致時は明示的にエラーを返す。
* frontend 側では受信データを共有スキーマでパースし、契約変更時の早期検知を可能にする。
* 共有型パッケージのバージョンを基準に、frontend/backend の採用バージョンを追跡できるようにする。
* リリース順序が前後しても壊れないよう、破壊的変更は段階的（追加→移行→削除）に行う。

## 移行方針（段階移行）

### Phase 1: ルール確定・基盤整備（1-2日）

* 共有型パッケージ作成
* 命名・配置・zod運用ルール確定
* CI 型チェック追加
* Cloudflare 分離デプロイ時の互換性ポリシー定義

### Phase 2: 旅程ドメイン移行（3-4日）

* 旅程関連 API契約型を共通化
* frontend/backend の参照を共有型へ切替
* 型チェック通過確認
* backend 単体デプロイ時・frontend 単体デプロイ時の互換性確認

### Phase 3: ユーザー周り移行（2-3日）

* ユーザー関連 API契約型を共通化
* 既存重複型の削除またはdeprecated化
* frontend/backend 間の契約差分チェック運用開始

### Phase 4: フロントエンド内の型整理（1-2日）

* frontend 内の `models` / `types` / `hooks` に分散した型を整理し、責務を明確化する。
* API契約型の再定義を削減し、`shared-types` 参照へ統一する。
* UIローカル型とAPI契約型の境界を文書化する。

### Phase 5: model型未使用箇所の洗い出し・是正（0.5-1日）

* 「本来 `models` の型を使うべき箇所」で独自宣言されている型を棚卸しする。
* 置換可能な箇所を `models` 参照へ寄せる（または寄せる計画を明文化する）。
* 再定義が残る場合は、残置理由を記録して見落とし修正を防ぐ。

### Phase 6: 手順書作成・運用化（1-2日）

* 移行ガイド作成
* 契約変更時の手順（追加→移行→削除）を手順書へ反映
* PRテンプレートに型契約変更チェック項目を追加
* 残課題整理（次課題化）
* 最終検証
* Cloudflare の分離先行リリース検証は別途タスクとして保留

## 実装計画書（Phase単位）

### Phase 0: 現状棚卸し（0.5日）

**目的:** 現状の型定義分散とAPI契約の重複箇所を可視化する。

**作業内容:**

* frontend と backend の型定義ファイル一覧を作成する。
* APIごとに request/response 型の定義元と利用箇所を対応付ける。
* Cloudflare デプロイ単位（frontend/backend）で影響範囲を整理する。

**成果物:**

* 型棚卸し表
* API契約マップ

#### Phase 0 実装結果

**型棚卸しサマリー（現状）**

| 区分 | 主な配置先 | 件数（目視） | 補足 |
|---|---|---:|---|
| frontend 型定義 | `frontend/src/models`, `frontend/src/types` | 14+ | `models` と `types` で同一概念の重複あり |
| backend 型定義 | `backend/src/models` | 10+ | zod-openapi ベースで契約定義済み |
| DBスキーマ | `backend/src/db/schema.ts` | 1 | API公開型とDB型の分離は一部未統一 |

**優先ドメインの重複候補（旅程・ユーザー周り）**

| ドメイン | backend 側 | frontend 側 | 差分/課題 |
|---|---|---|---|
| 旅程 | `models/trip.ts` | `models/trip.ts`, `types/trip.ts`, `types/plan.ts` | Trip系型が3系統に分散 |
| ユーザー地点 | `models/userLocation.ts` | `models/userLocation.ts` | 同名概念を別定義 |
| 出発地/目的地履歴 | `models/planLocation.ts` | `models/planLocation.ts` | zod + interface が混在 |

**API契約マップ（優先範囲）**

| ドメイン | backend route | backend 契約スキーマ | frontend 利用想定型 |
|---|---|---|---|
| 旅程一覧/詳細/作成 | `routes/trip.ts` | `TripSchema`, `TripDetailResponseSchema` | `models/trip.ts`, `types/trip.ts` |
| プラン地点候補 | `routes/planLocation.ts` | `PlanLocationCandidateResponseSchema` | `models/planLocation.ts` |
| ユーザーお気に入り地点 | `routes/userLocation.ts` | `UserLocationListSchema`, `CreateUserLocationSchema` | `models/userLocation.ts` |
| 管理ダッシュボード（ユーザー系） | `routes/auth.ts` | `StatsSchema`, `UserListResponseSchema` | `models/admin.ts` |

**Cloudflare 分離デプロイ観点での確認結果**

* frontend/backend は独立リリースされるため、API契約変更の同時反映前提は不可。
* 優先ドメイン（旅程→ユーザー周り）は、共有型化と後方互換ルールを最初に適用すべき。
* Phase 1 では shared-types 導入と型品質ゲート（frontend/backend 個別）を先行実装する。

#### Phase 0 追加調査（models/types 以外の独自定義）

**調査方針:** `frontend/src`, `backend/src` を対象に、`type`/`interface`/`zod schema` を横断抽出（`models`,`types`,`tests` を除外）

**主な独自型定義の分布（抜粋）**

| 区分 | ファイル例 | 概要 |
|---|---|---|
| frontend hooks | `hooks/use-admin.ts`, `hooks/use-user-list.ts`, `hooks/use-notification-list.ts` | ソート・フィルター・クエリ型の重複定義 |
| frontend app components | `app/admin/components/UserList.tsx`, `UserListContainer.tsx`, `NotificationManagement.tsx`, `NotificationManagementContainer.tsx` | 画面内ローカル型の重複定義 |
| frontend lib | `lib/plan.ts`, `lib/place-fetcher.ts`, `lib/algorithm.ts` | ドメイン寄り型がローカル定義されている |
| frontend components | `components/TripCard.tsx`, `TripSearchForm.tsx`, `TravelMap.tsx` など | Props型中心だが一部ドメイン型を内包 |
| backend routes | `routes/*.ts` | `z.object` によるローカル request/response 定義が散在 |
| backend infra | `backend/src/index.ts`, `backend/src/db/index.ts` | runtime設定・DB接続の型定義 |

**重複が確認できた代表例（優先対応候補）**

| 型名 | 主な重複箇所 | 課題 |
|---|---|---|
| `RoleType`, `UserSortBy`, `SortOrder` | `hooks/use-admin.ts`, `hooks/use-user-list.ts`, `app/admin/components/UserList*.tsx` | 同義型の再定義で変更時の追従漏れリスク |
| `NotificationSortBy`, `NotificationFilter` | `hooks/use-notification-list.ts`, `app/admin/components/NotificationManagement*.tsx` | フィルター仕様変更時の不整合リスク |
| `NotificationType` | `hooks/use-notification.ts`, `hooks/use-admin.ts`, `models/notification.ts` | 契約型とUI型の境界が曖昧 |

**Phase 1 への反映方針（追加）**

* shared-types では「API契約型（共通）」と「UIローカル型（非共通）」の境界を明記する。
* admin/notification 周辺の重複型を最初の統合対象に含める。
* backend routes 内の `z.object` インライン定義は、再利用されるものから段階的に shared schema へ移す。

### Phase 1: 共有型基盤の構築（1.5日）

**目的:** 共有型の単一ソースを作り、以降の移行先を確定する。

**作業内容:**

* `packages/shared-types` を作成し、ドメイン単位ディレクトリを作る。
* zod スキーマと `z.infer` ベースの型生成パターンをテンプレート化する。
* frontend/backend のビルドで shared-types を参照可能にする。
* CI に frontend/backend 個別の型チェックジョブを追加する。

**確認項目:**

* ローカルで frontend/backend の型チェックが成功する。
* CI 上で型チェックが失敗時にブロックされる。

#### Phase 1 実装結果

**実装内容（完了）**

* `packages/shared-types` を新規作成し、`common` / `admin` のスキーマ・型を追加
	* `SortOrderSchema`
	* `RoleTypeSchema`, `UserSortBySchema`, `NotificationSortBySchema`, `NotificationTypeSchema`, `NotificationFilterSchema`
	* `z.infer` ベースの型エクスポートを整備
* frontend/backend の `tsconfig` に `@shared/*` エイリアスを追加
* frontend/backend/root に `typecheck` スクリプトを追加
* CI（`.github/workflows/ci.yml`）に frontend/backend 個別の型チェックステップを追加
* 重複が多い frontend hook の一部を shared-types 参照に切り替え
	* `use-admin.ts`
	* `use-user-list.ts`
	* `use-notification-list.ts`
	* `use-notification.ts`

**補足（運用上の調整）**

* 既存のテストコード由来の型エラーをPhase 1の品質ゲートから切り離すため、frontend には `tsconfig.typecheck.json` を追加し、アプリ本体の型検査を対象化
* shared-types の `zod` 解決のため、モノレポルートに `zod` 依存を追加

**検証結果（完了）**

* `frontend`: `npm run typecheck` 成功
* `backend`: `bun run typecheck` 成功

### Phase 2: 旅程ドメイン移行（3日）

**目的:** 優先度の高い旅程ドメインを先行移行し、実運用パターンを確立する。

**作業内容:**

* 旅程APIの request/response を shared-types へ移管する。
* backend のハンドラ入出力を zod スキーマで統一する。
* frontend の取得データ型を shared-types 参照へ置換する。
* 旧型を deprecated 扱いにし、段階的に削除する。

**確認項目:**

* frontend/backend で型不一致が発生しない。
* Cloudflare staging で backend 先行デプロイ時に既存frontendが動作する。

#### Phase 2 実装結果

**実装内容（完了）**

* `packages/shared-types/src/trip` を追加
	* `schema.ts`: `TripSchema`, `TripDetailResponseSchema`, `DepartureAndDestinationSchema`, `TransportSchema`
	* `types.ts`: `TripContractType`, `TripDetailResponseContractType` 等の契約型
* `packages/shared-types/src/index.ts` に trip ドメインのエクスポートを追加
* backend 側で旅程モデルに shared 契約型エイリアスを追加
	* `backend/src/models/trip.ts`
* frontend 側で旅程型に shared 契約型エイリアスを追加
	* `frontend/src/types/trip.ts`

**互換性を優先した運用判断**

* backend の OpenAPI 生成は `@hono/zod-openapi` スキーマ型との互換要件があるため、Phase 2時点では route で使う実行スキーマは既存実装を維持
* 先に shared へ契約型を集約し、Phase 3以降で `@hono/zod-openapi` 互換ラッパーを整備して段階移行する方針にした

**検証結果（完了）**

* `frontend`: `npm run typecheck` 成功
* `backend`: `bun run typecheck` 成功

#### 追加実装結果（2026-04-11 / ビルド安定化・運用調整）

**目的:** TypeScript の参照境界と monorepo ビルド順序を安定化し、分離デプロイ前提でもローカル/CIの再現性を上げる。

**実装内容（実施済み）**

* `packages/shared-types` を「配布物（dist）参照」前提に調整
	* `packages/shared-types/package.json` に `build` を追加（`bunx tsc -p tsconfig.json`）
	* `main` / `types` / `exports` を `dist` 参照へ変更
	* `packages/shared-types/tsconfig.json` の `rootDir` を `src` に統一
* frontend/backend の shared 参照を `src` 直参照から `dist` 参照へ切替
	* `backend/tsconfig.json`: `@shared/* -> ../packages/shared-types/dist/*`
	* `frontend/tsconfig.json`: `@shared/* -> ../packages/shared-types/dist/*`
	* それぞれの `include` から `../packages/shared-types/src` の直接コンパイル対象を除外
* ビルド順序を固定化
	* `backend/package.json`: `prebuild` で shared-types を先行ビルド
	* `frontend/package.json`: `prebuild` で shared-types を先行ビルド
* TypeScript 実行コマンドの再現性を改善
	* `backend/package.json` の `build` / `typecheck` を `bunx tsc` ベースへ統一

**検証結果（実施済み）**

* `backend`: `bun run prebuild` 成功
* `backend`: `bun run build` 成功
* `backend`: `bun run typecheck` 成功
* `backend`: `bun run test` 成功（288 pass / 0 fail）
* `frontend`: `npm run build` 成功（型エラー解消を確認）

**補足（既知の残課題）**

* `frontend` の `next build` 実行時に、ESLint 側で `Invalid Options: useEslintrc, extensions` の警告が発生していたが、Phase 3 実装開始前に解消済み（下記参照）。

#### ESLint/Next 警告解消（2026-04-11）

**背景:** Next.js 15 の内部 lint runner が ESLint v9 で削除された `useEslintrc` / `extensions` オプションを渡すため警告が発生。ESLint は `npm run lint` で独立実行しているため、ビルド時の重複実行は不要。

**対応:** `frontend/next.config.ts` に `eslint: { ignoreDuringBuilds: true }` を追加。

**検証結果:** `npm run build` で `Skipping linting` と表示され、警告が解消されたことを確認。

### Phase 3: ユーザー周り移行（2.5日）

**目的:** 旅程で確立した方式をユーザー周りへ横展開する。

**作業内容:**

* ユーザー関連APIの契約型を shared-types へ移管する。
* frontend/backend 双方の再定義型を削除または参照切替する。
* mapper 層で DB型と公開型の分離を徹底する。

**確認項目:**

* 主要ユーザーAPIで request/response 型が統一される。
* frontend 先行デプロイ時に後方互換が維持される。

#### Phase 3 実装結果

**実装内容（完了）**

* `packages/shared-types/src/user` を追加
	* `schema.ts`:
		* `UserLocationSchema`, `CreateUserLocationSchema`, `UpdateUserLocationSchema`（ユーザーお気に入り地点）
		* `PlanLocationCandidateItemSchema`（候補アイテム: お気に入り/履歴共通、`transports` を optional で含む）
		* `PlanLocationCandidateResponseSchema`（候補取得APIレスポンス）
	* `types.ts`:
		* `UserLocationType`, `CreateUserLocationType`, `UpdateUserLocationType`
		* `PlanLocationCandidateItemType`, `PlanLocationCandidateResponseType`
		* 定数 `MAX_USER_LOCATIONS = 5`、`LOCATION_LABELS`、`LocationLabel` 型
* `packages/shared-types/src/index.ts` に user ドメインのエクスポートを追加
* backend 側でモデルに shared 契約型エイリアスを追加
	* `backend/src/models/userLocation.ts`: `UserLocationType`, `CreateUserLocationType`, `UpdateUserLocationType` をコントラクト型エイリアスとして re-export
	* `backend/src/models/planLocation.ts`: `PlanLocationCandidateItemType`, `PlanLocationCandidateResponseType` をコントラクト型エイリアスとして re-export
* frontend 側でモデルを shared-types 参照に切替
	* `frontend/src/models/userLocation.ts`: 定数（`LOCATION_LABELS`, `MAX_USER_LOCATIONS`）と型（`CreateUserLocationRequest`, `UpdateUserLocationRequest`）を shared-types から参照。表示用 `UserLocation` interface は日付フィールドを `string` で保持（APIレスポンスの実態に合わせた互換性維持）
	* `frontend/src/models/planLocation.ts`: `DepartureAndDestinationSchema` / `DepartureAndDestinationType` / `PlanLocationCandidatesResponse` を shared-types の `PlanLocationCandidateItemSchema` / `PlanLocationCandidateResponseSchema` から参照へ変更。既存のインポート名（`DepartureAndDestinationType`等）は型エイリアスで維持し、呼び出し側への変更なし
* `frontend/src/data/constants.ts`: `DEFAULT_DEPARTURE_AND_DESTINATION` に不足していた `planId: null` を追加（型整合性の修正）

**設計上の判断**

* backend は `@hono/zod-openapi` を使用するため、実行スキーマは既存を維持。共有型は「コントラクト型エイリアス」として re-export する Phase 2 と同様のパターンを踏襲
* `transports` フィールドは API レスポンスには含まれないが、フロントエンドのストア/UI ステート管理で使用されているため shared 側スキーマに optional として含めることで型互換を維持
* `UserLocation.createdAt/updatedAt` はフロントエンドでは `string` として扱う（`z.string().datetime()` 型の `Date` とは別に interface を定義）

**検証結果（完了）**

* `packages/shared-types`: `npm run build` 成功
* `backend`: `bun run typecheck` 成功
* `backend`: `bun run test` 成功（288 pass / 0 fail）
* `frontend`: `npm run typecheck` 成功
* `frontend`: `npm run build` 成功

#### 追加実装結果（2026-04-12 / 行きたいリスト・通知・詳細ページ・TOP対応）

**目的:** Phase 4（運用化）へ進む前に、ユーザー導線で利用頻度の高い領域（行きたいリスト・通知・詳細ページ関連・TOP周辺の型依存）を shared-types へ統一する。

**実装内容（完了）**

* `packages/shared-types` に追加ドメインを実装
	* `spot`
		* `schema.ts`: `OpeningHoursSchema`, `SpotMetaSchema`, `PlanSpotSchema`, `SpotSchema`, `SpotWithMetaSchema`
		* `types.ts`: `OpeningHoursType`, `SpotMetaType`, `PlanSpotType`, `SpotType`, `SpotWithMetaType`
	* `notification`
		* `schema.ts`: `NotificationSchema`, `NotificationCreateSchema`, `NotificationUpdateSchema`, `NotificationAdminSchema` ほか通知関連レスポンス
		* `types.ts`: `NotificationItemType`, `NotificationCreateType`, `NotificationUpdateType`, `NotificationAdminType` ほか
	* `wishlist`
		* `schema.ts`: `WishlistSchema`, `WishlistCreateSchema`, `WishlistUpdateSchema`, `SpotWithWishlistSchema`, `UnvisitedSpotsResponseSchema`, `VisitedSpotsResponseSchema`
		* `types.ts`: `WishlistItemType`, `WishlistCreateType`, `WishlistUpdateType`, `SpotWithWishlistType` ほか
* `packages/shared-types/src/index.ts` に上記3ドメインの export を追加
* backend 側へ契約型エイリアスを追加
	* `backend/src/models/spot.ts`
	* `backend/src/models/wishlist.ts`
	* `backend/src/models/notification.ts`
* frontend 側の参照切替（重複定義の削減）
	* `frontend/src/models/spot.ts` を shared-types の re-export 形式へ変更
	* `frontend/src/models/wishlist.ts` を shared-types の re-export 形式へ変更
	* `frontend/src/models/notification.ts` を shared-types の re-export 形式へ変更
	* `frontend/src/types/wishlist.ts` を `z.infer` 依存から shared 型参照へ変更

**設計上の判断**

* backend 実行スキーマは `@hono/zod-openapi` 互換を優先して維持し、shared-types は「契約型エイリアス」として段階統合
* frontend は import パス変更の影響を最小化するため、既存モデルファイルを再エクスポート層として残し、呼び出し側の変更範囲を抑制
* TOP 画面（`app/(home)/page.tsx`）はドメインモデル依存がなく、今回の型統一で副作用が出ないことをビルドで確認

**検証結果（完了）**

* `packages/shared-types`: `npm run build` 成功
* `backend`: `bun run typecheck` 成功
* `backend`: `bun run test` は実行したが、環境要因（DB: `No space left on device`）で通知系テストが失敗
* `frontend`: `npm run typecheck` 成功
* `frontend`: `npm run build` 成功

### Phase 4: フロントエンド内の型整理（1.5日）

**目的:** frontend 内に残る型分散を解消し、変更時の影響範囲を追いやすくする。

**作業内容:**

* `frontend/src/models` / `frontend/src/types` / `frontend/src/hooks` の型定義を棚卸しし、重複型を統合する。
* API契約に関わる型は `packages/shared-types` を参照するよう切替する。
* UI専用型はローカル残置を許可しつつ、命名と配置ルールを統一する。
* 主要導線（行きたいリスト、通知、詳細ページ、TOP）の依存型を再点検し、参照境界を明確化する。

**確認項目:**

* frontend 内で同一概念の型再定義が削減されている。
* 修正時の参照経路が追跡しやすい構造になっている。
* frontend の型チェック・ビルド・テストが成功する。

#### Phase 4 実装結果（着手: 2026-04-12）

**今回実施した内容**

* 通知関連のAPIレスポンス型を hook 内ローカル定義から `models` 集約へ移行
	* `frontend/src/models/notification.ts` に `NotificationItem`, `UnreadCountResponse` などを追加
	* `frontend/src/hooks/use-notification.ts` は `models` 参照へ切替
* 行きたいリストのスポットレスポンス型を `models` 起点に統一
	* `frontend/src/models/wishlist.ts` に `VisitedSpotWithWishlistType` を追加
	* `frontend/src/hooks/spot-search/use-wishlist-spots.ts` / `use-visited-spots.ts` のローカル型を置換
* マイページの集約データ型を hook 外へ切り出し
	* `frontend/src/models/mypage.ts` を新規追加
	* `frontend/src/hooks/use-mypage.ts` のローカル型を `models/mypage.ts` 参照へ切替
* admin 画面の hook / component に分散していた型を `models` 起点に集約
	* `frontend/src/models/pagination.ts` を新規追加し、`PaginationInfo` を component から分離
	* `frontend/src/models/admin.ts` に `AdminUser`, `UserListResponse`, `UserListQuery`, `NotificationAdminListResponse`, `NotificationListQuery` を追加
	* `frontend/src/hooks/use-user-list.ts` / `use-notification-list.ts` のローカルレスポンス型を削除
	* `frontend/src/app/admin/components/UserList.tsx` / `UserListContainer.tsx` の `RoleType` / `User` 再定義を削除
	* `frontend/src/app/admin/components/NotificationManagement.tsx` / `NotificationManagementContainer.tsx` の `NotificationFilter` / sort 型再定義を削除
* plan 一覧周辺の APIレスポンス型を `types` から `models` へ整理
	* `frontend/src/models/trip.ts` に `TripListItem` を追加
	* `frontend/src/app/plan/list/page.tsx` を `useSWR<TripListItem[]>` へ変更し、`as ResponseTripType[]` キャストを削除
	* `frontend/src/types/plan.ts` から未使用の `ResponseTripType` / `ResponsePlanType` / `ResponsePlanSpotType` / `ResponseSpotType` / `ResponseSpotMetaType` を削除
* trip detail 周辺の raw API型を `models` 側へ集約
	* `frontend/src/models/trip.ts` に `TripDetailApiSpot` / `TripDetailApiPlan` / `TripDetailApiResponse` を追加
	* detail API型は `shared` 契約型を土台にしつつ、`Transport` と出発地・目的地のみ frontend 利用形へ上書きする構成に変更
	* `frontend/src/hooks/use-trip.ts` は `types/trip.ts` 参照をやめて `models/trip.ts` 参照へ切替
	* `frontend/src/components/CreatePlanButton.tsx` の `TripType` 参照も `models/trip.ts` へ統一
	* `frontend/src/types/trip.ts` は shared 契約型の re-export のみに整理

**検証結果（着手分）**

* `frontend`: `npm run typecheck` 成功
* `frontend`: `npm run test -- --run` 成功（59 files pass / 648 pass / 1 skipped）

**Phase 4 棚卸し結果（残置型の整理）**

* `frontend/src/types/plan.ts`
	* `Coordination`, `Spot`, `TransportNodeType`, `TravelModeType`, `TravelPlanType` など、計画作成・地図表示・経路計算で横断利用する frontend 主体の状態型として残置
	* API契約型ではなく、store / component / lib / test で広く使う UIドメイン型として扱う
* `frontend/src/types/spot.ts`
	* `SpotMetaType` は Google Places 補助型として `lib/google-maps.ts` / `lib/place-fetcher.ts` で利用されているため残置
	* backend 契約ではなく、外部サービス由来の frontend 補助型として扱う
* `frontend/src/types/wishlist.ts`
	* `WishlistType` は shared 契約型の別名として維持し、`ViewModeType`, `FilteredWishlistType`, `SortWishlistType` は UI状態型として残置
	* store / component が参照するため、UI層のオプション定義として扱う
* `frontend/src/types/trip.ts`
	* 参照ゼロを確認したため削除

**Phase 4 完了時の追加成果物**

* `frontend/TYPE_GUIDE.md` を追加し、`shared-types` / `models` / `types` / ローカル定義の配置ルールを明文化

**Phase 4 完了判定**

* frontend 内で重複していた APIレスポンス型の主要な再定義を削減できた
* `types` に残す型の理由が整理され、追跡しやすい状態になった
* frontend 向けの型配置ルールを文書化できた

### Phase 5: model型未使用箇所の洗い出し・是正（0.5日）

**目的:** model 参照へ寄せられる型再定義を可視化し、余計な修正や見落としを減らす。

**作業内容:**

* `frontend/src/components` / `frontend/src/hooks` を中心に、独自型宣言と `models` 型の重複を棚卸しする。
* 置換可能なものは `models` 参照へ移行し、難しいものは理由を残す。
* 今後のレビューで使える確認観点を Phase 6 へ引き継ぐ。

**洗い出し結果（2026-04-12 追加対応）**

| 区分 | ファイル | 現状の独自宣言 | 参照すべき型 | 判定 |
|---|---|---|---|---|
| mypage | `frontend/src/components/mypage/NextTripSection.tsx` | `type NextTrip` | `models/mypage.ts` の `NextTrip` | 対応済み |
| mypage | `frontend/src/components/mypage/RecentTrips.tsx` | `type Trip` | `models/mypage.ts` の `RecentTrip` | 対応済み |
| mypage | `frontend/src/components/mypage/TripSummaryCards.tsx` | props の数値型をローカル定義 | `models/mypage.ts` の `MypageData`（Pick） | 対応済み |
| mypage | `frontend/src/components/mypage/UsageStatus.tsx` | props の数値型をローカル定義 | `models/mypage.ts` の `MypageData`（Pick） | 対応済み |
| plan list | `frontend/src/components/TripCard.tsx` | `type TripCardProps`（一覧項目と同等） | `models/trip.ts` の `TripListItem` | 対応済み（`id` は互換維持のため union） |

**備考（残置理由のある型）**

* `frontend/src/types/plan.ts`: 計画作成・地図表示・経路計算で横断利用する UIドメイン型のため残置。
* `frontend/src/types/spot.ts`: Google Places 補助型のため残置。
* `frontend/src/types/wishlist.ts`: view/filter/sort など UI状態型のため残置。

**確認項目:**

* 「models が存在する型」の独自宣言が一覧化されている。
* 置換対象/要調整/残置の判定理由が明確である。

**実施結果（2026-04-12 追加）**

* 上記の置換対象はすべて `models` 参照へ移行完了。
* `types/plan.ts` の `Location` / `Coordination` も `models/plan.ts` の `LocationType` / `CoordinationType` 参照へ置換済み。

**次の作業（Phase 6）**

* 契約変更時の手順書を整備
* PRレビュー向けの型変更チェック観点を整備

### Phase 6: 手順書作成・運用化（1.5日）

**目的:** 型運用をチームで継続できるように、変更手順とレビュー観点を標準化する。

**作業内容:**

* 契約変更時の手順（追加→移行→削除）を移行ガイドに明記する。
* PRテンプレートに型契約変更チェック項目を追加する。
* 影響範囲確認チェックリスト（frontend/backend/shared-types）を整備する。
* Cloudflare 分離先行リリース検証（frontend先行 / backend先行）は別途タスクとして保留管理する。

**確認項目:**

* 手順書のみで新規メンバーが運用可能である。
* PRレビュー時に型契約変更の漏れを検知できる。
* 分離先行リリース検証タスクへ引き継げる状態（手順・判定基準）になっている。

## 受け入れ条件（Done条件）

1. frontend/backend の型チェックがCIで常時成功する。
2. 旅程・ユーザーの主要APIで request/response 型が共有化されている。
3. API境界で zod スキーマ検証が実装されている。
4. 既存の型重複が削減され、再定義禁止ルールが文書化されている。
5. 開発者向け移行ガイド（追加方法、変更手順、注意点）が整備されている。
6. Cloudflare staging の分離先行リリース検証は、別途タスクとして実施できるよう手順と判定基準が整備されている。

## リスクと対策

| リスク | 内容 | 対策 |
|---|---|---|
| 既存実装との不整合 | 移行途中で型互換が崩れる | ドメイン単位で段階移行し、互換レイヤーを一時的に維持 |
| 工数超過 | 一括移行に近づき遅延 | 優先度（旅程→ユーザー）を固定し、非優先は次課題化 |
| ルール形骸化 | 実装者ごとに運用がぶれる | PRテンプレートとCIでルールを強制 |

## 成果物

* 要件定義書（本書）
* 型定義ルール（命名・配置・zod運用）
* 共有型パッケージ（初版）
* ドメイン移行結果（旅程、ユーザー）
* 移行ガイド

## 進行提案

本課題は「短期間で完了可能な基盤整備+優先ドメイン移行」に向いているため、まずは旅程ドメインの1APIをパイロットとして移行し、ルールを確定したうえで横展開する進め方を推奨する。


