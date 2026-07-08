import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserLocationSection } from '@/components/mypage/UserLocationSection';
import { UserLocation, MAX_USER_LOCATIONS, LOCATION_LABELS } from '@/models/userLocation';
import { TooltipProvider } from '@/components/ui/tooltip';

// Google Maps APIのモック
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="map-marker" />,
}));

// Geocodingフックのモック
vi.mock('@/hooks/use-geocoding', () => ({
  useGeocoding: () => ({
    isLoading: false,
    error: null,
    searchByAddress: vi.fn().mockResolvedValue(null),
    clearError: vi.fn(),
    resetLastSearchedAddress: vi.fn(),
  }),
}));

// TooltipProviderでラップするレンダリング用ヘルパー
function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// テスト用のモックデータ
const mockUserLocations: UserLocation[] = [
  {
    id: 1,
    userId: 'user_001',
    name: '自宅',
    latitude: 35.6895,
    longitude: 139.6917,
    label: '自宅',
    usageCount: 15,
    isDefault: true,
    createdAt: '2025-01-15T12:00:00Z',
    updatedAt: '2025-02-20T10:30:00Z',
  },
  {
    id: 2,
    userId: 'user_001',
    name: '東京駅',
    latitude: 35.6812,
    longitude: 139.7671,
    label: '駅・バス停',
    usageCount: 8,
    isDefault: false,
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-02-18T14:00:00Z',
  },
];

// モック関数
const mockPostUserLocation = vi.fn().mockResolvedValue({ ok: true });
const mockUpdateUserLocation = vi.fn().mockResolvedValue({ ok: true });
const mockDeleteUserLocation = vi.fn().mockResolvedValue({ ok: true });

describe('UserLocationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // 一覧表示のテスト
  // ========================================
  describe('一覧表示', () => {
    it('タイトルが「出発地と目的地」と表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText('出発地と目的地')).toBeInTheDocument();
    });

    it('現在の登録数と最大登録数がバッジで表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText(`${mockUserLocations.length} / ${MAX_USER_LOCATIONS}`)).toBeInTheDocument();
    });

    it('登録された地点の名前が表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      // 「自宅」は名前とラベルの両方に存在するためgetAllByTextを使用
      const homeTexts = screen.getAllByText('自宅');
      expect(homeTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('東京駅')).toBeInTheDocument();
    });

    it('ラベルがバッジとして表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      // ラベルが表示されている（「自宅」は名前とラベル両方あるので複数存在）
      expect(screen.getByText('駅・バス停')).toBeInTheDocument();
    });

    it('使用回数が表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText('使用回数: 15回')).toBeInTheDocument();
      expect(screen.getByText('使用回数: 8回')).toBeInTheDocument();
    });

    it('デフォルト地点にはデフォルトバッジが表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText('デフォルト')).toBeInTheDocument();
    });

    it('インデックス番号が表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('登録がない場合は空状態のメッセージが表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={[]}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByText('お気に入りの地点がまだ登録されていません')).toBeInTheDocument();
      expect(screen.getByText('よく使う出発地・目的地を登録しましょう')).toBeInTheDocument();
    });

    it('地点が登録されている場合はGoogle Mapが表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('登録がない場合はGoogle Mapが表示されない', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={[]}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // 追加機能のテスト
  // ========================================
  describe('追加機能', () => {
    it('追加ボタンが表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      expect(screen.getByRole('button', { name: /追加/i })).toBeInTheDocument();
    });

    it('追加ボタンをクリックするとダイアログが開く', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByText('お気に入り地点を追加')).toBeInTheDocument();
      expect(screen.getByText('旅行計画で使用する出発地・目的地を登録できます。')).toBeInTheDocument();
    });

    it('追加ダイアログに名前入力フィールドがある（必須）', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByLabelText(/名前/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('例: 自宅、東京駅')).toBeInTheDocument();
    });

    it('追加ダイアログにラベル選択がある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      // Selectコンポーネントはlabelledby属性が正しく関連付けられないため、テキストの存在を確認
      expect(screen.getByText('ラベル')).toBeInTheDocument();
    });

    it('追加ダイアログに住所入力フィールドがある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByLabelText('住所')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('例: 東京都新宿区西新宿1-1-1')).toBeInTheDocument();
    });

    it('追加ダイアログに緯度・経度の表示がある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByText('緯度')).toBeInTheDocument();
      expect(screen.getByText('経度')).toBeInTheDocument();
    });

    it('追加ダイアログにデフォルト設定チェックボックスがある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByText('デフォルトの地点として設定する')).toBeInTheDocument();
    });

    it('名前が空の場合は追加ボタンが無効化される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      const submitButton = screen.getByRole('button', { name: '追加する' });
      expect(submitButton).toBeDisabled();
    });

    it('名前を入力すると追加ボタンが有効になる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      const nameInput = screen.getByPlaceholderText('例: 自宅、東京駅');
      await user.type(nameInput, 'テスト地点');

      const submitButton = screen.getByRole('button', { name: '追加する' });
      expect(submitButton).not.toBeDisabled();
    });

    it('追加処理が正常に実行される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      const nameInput = screen.getByPlaceholderText('例: 自宅、東京駅');
      await user.type(nameInput, 'テスト地点');

      await user.click(screen.getByRole('button', { name: '追加する' }));

      await waitFor(() => {
        expect(mockPostUserLocation).toHaveBeenCalledTimes(1);
      });
    });

    it('キャンセルボタンでダイアログが閉じる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));
      expect(screen.getByText('お気に入り地点を追加')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(screen.queryByText('お気に入り地点を追加')).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // 最大件数制限のテスト
  // ========================================
  describe('最大件数制限', () => {
    it('最大件数に達していない場合は追加ボタンが有効', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const addButton = screen.getByRole('button', { name: /追加/i });
      expect(addButton).not.toBeDisabled();
    });

    it('最大件数に達した場合は追加ボタンが無効化される', () => {
      // 最大5件のモックデータを作成
      const maxLocations: UserLocation[] = Array.from({ length: MAX_USER_LOCATIONS }, (_, i) => ({
        id: i + 1,
        userId: 'user_001',
        name: `地点${i + 1}`,
        latitude: 35.6895 + i * 0.01,
        longitude: 139.6917 + i * 0.01,
        address: `住所${i + 1}`,
        label: '自宅',
        usageCount: i,
        isDefault: i === 0,
        createdAt: '2025-01-15T12:00:00Z',
        updatedAt: '2025-02-20T10:30:00Z',
      }));

      renderWithProviders(
        <UserLocationSection
          userLocationList={maxLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const addButton = screen.getByRole('button', { name: /追加/i });
      expect(addButton).toBeDisabled();
    });
  });

  // ========================================
  // 編集機能のテスト
  // ========================================
  describe('編集機能', () => {
    it('編集ボタンが各地点に表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      // 編集ボタン（ペンアイコン）が2つあることを確認
      const editButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg.lucide-pencil');
      });
      expect(editButtons.length).toBe(2);
    });

    it('編集ボタンをクリックすると編集ダイアログが開く', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const editButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg.lucide-pencil');
      });
      await user.click(editButtons[0]);

      expect(screen.getByText('お気に入り地点を編集')).toBeInTheDocument();
      expect(screen.getByText('地点の情報を更新できます。')).toBeInTheDocument();
    });

    it('編集ダイアログには既存の値が入力されている', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const editButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg.lucide-pencil');
      });
      await user.click(editButtons[0]);

      const nameInput = screen.getByPlaceholderText('例: 自宅、東京駅') as HTMLInputElement;
      expect(nameInput.value).toBe('自宅');
    });

    it('更新処理が正常に実行される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const editButtons = screen.getAllByRole('button').filter((btn) => {
        return btn.querySelector('svg.lucide-pencil');
      });
      await user.click(editButtons[0]);

      await user.click(screen.getByRole('button', { name: '更新する' }));

      await waitFor(() => {
        expect(mockUpdateUserLocation).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ========================================
  // 削除機能のテスト
  // ========================================
  describe('削除機能', () => {
    it('削除ボタンが各地点に表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      // 削除ボタン（data-testid）が2つあることを確認
      expect(screen.getByTestId('delete-button-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button-2')).toBeInTheDocument();
    });

    it('削除ボタンをクリックすると確認ダイアログが開く', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByTestId('delete-button-1'));

      expect(screen.getByText('削除の確認')).toBeInTheDocument();
      expect(screen.getByText(/「自宅」を削除しますか？/)).toBeInTheDocument();
      // <br />でテキストが分割されているため、部分一致で確認
      expect(screen.getByText(/この操作は取り消せません/)).toBeInTheDocument();
    });

    it('削除確認ダイアログにキャンセルボタンがある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByTestId('delete-button-1'));

      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });

    it('削除確認ダイアログに削除ボタンがある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByTestId('delete-button-1'));

      expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
    });

    it('削除処理が正常に実行される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByTestId('delete-button-1'));

      await user.click(screen.getByRole('button', { name: '削除する' }));

      await waitFor(() => {
        expect(mockDeleteUserLocation).toHaveBeenCalledWith(1);
      });
    });

    it('キャンセルボタンで削除ダイアログが閉じる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByTestId('delete-button-1'));

      expect(screen.getByText('削除の確認')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(screen.queryByText('削除の確認')).not.toBeInTheDocument();
      });
    });
  });

  // ========================================
  // デフォルトフラグの排他処理テスト
  // ========================================
  describe('デフォルトフラグの排他処理', () => {
    it('デフォルト地点は1つのみ存在する', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      const defaultBadges = screen.getAllByText('デフォルト');
      expect(defaultBadges.length).toBe(1);
    });
  });

  // ========================================
  // ラベル選択のテスト
  // ========================================
  describe('ラベル選択', () => {
    it('定義されたラベル選択肢が存在する', () => {
      // LOCATION_LABELSが正しく定義されていることを確認
      expect(LOCATION_LABELS).toContain('自宅');
      expect(LOCATION_LABELS).toContain('駅・バス停');
      expect(LOCATION_LABELS).toContain('実家');
      expect(LOCATION_LABELS).toContain('旅の拠点');
      expect(LOCATION_LABELS).toContain('その他');
    });
  });

  // ========================================
  // ツールチップのテスト
  // ========================================
  describe('ツールチップ', () => {
    it('インフォアイコンが表示される', () => {
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      // インフォアイコンが存在することを確認
      const infoIcon = document.querySelector('svg.lucide-info');
      expect(infoIcon).toBeInTheDocument();
    });
  });

  // ========================================
  // 住所検索機能のテスト
  // ========================================
  describe('住所検索機能', () => {
    it('住所入力フィールドにdata-testid属性がある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByTestId('address-input')).toBeInTheDocument();
    });

    it('緯度・経度の表示フィールドがある', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByTestId('latitude-display')).toBeInTheDocument();
      expect(screen.getByTestId('longitude-display')).toBeInTheDocument();
    });

    it('住所検索の説明テキストが表示される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByText(/カーソルを外すと.*自動取得/)).toBeInTheDocument();
    });

    it('地図のピン調整説明テキストが表示される', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <UserLocationSection
          userLocationList={mockUserLocations}
          postUserLocation={mockPostUserLocation}
          updateUserLocation={mockUpdateUserLocation}
          deleteUserLocation={mockDeleteUserLocation}
        />,
      );

      await user.click(screen.getByRole('button', { name: /追加/i }));

      expect(screen.getByText(/地図をクリック.*ドラッグして位置を調整/)).toBeInTheDocument();
    });
  });
});
