# No.168 現在地登録を別の手段に変更する 調査報告

- Issue: https://github.com/ju-ki/moptabi/issues/168
- 調査日: 2026-10-13
- 対象ブランチ: `feature168`（`dev` から作成）

## 1. 要件整理

### 目的
- 自宅などユーザーが登録した地点の座標を、DB 流出時や第三者から推測されないようにする。

### 要件（Issue 本文・コメントより）
- 座標保持の仕組みを他人から推測等ができないようにする。
- 徒歩等の移動時間から、設定した座標が推測されないようにする。
- 住所はすでに DB から削除済み（`20e38fd feature270 UserLocationとPlanLocationからaddressカラムを削除`）。
- 緯度・経度は「マスキング等のアルゴリズム」を採用したい（コメント 2026-09-15）。
- 他にも怪しいものがあれば対応したい（備考）。

### 未確定事項（要判断）
1. 「推測されない」の脅威モデル: **DB 流出**を想定するのか、**運営者（DB を直接見られる人）からも隠す**のか。
   - 前者なら「サーバー側暗号化」で足りる。後者なら「端末側暗号化」まで必要になる。
2. 座標の精度をどこまで落としてよいか（地図ピン・経路計算・移動時間の精度に直結する）。
3. 対象テーブルを `UserLocation`（お気に入り地点）だけにするか、`PlanLocation`（プランの出発地・目的地の履歴）も含めるか。
4. 既存データの移行方法（一括変換スクリプトか、読み出し時の遅延変換か）。

## 2. 現状調査

### 座標を平文で保存している箇所
| テーブル | カラム | 定義 | 備考 |
|---|---|---|---|
| `UserLocation` | `latitude` / `longitude`（double precision） | `backend/src/db/schema.ts:70-97` | `name` / `label` に「自宅」等が平文で入る |
| `UserLocationNearestStation` | `placeId` | `backend/src/db/schema.ts:99-117` | 自宅の最寄駅が平文で分かる |
| `PlanLocation` | `latitude` / `longitude`, `travelTime` | `backend/src/db/schema.ts:292-336` | 出発地＝自宅のケースが多い。`travelTime` は出発地から最初のスポットまでの所要時間 |
| `PlanLocationNearestStation` | `placeId`, `transitTime` | `backend/src/db/schema.ts:253-274` | `transitTime` は乗車時間 |

### 書き込み・読み出し箇所
- UserLocation
  - 作成: `backend/src/services/userLocation.ts:55-65`
  - 更新: `backend/src/services/userLocation.ts:124-134`
  - 一覧: `backend/src/services/userLocation.ts:9-21`
- PlanLocation
  - 作成: `backend/src/services/planLocation.ts:29-55`（`createPlanLocation`、旅行作成時に `backend/src/services/trip.ts` から呼ばれる）
  - 作成/更新: `backend/src/services/planLocation.ts:155-204`（`createOrUpdatePlanLocation`）
  - 候補一覧（お気に入り＋履歴）: `backend/src/services/planLocation.ts:65-146`
  - 旅行詳細の組み立て: `backend/src/services/trip.ts:186`, `:237`, `:543`
- 座標を検索条件（WHERE / ORDER BY）に使っている箇所は**無い**（`grep "eq(.*latitude"` で該当なし）。→ 暗号化しても既存クエリは壊れない。

### 座標の入力元（フロント）
- 現在地取得: `frontend/src/components/Departure.tsx:371`, `frontend/src/components/Destination.tsx:232`, `frontend/src/hooks/use-google.ts:23`, `frontend/src/hooks/spot-search/use-current-location.ts:26`
- マイページでの地点登録: `frontend/src/components/mypage/UserLocationSection.tsx:106`, `:127`, `:413`
- 経路の所要時間: `frontend/src/lib/plan.ts:700-729`（Routes API の結果を `travelTime` に入れる）
- フロントは地図表示・経路計算のために**正確な座標を必要とする**（`UserLocationSection.tsx:69`, `Departure.tsx` の `GoogleMap center` など）。

### 外部への露出
- 地点 API はすべて `requireAuth` 配下で本人のデータのみ返す（`backend/src/index.ts:167`）。共有・公開機能は無い。
- エラーログはメッセージのみでリクエストボディは出力していない（`backend/src/index.ts:254`）。
- フロントの `localStorage` には Place ID 単位の lat/lng キャッシュのみ（`frontend/src/lib/place-fetcher.ts:57-111`）。ユーザー地点は保存していない。Zustand の `persist` も未使用。

### まとめ
現状のリスクは「**DB（Neon）の中身が流出すると、自宅等の座標・ラベル・最寄駅がそのまま分かる**」こと。API 経由で他人に見える経路は無い。

### 「徒歩時間から推測」について
DB から次の組み合わせが分かると、自宅の位置はある程度絞れる。
- `PlanLocation.travelTime`（出発地→最初のスポット）＋ 最初のスポットの `placeId`（`PlanSpot`）＋ 移動手段
- `UserLocationNearestStation.placeId`（最寄駅）

ただし時間と駅だけでは「駅から半径数百 m〜1 km の円」程度で、単体での特定は難しい。**座標そのものが平文で残っていることが一番のリスク**であり、時間情報は補助的なリスク。

## 3. 実現案

### 案A: サーバー側でのアプリ層暗号化（AES-256-GCM）
- 内容
  - `latitude` / `longitude` を 1 つの JSON（例 `{"lat":..,"lng":..}`）にまとめ、バックエンドで AES-256-GCM で暗号化して `encryptedCoordinates text` に保存する。
  - 鍵は Cloudflare Workers の Secret（`wrangler secret put LOCATION_ENC_KEY`）とローカルの `.dev.vars` で管理する。Web Crypto（`crypto.subtle`）は Workers / Node 両方で動く。
  - 暗号文に鍵バージョンを付ける（例 `v1:<iv>:<ciphertext>`）ことで、将来の鍵ローテーションに対応できる。
  - API のレスポンス形式は変えない（サーバーで復号して返す）ため、フロントの変更は不要。
- 変更範囲
  - `backend/src/db/schema.ts`（カラム追加 → 移行後に `latitude` / `longitude` を削除）＋ migration
  - 新規 `backend/src/lib/locationCrypto.ts`（encrypt / decrypt）
  - `backend/src/services/userLocation.ts`, `backend/src/services/planLocation.ts`, `backend/src/services/trip.ts` の読み書き
  - 既存データの変換スクリプト
  - テスト（`backend/src/tests/schema/userLocation.spec.ts`, `planLocation.*.spec.ts` ほか）、`docs/DB設計書.md`
- メリット
  - 精度が落ちないので、地図・経路・移動時間の挙動が今と同じ。
  - DB だけが流出しても座標は読めない。
  - 座標で検索していないので、既存クエリへの影響が小さい。
- デメリット
  - 鍵と DB が同時に漏れると読める。運営者からは隠せない。
  - 鍵の管理（dev / staging / prod / test の 4 環境）が増える。鍵を失うとデータを復元できない。
- 工数感: 中（2〜3 日）

### 案B: 座標の粗化（ジオマスキング）
- 内容
  - 保存前に座標を丸める（例: 小数第 3 位 ≒ 約 100 m 四方のグリッドの中心に寄せる）。
  - ランダムにずらす方式（ドーナツマスキング）は、同じ地点を何度も登録すると平均を取られて元の位置に近づくため、使うなら「ユーザー＋地点ごとに決まったずらし量」にする必要がある。
- 変更範囲
  - `backend/src/services/userLocation.ts`, `backend/src/services/planLocation.ts` に丸め処理を追加するだけ。スキーマ変更なし。
- メリット
  - 実装が最も小さい。鍵管理も不要。
  - DB が流出しても「約 100 m 四方」までしか分からない。
- デメリット
  - 地図ピンがずれる。駅や最初のスポットまでの所要時間も実際とずれる（徒歩 1〜2 分程度）。
  - 100 m 四方は住宅地では数十軒程度で、名前が「自宅」なら十分に絞り込める。保護としては弱い。
  - 一度丸めると元に戻せない。
- 工数感: 小（0.5〜1 日）

### 案C: 端末側暗号化（E2E）または端末内保持
- 内容
  - フロントでユーザーごとの鍵を作り、座標を暗号化してからサーバーへ送る。またはサーバーに送らず `localStorage` 等の端末内だけに置く。
- メリット
  - 運営者や鍵を含むサーバー全体が漏れても読めない。最も強い保護。
- デメリット
  - PC とスマホの両方で使う想定（CLAUDE.md の Device）なので、端末間で鍵を共有する仕組み（パスフレーズ等）が必要になり、UX と実装が大幅に重くなる。端末内保持の場合は端末をまたいで使えない。
  - サーバー側で座標を使う処理を将来追加できなくなる。
- 工数感: 大（1 週間以上）

### 比較

| | 案A 暗号化 | 案B 粗化 | 案C 端末側 |
|---|---|---|---|
| DB 流出時の保護 | 強い（鍵が無事なら読めない） | 弱い（約 100 m まで分かる） | 最も強い |
| 運営者から隠す | できない | 一部 | できる |
| 精度・既存機能への影響 | なし | あり（ピン・所要時間がずれる） | なし |
| フロント変更 | 不要 | 不要 | 大 |
| 工数 | 中 | 小 | 大 |

### 推奨: 案A（サーバー側暗号化）
- 個人開発のサービスで現実的に起きやすいのは「DB の接続情報や中身の流出」であり、案A でこれを防げる。
- 正確な座標が必要な経路計算・地図表示を壊さずに済む。案B の精度低下は、移動時間を詰めるプランニングの体験と相性が悪い。
- 案C は PC とスマホの両方で使う前提だと UX のコストが高すぎる。必要になったら案A の暗号化処理をフロントへ移す形で段階的に移行できる。

### 「徒歩時間からの推測」への対応（推奨案に含める）
- 対象範囲は `UserLocation` と `PlanLocation` の両方とする（出発地はほぼ自宅になるため）。
- `PlanLocation.travelTime` と `UserLocationNearestStation.placeId` は、座標が暗号化されれば単体では「駅周辺の円」程度しか分からないため、**初回は平文のまま**とする。
- より強くしたい場合は、`travelTime` と最寄駅の `placeId` も同じ暗号化 JSON に含める（後述の追加の提案 2）。

## 4. 追加の提案
1. **地点の名前・ラベルの扱い**: `UserLocation.name` / `label` に「自宅」「実家」などが平文で入る。座標を暗号化しても「自宅」というラベルと最寄駅が組み合わさると推測材料になるため、`name` / `label` も暗号化対象に含めるか検討したい。
2. **移動時間・最寄駅の暗号化**: `PlanLocation.travelTime`（出発地の行のみ）と `UserLocationNearestStation.placeId` も暗号化 JSON に含めると、Issue の「徒歩時間から推測されない」を完全に満たせる。どちらも検索条件に使っていないので追加コストは小さい。
3. **Google Maps Platform 規約との整合**: `docs/DB設計書.md:362` では「座標は DB に保存せず Place ID のみ」と方針を定めているが、`UserLocation` / `PlanLocation` は座標を無期限に保存している。ユーザーが現在地や地図クリックで決めた座標は Google のコンテンツではないため問題は小さいが、Places 検索で選んだ地点の座標を無期限保存している点は規約上グレー。暗号化の対応と合わせて方針を整理しておくとよい。
4. **ログ・監視**: 今は問題ないが、今後リクエストボディをログに出す変更を入れる場合は座標をマスクするルールを決めておく。

## 5. 判断していただきたいこと
- 推奨の案A（サーバー側暗号化）で進めてよいか。
- 対象を `UserLocation` と `PlanLocation` の両方にしてよいか。
- 追加の提案 1（名前・ラベル）と 2（移動時間・最寄駅）を今回の範囲に含めるか。
