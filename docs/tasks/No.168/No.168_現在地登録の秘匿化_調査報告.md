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
- 座標だけを暗号化しても、次の情報が平文で残ると DB 流出後に位置を推測できる。
  - `PlanLocation.travelTime`（出発地 → 最初のスポット）と、最初のスポットの `PlanSpot.spotId`・移動手段
  - 最後のスポットの `PlanSpot.travelTime`（最後のスポット → 目的地。`backend/src/services/trip.ts:298`）
  - `UserLocationNearestStation.placeId` / `PlanLocationNearestStation.placeId`（自宅の最寄駅）
- 1 回分なら「スポットを中心とした円」程度だが、同じ自宅から何度もプランを作ると、最初のスポットが違う複数の円が重なり、交点から位置をかなり絞り込める（三辺測量）。対象ユーザーは月 2〜4 回旅行する想定なので、このリスクは無視できない。
- そのため、**これらも暗号化の対象に含める**ことを推奨する（2026-10-15 CodeRabbit 指摘を受けて見直し）。いずれも検索条件や並び替えには使っていない。
  - `PlanLocation`: 座標と `travelTime`、最寄駅の `placeId` を暗号化する
  - `UserLocation`: 座標とラベル、最寄駅の `placeId` を暗号化する
  - `PlanSpot.travelTime`: 最後のスポットの値だけを暗号化するのは扱いが複雑になるため、カラムごと暗号化するか、目的地までの移動時間を `PlanLocation`（DESTINATION）側に移すかを実装計画で決める
- 平文で残す場合は、上記の推測リスクを要件として許容することを明記する必要がある。

## 4. 追加の提案
1. **地点の名前・ラベルの扱い**: `UserLocation.name` / `label` に「自宅」「実家」などが平文で入る。座標を暗号化しても「自宅」というラベルと最寄駅が組み合わさると推測材料になるため、`name` / `label` も暗号化対象に含めるか検討したい。
2. **移動時間・最寄駅の暗号化**: `PlanLocation.travelTime`（出発地の行のみ）と `UserLocationNearestStation.placeId` も暗号化 JSON に含めると、Issue の「徒歩時間から推測されない」を完全に満たせる。どちらも検索条件に使っていないので追加コストは小さい。
3. **Google Maps Platform 規約との整合**: `docs/DB設計書.md:362` では「座標は DB に保存せず Place ID のみ」と方針を定めているが、`UserLocation` / `PlanLocation` は座標を無期限に保存している。ユーザーが現在地や地図クリックで決めた座標は Google のコンテンツではないため問題は小さいが、Places 検索で選んだ地点の座標を無期限保存している点は規約上グレー。暗号化の対応と合わせて方針を整理しておくとよい。
4. **ログ・監視**: 今は問題ないが、今後リクエストボディをログに出す変更を入れる場合は座標をマスクするルールを決めておく。

## 5. レビュー結果（2026-10-13 PR #443 のコメントより）

### 決定事項
| 項目 | 決定 |
|---|---|
| 脅威モデル | DB 流出を想定。Neon のコンソールや接続文字列から直接 DB を見ても座標が読めないようにする |
| 精度 | 参考程度なので多少の誤差は許容 |
| 対象 | `UserLocation` と `PlanLocation` の両方（自宅かどうかの判定はしない） |
| 既存データの移行 | 一括で変換する |
| 案B（粗化） | 不採用（100 m 四方では危ない。平均を取られる問題もある） |
| 案C（端末側） | 不採用（サーバー側で座標を使う処理を将来追加できなくなるのは致命的） |
| 採用 | **案A（サーバー側暗号化）**。鍵は Workers の Secret に置き、Neon には暗号文だけを保存する |

### #441 との関係
- #441（`X-User-Id` ヘッダーを信用している問題）は「**API 経由で他人に見られる**」問題、本 Issue は「**DB を直接見られる**」問題で、守る経路が別。
- #441 を直さない限り、他人の Google ID が分かればヘッダーを付けるだけで座標を含むプランや地点を取得できる（`backend/src/middleware/auth.ts:9-20`）。暗号化してもサーバーが復号して返すため、この経路は防げない。
- 逆に #441 だけでは、Neon のコンソールや `DATABASE_URL` が漏れた場合に平文の座標が見える。
- したがって **#441 を先に対応し、本 Issue の暗号化を続けて入れる** 順番がよい。両方そろって「API 経由でも DB 直接でも見えない」状態になる。

### 地点名・ラベルの扱い
- 地点名（`name`）: 平文のままとする。検索条件には使っていないため（`backend/src/services/planLocation.ts` の `search` オプションは未実装）、暗号化 JSON に含めることは低コストでできる。必要になったら追加する。
- ラベル（`label`）: 値は `LOCATION_LABELS = ['自宅', '駅・バス停', '実家', '旅の拠点', 'その他']` の 5 種類で固定（`packages/shared-types/src/user/types.ts:21`）。
  - 数値で保持してフロントで文字列に変換する案は、対応表が `shared-types` にあるため、DB を見た人が「0 = 自宅」と推測するのは容易で、秘匿の効果は小さい。
  - **ラベルも座標と同じ暗号化 JSON に含める**ことを推奨する。`label` は検索・並び替えに使っていないので、追加の手間はほぼない。

## 6. 本 Issue 以外のセキュリティ上の懸念（#441 を除く、2026-10-13 時点の dev で確認）
| 優先度 | 内容 | 該当箇所 |
|---|---|---|
| 高 | `next` 15.5.20 に critical の脆弱性。AVIF 画像最適化の未認証 RCE（GHSA-2xp9-vwfh-vxw4）など。15.5.24 で修正済み。15.5.27 未満には moderate のキャッシュ汚染（GHSA-4jqv-mc3x-m676 など）も残るため、**15.5.27 以上**に上げる | `frontend/pnpm-lock.yaml:4600` |
| 高 | `next-auth` 5.0.0-beta.31 に、設定エラー時に `auth` の有無だけで判定する認証チェックが素通りになる問題（GHSA-8fpg-xm3f-6cx3、`pnpm audit` 上は critical）がある。このアプリの `frontend/src/middleware.ts` は `!req.auth` で判定しているので適用条件に当たる。修正版は 5.0.0-beta.32 | `frontend/pnpm-lock.yaml:4584` |
| 低 | `next-auth` のその他の advisory。メールアドレス正規化（GHSA-7rqj-j65f-68wh）はメールプロバイダー用で、Google ログインだけのこのアプリでは該当しない。`getToken()` の例外（GHSA-xmf8-cvqr-rfgj）は `getToken` を使っていないので該当しない。OAuth の state/PKCE cookie（GHSA-x445-f3h2-j279、moderate）は複数プロバイダー前提で影響は小さい。いずれも 5.0.0-beta.32 で修正 | `frontend/auth.ts` |
| 高 | 画像アップロードのファイル名にユーザー入力の `file.name` をそのまま使っており、`../` でパストラバーサルになり得る。MIME・サイズの検証もない | `backend/src/controllers/image.ts:22-25` |
| 中 | 500 エラー時に `error.message`（SQL エラー文など）をそのまま返している。SQL エラーには値が含まれることがあり、座標が漏れる経路にもなり得る | `backend/src/index.ts:252-256` |
| 中 | Swagger UI が本番でも公開されており、API 一覧が誰でも見られる | `backend/src/index.ts:230-234` |
| 低 | レート制限がない。#441 の後でも、ログイン済みユーザーによる大量リクエストを止められない | `backend/src/index.ts` |
| 低 | 行きたいリスト更新で、存在確認を `userId` なしで行っている。他人の ID を指定すると 404 ではなく空の結果になり、ID の存在が分かる（更新自体は `userId` で絞っているので書き換えはできない） | `backend/src/services/wishlist.ts:101` |

- 上の高・中の項目は 2026-10-01 のプロジェクト全体レビュー（`project-review/タスク洗い出し_2026-10-01.md` の 2〜4）で挙げたもので、まだ直っていない。

## 7. 次のステップ
1. #441 の対応（先行）
2. 本 Issue の実装計画を `docs/tasks/No.168/` に作成（実装計画・処理フロー・動作確認手順）
   - 暗号化対象: `UserLocation`（座標・ラベル・最寄駅）、`PlanLocation`（座標・移動時間・最寄駅）、最後のスポット → 目的地の移動時間
   - 既存データは一括変換スクリプトで暗号化し、その後に平文カラムを削除する
