# No.322 ローカル環境を Cloudflare 環境に寄せる 実装計画

## 1. 目的

本計画は、`ju-ki/moptabi#319` と `ju-ki/moptabi#320` をローカルで再現・デバッグできるように、開発手順を Cloudflare 実行形態（Wrangler）へ寄せるための実装方針を定義する。

受け入れ条件:
1. `next dev` / `bun run --hot` ではなく Wrangler ベースでローカル起動できること
2. #319 / #320 をローカルで再現できること（#320 は transaction 利用状態で再現確認）
3. 再現結果をもとに対応方針を立てられること

---

## 2. 現状整理（調査結果）

- backend
  - `package.json` に `dev:wrangler` は存在（`wrangler dev src/index.ts`）
  - 既定 `dev` は Bun ホットリロード（`bun run --hot src/dev.ts`）
  - `src/db/index.ts` は `NODE_ENV === 'production'` のときに `neon-http` を選択
  - `src/controllers/trip.ts` には `No transactions support in neon-http driver` のフォールバック実装がある
- frontend
  - `dev` は `next dev`
  - `preview` は `opennextjs-cloudflare build && opennextjs-cloudflare preview`
  - `wrangler.jsonc` / `wrangler.toml` はあるが、ローカル開発の標準手順として未整理
- ドキュメント
  - ルート `README.md` と `docs/環境詳細書.md` は Cloudflare 前提のローカル起動手順になっていない

---

## 3. 変更対象ファイル（予定）

### 3-1. 起動スクリプト
- `frontend/package.json`
  - Wrangler ベースの開発スクリプト追加（例: `dev:wrangler`）
  - OpenNext ビルド＋Wrangler 実行の導線を統一
- `backend/package.json`
  - `dev:wrangler` をローカル標準手順として扱えるよう、必要なら補助スクリプトを追加

### 3-2. Wrangler 設定
- `frontend/wrangler.jsonc`（または `frontend/wrangler.toml` のどちらかへ一本化）
  - ローカル実行に必要な binding / vars の整理
- `backend/wrangler.toml`
  - ローカル再現用の vars/binding 方針を明確化

### 3-3. ドキュメント
- `README.md`
  - ローカル起動手順を Wrangler ベースへ更新
- `docs/環境詳細書.md`
  - Cloudflare 相当ローカル環境の構築手順（frontend/backend 別）
  - `.dev.vars` / `wrangler secret` の使い分け
- `docs/tasks/No.322_実装計画.md`（本書）
  - 実施結果・判断の反映

---

## 4. 実装方針

### 4-1. ローカル起動の Cloudflare 統一

- frontend は `next dev` ではなく、OpenNext で生成した Worker を `wrangler dev` で起動する。
- backend は `bun run --hot` を標準手順から外し、`wrangler dev` を標準化する。
- 実装後の「日常的な再現手順」は frontend/backend とも Wrangler コマンドのみで完結させる。

### 4-2. #319 / #320 再現性の担保

- `NODE_ENV=production` と Cloudflare bindings 経由で backend を実行し、Workers 相当の DB 経路（`neon-http`）を通す。
- #320 は transaction を有効な状態で `POST /api/trips/create` を実行し、失敗条件・フォールバック発火有無を記録する。
- #319 は該当 API の再現シナリオ（リクエスト入力、期待される失敗、ログ）を固定し、手順化する。

### 4-3. 切り分けしやすい観測

- `wrangler dev` ログ（backend）と browser/network ログ（frontend）を同時取得できる手順にする。
- 再現時の必須記録項目をテンプレート化する。
  - 実行コマンド
  - 使用した env/vars
  - 実行時刻
  - エラーメッセージ
  - 対象 API

---

## 5. 再現・検証手順（実装後に満たすべき運用）

1. frontend を Cloudflare 方式で起動
   - OpenNext build 実行
   - `wrangler dev` で Worker 起動
2. backend を Cloudflare 方式で起動
   - `wrangler dev src/index.ts`（必要な vars/secret を注入）
3. #320 再現確認
   - transaction 経路で `POST /api/trips/create` を実行
   - `No transactions support in neon-http driver` 等の現象有無を確認
4. #319 再現確認
   - 対象 API シナリオを実行し、失敗条件を記録
5. 対応方針作成
   - 原因を「環境差分」「DB driver 差分」「実装不整合」に分解
   - 修正候補（優先度・影響範囲・テスト観点）を作成

---

## 6. 対応方針の作成物（成果物）

- 再現手順書（コマンド付き）
- #319 / #320 の再現ログ
- 原因仮説と確定事項
- 修正方針（実装対象ファイル、テスト追加方針、ロールバック方針）

---

## 7. 完了条件（DoD）

1. `next dev` / `bun run --hot` を使わず、Wrangler 手順でローカル起動できる。
2. #319 / #320 をローカルで再現した記録が残っている。
3. #320 は transaction 利用状態の再現結果が確認できる。
4. #319 / #320 それぞれに対し、実装可能な対応方針が文書化されている。
5. 開発者が同じ手順で再現できるよう、README/環境ドキュメントが更新されている。

以上。
