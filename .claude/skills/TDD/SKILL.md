---
name: "moptabi-issue-implement"
description: "Moptabi の Issue を実装して dev 向け PR を出すまでの手順。Issue 番号を指定して実装を頼まれたときに使う。"
---

# Moptabi Issue 実装手順

## 1. 準備
- Issue 本文とコメントを読み、要件と受け入れ条件を整理する。
- dev から作業ブランチ `feature<Issue番号>` を作成する（例: feature439）。
- 機能が複数にまたがる場合はブランチを分け、それぞれ `feature<Issue番号>-something` のように命名する。

## 2. 計画ドキュメント
`docs/tasks/` 直下に次の3点を作成し、作業ブランチにコミットする（例: `docs/tasks/No.232_実装計画.md`）。
- `No.<番号>_実装計画.md`: 変更方針、対象ファイル、影響範囲
- `No.<番号>_処理フロー.md`: 変更後の処理の流れ
- `No.<番号>_動作確認手順.md`: 手動確認の手順と期待結果

## 3. 実装（TDD）
- 2までのレビューが完了後に実装を開始する。
- 先に失敗するテストを書き、通る実装を加え、リファクタする。
- パッケージマネージャーは各ディレクトリの CLAUDE.md の指定に従う（frontend は pnpm、backend は bun）。

## 4. 検証
- 検証前に次のガイドを読み、各ガイドの検証コマンドに従う。
  - バックエンド: [backend/CLAUDE.md](../../../backend/CLAUDE.md)
  - フロントエンド: [frontend/CLAUDE.md](../../../frontend/CLAUDE.md)
- バックエンドは `backend/` 内で bun を使い、lint・test・typecheck をすべて通す。
- フロントエンドは `frontend/` 内で pnpm を使い、lint・test・typecheck をすべて通す。
- UI 変更がある場合は修正前後のスクリーンショットを撮り、PR に添付する。

## 5. PR
- 指定がなければ base は `dev`。
- リポジトリの PR テンプレートがあればそれに従う。
- 本文に Issue 番号（Closes #番号）、変更内容、動作確認結果を書く。
- PR 作成後は CI を監視し、green になるまで修正する。