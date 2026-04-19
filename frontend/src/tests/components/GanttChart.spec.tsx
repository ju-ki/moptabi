import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * GanttChart テスト
 * DnD が必要なため @dnd-kit/core と DndItem をモック化する
 */

// @dnd-kit/core はjsdom環境では動作しないためモック化する
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToHorizontalAxis: vi.fn(),
}));

// DndItem はDnDフック依存のためモック化する
vi.mock('@/components/common/DndItem', () => ({
  DraggableHandle: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="draggable-handle">{children}</div>
  ),
  DroppableHandle: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="droppable-handle">{children}</div>
  ),
}));

const mockGetSpotInfo = vi.fn();
const mockSetSpots = vi.fn();

vi.mock('@/lib/plan', () => ({
  useStoreForPlanning: vi.fn(),
}));

import { useStoreForPlanning } from '@/lib/plan';
import GanttChart from '@/components/GanttChart';
import { TransportNodeType } from '@/types/plan';

const createMockSpot = (id: string, name: string, stayStart: string, stayEnd: string) => ({
  id,
  location: { id, name, lat: 35.6895, lng: 139.6917 },
  stayStart,
  stayEnd,
  memo: null,
  transports: {
    transportMethod: 1,
    name: 'WALKING',
    travelTime: '30分',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  order: 0,
});

const createMockFields = (spots: ReturnType<typeof createMockSpot>[]) => ({
  getSpotInfo: mockGetSpotInfo,
  setSpots: mockSetSpots,
  plans: [
    {
      date: '2025-12-20',
      spots,
      departure: null,
      destination: null,
    },
  ],
});

describe('GanttChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('空の状態', () => {
    it('スポットがない場合「観光地を選択してください」が表示されること', async () => {
      mockGetSpotInfo.mockReturnValue([]);
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<GanttChart date="2025-12-20" />);

      expect(screen.getByText('観光地を選択してください')).toBeInTheDocument();
    });

    it('スポットがない場合ガントチャートの説明テキストが表示されること', async () => {
      mockGetSpotInfo.mockReturnValue([]);
      (useStoreForPlanning as any).mockReturnValue(createMockFields([]));

      render(<GanttChart date="2025-12-20" />);

      expect(
        screen.getByText('観光地を選択すると、ここにガントチャートが表示されます。時間の調整や移動が可能です。'),
      ).toBeInTheDocument();
    });
  });

  describe('スポット表示', () => {
    it('スポットがある場合スポット名が表示されること', async () => {
      const spots = [createMockSpot('spot-1', '東京タワー', '09:00', '11:00')];
      mockGetSpotInfo.mockReturnValue(spots);
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<GanttChart date="2025-12-20" />);

      await waitFor(() => {
        expect(screen.getByText('東京タワー')).toBeInTheDocument();
      });
    });

    it('スポットがある場合滞在時間が表示されること', async () => {
      const spots = [createMockSpot('spot-1', '浅草寺', '10:00', '12:00')];
      mockGetSpotInfo.mockReturnValue(spots);
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<GanttChart date="2025-12-20" />);

      await waitFor(() => {
        expect(screen.getByText('(10:00 ~ 12:00)')).toBeInTheDocument();
      });
    });

    it('スポットがある場合削除ボタンが表示されること', async () => {
      const spots = [createMockSpot('spot-1', '東京スカイツリー', '13:00', '15:00')];
      mockGetSpotInfo.mockReturnValue(spots);
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<GanttChart date="2025-12-20" />);

      await waitFor(() => {
        expect(screen.getByText('東京スカイツリー')).toBeInTheDocument();
      });

      // X ボタン（削除ボタン）が存在することを確認
      const deleteButton = screen
        .getAllByRole('button')
        .find((btn) => btn.closest('[class*="flex-shrink-0"]') !== null);
      expect(deleteButton).toBeDefined();
    });

    it('複数スポットがある場合すべてのスポット名が表示されること', async () => {
      const spots = [
        createMockSpot('spot-1', '東京タワー', '09:00', '10:00'),
        createMockSpot('spot-2', '浅草寺', '11:00', '13:00'),
      ];
      mockGetSpotInfo.mockReturnValue(spots);
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<GanttChart date="2025-12-20" />);

      await waitFor(() => {
        expect(screen.getByText('東京タワー')).toBeInTheDocument();
        expect(screen.getByText('浅草寺')).toBeInTheDocument();
      });
    });
  });

  describe('スポット削除', () => {
    it('削除ボタンをクリックした場合setSpotsが呼ばれること', async () => {
      const spots = [createMockSpot('spot-1', '東京タワー', '09:00', '11:00')];
      mockGetSpotInfo.mockReturnValue(spots);
      (useStoreForPlanning as any).mockReturnValue(createMockFields(spots));

      render(<GanttChart date="2025-12-20" />);

      await waitFor(() => {
        expect(screen.getByText('東京タワー')).toBeInTheDocument();
      });

      // 削除ボタンをクリック
      const ghostButtons = screen.getAllByRole('button');
      fireEvent.click(ghostButtons[ghostButtons.length - 1]);

      expect(mockSetSpots).toHaveBeenCalledWith('2025-12-20', expect.objectContaining({ id: 'spot-1' }), true);
    });
  });
});
