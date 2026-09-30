## API仕様書
@../docs/API設計書.md

## DB設計書
@../doc/DB設計書.md


# コードスタイル
- anyは基本使わない(テストにおいても)

# バックエンドコマンド (`cd backend`, uses bun)
```bash
bun run dev           # Dev server on port 8787
bun run test          # Run all tests
bun run test <file>   # Run a single test file (e.g. bun run test trip.service.spec.ts)
bun run test:coverage
bun run lint
bun run typecheck
bun run db:generate   # Generate Drizzle migrations
bun run db:push       # Apply schema to dev DB
bun run db:studio     # Drizzle Studio UI
bun run db:push:test  # Apply schema to test DB
bun run db:reset:test # Reset test DB
```

# テストガイダンス
**Backend tests** (`backend/src/tests/*.spec.ts`):
- Test schema/model first, then API responses
- Use `describe('GET /api/path')` naming for API tests
- Base assertions on types defined in `shared-types/`
- Run `bun run test` before finishing any task

# 禁止事項
- コマンドで生成したdrizzle/*.sqlファイルを手修正しないこと(schema.tsを反映→コマンドで生成)
- テストの追加/修正なしで機能を実装すること
