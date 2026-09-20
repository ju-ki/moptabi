# No.337 通知機能のミニマムアップデート 実装計画

## 1. 目的

最低限しか作成しておらず、お知らせの内容が全体的に見えないので改善する。
追加でテキストエリアのサイズも変更して、自動で拡大縮小できるようにする

## 2.要件
1. お知らせのカードをクリックすると、お知らせの全文が確認できる
2. お知らせを開くことで、既読扱いとなる
3. その他お知らせ確認にての機能変更はなし
4. 別途管理画面のお知らせ入力エリアを自動で拡大・縮小ができるようにしたい

## 3. 実装計画（TDD 方式）

### 3.1 テスト対象コンポーネント・ファイル

| 対象 | ファイルパス | テスト方針 |
|------|-------------|---------|
| NotificationDetailSheet | `frontend/src/components/NotificationDetailSheet.tsx` | 新規作成 - 詳細表示モーダル/シートのテスト |
| AutoExpandTextarea | `frontend/src/components/ui/auto-expand-textarea.tsx` | 新規作成 - 自動拡大・縮小のテスト |
| Notification（改善） | `frontend/src/components/Notification.tsx` | 既存を改善 - クリック時の詳細表示・既読処理テスト |
| NotificationManagement（改善） | `frontend/src/app/admin/components/NotificationManagement.tsx` | 既存を改善 - Textarea 置き換えテスト |

### 3.2 テスト計画

#### Phase 1: AutoExpandTextarea コンポーネント（自動拡大・縮小機能）

**テスト観点：**
1. 初期状態 - 初期行数（4行）で表示されること
2. コンテンツ増加時 - テキスト入力により自動的に高さが拡大すること
3. コンテンツ削除時 - テキスト削除により自動的に高さが縮小すること
4. 最大高さ制限 - スクロール可能な最大高さに達すること
5. イベント伝播 - onChange イベントが正しく発火すること
6. アクセシビリティ - data-testid 属性を持つこと

**テスト対象ファイル:** `frontend/src/tests/components/ui/auto-expand-textarea.spec.tsx`

**テストケース：**
| テスト観点 | 操作 | 期待結果 | 参考 |
|-----------|------|--------|------|
| 初期表示 | コンポーネント描画 | 初期高さ（4行分）で表示 | textarea の默認 rows=4 |
| 入力時の拡大 | 5行以上のテキスト入力 | コンテンツに応じて高さが拡大 | scrollHeight ≥ clientHeight |
| 削除時の縮小 | テキストを削除 | 高さが自動的に縮小 | 最小 4行に制限 |
| 最大高さ制限 | 大量のテキスト入力 | 最大高さに達したらスクロール可能 | maxHeight: 200px など |
| onChange イベント | テキスト入力・削除 | onChange コールバックが実行される | フック値が更新される |
| data-testid | コンポーネント確認 | data-testid 属性が存在 | テスト検出用 |
| Placeholder | Placeholder prop 指定 | プレースホルダーテキストが表示 | UI仕様 |
| 値の変更 | value prop の外部更新 | コンポーネントが正しく更新・高さ調整 | 制御コンポーネント |

#### Phase 2: NotificationDetailSheet コンポーネント（詳細表示シート）

**テスト観点：**
1. 表示制御 - isOpen が true の場合表示、false の場合非表示
2. コンテンツ表示 - タイトル・本文・公開日時が正しく表示されること
3. クリック閉じる - オーバーレイクリック時に閉じること
4. 既読処理 - シート表示時に markAsRead が呼び出されること（既読状態でない場合のみ）
5. 既読済みの場合 - markAsRead は呼び出されないこと

**テスト対象ファイル:** `frontend/src/tests/components/NotificationDetailSheet.spec.tsx`

**テストケース：**
| テスト観点 | 入力条件 | 期待結果 |
|-----------|--------|--------|
| 初期非表示 | isOpen=false | シートが DOM に表示されない |
| 表示状態 | isOpen=true | シートが表示される |
| コンテンツ表示 | notification プロップ渡却 | タイトル・本文・日時が正しく表示 |
| 既読未読判定 | isRead=false & シート表示 | markAsRead(id) が呼び出される |
| 既読済み | isRead=true & シート表示 | markAsRead が呼び出されない |
| オーバーレイクリック | Overlay クリック | onClose コールバックが実行される |
| 日時フォーマット | publishedAt: ISO 文字列 | "9月20日 14:30" 形式で表示 |

#### Phase 3: Notification コンポーネント（フロントエンド改善）

**テスト観点：**
1. カード表示 - カードをクリック可能な状態で表示すること
2. クリック時の詳細表示 - NotificationDetailSheet が表示されること
3. 既読状態の更新 - シートクローズ時に既読状態が反映されること
4. 複数カード - 正しいカードが選択されること

**テスト対象ファイル:** `frontend/src/tests/components/Notification.spec.tsx`（既存テストの拡張）

**テストケース：**
| テスト観点 | 操作 | 期待結果 |
|-----------|------|--------|
| カード表示 | 通知一覧描画 | 各通知がカードとして表示 |
| カードクリック | notification item クリック | NotificationDetailSheet が開く |
| 詳細に正しいデータ | 特定カードをクリック | 選択されたお知らせの内容が詳細に表示 |
| 既読フラグ更新 | 未読通知をクリック→シート表示 | markAsRead が呼び出される |
| 既読通知の二度呼び出しなし | 既読通知クリック | markAsRead は呼び出されない |
| シートクローズ | 詳細シートを閉じる | リスト画面に戻る |

#### Phase 4: NotificationManagement コンポーネント（管理画面改善）

**テスト観点：**
1. Textarea 置き換え - AutoExpandTextarea が使用されていること
2. 作成フォームの Textarea - 自動拡大・縮小が機能すること
3. 編集フォームの Textarea - 自動拡大・縮小が機能すること
4. 入力値の保持 - Textarea の値が正しく state に反映されること

**テスト対象ファイル:** `frontend/src/tests/components/admin/NotificationManagement.spec.tsx`（既存テストの拡張）

**テストケース：**
| テスト観点 | 操作 | 期待結果 |
|-----------|------|--------|
| 新規作成フォーム | フォーム描画 | AutoExpandTextarea が使用されている |
| 編集フォーム | 編集ダイアログ表示 | AutoExpandTextarea が使用されている |
| 新規作成時入力 | Textarea に複数行入力 | 高さが自動拡大 |
| 編集時の既存値読み込み | 編集ダイアログ開く | 既存のテキストが Textarea に読み込まれ、高さが調整される |
| フォーム値更新 | Textarea 入力 | formData の content が更新される |
| 削除時の縮小 | テキストを削除 | 高さが自動縮小 |

### 3.3 実装ステップ（TDD サイクル）

**ステップ 1: AutoExpandTextarea の実装**
1. テストファイル作成：`frontend/src/tests/components/ui/auto-expand-textarea.spec.tsx`
2. テスト実装（すべて Red）
3. コンポーネント実装：`frontend/src/components/ui/auto-expand-textarea.tsx`
   - props: value, onChange, placeholder, data-testid など
   - useEffect で高さ自動調整ロジック実装
   - useRef で textarea 参照
4. テスト実行（Green）
5. リファクタリング（スタイル調整など）

**ステップ 2: NotificationDetailSheet の実装**
1. テストファイル作成：`frontend/src/tests/components/NotificationDetailSheet.spec.tsx`
2. テスト実装（すべて Red）
3. コンポーネント実装：`frontend/src/components/NotificationDetailSheet.tsx`
   - Sheet（shadcn/ui）を使用
   - props: isOpen, notification, onClose, onNotificationView
   - isOpen=true かつ isRead=false 時に markAsRead 実行
   - 日時フォーマット（format 関数使用）
4. テスト実行（Green）
5. リファクタリング

**ステップ 3: Notification コンポーネント改善**
1. 既存テストを確認：`frontend/src/tests/components/Notification.spec.tsx`
2. 新機能のテストケース追加（Red）
3. コンポーネント改善：`frontend/src/components/Notification.tsx`
   - 状態管理：selectedNotification, isDetailOpen
   - クリック時にシート表示
   - NotificationDetailSheet コンポーネント追加
4. テスト実行（Green）
5. リファクタリング

**ステップ 4: NotificationManagement 改善**
1. 既存テストを確認：`frontend/src/tests/components/admin/NotificationManagement.spec.tsx`
2. Textarea → AutoExpandTextarea の置き換えテスト追加（Red）
3. コンポーネント改善：`frontend/src/app/admin/components/NotificationManagement.tsx`
   - 作成フォームの Textarea を AutoExpandTextarea に置き換え
   - 編集フォームの Textarea を AutoExpandTextarea に置き換え
   - NotificationManagementContainer.tsx も同様に改善
4. テスト実行（Green）
5. リファクタリング

**ステップ 5: 統合テスト・E2E テスト**
1. ローカル開発環境での動作確認
2. フロント側テスト実行：`npm run test` （すべて Green）
3. ブラウザでの UI/UX 確認
4. ストレステスト（大量テキスト入力など）

### 3.4 ファイル構成変更

**新規作成ファイル：**
- `frontend/src/components/ui/auto-expand-textarea.tsx` - 自動拡大・縮小 Textarea コンポーネント
- `frontend/src/components/NotificationDetailSheet.tsx` - 通知詳細表示シートコンポーネント
- `frontend/src/tests/components/ui/auto-expand-textarea.spec.tsx` - 自動拡大・縮小のテスト
- `frontend/src/tests/components/NotificationDetailSheet.spec.tsx` - 詳細表示シートのテスト

**既存ファイル改善：**
- `frontend/src/components/Notification.tsx` - 詳細表示機能追加
- `frontend/src/app/admin/components/NotificationManagement.tsx` - Textarea → AutoExpandTextarea に置き換え
- `frontend/src/app/admin/components/NotificationManagementContainer.tsx` - Textarea → AutoExpandTextarea に置き換え
- `frontend/src/tests/components/Notification.spec.tsx` - 新テストケース追加
- `frontend/src/tests/components/admin/NotificationManagement.spec.tsx` - 新テストケース追加

### 3.5 実装上の注意点

**フロントエンド側：**
1. Sheet コンポーネント - shadcn/ui の Sheet または Dialog を使用
2. 日時フォーマット - 既存の format 関数と統一（ja-JP locale）
3. markAsRead 呼び出し - 重複呼び出しを避ける（既読済みチェック）
4. Textarea 自動高さ調整 - scrollHeight を参照して height を設定

**管理画面側：**
1. Textarea 置き換え - 既存の props（value, onChange など）を保持
2. スタイル統一 - 既存 Textarea と同じ Tailwind class を使用
3. placeholder - 各フォームで適切に設定

**バックエンド側：**
- 既存実装で対応（変更不要）
- markAsRead API はすでに存在

### 3.6 テスト実行コマンド

```bash
# フロントエンド側でテスト実行
cd frontend
pnpm run test

# 特定テストファイルのみ実行
pnpm run test -- auto-expand-textarea.spec.tsx
pnpm run test -- NotificationDetailSheet.spec.tsx
pnpm run test -- Notification.spec.tsx
pnpm run test -- admin/NotificationManagement.spec.tsx
```

### 3.7 完了条件

✅ すべてのテストが Green（通過）
✅ 型チェック：`pnpm run type-check` でエラーなし
✅ ローカル開発環境での UI/UX 動作確認完了
✅ ドキュメント（README など）更新
✅ git push 前の最終確認完了