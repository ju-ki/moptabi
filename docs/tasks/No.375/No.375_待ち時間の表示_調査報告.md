# No.375 待ち時間を表示する 調査報告

- Issue: https://github.com/ju-ki/moptabi/issues/375
- 調査日: 2026-10-14
- 調査ブランチ: `feature375`（`dev` = ac8788b から作成）

## 1. 要件整理

### 目的
- 最寄駅経由（移動手段ID 4）のルートで、駅に着いてから発車するまでの「待ち時間」を画面に表示する。
- 待ち時間が見えることで、その時間にスポットを追加するという判断ができるようにする。

### 要件（Issue 本文より）
- 対象: 最寄駅の経路を選択している区間
- 影響画面
  - プラン詳細画面（`/plan/[id]`）
  - 作成/更新のプレビュー画面
- メモ
  - プランニングでは待ち時間を計算済みだが、表示していない
  - 詳細画面で表示するには DB 定義の変更が必要と思われる

### 未確定事項（実装前に確認したい点）
1. 待ち時間が 0 分のとき表示するか（案: 0 分なら非表示）
2. 既存プラン（DB に待ち時間が無いデータ）の詳細画面での扱い（案: 非表示。編集して保存し直すと表示される）
3. 「スポットを増やす選択」を UI で促すか（例: 待ち時間が一定以上なら強調表示）。本 Issue の範囲外とし「追加の提案」に記載
4. デザイン資料 `docs/pages/plan-detail.md` / `docs/pages/plan-create.md` に待ち時間の行が無い。追記が必要（CLAUDE.md の「設計書に無い機能は実装しない」に該当するため先に確認）

## 2. 現状調査

### 2.1 待ち時間の計算（プランニング）
| 箇所 | 内容 |
|---|---|
| `frontend/src/lib/planning.ts:800` | `calculateWaitingMinutes()` 駅到着時刻から採用した発車時刻までの分数を返す（日またぎ対応済み） |
| `frontend/src/lib/planning.ts:834` | 駅到着 = 区間開始 + 徒歩時間。発車時刻候補から選んだ時刻との差を待ち時間とする |
| `frontend/src/lib/planning.ts:847` | 区間の所要時間 = 徒歩 + **待ち時間** + 乗車時間 + 徒歩。つまり `travelTime` には待ち時間が含まれている |
| `frontend/src/lib/planning.ts:1105-1111` | 計算結果の `waitingTime` を出発側ノードの `nearestStation` に書き戻している |
| `frontend/src/hooks/use-planning.ts:89-104` | 書き戻された `nearestStation`（`waitingTime` を含む）をストアへ反映 |

→ プレビュー画面ではストアの `nearestStation.waitingTime` に値が既に入っている。表示していないだけ。

### 2.2 型
| 箇所 | 内容 |
|---|---|
| `frontend/src/types/plan.ts:41` | `ExtendNearestStationType.waitingTime?: number`（フロント専用型には既にある） |
| `packages/shared-types/src/nearestStation/schema.ts:4-11` | `NearestStationSchema` に `waitingTime` が無い。API 送信時に zod で落ちる |

### 2.3 DB / API
| 箇所 | 内容 |
|---|---|
| `backend/src/db/schema.ts:224-246` | `PlanSpotNearestStation`: `transitTime`, `scheduledDepartureTime` はあるが待ち時間の列は無い |
| `backend/src/db/schema.ts:253-275` | `PlanLocationNearestStation`: 同上 |
| `backend/src/services/trip.ts:203-224, 254-275, 316-336` | 作成/更新時の最寄駅 insert / upsert。待ち時間は保存していない |
| `backend/src/services/trip.ts:523-530, 551-558` | 取得時の変換。待ち時間は返していない |
| `backend/src/services/spot.ts:33`, `backend/src/services/planLocation.ts:51` | 他の最寄駅保存箇所（同じく待ち時間なし） |
| `backend/drizzle/` | 最新マイグレーションは `0015_add_user_location_nearestStation.sql` |

### 2.4 表示
| 画面 | コンポーネント | 現状 |
|---|---|---|
| 作成/更新プレビュー | `frontend/src/components/travel-plan/nearestStation/RouteSummaryNearestStation.tsx:47-61` | 「徒歩 → 駅 → 電車/バス X分（発車: HH:mm） → 駅 → 徒歩」を表示。待ち時間なし |
| 〃 | 呼び出し元 `SpotDetailCard.tsx:271-289`, `DepartureDetailCard.tsx:128-134` | `transportMethodId == 4` の区間で表示 |
| プラン詳細 | `frontend/src/components/NearestStationDetail.tsx:54-73` | 「徒歩X分 / 発車 HH:mm / 乗車 X分」のバッジ表示。待ち時間なし |
| 〃 | 呼び出し元 `SpotInfoCard.tsx:101-108`, `DepartureInfoCard.tsx:47-54`, `DestinationInfoCard.tsx:34` | |
| 〃 | データ取得 `frontend/src/hooks/use-trip.ts:25-140` | DB の最寄駅情報に、Place API から取った駅名・座標と、座標から推定した徒歩時間を付け足している |

## 3. 実現案

### 案A: DB に待ち時間を保存して表示する（推奨）
**変更範囲**
- `backend/src/db/schema.ts`: `PlanSpotNearestStation` と `PlanLocationNearestStation` に `waitingTime: integer()`（nullable）を追加、`0016_add_nearest_station_waiting_time.sql` を生成
- `packages/shared-types/src/nearestStation/schema.ts`: `waitingTime: z.number().int().min(0).optional()` を追加
- `backend/src/services/trip.ts`: 作成/更新の insert・upsert と、取得時の変換に `waitingTime` を追加（`spot.ts` / `planLocation.ts` も揃える）
- `RouteSummaryNearestStation.tsx`: 駅と電車の間に「待ち X分」の行を追加（プレビュー）
- `NearestStationDetail.tsx`: 「発車」の前に「待ち X分」バッジを追加（詳細）
- テスト: backend の trip spec、frontend の上記 2 コンポーネントのテスト
- `docs/pages/plan-detail.md`, `docs/pages/plan-create.md` に表示項目を追記

**メリット**
- プランニングで計算した値をそのまま出すので、プレビューと詳細で値が必ず一致する
- 詳細画面に計算ロジックを持ち込まない
- Issue のメモ（DB 定義変更が必要）と一致

**デメリット**
- マイグレーションが必要
- 既存プランは `null` のため、編集して保存し直すまで待ち時間が出ない

**工数感**: 中（0.5〜1日）

### 案B: DB は変えず、詳細画面で逆算して表示する
**変更範囲**
- `frontend/src/hooks/use-trip.ts` などで `待ち時間 = 発車時刻 − (滞在終了 or 出発時刻 + 徒歩時間)` を計算し、`nearestStation.waitingTime` に入れる
- 表示は案Aと同じ 2 コンポーネント

**メリット**
- マイグレーション不要、既存プランでもすぐ表示できる

**デメリット**
- 詳細画面の徒歩時間は読み込み時に座標から推定し直した値（`use-trip.ts:43`）なので、Place の座標が変わるとプランニング時の値とずれる
- `calculateWaitingMinutes` と同じ計算（日またぎ含む）を詳細側にも持つことになる
- 発車時刻が空のデータなど、逆算できないケースの扱いが増える

**工数感**: 小〜中（0.5日）

### 案C: プレビュー画面のみ表示する
**変更範囲**: `RouteSummaryNearestStation.tsx` のみ

**メリット**: 最小（ストアに値は既にある）
**デメリット**: 詳細画面（旅行中に一番見る画面）に出ないため要件を満たさない
**工数感**: 小（1〜2時間）

### 比較
| | 案A DB保存 | 案B 逆算 | 案C プレビューのみ |
|---|---|---|---|
| 要件充足 | ◎ | ○ | △ |
| 値の一致 | ◎ | △（ずれる可能性） | ― |
| 既存プラン | 再保存で表示 | すぐ表示 | ― |
| 変更範囲 | DB/API/フロント | フロント | フロント1ファイル |
| 工数 | 中 | 小〜中 | 小 |

### 推奨: 案A
- 待ち時間は「プランニングが決めた値」であり、表示側で計算し直すとずれの原因になる。保存して表示するのが一番素直。
- `transitTime` / `scheduledDepartureTime` と同じテーブルに 1 列足すだけで、既存の保存・取得の流れに乗せられる。
- 既存プランは `null` を非表示にすれば壊れない。

## 4. 実装時の注意
- `waitingTime` は出発側ノードの最寄駅に入る（`planning.ts:1105`）。詳細画面の `NearestStationDetail` は各ノードの最寄駅をそのまま表示しているので、出発側ノードのカードに出せばよい（`SpotInfoCard`, `DepartureInfoCard`）。目的地カードには出ない。
- 発車時刻を切り替えると再プランニングされ、ストアの `waitingTime` も更新される（`SpotDetailCard.tsx:102-105` → `onDepartureTimeChange`）。プレビューは props の `originNearestStation.waitingTime` を読むだけでよい。
- `transportMethodId !== 4` の区間でも `nearestStation` は残ることがある。待ち時間は最寄駅経由を選んだ区間でのみ表示する。

## 5. 追加の提案
1. **空き時間の強調**: 待ち時間が一定以上（例: 20分以上）のとき「待ち時間 X分 ─ 近くのスポットを追加できます」と色付きで表示し、Issue の「スポットを増やす選択」につなげる。将来的には No.341（マップからスポット検索）の駅周辺検索に飛ばせると良い。
2. **所要時間の内訳表示**: プレビューの移動手段行は `travelTime`（待ち時間込み）だけを出しているため、「電車 45分」が実は待ち 20分を含むことが分からない。待ち時間表示と合わせて「（うち待ち X分）」を付けると誤解が減る。
3. **デザイン資料の更新**: `docs/pages/plan-detail.md` の最寄駅関連の行（73-95行）に「待ち時間」を追加する。
