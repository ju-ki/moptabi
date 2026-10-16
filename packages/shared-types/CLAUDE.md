# コードスタイル
- anyは基本使わない(テストにおいても)

# shared-typeコマンド (`cd packages/shared-type`, uses npm)
```bash
npm install
```

## 修正後
- このプロジェクトで何らかの修正を行った場合は下記を行う
- backend下で`bun run prebuild`を行う
- frontend下で`pnpm run prebuild`を行う


# 禁止事項
- テストの追加/修正なしで機能を実装すること(レイアウトの調整は除く)