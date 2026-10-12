# コードスタイル
- anyは基本使わない(テストにおいても)

# フロントエンドコマンド (`cd frontend`, uses pnpm)
```bash
pnpm run dev          # Dev server on port 3000
pnpm run test         # Run all tests
pnpm run test -- <file>  # Run a single test file
pnpm run test:watch
pnpm run test:coverage
pnpm run lint
pnpm run typecheck
pnpm run build
```

## 型定義について
@TYPE_GUIDE.md

# テストガイダンス
**Frontend tests** (`frontend/src/tests/`):
- Use Vitest + React Testing Library
- Write `describe`/`it` labels in Japanese
- Avoid mocks where possible; if needed, leave a comment explaining why
- Use `data-testid` attributes when element selection is otherwise difficult
- Do not refactor source files during testing — leave a comment instead

**Always run type check as final step**: `bun run typecheck` (backend) or `pnpm run typecheck` (frontend).

# 禁止事項
- テストの追加/修正なしで機能を実装すること(レイアウトの調整は除く)