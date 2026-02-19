import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VisitedSpotCard from '@/components/spot-selection/cards/VisitedSpotCard';
import { Spot, TransportNodeType } from '@/types/plan';

// テスト用のSpotデータを生成するヘルパー関数
const createMockSpot = (overrides?: Partial<Spot>): Spot => ({
  id: 'spot-1',
  location: {
    id: 'spot-1',
    name: 'テスト観光スポット',
    lat: 35.6895,
    lng: 139.6917,
  },
  stayStart: '09:00',
  stayEnd: '10:00',
  transports: {
    transportMethodIds: [0],
    name: 'DEFAULT',
    travelTime: '不明',
    fromType: TransportNodeType.SPOT,
    toType: TransportNodeType.SPOT,
  },
  order: 0,
  image: 'https://example.com/image.jpg',
  rating: 4.5,
  address: '東京都千代田区',
  url: 'https://example.com',
  visitCount: 3,
  visitedAt: '2024-06-15T10:30:00.000Z',
  ...overrides,
});

describe('VisitedSpotCard', () => {
  describe('表示内容', () => {
    it('画像が表示される', () => {
      const spot = createMockSpot();
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      const image = screen.getByAltText('テスト観光スポット');
      expect(image).toBeInTheDocument();
    });

    it('スポット名が表示される', () => {
      const spot = createMockSpot();
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('visited-spot-name-spot-1')).toHaveTextContent('テスト観光スポット');
    });

    it('評価が表示される', () => {
      const spot = createMockSpot({ rating: 4.5 });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('visited-spot-rating-spot-1')).toHaveTextContent('4.5');
    });

    it('住所が表示される', () => {
      const spot = createMockSpot({ address: '東京都千代田区' });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('visited-spot-address-spot-1')).toHaveTextContent('東京都千代田区');
    });

    it('外部リンクが表示される', () => {
      const spot = createMockSpot({ url: 'https://example.com' });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      const link = screen.getByTestId('visited-spot-url-spot-1');
      expect(link).toHaveTextContent('外部リンク');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('訪問回数が表示される', () => {
      const spot = createMockSpot({ visitCount: 3 });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('visited-spot-visit-count-spot-1')).toHaveTextContent('3回訪問');
    });

    it('前回訪問日時がYYYY-MM-DD形式で表示される', () => {
      const spot = createMockSpot({ visitedAt: '2024-06-15T10:30:00.000Z' });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.getByTestId('visited-spot-visited-at-spot-1')).toHaveTextContent('前回: 2024-06-15');
    });

    it('訪問回数が0の場合は表示されない', () => {
      const spot = createMockSpot({ visitCount: 0 });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('visited-spot-visit-count-spot-1')).not.toBeInTheDocument();
    });

    it('訪問回数がない場合は表示されない', () => {
      const spot = createMockSpot({ visitCount: undefined });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('visited-spot-visit-count-spot-1')).not.toBeInTheDocument();
    });

    it('前回訪問日時がない場合は表示されない', () => {
      const spot = createMockSpot({ visitedAt: undefined });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByTestId('visited-spot-visited-at-spot-1')).not.toBeInTheDocument();
    });

    it('評価数は表示されない（Google検索との違い）', () => {
      const spot = createMockSpot({ ratingCount: 1234 });
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      // 評価数はVisitedSpotCardでは表示しない
      expect(screen.queryByText('(1,234)')).not.toBeInTheDocument();
    });
  });

  describe('選択状態', () => {
    it('選択済みの場合は選択済みバッジが表示される', () => {
      const spot = createMockSpot();
      render(<VisitedSpotCard place={spot} isSpotSelected={() => true} />);

      expect(screen.getByText('選択済み')).toBeInTheDocument();
    });

    it('未選択の場合は選択済みバッジが表示されない', () => {
      const spot = createMockSpot();
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} />);

      expect(screen.queryByText('選択済み')).not.toBeInTheDocument();
    });
  });

  describe('クリックイベント', () => {
    it('カードをクリックするとonSpotClickが呼ばれる', () => {
      const spot = createMockSpot();
      const onSpotClick = vi.fn();
      render(<VisitedSpotCard place={spot} isSpotSelected={() => false} onSpotClick={onSpotClick} />);

      fireEvent.click(screen.getByTestId('visited-spot-card-spot-1'));
      expect(onSpotClick).toHaveBeenCalledWith(spot);
    });
  });
});
