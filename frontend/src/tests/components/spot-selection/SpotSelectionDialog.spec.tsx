import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SpotSelectionDialog from '@/components/spot-selection/SpotSelectionDialog';
import { useStoreForPlanning } from '@/lib/plan';
import { useSpotSearchStore } from '@/store/planning/spotSearchStore';
import { ExtendSpotType } from '@/types/plan';

/**
 * SpotSelectionDialog のスポット追加時の営業日確認（No.158）を検証する
 */

// 2026-10-12 は月曜日。月曜定休・火〜日 10:00-17:00 のスポット
const MONDAY = '2026-10-12';
const TUESDAY = '2026-10-13';
const openingPeriods = [0, 2, 3, 4, 5, 6].map((day) => ({
  open: { day, hour: 10, minute: 0 },
  close: { day, hour: 17, minute: 0 },
}));

const { mockToast, selectedSpotRef } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  selectedSpotRef: { current: null as ExtendSpotType | null },
}));

// トーストの表示内容を検証するためモックする
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// 上限 API はテスト環境で呼べないためモックする
vi.mock('@/hooks/use-user-limits', () => ({
  useUserLimits: () => ({
    limits: { maxWishlistSpots: 20, maxPlans: 5, maxSpotsPerDay: 5, maxPlanDays: 3, maxUserLocations: 2 },
    isLoading: false,
    error: undefined,
    retry: vi.fn(),
  }),
}));

// 検索タブは Google Maps API に依存するため、選択操作だけを行う部品に置き換える
vi.mock('@/components/spot-selection/GoogleSpotSearch', () => ({
  default: ({ onSpotSelect }: { onSpotSelect: (spot: ExtendSpotType, isDeleted: boolean) => void }) => (
    <button type="button" onClick={() => selectedSpotRef.current && onSpotSelect(selectedSpotRef.current, false)}>
      テスト用スポットを追加
    </button>
  ),
}));
vi.mock('@/components/spot-selection/WishlistSpotSearch', () => ({ default: () => null }));
vi.mock('@/components/spot-selection/VisitedSpotSearch', () => ({ default: () => null }));
// 地図は Google Maps SDK を実行できないため、描画されたことだけ分かる部品に置き換える
vi.mock('@/components/spot-selection/MapSpotSearch', () => ({
  default: () => <div data-testid="map-spot-search" />,
}));

const createSpot = (overrides: Partial<ExtendSpotType> = {}): ExtendSpotType => ({
  id: 'spot-1',
  spotId: 'spot-1',
  name: '美術館',
  latitude: 35.0,
  longitude: 139.0,
  stayStart: '10:00',
  stayEnd: '11:00',
  stayDuration: 60,
  rating: 4.2,
  transportMethodId: 0,
  transportMethod: 'DEFAULT',
  travelTime: 0,
  order: 0,
  openingPeriods,
  ...overrides,
});

const addSpot = (date: string, spot: ExtendSpotType) => {
  selectedSpotRef.current = spot;
  render(<SpotSelectionDialog date={date} />);
  fireEvent.click(screen.getByRole('button', { name: /観光地を選択/ }));
  fireEvent.click(screen.getByText('テスト用スポットを追加'));
};

const getSpotIds = (date: string) =>
  useStoreForPlanning
    .getState()
    .plans.find((plan) => plan.date === date)
    ?.spots.map((spot) => spot.id) ?? [];

describe('SpotSelectionDialog の営業日確認（No.158）', () => {
  beforeEach(() => {
    mockToast.mockClear();
    useStoreForPlanning.setState({ plans: [] });
  });

  it('計画日が定休日のスポットを追加するとトーストを表示し、スポットは追加されること', () => {
    addSpot(MONDAY, createSpot());

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '営業日をご確認ください',
        description: '「美術館」はこの日（月）が定休日の可能性があります。公式サイト等で営業日をご確認ください。',
      }),
    );
    expect(getSpotIds(MONDAY)).toEqual(['spot-1']);
  });

  it('臨時休業中のスポットを追加するとトーストを表示し、スポットは追加されること', () => {
    addSpot(TUESDAY, createSpot({ businessStatus: 'CLOSED_TEMPORARILY' }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description:
          '「美術館」は Google マップ上で臨時休業中と登録されています。公式サイト等で最新情報をご確認ください。',
      }),
    );
    expect(getSpotIds(TUESDAY)).toEqual(['spot-1']);
  });

  it('計画日が営業日のスポットはトーストを表示せずに追加されること', () => {
    addSpot(TUESDAY, createSpot());

    expect(mockToast).not.toHaveBeenCalled();
    expect(getSpotIds(TUESDAY)).toEqual(['spot-1']);
  });

  it('仮の滞在時間が営業時間外でも、追加時は日単位で判定してトーストを表示しないこと', () => {
    addSpot(TUESDAY, createSpot({ stayStart: '08:00', stayEnd: '09:00' }));

    expect(mockToast).not.toHaveBeenCalled();
  });
});

describe('SpotSelectionDialog の探し方の切替（No.341）', () => {
  const openDialog = (date = TUESDAY) => {
    const view = render(<SpotSelectionDialog date={date} />);
    fireEvent.click(screen.getByRole('button', { name: /観光地を選択/ }));
    return view;
  };

  beforeEach(() => {
    useStoreForPlanning.setState({ plans: [] });
    useSpotSearchStore.setState({ searchMode: 'list', openOnPlanDate: false, planSpotSelection: [], searchDate: null });
  });

  it('初期表示はリストで探すで、3タブが表示され地図は表示されないこと', () => {
    openDialog();

    expect(screen.getByRole('button', { name: 'リストで探す' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /Google検索/ })).toBeInTheDocument();
    expect(screen.queryByTestId('map-spot-search')).not.toBeInTheDocument();
  });

  it('地図で探すを押すと地図に切り替わり、3タブは表示されないこと', () => {
    openDialog();

    fireEvent.click(screen.getByRole('button', { name: '地図で探す' }));

    expect(screen.getByTestId('map-spot-search')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Google検索/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '地図で探す' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ダイアログを開き直すと最後に使った探し方で開くこと', () => {
    const { unmount } = openDialog();
    fireEvent.click(screen.getByRole('button', { name: '地図で探す' }));
    unmount();

    openDialog();

    expect(screen.getByTestId('map-spot-search')).toBeInTheDocument();
  });

  it('「計画日に営業しているスポットのみ」はリストで探すに1つだけ表示され、押すと状態が切り替わること', () => {
    openDialog();

    const checkboxes = screen.getAllByRole('checkbox', { name: '計画日に営業しているスポットのみ' });
    expect(checkboxes).toHaveLength(1);
    fireEvent.click(checkboxes[0]);
    expect(useSpotSearchStore.getState().openOnPlanDate).toBe(true);
  });

  it('地図で探すのときは「計画日に営業しているスポットのみ」をダイアログ上部に出さないこと', () => {
    useSpotSearchStore.setState({ searchMode: 'map' });
    openDialog();

    expect(screen.queryByRole('checkbox', { name: '計画日に営業しているスポットのみ' })).not.toBeInTheDocument();
  });

  it('前回と違う日付で開くとプランの地点選択が空になること（P-5）', () => {
    useSpotSearchStore.setState({ planSpotSelection: ['spot-1'], searchDate: MONDAY });

    openDialog(TUESDAY);

    expect(useSpotSearchStore.getState().planSpotSelection).toEqual([]);
  });

  it('前回と同じ日付で開くとプランの地点選択が残ること', () => {
    useSpotSearchStore.setState({ planSpotSelection: ['spot-1'], searchDate: TUESDAY });

    openDialog(TUESDAY);

    expect(useSpotSearchStore.getState().planSpotSelection).toEqual(['spot-1']);
  });
});
